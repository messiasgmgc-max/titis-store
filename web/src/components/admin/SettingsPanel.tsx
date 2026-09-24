'use client';

import { useMemo, useState } from 'react';
import { 
  CreditCard, 
  Megaphone, 
  MessageCircle, 
  Tags, 
  Truck, 
  Key, 
  ShieldCheck, 
  Radio, 
  Send,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Download,
  Database,
  Code2,
  RefreshCw,
  Terminal,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUI } from '@/providers/UIProvider';
import { supabase } from '@/lib/supabaseClient';
import { cn, formatBRL } from '@/lib/format';
import { 
  normalizeWhatsappNumber, 
  parseSettings, 
  settingsToRows, 
  type SettingKey, 
  type SettingRow, 
  type SiteSettings,
  type ShippingSetting,
  type PaymentsSetting,
  type NotificationsSetting,
} from '@/lib/settings';
import { CHECKOUT_PROVIDER, CLUB_PLANS } from '@/lib/site';
import type { CheckoutProvider, PlanId } from '@/lib/types';
import { ErrorState, Field, InlineError, LoadingRows, PillOption, RefreshButton, SectionLabel, Switch } from './AdminUI';
import { centsToInput, describeError, displayPhone, formatShortDateBR, parsePriceToCents } from './admin-utils';
import type { Resource } from './useAdminData';
import { getAdminEnvStatusAction, testNtfyAction } from '@/app/admin/actions';

type IconComponent = React.ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>;

/** Campos de texto dos planos (preço em reais, dias), separados do valor gravado. */
interface PlanDraft {
  price: string;
  days: string;
  active: boolean;
}

const DIGITAL_PLANS = CLUB_PLANS.filter((p) => p.accessDays !== null);

function planDrafts(settings: SiteSettings): Record<PlanId, PlanDraft> {
  const out = {} as Record<PlanId, PlanDraft>;
  for (const p of CLUB_PLANS) {
    const s = settings.plans[p.id];
    out[p.id] = { price: centsToInput(s.price_cents), days: s.access_days === null ? '' : String(s.access_days), active: s.active };
  }
  return out;
}

/** Configurações do site gravadas em public.settings, uma chave por bloco. */
export function SettingsPanel({ resource }: { resource: Resource<SettingRow> }) {
  const { data: rows, loading, refreshing, error, reload, setData } = resource;
  const { toast } = useUI();

  const saved = useMemo(() => parseSettings(rows), [rows]);
  const updatedAt = useMemo(() => {
    const map = new Map<SettingKey, string | null>();
    rows.forEach((r) => map.set(r.key, r.updated_at));
    return map;
  }, [rows]);

  // Estados locais para edição
  const [whatsapp, setWhatsapp] = useState(saved.whatsapp.number);
  const [checkoutProvider, setCheckoutProvider] = useState<CheckoutProvider>(saved.checkout.provider);
  const [plans, setPlans] = useState<Record<PlanId, PlanDraft>>(() => planDrafts(saved));
  const [announcement, setAnnouncement] = useState(saved.announcement);
  const [shipping, setShipping] = useState<ShippingSetting>(saved.shipping);
  const [payments, setPayments] = useState<PaymentsSetting>(saved.payments);
  const [notifications, setNotifications] = useState<NotificationsSetting>(saved.notifications);

  const [savingKey, setSavingKey] = useState<SettingKey | null>(null);
  const [planErrors, setPlanErrors] = useState<Partial<Record<PlanId, string>>>({});
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [testingNtfy, setTestingNtfy] = useState(false);

  // Estados do Diagnóstico e Descoberta de Chaves Vercel
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredSql, setDiscoveredSql] = useState<string | null>(null);
  const [discoveredEnv, setDiscoveredEnv] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Sincroniza rascunhos quando o banco chega
  const [syncedFrom, setSyncedFrom] = useState(saved);
  if (syncedFrom !== saved) {
    setSyncedFrom(saved);
    setWhatsapp(saved.whatsapp.number);
    setCheckoutProvider(saved.checkout.provider);
    setPlans(planDrafts(saved));
    setAnnouncement(saved.announcement);
    setShipping(saved.shipping);
    setPayments(saved.payments);
    setNotifications(saved.notifications);
  }

  const toggleTokenVisibility = (key: string) => {
    setShowTokens((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const persist = async (key: SettingKey, next: SiteSettings, message: string) => {
    if (savingKey) return;
    const row = settingsToRows(next).find((r) => r.key === key);
    if (!row) return;
    setSavingKey(key);
    try {
      const { data, error: upsertError } = await supabase
        .from('settings')
        .upsert({ key, value: row.value }, { onConflict: 'key' })
        .select('key, value, updated_at')
        .single();
      if (upsertError) throw upsertError;
      const savedRow = (data ?? {}) as Record<string, unknown>;
      const updated: SettingRow = {
        key,
        value: row.value,
        updated_at: typeof savedRow.updated_at === 'string' ? savedRow.updated_at : new Date().toISOString(),
      };
      setData((list) => (list.some((r) => r.key === key) ? list.map((r) => (r.key === key ? updated : r)) : [...list, updated]));
      toast(message, 'success');
    } catch (err) {
      toast(describeError(err, 'Não foi possível salvar a configuração.'), 'error');
    } finally {
      setSavingKey(null);
    }
  };

  // Salvar Frete & Logística (SuperFrete / Melhor Envio)
  const saveShipping = () => {
    void persist('shipping', { ...saved, shipping }, 'Configurações de frete e API salvas com sucesso!');
  };

  // Salvar Pagamentos (Mercado Pago)
  const savePayments = () => {
    void persist('payments', { ...saved, payments }, 'Chaves de API do Mercado Pago salvas com sucesso!');
  };

  // Salvar Notificações (WhatsApp & ntfy.sh)
  const saveNotifications = () => {
    void persist('notifications', { ...saved, notifications }, 'Configurações de notificações e ntfy salvas com sucesso!');
  };

  const handleTestNtfy = async () => {
    setTestingNtfy(true);
    try {
      const res = await testNtfyAction({
        serverUrl: notifications.ntfy_server_url,
        topic: notifications.ntfy_topic,
        token: notifications.ntfy_token,
      });
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('Erro de rede ao testar notificação ntfy.', 'error');
    } finally {
      setTestingNtfy(false);
    }
  };

  // Salvar WhatsApp
  const saveWhatsapp = () => {
    const number = normalizeWhatsappNumber(whatsapp);
    if (!number) {
      toast('Informe o número com DDI e DDD, só dígitos (ex.: 5531996000213).', 'error');
      return;
    }
    setWhatsapp(number);
    void persist('whatsapp', { ...saved, whatsapp: { number } }, 'WhatsApp da loja atualizado.');
  };

  // Salvar Checkout Provider
  const saveCheckout = () => void persist('checkout', { ...saved, checkout: { provider: checkoutProvider } }, 'Provedor de checkout atualizado.');

  // Salvar Planos
  const savePlans = () => {
    const errors: Partial<Record<PlanId, string>> = {};
    const next: SiteSettings['plans'] = { ...saved.plans };
    for (const p of CLUB_PLANS) {
      const d = plans[p.id];
      if (p.accessDays === null) {
        next[p.id] = { ...saved.plans[p.id], active: d.active };
        continue;
      }
      const cents = parsePriceToCents(d.price);
      if (cents === undefined || cents === null || cents <= 0) {
        errors[p.id] = 'Informe um preço válido, maior que zero.';
        continue;
      }
      const days = Number(d.days);
      if (!Number.isInteger(days) || days < 1 || days > 3660) {
        errors[p.id] = 'Informe de 1 a 3660 dias de acesso.';
        continue;
      }
      next[p.id] = { price_cents: cents, access_days: days, active: d.active };
    }
    setPlanErrors(errors);
    if (Object.keys(errors).length > 0) return;
    void persist('plans', { ...saved, plans: next }, 'Planos atualizados.');
  };

  // Salvar Anúncio
  const saveAnnouncement = () => {
    const text = announcement.text.trim().slice(0, 280);
    if (announcement.active && !text) {
      toast('Escreva o aviso antes de ativá-lo.', 'error');
      return;
    }
    void persist('announcement', { ...saved, announcement: { text, active: announcement.active } }, 'Aviso do site atualizado.');
  };

  // Descobrir chaves ativas na memória da Vercel e gerar SQL
  const discoverVercelKeys = async () => {
    setIsDiscovering(true);
    try {
      let data: any = null;

      // 1. Tenta prioritariamente via Server Action nativa (imune a erros de proxy ou 404 de rotas)
      try {
        const actionRes = await getAdminEnvStatusAction();
        if (actionRes?.success) {
          data = actionRes;
        }
      } catch (actionErr) {
        console.warn('[SettingsPanel] Server action falhou, recorrendo a HTTP:', actionErr);
      }

      // 2. Se a action falhou, recorre à rota HTTP /api/admin/env-status
      if (!data) {
        const res = await fetch('/api/admin/env-status?include_values=true');
        if (!res.ok) throw new Error(`Status ${res.status}`);
        data = await res.json();
      }

      if (data.sqlScript) {
        setDiscoveredSql(data.sqlScript);
      }
      if (data.envFile) {
        setDiscoveredEnv(data.envFile);
      }
      if (data.unmaskedValues) {
        if (data.unmaskedValues.shipping) {
          setShipping((prev) => ({
            ...prev,
            ...data.unmaskedValues.shipping,
            superfrete_token: data.unmaskedValues.shipping.superfrete_token || prev.superfrete_token,
            melhorenvio_token: data.unmaskedValues.shipping.melhorenvio_token || prev.melhorenvio_token,
          }));
        }
        if (data.unmaskedValues.payments) {
          setPayments((prev) => ({
            ...prev,
            ...data.unmaskedValues.payments,
            mercadopago_access_token: data.unmaskedValues.payments.mercadopago_access_token || prev.mercadopago_access_token,
            mercadopago_public_key: data.unmaskedValues.payments.mercadopago_public_key || prev.mercadopago_public_key,
            mercadopago_webhook_secret: data.unmaskedValues.payments.mercadopago_webhook_secret || prev.mercadopago_webhook_secret,
          }));
        }
        if (data.unmaskedValues.notifications) {
          setNotifications((prev) => ({
            ...prev,
            ...data.unmaskedValues.notifications,
            evolution_api_url: data.unmaskedValues.notifications.evolution_api_url || prev.evolution_api_url,
            evolution_api_key: data.unmaskedValues.notifications.evolution_api_key || prev.evolution_api_key,
            ntfy_topic: data.unmaskedValues.notifications.ntfy_topic || prev.ntfy_topic,
            ntfy_server_url: data.unmaskedValues.notifications.ntfy_server_url || prev.ntfy_server_url,
          }));
        }
      }
      toast('Chaves do servidor lidas com sucesso! O formulário foi preenchido e o SQL gerado.', 'success');
    } catch (err) {
      toast(describeError(err, 'Erro ao consultar variáveis do servidor.'), 'error');
    } finally {
      setIsDiscovering(false);
    }
  };

  const copySqlToClipboard = async () => {
    if (!discoveredSql) return;
    try {
      await navigator.clipboard.writeText(discoveredSql);
      setCopiedSql(true);
      toast('SQL copiado com sucesso! Cole no SQL Editor do Supabase.', 'success');
      setTimeout(() => setCopiedSql(false), 3000);
    } catch {
      toast('Não foi possível copiar automaticamente. Selecione e copie o texto.', 'error');
    }
  };

  const downloadEnvFile = () => {
    if (!discoveredEnv) return;
    const blob = new Blob([discoveredEnv], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '.env';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast('Arquivo .env baixado com sucesso!', 'success');
  };

  const syncDirectlyToSupabase = async () => {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    try {
      const rowsToUpsert = settingsToRows({
        ...saved,
        shipping,
        payments,
        notifications,
        whatsapp: { number: whatsapp },
        checkout: { provider: checkoutProvider },
      });

      for (const row of rowsToUpsert) {
        const { error: upsertErr } = await supabase
          .from('settings')
          .upsert({ key: row.key, value: row.value }, { onConflict: 'key' });
        if (upsertErr) throw upsertErr;
      }

      await reload();
      toast('Todas as configurações e chaves foram gravadas com sucesso no Supabase!', 'success');
    } catch (err) {
      toast(describeError(err, 'Erro ao salvar configurações no Supabase.'), 'error');
    } finally {
      setIsSyncingAll(false);
    }
  };

  const stamp = (key: SettingKey) => {
    const at = updatedAt.get(key);
    return at ? `Salvo em ${formatShortDateBR(at)}` : 'Padrão (banco/env)';
  };

  const shippingDirty = JSON.stringify(shipping) !== JSON.stringify(saved.shipping);
  const paymentsDirty = JSON.stringify(payments) !== JSON.stringify(saved.payments);
  const notificationsDirty = JSON.stringify(notifications) !== JSON.stringify(saved.notifications);
  const whatsappDirty = whatsapp !== saved.whatsapp.number;
  const checkoutDirty = checkoutProvider !== saved.checkout.provider;
  const plansDirty = JSON.stringify(plans) !== JSON.stringify(planDrafts(saved));
  const announcementDirty = announcement.text !== saved.announcement.text || announcement.active !== saved.announcement.active;

  let body: React.ReactNode;
  if (loading) {
    body = <LoadingRows rows={6} label="Carregando configurações do Supabase..." />;
  } else if (error && rows.length === 0) {
    body = <ErrorState message={error} onRetry={() => void reload()} retrying={refreshing} />;
  } else {
    body = (
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 🛠️ Sincronizador & Exportador de Chaves da Vercel / Supabase ------- */}
        <div className="lg:col-span-2 rounded-3xl border border-gold/40 bg-gradient-to-br from-gold/[0.08] via-obsidian-surface/80 to-obsidian-card p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-gold/20 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/20 text-gold border border-gold/40">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-ivory flex items-center gap-2">
                  Diagnóstico de Chaves & Gerador SQL Supabase
                </h3>
                <p className="text-xs text-mist">
                  Descubra as variáveis da Vercel em execução e gere o script SQL com 1 clique para gravar tudo no Supabase.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={discoverVercelKeys}
                loading={isDiscovering}
                className="bg-gold text-obsidian font-bold text-xs shadow-md hover:bg-gold-light flex items-center gap-2"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isDiscovering && 'animate-spin')} />
                {isDiscovering ? 'Consultando Vercel...' : '🔍 Descobrir Chaves Ativas'}
              </Button>

              {discoveredSql && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={syncDirectlyToSupabase}
                  loading={isSyncingAll}
                  className="border-gold/60 text-gold hover:bg-gold/15 text-xs font-semibold flex items-center gap-2"
                >
                  <Database className="h-3.5 w-3.5" />
                  ⚡ Gravar Tudo no Supabase Agora
                </Button>
              )}
            </div>
          </div>

          {discoveredSql && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-obsidian/60 px-4 py-3 rounded-2xl border border-line">
                <span className="text-xs text-smoke font-mono flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-gold" /> Script SQL Pronto para Supabase
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copySqlToClipboard}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gold/15 hover:bg-gold/25 px-3 py-1.5 text-xs font-semibold text-gold border border-gold/30 transition-colors"
                  >
                    {copiedSql ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedSql ? 'Copiado!' : 'Copiar SQL'}
                  </button>

                  <button
                    type="button"
                    onClick={downloadEnvFile}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-line/40 hover:bg-line/70 px-3 py-1.5 text-xs font-semibold text-ivory border border-line transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-mist" />
                    Baixar .env Restaurado
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl bg-obsidian border border-line p-4 overflow-x-auto max-h-60 scrollbar-thin">
                <pre className="text-[11px] font-mono leading-relaxed text-mist select-all">
                  {discoveredSql}
                </pre>
              </div>

              <p className="text-[11px] text-mist/80 leading-relaxed">
                💡 <strong className="text-gold">Dica:</strong> Seus campos abaixo foram automaticamente preenchidos com as chaves encontradas. Você pode salvar cada bloco individualmente ou clicar em <strong className="text-ivory">⚡ Gravar Tudo no Supabase Agora</strong> para sincronizar o banco instantaneamente.
              </p>
            </div>
          )}
        </div>

        {/* 🚚 Frete & Envio (SuperFrete / Melhor Envio) ------------------- */}
        <SettingsCard icon={Truck} title="Envio & Logística de Frete" stamp={stamp('shipping')} className="lg:col-span-2">
          <div className="space-y-6">
            <div>
              <p className="label text-xs uppercase tracking-wider text-mist">Provedor de Envio Ativo</p>
              <div role="group" aria-label="Provedor de frete" className="mt-2.5 flex flex-wrap gap-3">
                <PillOption
                  active={shipping.provider === 'superfrete'}
                  onClick={() => setShipping((s) => ({ ...s, provider: 'superfrete' }))}
                >
                  <span className="flex items-center gap-2">
                    <Radio className={cn('h-3.5 w-3.5', shipping.provider === 'superfrete' ? 'text-gold' : 'text-smoke')} />
                    <strong>SuperFrete</strong> (Correios & Jadlog com desconto)
                  </span>
                </PillOption>
                <PillOption
                  active={shipping.provider === 'melhorenvio'}
                  onClick={() => setShipping((s) => ({ ...s, provider: 'melhorenvio' }))}
                >
                  <span className="flex items-center gap-2">
                    <Radio className={cn('h-3.5 w-3.5', shipping.provider === 'melhorenvio' ? 'text-gold' : 'text-smoke')} />
                    <strong>Melhor Envio</strong> (Correios, Jadlog, Loggi)
                  </span>
                </PillOption>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Bloco SuperFrete */}
              <div className={cn('rounded-3xl border p-5 transition-all', shipping.provider === 'superfrete' ? 'border-gold/50 bg-gold/[0.02]' : 'border-line opacity-80')}>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-ivory flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gold" /> Chaves SuperFrete
                  </h4>
                  {shipping.provider === 'superfrete' && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">Ativo</span>
                  )}
                </div>

                <div className="mt-4 space-y-4">
                  <Field label="Token da API (Bearer)" htmlFor="cfg-sf-token">
                    <div className="relative">
                      <input
                        id="cfg-sf-token"
                        type={showTokens['sf'] ? 'text' : 'password'}
                        value={shipping.superfrete_token}
                        onChange={(e) => setShipping((s) => ({ ...s, superfrete_token: e.target.value }))}
                        placeholder="Insira o token oficial da SuperFrete..."
                        className="field rounded-2xl pr-10 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility('sf')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-ivory"
                      >
                        {showTokens['sf'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  <Field label="CEP de Origem (Remetente)" htmlFor="cfg-sf-cep" hint="Apenas dígitos. Padrão: 30130000 (Belo Horizonte / MG)">
                    <input
                      id="cfg-sf-cep"
                      value={shipping.superfrete_origin_cep}
                      onChange={(e) => setShipping((s) => ({ ...s, superfrete_origin_cep: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                      placeholder="30130000"
                      className="field rounded-2xl tabular-nums text-xs"
                    />
                  </Field>

                  <div className="flex items-center justify-between rounded-2xl border border-line p-3">
                    <span className="text-xs text-smoke">Ambiente Sandbox (Testes)</span>
                    <Switch
                      checked={shipping.superfrete_sandbox}
                      onChange={(val) => setShipping((s) => ({ ...s, superfrete_sandbox: val }))}
                      label="SuperFrete Sandbox"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco Melhor Envio */}
              <div className={cn('rounded-3xl border p-5 transition-all', shipping.provider === 'melhorenvio' ? 'border-gold/50 bg-gold/[0.02]' : 'border-line opacity-80')}>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-ivory flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gold" /> Chaves Melhor Envio
                  </h4>
                  {shipping.provider === 'melhorenvio' && (
                    <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">Ativo</span>
                  )}
                </div>

                <div className="mt-4 space-y-4">
                  <Field label="Token de Acesso (Bearer)" htmlFor="cfg-me-token">
                    <div className="relative">
                      <input
                        id="cfg-me-token"
                        type={showTokens['me'] ? 'text' : 'password'}
                        value={shipping.melhorenvio_token}
                        onChange={(e) => setShipping((s) => ({ ...s, melhorenvio_token: e.target.value }))}
                        placeholder="Insira o Bearer Token do Melhor Envio..."
                        className="field rounded-2xl pr-10 font-mono text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => toggleTokenVisibility('me')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-ivory"
                      >
                        {showTokens['me'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>

                  <Field label="CEP de Origem (Remetente)" htmlFor="cfg-me-cep" hint="Apenas dígitos. Padrão: 30130000">
                    <input
                      id="cfg-me-cep"
                      value={shipping.melhorenvio_origin_cep}
                      onChange={(e) => setShipping((s) => ({ ...s, melhorenvio_origin_cep: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                      placeholder="30130000"
                      className="field rounded-2xl tabular-nums text-xs"
                    />
                  </Field>

                  <div className="flex items-center justify-between rounded-2xl border border-line p-3">
                    <span className="text-xs text-smoke">Ambiente Sandbox (Testes)</span>
                    <Switch
                      checked={shipping.melhorenvio_sandbox}
                      onChange={(val) => setShipping((s) => ({ ...s, melhorenvio_sandbox: val }))}
                      label="Melhor Envio Sandbox"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <SaveRow dirty={shippingDirty} busy={savingKey === 'shipping'} onSave={saveShipping} />
        </SettingsCard>

        {/* 💳 Mercado Pago & Pagamentos ----------------------------------- */}
        <SettingsCard icon={CreditCard} title="Mercado Pago (Cartão & Pix)" stamp={stamp('payments')} className="lg:col-span-2">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Access Token (Produção ou Teste)" htmlFor="cfg-mp-token">
                <div className="relative">
                  <input
                    id="cfg-mp-token"
                    type={showTokens['mp'] ? 'text' : 'password'}
                    value={payments.mercadopago_access_token}
                    onChange={(e) => setPayments((p) => ({ ...p, mercadopago_access_token: e.target.value }))}
                    placeholder="APP_USR-xxxxxxxx..."
                    className="field rounded-2xl pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => toggleTokenVisibility('mp')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-ivory"
                  >
                    {showTokens['mp'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Public Key (Chave Pública)" htmlFor="cfg-mp-pub">
                <input
                  id="cfg-mp-pub"
                  value={payments.mercadopago_public_key}
                  onChange={(e) => setPayments((p) => ({ ...p, mercadopago_public_key: e.target.value }))}
                  placeholder="APP_USR-xxxxxxxx..."
                  className="field rounded-2xl font-mono text-xs"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2 items-center">
              <Field label="Webhook Secret (Opcional)" htmlFor="cfg-mp-wh">
                <input
                  id="cfg-mp-wh"
                  type="password"
                  value={payments.mercadopago_webhook_secret}
                  onChange={(e) => setPayments((p) => ({ ...p, mercadopago_webhook_secret: e.target.value }))}
                  placeholder="Assinatura de validação IPN..."
                  className="field rounded-2xl font-mono text-xs"
                />
              </Field>

              <div className="flex items-center justify-between rounded-2xl border border-line p-3 mt-4 md:mt-0">
                <span className="text-xs text-smoke">Modo Sandbox / Credenciais de Teste</span>
                <Switch
                  checked={payments.mercadopago_sandbox}
                  onChange={(val) => setPayments((p) => ({ ...p, mercadopago_sandbox: val }))}
                  label="Mercado Pago Sandbox"
                />
              </div>
            </div>
          </div>
          <SaveRow dirty={paymentsDirty} busy={savingKey === 'payments'} onSave={savePayments} />
        </SettingsCard>

        {/* 💬 WhatsApp & Evolution API (Notificações) --------------------- */}
        <SettingsCard icon={MessageCircle} title="Evolution API (WhatsApp Automático)" stamp={stamp('notifications')} className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="URL da API Evolution" htmlFor="cfg-evo-url" hint="Ex: https://api.meuservidor.com">
              <input
                id="cfg-evo-url"
                value={notifications.evolution_api_url}
                onChange={(e) => setNotifications((n) => ({ ...n, evolution_api_url: e.target.value }))}
                placeholder="https://api.seuservidor.com"
                className="field rounded-2xl text-xs"
              />
            </Field>

            <Field label="API Key (Chave Global/Instância)" htmlFor="cfg-evo-key">
              <div className="relative">
                <input
                  id="cfg-evo-key"
                  type={showTokens['evo'] ? 'text' : 'password'}
                  value={notifications.evolution_api_key}
                  onChange={(e) => setNotifications((n) => ({ ...n, evolution_api_key: e.target.value }))}
                  placeholder="Sua API Key da Evolution..."
                  className="field rounded-2xl pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => toggleTokenVisibility('evo')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-ivory"
                >
                  {showTokens['evo'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Field label="Nome da Instância" htmlFor="cfg-evo-inst" hint="Padrão: titis-store">
              <input
                id="cfg-evo-inst"
                value={notifications.evolution_instance_name}
                onChange={(e) => setNotifications((n) => ({ ...n, evolution_instance_name: e.target.value }))}
                placeholder="titis-store"
                className="field rounded-2xl text-xs"
              />
            </Field>
          </div>
          <SaveRow dirty={notificationsDirty} busy={savingKey === 'notifications'} onSave={saveNotifications} />
        </SettingsCard>

        {/* 🔔 Alertas Push no Celular (ntfy.sh) --------------------------- */}
        <SettingsCard icon={Bell} title="Alertas Push no Celular em Tempo Real (ntfy.sh)" stamp={stamp('notifications')} className="lg:col-span-2">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-line p-4 bg-surface/40">
              <div>
                <p className="text-sm font-semibold text-ivory">Notificações Push Instantâneas</p>
                <p className="text-xs text-mist">
                  Receba alertas sonoros no seu smartphone a cada venda aprovada, Pix gerado ou assinatura realizada na loja.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestNtfy}
                  loading={testingNtfy}
                  disabled={!notifications.ntfy_topic}
                  className="text-xs border-gold/40 text-gold hover:bg-gold/10"
                >
                  Testar Notificação Push
                </Button>
                <Switch
                  checked={notifications.ntfy_enabled}
                  onChange={(val) => setNotifications((n) => ({ ...n, ntfy_enabled: val }))}
                  label="Habilitar Alertas"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Nome do Tópico ntfy" htmlFor="cfg-ntfy-topic" hint="Ex: titis-store-vendas (use letras minúsculas e hífen)">
                <input
                  id="cfg-ntfy-topic"
                  value={notifications.ntfy_topic}
                  onChange={(e) => setNotifications((n) => ({ ...n, ntfy_topic: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
                  placeholder="titis-store-vendas"
                  className="field rounded-2xl text-xs font-mono"
                />
              </Field>

              <Field label="Servidor ntfy" htmlFor="cfg-ntfy-url" hint="Padrão público gratuito: https://ntfy.sh">
                <input
                  id="cfg-ntfy-url"
                  value={notifications.ntfy_server_url}
                  onChange={(e) => setNotifications((n) => ({ ...n, ntfy_server_url: e.target.value }))}
                  placeholder="https://ntfy.sh"
                  className="field rounded-2xl text-xs"
                />
              </Field>

              <Field label="Token de Acesso (Opcional)" htmlFor="cfg-ntfy-token" hint="Apenas se usar tópico protegido ou privado">
                <div className="relative">
                  <input
                    id="cfg-ntfy-token"
                    type={showTokens['ntfy'] ? 'text' : 'password'}
                    value={notifications.ntfy_token}
                    onChange={(e) => setNotifications((n) => ({ ...n, ntfy_token: e.target.value }))}
                    placeholder="tk_xxxxxxxx (opcional)"
                    className="field rounded-2xl pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => toggleTokenVisibility('ntfy')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-ivory"
                  >
                    {showTokens['ntfy'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </div>

            {/* Guia visual de configuração rápida no smartphone */}
            <div className="rounded-2xl border border-gold/20 bg-gold/[0.03] p-4 text-xs space-y-2 text-smoke">
              <p className="font-semibold text-ivory flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-gold" /> Como receber os alertas de vendas no seu celular em 1 minuto:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-mist pl-1">
                <li>Baixe o aplicativo oficial e gratuito <strong>ntfy</strong> na <strong>App Store (iPhone)</strong> ou <strong>Google Play Store (Android)</strong>.</li>
                <li>Abra o aplicativo ntfy no celular e toque no botão <strong>+</strong> (Inscrever-se no tópico).</li>
                <li>Digite o nome do tópico configurado acima (ex.: <code className="text-gold font-mono font-bold">{notifications.ntfy_topic || 'titis-store-vendas'}</code>) e clique em Inscrever-se.</li>
                <li>Clique no botão <strong>&quot;Testar Notificação Push&quot;</strong> acima para confirmar que o celular toca e vibra instantaneamente!</li>
              </ol>
            </div>
          </div>
          <SaveRow dirty={notificationsDirty} busy={savingKey === 'notifications'} onSave={saveNotifications} />
        </SettingsCard>

        {/* WhatsApp da Loja ----------------------------------------------- */}
        <SettingsCard icon={MessageCircle} title="WhatsApp de Contato da Loja" stamp={stamp('whatsapp')}>
          <Field label="Número Principal" htmlFor="cfg-whatsapp" hint={`Exibido no site como ${displayPhone(whatsapp) || '—'}.`}>
            <input
              id="cfg-whatsapp"
              inputMode="numeric"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 15))}
              placeholder="5531996000213"
              className="field rounded-2xl tabular-nums text-sm"
            />
          </Field>
          <SaveRow dirty={whatsappDirty} busy={savingKey === 'whatsapp'} onSave={saveWhatsapp} />
        </SettingsCard>

        {/* Provedor de Checkout ------------------------------------------- */}
        <SettingsCard icon={CreditCard} title="Método de Checkout da Loja" stamp={stamp('checkout')}>
          <p className="label">Como a compra é finalizada</p>
          <div role="group" aria-label="Provedor de checkout" className="mt-2 flex flex-wrap gap-2">
            <PillOption active={checkoutProvider === 'whatsapp'} onClick={() => setCheckoutProvider('whatsapp')}>
              WhatsApp · liberação manual
            </PillOption>
            <PillOption active={checkoutProvider === 'mercadopago'} onClick={() => setCheckoutProvider('mercadopago')}>
              Mercado Pago · automático
            </PillOption>
          </div>
          <SaveRow dirty={checkoutDirty} busy={savingKey === 'checkout'} onSave={saveCheckout} />
        </SettingsCard>

        {/* Planos --------------------------------------------------------- */}
        <SettingsCard icon={Tags} title="Planos da Consultoria" stamp={stamp('plans')} className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-3">
            {DIGITAL_PLANS.map((p) => {
              const d = plans[p.id];
              const err = planErrors[p.id];
              return (
                <div key={p.id} className={cn('rounded-2xl border px-4 py-4', d.active ? 'border-line' : 'border-line opacity-70')}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-ivory">{p.name}</p>
                    <Switch checked={d.active} onChange={(next) => setPlans((s) => ({ ...s, [p.id]: { ...s[p.id], active: next } }))} label={`${p.name} ativo`} />
                  </div>
                  <Field label="Preço (R$)" htmlFor={`cfg-preco-${p.id}`} className="mt-3" error={err}>
                    <input
                      id={`cfg-preco-${p.id}`}
                      inputMode="decimal"
                      value={d.price}
                      onChange={(e) => setPlans((s) => ({ ...s, [p.id]: { ...s[p.id], price: e.target.value } }))}
                      className="field rounded-2xl py-2.5 text-sm tabular-nums"
                    />
                  </Field>
                  <Field label="Dias de acesso" htmlFor={`cfg-dias-${p.id}`} className="mt-3">
                    <input
                      id={`cfg-dias-${p.id}`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={3660}
                      value={d.days}
                      onChange={(e) => setPlans((s) => ({ ...s, [p.id]: { ...s[p.id], days: e.target.value } }))}
                      className="field rounded-2xl py-2.5 text-sm tabular-nums"
                    />
                  </Field>
                  <p className="mt-2 text-xs text-smoke">
                    Salvo: {formatBRL(saved.plans[p.id].price_cents)} · {saved.plans[p.id].access_days ?? '—'} dias
                  </p>
                </div>
              );
            })}
            {CLUB_PLANS.filter((p) => p.accessDays === null).map((p) => (
              <div key={p.id} className={cn('rounded-2xl border border-line px-4 py-4', !plans[p.id].active && 'opacity-70')}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ivory">{p.name}</p>
                  <Switch
                    checked={plans[p.id].active}
                    onChange={(next) => setPlans((s) => ({ ...s, [p.id]: { ...s[p.id], active: next } }))}
                    label={`${p.name} ativo`}
                  />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-smoke">Sob consulta, agendado pelo WhatsApp.</p>
              </div>
            ))}
          </div>
          <SaveRow dirty={plansDirty} busy={savingKey === 'plans'} onSave={savePlans} />
        </SettingsCard>

        {/* Aviso ----------------------------------------------------------- */}
        <SettingsCard icon={Megaphone} title="Aviso no Topo do Site" stamp={stamp('announcement')} className="lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
            <Field label="Texto do Banner" htmlFor="cfg-aviso" hint={`${announcement.text.length}/280 · aparece no topo do site quando ativo.`}>
              <textarea
                id="cfg-aviso"
                value={announcement.text}
                maxLength={280}
                rows={2}
                onChange={(e) => setAnnouncement((a) => ({ ...a, text: e.target.value }))}
                placeholder="Ex.: Frete grátis para todo o Brasil em compras acima de R$ 499."
                className="field min-h-[4.5rem] resize-y rounded-2xl text-sm"
              />
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-line px-4 py-3 md:mt-7 md:min-w-[12rem]">
              <p className="text-sm font-semibold text-ivory">{announcement.active ? 'Exibindo' : 'Oculto'}</p>
              <Switch checked={announcement.active} onChange={(next) => setAnnouncement((a) => ({ ...a, active: next }))} label="Aviso ativo" />
            </div>
          </div>
          <SaveRow dirty={announcementDirty} busy={savingKey === 'announcement'} onSave={saveAnnouncement} />
        </SettingsCard>
      </div>
    );
  }

  return (
    <section aria-labelledby="config-titulo">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel numeral="VI">Configurações & Integrações</SectionLabel>
          <h2 id="config-titulo" className="mt-3 font-display text-3xl font-extrabold text-ivory sm:text-4xl">
            Chaves de API & <span className="text-gold-light">Painel de Controle</span>
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist">
            Alterne o provedor de frete ativo (SuperFrete / Melhor Envio), configure chaves de pagamento do Mercado Pago e notificações do WhatsApp. Tudo salvo em tempo real no Supabase.
          </p>
        </div>
        {!loading && <RefreshButton onClick={() => void reload()} busy={refreshing} />}
      </div>

      {error && rows.length > 0 && (
        <div className="mt-6">
          <InlineError message={error} onRetry={() => void reload()} retrying={refreshing} />
        </div>
      )}

      <div className="mt-8">{body}</div>
    </section>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  stamp,
  className,
  children,
}: {
  icon: IconComponent;
  title: string;
  stamp: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn('panel rounded-3xl p-5 sm:p-6', className)} aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
          <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          {title}
        </h3>
        <span className="text-[0.62rem] uppercase tracking-[0.18em] text-smoke">{stamp}</span>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SaveRow({ dirty, busy, onSave }: { dirty: boolean; busy: boolean; onSave: () => void }) {
  return (
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
      <span className="text-xs text-smoke" aria-live="polite">
        {dirty ? 'Alterações não salvas' : 'Sincronizado com Supabase'}
      </span>
      <Button size="sm" onClick={onSave} loading={busy} disabled={!dirty} className="bg-gold text-obsidian font-bold text-xs">
        Salvar Alterações
      </Button>
    </div>
  );
}
