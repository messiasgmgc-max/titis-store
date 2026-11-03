// npm install --no-save @electric-sql/pglite (ou PGLITE_MODULE apontando para instalação temporária)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');

test('fila de pedidos: proteção, reserva, intervalo e confirmação por destinatário', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create table public.profiles(id uuid primary key, role text);
      create table public.orders(id text primary key, channel text, status text, dispatched_at timestamptz);
      insert into auth.users values ('11111111-1111-1111-1111-111111111111'),('22222222-2222-2222-2222-222222222222');
      insert into profiles values ('11111111-1111-1111-1111-111111111111','admin');`);
    const sql = fs.readFileSync(path.join(__dirname, '../supabase/order_push_reminders.sql'), 'utf8');
    await db.exec(sql);
    await db.exec(sql); // Migração repetível.
    const rows = async sql => (await db.query(sql)).rows;
    await db.exec(`insert into orders values ('old','online','pending',null);
      update order_push_settings set enabled=true,recipient_user_id='11111111-1111-1111-1111-111111111111';
      insert into orders values ('new','mercadopago','paid',null),('cancel','online','cancelado',null),('pdv','pdv','paid',null);`);
    assert.deepEqual((await rows('select order_id from order_push_reminders')).map(r => r.order_id), ['new']);
    assert.equal((await rows('select * from claim_order_push(5)')).length, 1);
    assert.equal((await rows('select * from claim_order_push(5)')).length, 0, 'reserva evita envio concorrente');
    await db.exec(`update order_push_reminders set locked_until=null,next_send_at=now()+interval '1 hour',sent_count=1;`);
    assert.equal((await rows('select * from claim_order_push(5)')).length, 0, 'aguarda hora seguinte');
    await db.exec(`update order_push_reminders set next_send_at=now()-interval '1 second';
      update order_push_reminders set viewed_at=now() where recipient_user_id='22222222-2222-2222-2222-222222222222';`);
    assert.equal((await rows('select * from claim_order_push(5)')).length, 1, 'outro admin não confirma o Titi');
    await db.exec(`update order_push_reminders set viewed_at=now(),locked_until=null;`);
    assert.equal((await rows('select * from claim_order_push(5)')).length, 0, 'visualizado encerra lembretes');
    await db.exec(`insert into orders values ('later-cancel','online','pending',null),('sent','online','paid',null);
      update orders set status='cancelado' where id='later-cancel'; update orders set dispatched_at=now() where id='sent';`);
    assert.equal((await rows('select * from claim_order_push(5)')).length, 0, 'cancelado e enviado não notificam');
    await db.exec(`insert into orders values ('demoted','online','paid',null); update profiles set role='client';`);
    assert.equal((await rows('select * from claim_order_push(5)')).length, 0, 'destinatário sem papel admin não recebe');
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(() => db.query('select * from order_push_settings'), /permission denied/);
      await assert.rejects(() => db.query('select * from order_push_reminders'), /permission denied/);
      await assert.rejects(() => db.query('select * from claim_order_push(5)'), /permission denied/);
      await db.exec('reset role');
    }
  } finally { await db.close(); }
});
