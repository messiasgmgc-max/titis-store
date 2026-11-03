'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Bell, Check, Copy, MapPin, Package, RefreshCw, Search, X } from 'lucide-react';
import { useSession } from '@/providers/SessionProvider';
import { formatBRL } from '@/lib/format';
import { normalizeOrder } from '@/components/admin/admin-utils';
import { Thumb } from '@/components/admin/AdminUI';
import type { OrderRow } from '@/lib/types';
import styles from './OrderCenter.module.css';

type Filter = 'all' | 'prepare' | 'pending' | 'sent';
const normalize = (row: Record<string, unknown>): OrderRow => ({ ...normalizeOrder(row), shipping_address: row.shipping_address });
type PushState = { enabled: boolean; configured: boolean; device: string; recipientIsMe: boolean; hasRecipient: boolean;
  recent: { order_id: string; viewed_at: string | null; last_sent_at: string | null; sent_count: number; last_error: string | null }[] };

const date = (v: string) => new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const pending = (o: OrderRow) => o.status === 'pending' || (o.status === 'novo' && !o.paid_at);
const sent = (o: OrderRow) => !!o.dispatched_at || o.status === 'concluido';
const prepare = (o: OrderRow) => !sent(o) && o.status !== 'cancelado' && (!!o.paid_at || o.status === 'paid');
const label = (o: OrderRow) => o.status === 'cancelado' ? 'Cancelado' : sent(o) ? 'Enviado / concluído' : pending(o) ? 'Aguardando pagamento' : prepare(o) ? 'Pago · Preparar' : 'Em atendimento';
function addressFor(o: OrderRow): Record<string, string> {
  try { const value = typeof o.shipping_address === 'string' ? JSON.parse(o.shipping_address) : o.shipping_address;
    return value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).filter(([, v]) => typeof v === 'string' || typeof v === 'number').map(([k, v]) => [k, String(v)])) : {};
  } catch { return {}; }
}
function addressLines(o: OrderRow) {
  const a = addressFor(o);
  return [[a.street || a.logradouro || a.rua, a.number || a.numero].filter(Boolean).join(', '), a.complement || a.complemento,
    a.neighborhood || a.bairro, [a.city || a.cidade, a.state || a.uf].filter(Boolean).join(' / '),
    a.cep || a.postal_code || a.postalCode || a.zip].filter(Boolean);
}

export function OrderCenter() {
  const { user, profile, isAdmin, loading, accessToken } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get('pedido');
  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent('/pedidos' + (orderId ? `?pedido=${encodeURIComponent(orderId)}` : ''))}`);
  }, [loading, user, router, orderId]);
  if (loading || !user || !profile) return <p className="p-8 text-mist">Verificando acesso…</p>;
  if (!isAdmin) return <main className="p-8"><h1 className="text-2xl">Área exclusiva da administração</h1><p className="mt-4 text-mist">Entre com uma conta da equipe para consultar os pedidos.</p><Link className="mt-6 inline-block text-gold" href="/dashboard">Voltar à minha conta</Link></main>;
  if (!accessToken) return <p className="p-8 text-mist">Restaurando sessão…</p>;
  return <Center token={accessToken} adminName={profile.full_name || user.email || 'Equipe'} orderId={orderId} />;
}

function Center({ token, adminName, orderId }: { token: string; adminName: string; orderId: string | null }) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadedDetail, setDetail] = useState<OrderRow | null>(null);
  const detail = loadedDetail?.id === orderId ? loadedDetail : null;
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [ackError, setAckError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();
  const request = useCallback(async (path: string, body?: unknown) => {
    const res = await fetch(path, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Não foi possível concluir. Tente novamente.');
    return data;
  }, [token]);
  const reload = useCallback(async () => {
    try { const data = await request('/api/admin/order-center'); setOrders(data.orders.map(normalize)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Falha de conexão.'); }
    finally { setBusy(false); }
  }, [request]);
  useEffect(() => { const first = setTimeout(() => void reload(), 0); const timer = setInterval(() => { if (document.visibilityState === 'visible') void reload(); }, 30000); return () => { clearTimeout(first); clearInterval(timer); }; }, [reload]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); }, [notice]);
  // A lista e pré-carregamentos nunca confirmam visualização: somente os detalhes carregados.
  useEffect(() => {
    let cancelled = false;
    if (!orderId) return;
    const fetchDetail = () => request(`/api/admin/order-center?pedido=${encodeURIComponent(orderId)}`).then(data => {
      if (cancelled) return;
      if (!data.orders[0]) throw new Error('Pedido não encontrado.');
      setAckError('');
      setDetail(normalize(data.orders[0]));
    }).catch(e => { if (!cancelled) setAckError(e.message); });
    void fetchDetail();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void fetchDetail(); }, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [orderId, request]);
  const acknowledge = useCallback(async (id: string) => {
    try { await request('/api/admin/order-center', { orderId: id }); setAckError(''); }
    catch (e) { setAckError(e instanceof Error ? e.message : 'Falha ao registrar visualização.'); }
  }, [request]);
  useEffect(() => {
    if (!detail) return;
    const onVisible = () => { if (document.visibilityState === 'visible') void acknowledge(detail.id); };
    onVisible(); document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [detail, acknowledge]);

  const counts = { all: orders.length, prepare: orders.filter(prepare).length, pending: orders.filter(pending).length, sent: orders.filter(sent).length };
  const visible = orders.filter(o => (filter === 'all' || (filter === 'prepare' ? prepare(o) : filter === 'pending' ? pending(o) : sent(o)))
    && `${o.id} ${o.customer_name} ${o.customer_email || ''}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const open = (id: string) => router.push(`/pedidos?pedido=${encodeURIComponent(id)}`, { scroll: false });
  return <div className={styles.center}>
    <header className={styles.header}><Link href="/pedidos" className={styles.brand}>Titi’s Store<small>CENTRAL DE PEDIDOS</small></Link><div className={styles.admin}>{adminName}<Link href="/admin">Administração ↗</Link></div></header>
    <main id="conteudo" className={styles.main}>
      <div className={styles.top}><div><h1>Seus pedidos</h1><p>Tudo pronto para cuidar da próxima entrega.</p></div><button className={styles.button} onClick={() => setSettingsOpen(true)}><Bell size={17} /> Configurar avisos</button></div>
      <div className={styles.stats}><div><b>{counts.prepare}</b><span>Para preparar</span></div><div><b>{counts.pending}</b><span>Aguardando pagamento</span></div><div><b>{counts.sent}</b><span>Enviados / concluídos</span></div></div>
      <div className={styles.toolbar}><label className={styles.search}><Search size={18} /><input aria-label="Buscar cliente ou pedido" placeholder="Buscar cliente ou nº do pedido…" value={search} onChange={e => setSearch(e.target.value)} /></label><button className={styles.button} onClick={() => void reload()} aria-label="Atualizar pedidos"><RefreshCw size={17} /> Atualizar</button></div>
      <div className={styles.filters}>{(['all', 'prepare', 'pending', 'sent'] as Filter[]).map(f => <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{({ all: 'Todos', prepare: 'Para preparar', pending: 'Aguardando', sent: 'Enviados' })[f]} · {counts[f]}</button>)}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={`${styles.layout} ${orderId ? styles.open : ''}`}><div className={styles.list}>
        {busy ? <p>Carregando pedidos…</p> : visible.length === 0 ? <p className={styles.empty}>Nenhum pedido encontrado.</p> : visible.map(o => <button key={o.id} className={`${styles.order} ${orderId === o.id ? styles.selected : ''}`} onClick={() => open(o.id)}>
          {o.id === orders[0]?.id && <div className={styles.latest}>● PEDIDO MAIS RECENTE</div>}
          <div className={styles.row}><small>#{o.id}</small><ArrowUpRight size={16} /></div><strong>{o.customer_name || 'Cliente sem nome'}</strong><small>{date(o.created_at)} · {(o.items || []).reduce((n, i) => n + (i.quantity || 1), 0)} peças</small>
          <div className={styles.row}><span className={`${styles.badge} ${pending(o) ? styles.waiting : ''}`}>{label(o)}</span><b>{formatBRL(o.total_cents || 0)}</b></div>
        </button>)}
        <p className={styles.footnote}>Até 500 pedidos recentes · Atualização a cada 30 segundos.</p>
      </div><div className={styles.detailColumn}>
        <button className={`${styles.button} ${styles.back}`} onClick={() => router.push('/pedidos', { scroll: false })}><ArrowLeft size={17} /> Voltar aos pedidos</button>
        {ackError && <div className={styles.error} role="alert">{ackError}{detail && <button className={styles.button} onClick={() => void acknowledge(detail.id)}>Tentar registrar visualização</button>}</div>}
        {orderId ? detail ? <OrderDetail order={detail} onNotice={setNotice} /> : <p className={styles.empty}>{ackError ? 'Verifique o número do pedido ou volte à lista.' : 'Carregando detalhes…'}</p> : <div className={styles.empty}><Package size={32} /><h2>Escolha um pedido</h2><p>Abra para ver as peças, o pagamento e o endereço de entrega.</p></div>}
      </div></div>
    </main>{notice && <div className={styles.toast} role="status">{notice}</div>}
    {settingsOpen && <PushSettings request={request} onClose={() => setSettingsOpen(false)} />}
  </div>;
}

function OrderDetail({ order: o, onNotice }: { order: OrderRow; onNotice: (s: string) => void }) {
  const lines = addressLines(o);
  const phone = (o.customer_phone || '').replace(/\D/g, '');
  const whatsapp = phone ? `https://wa.me/${phone.length > 11 && phone.startsWith('55') ? phone : `55${phone}`}` : null;
  const shipping = o.shipping_price_cents;
  return <article className={styles.detail} aria-label={`Detalhes do pedido ${o.id}`}>
    <div className={styles.detailHead}><div className={styles.row}><small>PEDIDO #{o.id}</small><span className={`${styles.badge} ${pending(o) ? styles.waiting : ''}`}>{label(o)}</span></div><h2>{o.customer_name || 'Cliente sem nome'}</h2><p>{date(o.created_at)} · {o.channel === 'mercadopago' ? 'Compra pelo site' : o.channel}</p>
      <div className={styles.payment}>{o.status === 'cancelado' ? 'Pedido cancelado.' : pending(o) ? 'Aguardando confirmação de pagamento. Não prepare antes da confirmação.' : o.paid_at || o.status === 'paid' ? '✓ Pagamento confirmado no sistema.' : 'Consulte a situação do pagamento antes de preparar.'}</div></div>
    <section className={styles.section}><h3>O QUE SEPARAR</h3>{(o.items || []).length ? o.items.map((i, n) => <div className={styles.product} key={i.key || n}><Thumb src={i.image} alt={i.name} className={styles.thumb} /><div><b>{i.quantity}× {i.name}</b><small>Tamanho {i.size || '—'} · {i.color || 'Cor não informada'}</small></div><strong>{i.priceCents == null ? 'Sob consulta' : formatBRL(i.priceCents * i.quantity)}</strong></div>) : <p>Sem itens registrados.</p>}</section>
    <section className={styles.section}><h3>ONDE ENTREGAR</h3>{lines.length ? <><address><b>{o.customer_name}</b>{lines.map((line, n) => <span key={n}>{line}</span>)}</address><p>{o.shipping_service_name || 'Serviço de entrega não informado'}</p><div className={styles.actions}><button className={styles.button} onClick={async () => { try { await navigator.clipboard.writeText([o.customer_name, ...lines].join('\n')); onNotice('Endereço copiado.'); } catch { onNotice('Selecione o endereço na tela para copiar.'); } }}><Copy size={16} /> Copiar endereço</button><a className={styles.button} target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lines.join(', '))}`}><MapPin size={16} /> Ver no mapa</a></div></> : <p>Endereço não registrado. Confirme a entrega com o cliente.</p>}</section>
    <section className={styles.section}><h3>CONTATO DO CLIENTE</h3><p>{o.customer_phone || 'Telefone não informado'}<br />{o.customer_email}</p>{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer" className={styles.button}>Conversar no WhatsApp <ArrowUpRight size={16} /></a>}</section>
    <section className={styles.section}><h3>PAGAMENTO E RESUMO</h3><p>{o.payment_method || 'Meio de pagamento não informado'}{o.paid_at && <><br />Confirmado em {date(o.paid_at)}</>}</p><div className={styles.row}><span>Frete</span><span>{shipping == null ? 'Não informado' : shipping === 0 ? 'Grátis' : formatBRL(shipping)}</span></div><div className={`${styles.row} ${styles.total}`}><b>Total</b><b>{formatBRL(o.total_cents || 0)}</b></div>{o.tracking_code && <p>Rastreamento: <b>{o.tracking_code}</b><br />{o.tracking_carrier}</p>}{o.notes && <p className={styles.notes}>{o.notes}</p>}<Link className={styles.button} href="/admin#pedidos">Gerenciar frete e editar no painel <ArrowUpRight size={16} /></Link></section>
  </article>;
}

function PushSettings({ request, onClose }: { request: (url: string, body?: unknown) => Promise<PushState & { success?: boolean }>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [config, setConfig] = useState<PushState | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [userKey, setUserKey] = useState('');
  const [appToken, setAppToken] = useState('');
  const [device, setDevice] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { const data = await request('/api/admin/order-push'); setConfig(data); setEnabled(data.enabled); setDevice(data.device); }, [request]);
  useEffect(() => { dialog.current?.showModal(); const timer = setTimeout(() => { void load().catch(e => setMessage(e.message)); }, 0); return () => clearTimeout(timer); }, [load]);
  const save = async () => { setSaving(true); try { await request('/api/admin/order-push', { enabled, userKey, appToken, device }); setUserKey(''); setAppToken(''); await load(); setMessage('Configuração salva. Novos pedidos seguirão esta regra.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Falha ao salvar.'); } finally { setSaving(false); } };
  return <dialog ref={dialog} className={styles.dialog} onCancel={onClose} onClose={onClose} aria-labelledby="push-title"><div className={styles.row}><h2 id="push-title">Avisos do Titi</h2><button className={styles.button} onClick={onClose} aria-label="Fechar configurações"><X size={18} /></button></div><p>Pushover · Notificações no iPhone</p>
    <div className={styles.payment}><Check size={16} /> Aviso de novo pedido + lembretes de hora em hora, inclusive à noite. Encerram quando a conta vinculada abre os detalhes, ou quando o pedido é cancelado, enviado ou concluído.</div>
    {config && <form onSubmit={e => { e.preventDefault(); void save(); }}><label className={styles.check}><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} /> Ativar avisos</label>
      <p>{config.hasRecipient ? config.recipientIsMe ? 'Esta é a conta vinculada aos avisos.' : 'Outra conta está vinculada. Entre na conta do Titi para alterar.' : 'Salve usando a conta do Titi: ela será vinculada à confirmação de visualização.'}</p>
      <label>Chave do usuário (User Key)<input type="password" value={userKey} autoComplete="off" onChange={e => setUserKey(e.target.value)} placeholder={config.configured ? 'Salva · deixe vazio para manter' : 'Cole a chave do Pushover'} /></label>
      <label>Token do aplicativo<input type="password" value={appToken} autoComplete="off" onChange={e => setAppToken(e.target.value)} placeholder={config.configured ? 'Salvo · deixe vazio para manter' : 'Cole o token do aplicativo'} /></label>
      <label>Dispositivo (opcional)<input value={device} onChange={e => setDevice(e.target.value)} placeholder="Nome do iPhone no Pushover" /></label><p>As chaves ficam no servidor, em tabela privada. O primeiro envio ocorre na próxima execução do agendador. Pedidos antigos não serão notificados ao ativar.</p>
      <button className={`${styles.button} ${styles.primary}`} disabled={saving || (config.hasRecipient && !config.recipientIsMe)}>{saving ? 'Salvando…' : 'Salvar configuração'}</button></form>}
    {message && <p role="status" className={styles.feedback}>{message}</p>}
    {config?.configured && <button disabled={saving} className={styles.button} onClick={async () => { setSaving(true); try { await request('/api/admin/order-push', { action: 'test' }); setMessage('Teste aceito pelo Pushover. Verifique o iPhone.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Falha no teste.'); } finally { setSaving(false); } }}>Enviar notificação de teste</button>}
    {!!config?.recent.length && <section><h3>ÚLTIMOS AVISOS</h3>{config.recent.map(r => <p key={r.order_id}>#{r.order_id}<br />{r.viewed_at ? `Visualizado em ${date(r.viewed_at)}` : r.last_sent_at ? `Último envio: ${date(r.last_sent_at)} · ${r.sent_count} avisos` : 'Aguardando primeiro envio'}{r.last_error && <><br /><span className={styles.error}>{r.last_error}</span></>}</p>)}</section>}
  </dialog>;
}
