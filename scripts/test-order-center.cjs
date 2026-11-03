const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('../web/node_modules/typescript');
function load(file, mocks, extra = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../web/src', file), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require: name => { if (Object.hasOwn(mocks, name)) return mocks[name]; throw new Error(`Unexpected import ${name}`); },
    Response, Request, URL, Buffer, AbortSignal, process: { env: {} }, ...extra });
  return module.exports;
}
const next = { NextResponse: { json: (body, options) => Response.json(body, options) } };
test('rotas de pedidos recusam visitante e cliente antes de acessar banco', async () => {
  for (const status of [401, 403]) for (const file of ['app/api/admin/order-center/route.ts', 'app/api/admin/order-push/route.ts']) {
    const route = load(file, { 'next/server': next, '@/lib/server/supabase-server': { requireAdmin: async () => new Response('', { status }) },
      '@/lib/server/order-center-db': { createOrderServiceSupabase: () => { throw new Error('Banco não deve ser acessado'); } }, '@/lib/server/order-push': {} });
    for (const method of ['GET', 'POST']) assert.equal((await route[method](new Request('https://loja.test/api'))).status, status);
  }
});
test('abrir lista não confirma pedido; confirmação exige id e conta destinatária', async () => {
  const calls = [];
  const query = table => {
    const q = {};
    for (const method of ['select', 'eq', 'is', 'update', 'order', 'limit', 'maybeSingle']) q[method] = (...args) => { calls.push([table, method, ...args]); return q; };
    q.then = (resolve, reject) => Promise.resolve({ data: table === 'orders' ? { id: 'order-1' } : [{ order_id: 'order-1' }], error: null }).then(resolve, reject);
    return q;
  };
  const route = load('app/api/admin/order-center/route.ts', { 'next/server': next,
    '@/lib/server/supabase-server': { requireAdmin: async () => ({ user: { id: 'titi-user-id' } }) },
    '@/lib/server/order-center-db': { createOrderServiceSupabase: () => ({ from: query }) } });
  await route.GET(new Request('https://loja.test/api'));
  assert.ok(!calls.some(c => c[1] === 'update'));
  const invalid = await route.POST(new Request('https://loja.test/api', { method: 'POST', body: '{}' }));
  assert.equal(invalid.status, 400);
  const response = await route.POST(new Request('https://loja.test/api', { method: 'POST', body: JSON.stringify({ orderId: 'order-1' }) }));
  assert.equal(response.status, 200);
  assert.ok(calls.some(c => c[0] === 'order_push_reminders' && c[1] === 'eq' && c[2] === 'recipient_user_id' && c[3] === 'titi-user-id'));
  assert.ok(calls.some(c => c[0] === 'order_push_reminders' && c[1] === 'is' && c[2] === 'viewed_at' && c[3] === null));
});
test('envio exige sucesso do Pushover e não expõe corpo de erro ou credenciais', async () => {
  let payload;
  let accepted = true;
  const service = load('lib/server/order-push.ts', { 'server-only': {}, './order-center-db': {} }, {
    fetch: async (url, options) => { assert.equal(url, 'https://api.pushover.net/1/messages.json'); payload = JSON.parse(options.body);
      return { ok: accepted, status: accepted ? 200 : 400, json: async () => ({ status: accepted ? 1 : 0, errors: ['SECRET_RESPONSE'] }) }; },
  });
  const config = { app_token: 'PRIVATE_TOKEN', user_key: 'PRIVATE_KEY', device: 'iphone' };
  assert.equal((await service.sendOrderPush(config, 'Pedido novo', 'https://loja.test/pedidos?pedido=1')).success, true);
  assert.equal(payload.url, 'https://loja.test/pedidos?pedido=1');
  assert.equal(payload.priority, 1);
  accepted = false;
  const failed = await service.sendOrderPush(config, 'Novo pedido', 'https://loja.test/pedidos');
  assert.equal(failed.success, false);
  assert.ok(!JSON.stringify(failed).includes('SECRET_RESPONSE'));
  assert.ok(!JSON.stringify(failed).includes('PRIVATE_'));
  assert.equal((await service.sendOrderPush({ ...config, user_key: '' }, '', '')).success, false);
});
test('agendador exige segredo válido e não executa sem autorização', async () => {
  let executed = false;
  const route = load('app/api/admin/order-push/run/route.ts', { 'node:crypto': require('node:crypto'), 'next/server': next,
    '@/lib/server/order-push': { processOrderPush: async () => { executed = true; return { sent: 1 }; } } }, { process: { env: { CRON_SECRET: 'private-cron-test' } } });
  assert.equal((await route.GET(new Request('https://loja.test/api'))).status, 401);
  assert.equal(executed, false);
  assert.equal((await route.GET(new Request('https://loja.test/api', { headers: { Authorization: 'Bearer wrong' } }))).status, 401);
  assert.equal((await route.GET(new Request('https://loja.test/api', { headers: { Authorization: 'Bearer private-cron-test' } }))).status, 200);
  assert.equal(executed, true);
});
