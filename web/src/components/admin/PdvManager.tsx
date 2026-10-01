'use client';

import { useMemo, useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  Calculator,
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle2,
  Printer,
  Send,
  Smartphone,
  Receipt,
  Calendar,
  Sparkles,
  AlertCircle,
  CreditCard,
  QrCode,
  Banknote,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  Building,
  User,
  Phone,
  FileText,
  BadgePercent,
  X,
  Clock,
  BarChart3,
  Layers,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { WhatsAppIcon } from '@/components/ui/icons';
import { useUI } from '@/providers/UIProvider';
import { cn, formatBRL, formatDateBR } from '@/lib/format';
import type { OrderRow, Product } from '@/lib/types';
import type { SettingRow } from '@/lib/settings';
import { parseSettings } from '@/lib/settings';
import {
  SectionLabel,
  PillOption,
  LoadingRows,
  RefreshButton,
  EmptyState,
  Thumb,
} from './AdminUI';
import {
  centsToInput,
  parsePriceToCents,
  displayPhone,
  normalizeSearch,
  formatTimeBR,
  waLinkFor,
} from './admin-utils';
import type { Resource } from './useAdminData';
import {
  createManualPdvSaleAction,
  cancelPdvSaleAction,
  testMerchantWhatsAppNotificationAction,
} from '@/app/admin/actions';

interface CartDraftItem {
  id: string; // unique draft item id
  productId?: string;
  name: string;
  category: string;
  size: string;
  colorName: string;
  imageUrl: string | null;
  quantity: number;
  costInput: string; // in BRL, e.g. "120,00"
  priceInput: string; // in BRL, e.g. "350,00"
}

interface PdvManagerProps {
  ordersResource: Resource<OrderRow>;
  productsResource: Resource<Product>;
  settingsResource: Resource<SettingRow>;
}

const SALE_LOCATIONS = [
  'Ateliê Betim',
  'Showroom / Atendimento VIP',
  'Feira / Evento Exclusivo',
  'WhatsApp / Venda Direta',
  'Outro Local',
] as const;

export function PdvManager({
  ordersResource,
  productsResource,
  settingsResource,
}: PdvManagerProps) {
  const { toast } = useUI();
  const { data: orders, reload: reloadOrders } = ordersResource;
  const { data: products } = productsResource;
  const { data: settingRows } = settingsResource;

  const settings = useMemo(() => parseSettings(settingRows), [settingRows]);

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'terminal' | 'saidas' | 'evolution'>('dashboard');

  // Terminal PDV: Search & Selection
  const [searchCatalog, setSearchCatalog] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Terminal PDV: Cart state
  const [cart, setCart] = useState<CartDraftItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'debito' | 'credito' | 'dinheiro'>('pix');
  const [installments, setInstallments] = useState<number>(1);
  const [saleLocation, setSaleLocation] = useState<string>(SALE_LOCATIONS[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [saleNotes, setSaleNotes] = useState('');
  const [sendReceiptWhatsApp, setSendReceiptWhatsApp] = useState(true);

  // Submitting PDV Sale
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderRow | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);

  // Consolidated Outflow state & filters
  const [periodFilter, setPeriodFilter] = useState<'hoje' | '7dias' | '30dias' | 'todos'>('todos');
  const [paymentFilter, setPaymentFilter] = useState<string>('todos');
  const [outflowSearch, setOutflowSearch] = useState('');
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  // Evolution API Test Simulator
  const [testingEvolution, setTestingEvolution] = useState(false);
  const [customTestPhone, setCustomTestPhone] = useState('');
  const [evolutionResult, setEvolutionResult] = useState<{ success: boolean; message: string } | null>(null);

  // Categories available in catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered catalog products
  const filteredProducts = useMemo(() => {
    const query = normalizeSearch(searchCatalog);
    return products.filter((p) => {
      if (!p.is_active) return false;
      if (selectedCategory !== 'todos' && p.category !== selectedCategory) return false;
      if (!query) return true;
      const haystack = normalizeSearch(`${p.name} ${p.category} ${p.color_name ?? ''} ${p.fabric ?? ''}`);
      return haystack.includes(query);
    });
  }, [products, searchCatalog, selectedCategory]);

  // Add catalog product to cart
  const handleAddToCart = (product: Product) => {
    const retailPriceCents = product.price_cents ?? 0;
    // Default estimated cost at 40% of retail price if not specified
    const estimatedCostCents = Math.round(retailPriceCents * 0.4);

    const defaultSize = product.sizes?.[0] || 'U';
    const defaultColor = product.color_name || 'Original';

    const newItem: CartDraftItem = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: product.id,
      name: product.name,
      category: product.category,
      size: defaultSize,
      colorName: defaultColor,
      imageUrl: product.image_url,
      quantity: 1,
      costInput: centsToInput(estimatedCostCents),
      priceInput: centsToInput(retailPriceCents),
    };

    setCart((prev) => [...prev, newItem]);
    toast(`"${product.name}" adicionado ao carrinho PDV`, 'info');
  };

  // Add custom manual item (e.g. tailoring, alteration, custom dress)
  const handleAddCustomItem = () => {
    const newItem: CartDraftItem = {
      id: `draft-custom-${Date.now()}`,
      name: 'Item / Peça Sob Medida',
      category: 'Alfaiataria / Avulso',
      size: 'Sob Medida',
      colorName: 'Personalizada',
      imageUrl: null,
      quantity: 1,
      costInput: '100,00',
      priceInput: '250,00',
    };
    setCart((prev) => [...prev, newItem]);
    toast('Item avulso adicionado', 'info');
  };

  // Update item in cart
  const updateCartItem = (id: string, updates: Partial<CartDraftItem>) => {
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  // Remove item from cart
  const removeCartItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations for current cart
  const cartSummary = useMemo(() => {
    let totalItems = 0;
    let totalChargedCents = 0;
    let totalCostCents = 0;

    cart.forEach((item) => {
      const q = Math.max(1, item.quantity);
      const costCents = parsePriceToCents(item.costInput) ?? 0;
      const priceCents = parsePriceToCents(item.priceInput) ?? 0;

      totalItems += q;
      totalCostCents += costCents * q;
      totalChargedCents += priceCents * q;
    });

    const grossProfitCents = totalChargedCents - totalCostCents;
    const marginPercent = totalChargedCents > 0 ? (grossProfitCents / totalChargedCents) * 100 : 0;

    return {
      totalItems,
      totalChargedCents,
      totalCostCents,
      grossProfitCents,
      marginPercent,
    };
  }, [cart]);

  // Submit PDV Sale
  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      toast('Adicione pelo menos uma peça ao carrinho antes de finalizar a venda.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.productId || null,
        name: item.name,
        size: item.size || null,
        color: item.colorName || null,
        image: item.imageUrl || null,
        quantity: Math.max(1, item.quantity),
        unitCostCents: parsePriceToCents(item.costInput) ?? 0,
        unitChargedCents: parsePriceToCents(item.priceInput) ?? 0,
      }));

      const res = await createManualPdvSaleAction({
        items: itemsPayload,
        paymentMethod,
        installments: paymentMethod === 'credito' ? installments : undefined,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        customerCpf: customerCpf.trim() || undefined,
        channelLocation: saleLocation,
        notes: saleNotes.trim() || undefined,
        notifyCustomerWhatsApp: sendReceiptWhatsApp && Boolean(customerPhone.trim()),
      });

      if (res.success && res.order) {
        toast(`Venda ${res.orderNumber || res.order.id} lançada e saída de estoque registrada com sucesso!`, 'success');
        setCompletedOrder(res.order);
        setReceiptModalOpen(true);
        // Reset Cart
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerCpf('');
        setSaleNotes('');
        await reloadOrders();
      } else {
        toast(res.message || res.error || 'Erro ao registrar venda externa.', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao processar venda no PDV.';
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel external sale
  const handleCancelSale = async (orderId: string) => {
    if (!window.confirm('Tem certeza de que deseja cancelar esta venda externa e estornar a saída de estoque?')) {
      return;
    }

    setCancelingId(orderId);
    try {
      const res = await cancelPdvSaleAction(orderId);
      if (res.success) {
        toast(res.message || 'Venda cancelada com sucesso.', 'success');
        await reloadOrders();
      } else {
        toast(res.message || res.error || 'Erro ao cancelar venda externa.', 'error');
      }
    } catch {
      toast('Erro de rede ao cancelar venda externa.', 'error');
    } finally {
      setCancelingId(null);
    }
  };

  // Evolution API Test Simulator Handler
  const handleTestEvolution = async () => {
    setTestingEvolution(true);
    setEvolutionResult(null);
    try {
      const res = await testMerchantWhatsAppNotificationAction(customTestPhone || undefined);
      setEvolutionResult(res);
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
    } catch {
      const fail = { success: false, message: 'Erro de comunicação ao acionar Evolution API.' };
      setEvolutionResult(fail);
      toast(fail.message, 'error');
    } finally {
      setTestingEvolution(false);
    }
  };

  // ------------------------------------------------------------
  // Filtered PDV Outflows (Consolidated)
  // ------------------------------------------------------------
  const pdvOutflows = useMemo(() => {
    return orders.filter((order) => {
      // Must be PDV or external channel
      const isPdv = order.channel === 'pdv' || order.channel === 'externa';
      if (!isPdv) return false;

      // Filter by period
      const createdAt = new Date(order.created_at);
      const now = new Date();
      if (periodFilter === 'hoje') {
        const isSameDay =
          createdAt.getDate() === now.getDate() &&
          createdAt.getMonth() === now.getMonth() &&
          createdAt.getFullYear() === now.getFullYear();
        if (!isSameDay) return false;
      } else if (periodFilter === '7dias') {
        const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (periodFilter === '30dias') {
        const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }

      // Filter by payment method
      if (paymentFilter !== 'todos') {
        const matchPayment = (order.payment_method ?? '').toLowerCase().includes(paymentFilter);
        if (!matchPayment) return false;
      }

      // Search query
      if (outflowSearch.trim()) {
        const q = normalizeSearch(outflowSearch);
        const matchOrder = normalizeSearch(
          `${order.id} ${order.customer_name ?? ''} ${order.customer_phone ?? ''} ${order.items.map((i) => i.name).join(' ')}`,
        );
        if (!matchOrder.includes(q)) return false;
      }

      return true;
    });
  }, [orders, periodFilter, paymentFilter, outflowSearch]);

  // Consolidated Metrics
  const consolidatedMetrics = useMemo(() => {
    let totalCharged = 0;
    let totalCost = 0;
    let totalPieces = 0;
    let activeSalesCount = 0;

    const byPayment: Record<string, { count: number; total: number }> = {
      pix: { count: 0, total: 0 },
      debito: { count: 0, total: 0 },
      credito: { count: 0, total: 0 },
      dinheiro: { count: 0, total: 0 },
      outros: { count: 0, total: 0 },
    };

    pdvOutflows.forEach((order) => {
      if (order.status === 'cancelado') return;

      activeSalesCount += 1;
      const orderTotal = order.total_cents ?? 0;
      totalCharged += orderTotal;

      let orderPieces = 0;
      let orderCost = 0;

      order.items.forEach((item) => {
        const q = item.quantity || 1;
        orderPieces += q;
        const itemCost = item.costCents ?? Math.round((item.priceCents || 0) * 0.4);
        orderCost += itemCost * q;
      });

      totalPieces += orderPieces;
      totalCost += orderCost;

      const method = (order.payment_method ?? '').toLowerCase();
      if (method.includes('pix')) {
        byPayment.pix.count += 1;
        byPayment.pix.total += orderTotal;
      } else if (method.includes('debito')) {
        byPayment.debito.count += 1;
        byPayment.debito.total += orderTotal;
      } else if (method.includes('credito')) {
        byPayment.credito.count += 1;
        byPayment.credito.total += orderTotal;
      } else if (method.includes('dinheiro')) {
        byPayment.dinheiro.count += 1;
        byPayment.dinheiro.total += orderTotal;
      } else {
        byPayment.outros.count += 1;
        byPayment.outros.total += orderTotal;
      }
    });

    const grossProfit = totalCharged - totalCost;
    const margin = totalCharged > 0 ? (grossProfit / totalCharged) * 100 : 0;

    return {
      activeSalesCount,
      totalCharged,
      totalCost,
      grossProfit,
      margin,
      totalPieces,
      byPayment,
    };
  }, [pdvOutflows]);

  // Omnichannel and Executive Dashboard Metrics
  const dashboardMetrics = useMemo(() => {
    let onlineRevenue = 0;
    let onlineCount = 0;
    let pdvRevenue = 0;
    let pdvCount = 0;
    let pdvCost = 0;
    let pdvPieces = 0;

    const paymentStats: Record<string, { total: number; count: number; label: string; color: string }> = {
      pix: { total: 0, count: 0, label: 'Pix Instantâneo', color: 'bg-emerald-400' },
      credito: { total: 0, count: 0, label: 'Cartão de Crédito', color: 'bg-gold' },
      debito: { total: 0, count: 0, label: 'Cartão de Débito', color: 'bg-sky-400' },
      dinheiro: { total: 0, count: 0, label: 'Dinheiro em Espécie', color: 'bg-amber-400' },
    };

    const productSalesMap = new Map<string, { name: string; image: string | null; qty: number; revenue: number }>();

    orders.forEach((order) => {
      if (order.status === 'cancelado') return;

      const total = order.total_cents ?? 0;
      const isPdv = order.channel === 'pdv' || order.channel === 'externa';

      if (isPdv) {
        pdvRevenue += total;
        pdvCount += 1;

        let orderCost = 0;
        order.items.forEach((item) => {
          const q = item.quantity || 1;
          const cost = item.costCents ?? Math.round((item.priceCents || 0) * 0.4);
          orderCost += cost * q;
          pdvPieces += q;

          // Ranking
          const key = (item.name || 'Peça').toLowerCase().trim();
          const existing = productSalesMap.get(key) || { name: item.name || 'Peça', image: item.image ?? null, qty: 0, revenue: 0 };
          existing.qty += q;
          existing.revenue += (item.priceCents || 0) * q;
          productSalesMap.set(key, existing);
        });

        pdvCost += orderCost;

        const pm = (order.payment_method ?? '').toLowerCase();
        if (pm.includes('pix')) {
          paymentStats.pix.total += total;
          paymentStats.pix.count += 1;
        } else if (pm.includes('credito')) {
          paymentStats.credito.total += total;
          paymentStats.credito.count += 1;
        } else if (pm.includes('debito')) {
          paymentStats.debito.total += total;
          paymentStats.debito.count += 1;
        } else if (pm.includes('dinheiro')) {
          paymentStats.dinheiro.total += total;
          paymentStats.dinheiro.count += 1;
        }
      } else {
        onlineRevenue += total;
        onlineCount += 1;
      }
    });

    const totalCombinedRevenue = onlineRevenue + pdvRevenue;
    const pdvProfit = pdvRevenue - pdvCost;
    const pdvMargin = pdvRevenue > 0 ? (pdvProfit / pdvRevenue) * 100 : 0;
    const ticketMedioPdv = pdvCount > 0 ? Math.round(pdvRevenue / pdvCount) : 0;

    const topSellingProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    const maxProductQty = topSellingProducts.length > 0 ? Math.max(...topSellingProducts.map((p) => p.qty), 1) : 1;

    const onlinePercent = totalCombinedRevenue > 0 ? (onlineRevenue / totalCombinedRevenue) * 100 : 0;
    const pdvPercent = totalCombinedRevenue > 0 ? (pdvRevenue / totalCombinedRevenue) * 100 : 0;

    const recentPdvOrders = orders
      .filter((o) => (o.channel === 'pdv' || o.channel === 'externa'))
      .slice(0, 5);

    return {
      onlineRevenue,
      onlineCount,
      pdvRevenue,
      pdvCount,
      pdvCost,
      pdvProfit,
      pdvMargin,
      pdvPieces,
      ticketMedioPdv,
      totalCombinedRevenue,
      onlinePercent,
      pdvPercent,
      paymentStats,
      topSellingProducts,
      maxProductQty,
      recentPdvOrders,
    };
  }, [orders]);

  return (
    <section aria-labelledby="pdv-heading" className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionLabel numeral="III">Módulo de PDV & Lançamento Manual</SectionLabel>
          <h2 id="pdv-heading" className="mt-3 font-display text-3xl font-extrabold text-ivory sm:text-4xl">
            Vendas Externas & <span className="text-gold-light">Controle de Saídas</span>
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mist">
            Lance vendas manuais do ateliê ou eventos presenciais com seleção de produtos do acervo, definição de custo,
            valor cobrado, cálculo automático de lucro e margem, baixa de estoque e avisos instantâneos via WhatsApp (Evolution API).
          </p>
        </div>
        <RefreshButton onClick={() => void reloadOrders()} busy={ordersResource.refreshing} />
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-3 sm:mx-0 sm:flex-wrap sm:px-0 border-b border-line">
        <PillOption active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <BarChart3 className="h-4 w-4 text-gold" /> Dashboard Geral
          </span>
        </PillOption>
        <PillOption active={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')}>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <ShoppingCart className="h-4 w-4" /> Terminal PDV (Nova Venda)
          </span>
        </PillOption>
        <PillOption active={activeTab === 'saidas'} onClick={() => setActiveTab('saidas')}>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <TrendingUp className="h-4 w-4" /> Controle de Saídas ({pdvOutflows.length})
          </span>
        </PillOption>
        <PillOption active={activeTab === 'evolution'} onClick={() => setActiveTab('evolution')}>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Smartphone className="h-4 w-4" /> WhatsApp Lojista (Evolution API)
          </span>
        </PillOption>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 0: DASHBOARD GERAL & MÉTRICAS EXECUTIVAS                  */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Barra de Ações Rápidas do Dashboard */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-gold/30 bg-gradient-to-r from-gold/[0.08] via-obsidian-card to-surface/60 p-4 sm:p-5 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl bg-gold/20 text-gold border border-gold/40">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold text-ivory">
                  Painel Executivo de Vendas & Rentabilidade
                </h3>
                <p className="text-[11px] sm:text-xs text-mist">
                  Faturamento presencial, margem de contribuição e baixas de estoque em tempo real.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => setActiveTab('terminal')}
                className="bg-gold text-obsidian font-bold text-xs hover:bg-gold-light shadow-md flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
              >
                <Plus className="h-3.5 w-3.5" /> Lançar Venda
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('saidas')}
                className="border-line text-ivory hover:border-gold/50 text-xs flex items-center gap-1.5 flex-1 sm:flex-none justify-center"
              >
                <TrendingUp className="h-3.5 w-3.5 text-gold" /> Saídas
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('evolution')}
                className="border-line text-ivory hover:border-gold/50 text-xs flex items-center gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5 text-emerald-400" /> WhatsApp
              </Button>
            </div>
          </div>

          {/* Cards de Métricas Principais (4 KPIs) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {/* Card 1: Faturamento PDV */}
            <div className="panel rounded-3xl p-4 sm:p-6 border border-gold/30 bg-gradient-to-br from-surface/80 to-surface/40 space-y-2 sm:space-y-3 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Faturamento PDV
                </span>
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-gold uppercase">
                  Presencial
                </span>
              </div>
              <p className="font-display text-xl sm:text-3xl font-extrabold text-ivory tabular-nums">
                {formatBRL(dashboardMetrics.pdvRevenue)}
              </p>
              <p className="text-[10px] sm:text-xs text-smoke">
                <strong className="text-ivory font-mono">{dashboardMetrics.pdvCount}</strong> vendas · Ticket:{' '}
                <strong className="text-gold-light font-mono">{formatBRL(dashboardMetrics.ticketMedioPdv)}</strong>
              </p>
            </div>

            {/* Card 2: Lucro Bruto Líquido */}
            <div className="panel rounded-3xl p-4 sm:p-6 border border-emerald-500/30 bg-gradient-to-br from-surface/80 to-surface/40 space-y-2 sm:space-y-3 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Lucro Real
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase font-mono',
                    dashboardMetrics.pdvMargin >= 40
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400',
                  )}
                >
                  {dashboardMetrics.pdvMargin.toFixed(0)}% Margem
                </span>
              </div>
              <p className="font-display text-xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">
                {formatBRL(dashboardMetrics.pdvProfit)}
              </p>
              <p className="text-[10px] sm:text-xs text-smoke">
                Resultado líquido após dedução do custo CMV.
              </p>
            </div>

            {/* Card 3: Custo de Mercadorias (CMV) */}
            <div className="panel rounded-3xl p-4 sm:p-6 border border-line bg-surface/50 space-y-2 sm:space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-mist flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Custo CMV
                </span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-smoke uppercase font-mono">
                  {dashboardMetrics.pdvPieces} un.
                </span>
              </div>
              <p className="font-display text-xl sm:text-3xl font-extrabold text-mist tabular-nums">
                {formatBRL(dashboardMetrics.pdvCost)}
              </p>
              <p className="text-[10px] sm:text-xs text-smoke">
                Custo de produção das peças vendidas.
              </p>
            </div>

            {/* Card 4: Faturamento Global Omnichannel */}
            <div className="panel rounded-3xl p-4 sm:p-6 border border-line bg-surface/50 space-y-2 sm:space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-smoke flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gold-light" /> Omnichannel
                </span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-smoke uppercase">
                  Loja + PDV
                </span>
              </div>
              <p className="font-display text-xl sm:text-3xl font-extrabold text-ivory tabular-nums">
                {formatBRL(dashboardMetrics.totalCombinedRevenue)}
              </p>
              <p className="text-[10px] sm:text-xs text-smoke">
                PDV: <strong className="text-gold-light">{dashboardMetrics.pdvPercent.toFixed(0)}%</strong> · Site:{' '}
                <strong className="text-sky-300">{dashboardMetrics.onlinePercent.toFixed(0)}%</strong>
              </p>
            </div>
          </div>

          {/* Gráficos e Distribuições Visuais (2 Colunas: 7 e 5) */}
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Coluna Esquerda: Comparativo de Canais & Mix de Pagamento (7 cols) */}
            <div className="space-y-6 lg:col-span-7">
              {/* Comparativo de Canais de Venda */}
              <div className="panel rounded-3xl p-6 space-y-5 border border-line">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <h4 className="font-display text-base font-bold text-ivory flex items-center gap-2">
                    <Layers className="h-4 w-4 text-gold" /> Comparativo de Canais: Online vs Presencial (PDV)
                  </h4>
                  <span className="text-xs text-smoke font-mono">
                    Total: {formatBRL(dashboardMetrics.totalCombinedRevenue)}
                  </span>
                </div>

                {/* Barra Visual Proporcional Bicolor */}
                <div className="space-y-2">
                  <div className="h-4 w-full rounded-full bg-surface-2 overflow-hidden flex border border-line">
                    <div
                      style={{ width: `${Math.max(5, dashboardMetrics.pdvPercent)}%` }}
                      className="h-full bg-gradient-to-r from-gold to-gold-light transition-all duration-700"
                      title={`PDV: ${dashboardMetrics.pdvPercent.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${Math.max(5, dashboardMetrics.onlinePercent)}%` }}
                      className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-700"
                      title={`Online: ${dashboardMetrics.onlinePercent.toFixed(1)}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-smoke font-mono">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-gold inline-block" />
                      Presencial / PDV: <strong className="text-ivory">{dashboardMetrics.pdvPercent.toFixed(1)}%</strong> ({formatBRL(dashboardMetrics.pdvRevenue)})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-sky-400 inline-block" />
                      Online / E-commerce: <strong className="text-ivory">{dashboardMetrics.onlinePercent.toFixed(1)}%</strong> ({formatBRL(dashboardMetrics.onlineRevenue)})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl border border-line bg-surface/40 p-4 space-y-1">
                    <p className="text-[11px] text-smoke font-medium">Vendas Presenciais (PDV)</p>
                    <p className="font-display text-xl font-bold text-gold tabular-nums">
                      {formatBRL(dashboardMetrics.pdvRevenue)}
                    </p>
                    <p className="text-[11px] text-smoke font-mono">{dashboardMetrics.pdvCount} vendas registradas</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-surface/40 p-4 space-y-1">
                    <p className="text-[11px] text-smoke font-medium">Vendas Online (Site)</p>
                    <p className="font-display text-xl font-bold text-sky-400 tabular-nums">
                      {formatBRL(dashboardMetrics.onlineRevenue)}
                    </p>
                    <p className="text-[11px] text-smoke font-mono">{dashboardMetrics.onlineCount} pedidos finalizados</p>
                  </div>
                </div>
              </div>

              {/* Mix de Formas de Pagamento no PDV */}
              <div className="panel rounded-3xl p-6 space-y-5 border border-line">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <h4 className="font-display text-base font-bold text-ivory flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gold" /> Mix de Pagamento no PDV
                  </h4>
                  <span className="text-xs text-smoke font-mono">
                    {dashboardMetrics.pdvCount} vendas externas
                  </span>
                </div>

                <div className="space-y-4">
                  {Object.entries(dashboardMetrics.paymentStats).map(([key, stat]) => {
                    const percent = dashboardMetrics.pdvRevenue > 0 ? (stat.total / dashboardMetrics.pdvRevenue) * 100 : 0;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-ivory flex items-center gap-2">
                            {key === 'pix' && <QrCode className="h-3.5 w-3.5 text-emerald-400" />}
                            {key === 'credito' && <CreditCard className="h-3.5 w-3.5 text-gold" />}
                            {key === 'debito' && <CreditCard className="h-3.5 w-3.5 text-sky-400" />}
                            {key === 'dinheiro' && <Banknote className="h-3.5 w-3.5 text-amber-400" />}
                            {stat.label}
                          </span>
                          <div className="flex items-center gap-3 font-mono">
                            <span className="text-smoke text-[11px]">{stat.count}x</span>
                            <span className="font-bold text-ivory">{formatBRL(stat.total)}</span>
                            <span className="text-gold-light text-[11px] w-12 text-right">{percent.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                          <div
                            style={{ width: `${percent}%` }}
                            className={cn('h-full rounded-full transition-all duration-500', stat.color)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Top Peças Vendidas & Status de Notificações (5 cols) */}
            <div className="space-y-6 lg:col-span-5">
              {/* Ranking das Peças Mais Vendidas no PDV */}
              <div className="panel rounded-3xl p-6 space-y-5 border border-line">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <h4 className="font-display text-base font-bold text-ivory flex items-center gap-2">
                    <Package className="h-4 w-4 text-gold" /> Top Peças no PDV
                  </h4>
                  <span className="text-xs text-smoke font-mono">Maior saída</span>
                </div>

                <div className="space-y-3">
                  {dashboardMetrics.topSellingProducts.map((prod, idx) => {
                    const relativeWidth = Math.round((prod.qty / dashboardMetrics.maxProductQty) * 100);
                    return (
                      <div key={idx} className="rounded-2xl border border-line bg-surface/40 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-ivory truncate">{prod.name}</p>
                          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold font-mono whitespace-nowrap">
                            {prod.qty} un.
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-smoke font-mono">
                          <span>Receita gerada:</span>
                          <strong className="text-gold-light">{formatBRL(prod.revenue)}</strong>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                          <div style={{ width: `${relativeWidth}%` }} className="h-full bg-gold rounded-full" />
                        </div>
                      </div>
                    );
                  })}

                  {dashboardMetrics.topSellingProducts.length === 0 && (
                    <div className="py-8 text-center text-xs text-smoke">
                      Nenhuma saída registrada ainda para calcular o ranking.
                    </div>
                  )}
                </div>
              </div>

              {/* Status das Automações e WhatsApp */}
              <div className="panel rounded-3xl p-6 space-y-4 border border-line bg-surface/30">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <h4 className="font-display text-base font-bold text-ivory flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-emerald-400" /> Automações & WhatsApp
                  </h4>
                  <span className="text-[10px] rounded-full bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 font-bold uppercase">
                    Operacional
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between rounded-xl border border-line p-3 bg-surface/50">
                    <span className="text-smoke flex items-center gap-2">
                      <WhatsAppIcon className="h-4 w-4 text-emerald-400" /> Evolution API:
                    </span>
                    <span className="font-mono text-ivory font-bold">
                      {settings.notifications.merchant_whatsapp_phone ? displayPhone(settings.notifications.merchant_whatsapp_phone) : 'Configurado'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-line p-3 bg-surface/50">
                    <span className="text-smoke flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-gold" /> Notificação Lojista:
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {settings.notifications.merchant_notify_on_order ? '✅ Ativado' : '❌ Desativado'}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('evolution')}
                    className="w-full border-gold/40 text-gold hover:bg-gold/10 text-xs flex items-center justify-center gap-2 mt-2"
                  >
                    <Send className="h-3.5 w-3.5" /> Abrir Simulador de Disparo WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Feed das Últimas Vendas do PDV */}
          <div className="panel rounded-3xl p-6 space-y-4 border border-line">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h4 className="font-display text-base font-bold text-ivory flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gold" /> Últimas Vendas Registradas no PDV
                </h4>
                <p className="text-xs text-mist">Transações e baixas de estoque mais recentes do balcão</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab('saidas')}
                className="text-xs border-line text-smoke hover:text-ivory flex items-center gap-1.5"
              >
                Ver Todas <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="divide-y divide-line">
              {dashboardMetrics.recentPdvOrders.map((ord) => {
                let orderCost = 0;
                ord.items.forEach((it) => {
                  const q = it.quantity || 1;
                  const c = it.costCents ?? Math.round((it.priceCents || 0) * 0.4);
                  orderCost += c * q;
                });
                const profit = (ord.total_cents ?? 0) - orderCost;

                return (
                  <div key={ord.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ivory">{ord.id}</span>
                        <span className="rounded-full bg-gold/10 text-gold px-2 py-0.2 text-[10px] font-bold capitalize">
                          {ord.payment_method || 'Pix'}
                        </span>
                        <span className="text-smoke text-[11px]">
                          {formatDateBR(ord.created_at)} às {formatTimeBR(ord.created_at)}
                        </span>
                      </div>
                      <p className="text-mist truncate max-w-md">
                        {ord.customer_name ? <strong className="text-ivory mr-1">{ord.customer_name}:</strong> : ''}
                        {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-auto font-mono">
                      <div className="text-right">
                        <p className="font-bold text-ivory text-sm">{formatBRL(ord.total_cents ?? 0)}</p>
                        <p className="text-[11px] text-emerald-400 font-bold">Lucro: +{formatBRL(profit)}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCompletedOrder(ord);
                          setReceiptModalOpen(true);
                        }}
                        className="text-[10px] h-7 px-2.5 border-line text-smoke hover:text-ivory"
                      >
                        <Receipt className="h-3 w-3 mr-1" /> Recibo
                      </Button>
                    </div>
                  </div>
                );
              })}

              {dashboardMetrics.recentPdvOrders.length === 0 && (
                <div className="py-8 text-center text-xs text-smoke">
                  Nenhuma venda lançada no PDV ainda. Clique em &quot;Lançar Venda no PDV&quot; para registrar a primeira!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 1: TERMINAL PDV (NOVA VENDA)                              */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'terminal' && (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Coluna Esquerda: Catálogo e Seleção de Peças (7 colunas) */}
          <div className="space-y-6 lg:col-span-7">
            <div className="panel rounded-3xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-ivory flex items-center gap-2">
                    <Package className="h-5 w-5 text-gold" /> Selecionar Peças do Acervo
                  </h3>
                  <p className="text-xs text-mist">Clique no produto para adicionar ao carrinho da venda externa.</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddCustomItem}
                  className="border-gold/40 text-gold hover:bg-gold/10 text-xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="h-3.5 w-3.5" /> Item Avulso / Sob Medida
                </Button>
              </div>

              {/* Filtros de Busca */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-smoke" />
                  <input
                    type="text"
                    value={searchCatalog}
                    onChange={(e) => setSearchCatalog(e.target.value)}
                    placeholder="Buscar por nome, cor, tecido..."
                    className="field rounded-2xl pl-9 text-xs"
                  />
                  {searchCatalog && (
                    <button
                      type="button"
                      onClick={() => setSearchCatalog('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-ivory text-xs"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="field rounded-2xl text-xs"
                >
                  <option value="todos">Todas as Categorias</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lista em Grid de Produtos */}
              <div className="grid max-h-[32rem] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                {filteredProducts.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => handleAddToCart(prod)}
                    className="group flex items-center gap-3.5 rounded-2xl border border-line bg-surface/40 p-3 text-left transition-all hover:border-gold/50 hover:bg-gold/[0.04]"
                  >
                    <Thumb src={prod.image_url} alt={prod.name} className="h-12 w-12 rounded-xl shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ivory group-hover:text-gold-light transition-colors">
                        {prod.name}
                      </p>
                      <p className="text-[10px] text-smoke truncate">
                        {prod.category} {prod.color_name ? `· ${prod.color_name}` : ''}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs font-bold text-gold tabular-nums">
                          {formatBRL(prod.price_cents ?? 0)}
                        </span>
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] text-mist uppercase font-mono">
                          + Adicionar
                        </span>
                      </div>
                    </div>
                  </button>
                ))}

                {filteredProducts.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-xs text-smoke">
                    Nenhum produto ativo encontrado com os termos pesquisados.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita: Carrinho, Custos, Preços e Fechamento (5 colunas) */}
          <div id="pdv-cart-panel" className="space-y-6 lg:col-span-5 scroll-mt-28">
            <div className="panel rounded-3xl p-5 sm:p-6 space-y-6 border border-gold/30 bg-gradient-to-b from-surface/80 to-surface/40">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-gold" />
                  <h3 className="font-display text-lg font-bold text-ivory">Itens da Venda ({cart.length})</h3>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs text-smoke hover:text-rose-400 transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Lista de Itens no Carrinho */}
              {cart.length === 0 ? (
                <div className="py-12 text-center space-y-2 border border-dashed border-line rounded-2xl p-6">
                  <Package className="h-8 w-8 text-smoke/50 mx-auto" />
                  <p className="text-xs text-mist font-medium">O carrinho do PDV está vazio.</p>
                  <p className="text-[11px] text-smoke">Selecione peças do acervo ao lado ou adicione um item avulso.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[22rem] overflow-y-auto pr-1">
                  {cart.map((item) => {
                    const costCents = parsePriceToCents(item.costInput) ?? 0;
                    const priceCents = parsePriceToCents(item.priceInput) ?? 0;
                    const itemProfitCents = (priceCents - costCents) * item.quantity;
                    const itemMarginPercent = priceCents > 0 ? ((priceCents - costCents) / priceCents) * 100 : 0;

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-line bg-obsidian-card p-4 space-y-3 relative group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-ivory truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-smoke">
                              <span>Tam:</span>
                              <input
                                type="text"
                                value={item.size}
                                onChange={(e) => updateCartItem(item.id, { size: e.target.value })}
                                className="w-12 rounded bg-surface px-1 py-0.5 text-center text-ivory border border-line text-[11px]"
                              />
                              <span>Cor:</span>
                              <input
                                type="text"
                                value={item.colorName}
                                onChange={(e) => updateCartItem(item.id, { colorName: e.target.value })}
                                className="w-20 rounded bg-surface px-1 py-0.5 text-ivory border border-line text-[11px]"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCartItem(item.id)}
                            className="text-smoke hover:text-rose-400 p-1 transition-colors"
                            title="Remover peça"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Controles de Custo, Valor Cobrado e Quantidade */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line/60">
                          <div>
                            <label className="text-[10px] text-smoke block mb-1">Qtd</label>
                            <div className="flex items-center border border-line rounded-xl overflow-hidden bg-surface">
                              <button
                                type="button"
                                onClick={() => updateCartItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                                className="px-2 py-1 text-xs text-smoke hover:text-ivory"
                              >
                                -
                              </button>
                              <span className="flex-1 text-center text-xs font-bold text-ivory tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartItem(item.id, { quantity: item.quantity + 1 })}
                                className="px-2 py-1 text-xs text-smoke hover:text-ivory"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-mist block mb-1">Custo Un. (R$)</label>
                            <input
                              type="text"
                              value={item.costInput}
                              onChange={(e) => updateCartItem(item.id, { costInput: e.target.value })}
                              className="field rounded-xl py-1 text-xs tabular-nums font-mono text-mist"
                              placeholder="0,00"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-gold-light font-bold block mb-1">Cobrado Un. (R$)</label>
                            <input
                              type="text"
                              value={item.priceInput}
                              onChange={(e) => updateCartItem(item.id, { priceInput: e.target.value })}
                              className="field rounded-xl py-1 text-xs tabular-nums font-bold text-gold font-mono"
                              placeholder="0,00"
                            />
                          </div>
                        </div>

                        {/* Micro KPI por Item */}
                        <div className="flex items-center justify-between text-[11px] pt-1 text-smoke font-mono">
                          <span>
                            Total: <strong className="text-ivory">{formatBRL(priceCents * item.quantity)}</strong>
                          </span>
                          <span className="flex items-center gap-1.5">
                            Lucro:{' '}
                            <strong className={itemProfitCents >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                              {formatBRL(itemProfitCents)}
                            </strong>
                            <span
                              className={cn(
                                'px-1.5 py-0.2 rounded text-[10px] font-bold',
                                itemMarginPercent >= 40
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : itemMarginPercent >= 20
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-rose-500/10 text-rose-400',
                              )}
                            >
                              {itemMarginPercent.toFixed(0)}%
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Informações da Venda (Forma de Pagamento & Local) */}
              <div className="space-y-4 pt-3 border-t border-line">
                <div>
                  <label className="text-xs font-semibold text-ivory block mb-2">Forma de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-medium transition-all gap-1',
                        paymentMethod === 'pix'
                          ? 'border-gold bg-gold/15 text-gold-light font-bold shadow-sm'
                          : 'border-line bg-surface text-smoke hover:text-ivory',
                      )}
                    >
                      <QrCode className="h-4 w-4" /> Pix
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('debito')}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-medium transition-all gap-1',
                        paymentMethod === 'debito'
                          ? 'border-gold bg-gold/15 text-gold-light font-bold shadow-sm'
                          : 'border-line bg-surface text-smoke hover:text-ivory',
                      )}
                    >
                      <CreditCard className="h-4 w-4" /> Débito
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credito')}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-medium transition-all gap-1',
                        paymentMethod === 'credito'
                          ? 'border-gold bg-gold/15 text-gold-light font-bold shadow-sm'
                          : 'border-line bg-surface text-smoke hover:text-ivory',
                      )}
                    >
                      <CreditCard className="h-4 w-4" /> Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('dinheiro')}
                      className={cn(
                        'flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-medium transition-all gap-1',
                        paymentMethod === 'dinheiro'
                          ? 'border-gold bg-gold/15 text-gold-light font-bold shadow-sm'
                          : 'border-line bg-surface text-smoke hover:text-ivory',
                      )}
                    >
                      <Banknote className="h-4 w-4" /> Dinheiro
                    </button>
                  </div>
                </div>

                {/* Parcelas se for Crédito */}
                {paymentMethod === 'credito' && (
                  <div>
                    <label className="text-xs text-smoke block mb-1">Parcelamento no Cartão</label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="field rounded-2xl text-xs"
                    >
                      <option value={1}>1x à vista ({formatBRL(cartSummary.totalChargedCents)})</option>
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <option key={n} value={n}>
                          {n}x de {formatBRL(Math.round(cartSummary.totalChargedCents / n))} (sem acréscimo)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Local da Venda */}
                <div>
                  <label className="text-xs font-semibold text-ivory block mb-1">Local / Ponto de Venda</label>
                  <select
                    value={saleLocation}
                    onChange={(e) => setSaleLocation(e.target.value)}
                    className="field rounded-2xl text-xs"
                  >
                    {SALE_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dados do Cliente (Opcional) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-ivory">Identificação do Cliente</label>
                    <span className="text-[10px] text-smoke">Opcional para recibo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nome do cliente"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="field rounded-xl py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="WhatsApp (ex: 31999999999)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                      className="field rounded-xl py-1.5 text-xs font-mono"
                    />
                  </div>

                  {customerPhone && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-mist">
                      <input
                        type="checkbox"
                        checked={sendReceiptWhatsApp}
                        onChange={(e) => setSendReceiptWhatsApp(e.target.checked)}
                        className="rounded border-line bg-surface text-gold focus:ring-gold"
                      />
                      <span>Enviar comprovante elegante no WhatsApp do cliente após a venda</span>
                    </label>
                  )}
                </div>

                {/* Notas / Observações */}
                <input
                  type="text"
                  placeholder="Observações internas (ex: desconto à vista, ajuste de barra...)"
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                  className="field rounded-xl py-1.5 text-xs"
                />
              </div>

              {/* Quadro Resumo Financeiro & Margem */}
              <div className="rounded-2xl border border-gold/30 bg-gold/[0.03] p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-smoke">
                  <span>Total de Peças:</span>
                  <span className="font-bold text-ivory">{cartSummary.totalItems} un.</span>
                </div>
                <div className="flex items-center justify-between text-xs text-smoke">
                  <span>Custo Mercadorias (CMV):</span>
                  <span className="font-mono text-mist">{formatBRL(cartSummary.totalCostCents)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-smoke">
                  <span>Lucro Bruto Estimado:</span>
                  <span
                    className={cn(
                      'font-mono font-bold',
                      cartSummary.grossProfitCents >= 0 ? 'text-emerald-400' : 'text-rose-400',
                    )}
                  >
                    {formatBRL(cartSummary.grossProfitCents)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-smoke">
                  <span>Margem Bruta:</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs font-bold',
                      cartSummary.marginPercent >= 40
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-400',
                    )}
                  >
                    {cartSummary.marginPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="border-t border-gold/20 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-ivory">Valor Total Cobrado:</span>
                  <span className="font-display text-2xl font-extrabold text-gold tabular-nums">
                    {formatBRL(cartSummary.totalChargedCents)}
                  </span>
                </div>
              </div>

              {/* Botão de Finalização da Venda */}
              <Button
                size="lg"
                onClick={handleFinalizeSale}
                loading={submitting}
                disabled={cart.length === 0}
                className="w-full bg-gold text-obsidian font-extrabold hover:bg-gold-light py-4 text-sm shadow-xl flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" />
                Confirmar Venda & Registrar Saída
              </Button>
            </div>
          </div>

          {/* Barra Flutuante Mobile para Finalizar Venda */}
          {cart.length > 0 && (
            <div className="lg:hidden fixed bottom-4 inset-x-4 z-40">
              <button
                type="button"
                onClick={() => document.getElementById('pdv-cart-panel')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full rounded-2xl bg-gold text-obsidian font-extrabold py-3.5 px-5 shadow-2xl flex items-center justify-between border border-gold-light active:scale-[0.98] transition-transform"
              >
                <span className="flex items-center gap-2 text-xs">
                  <ShoppingCart className="h-4 w-4" /> Carrinho ({cartSummary.totalItems} un.)
                </span>
                <span className="font-display text-sm font-bold tabular-nums">
                  {formatBRL(cartSummary.totalChargedCents)} · Finalizar &rarr;
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 2: CONTROLE CONSOLIDADO DE SAÍDAS                         */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'saidas' && (
        <div className="space-y-6">
          {/* Cartões Consolidados (KPIs) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="panel rounded-3xl p-4 sm:p-5 border border-line bg-surface/50 space-y-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-smoke flex items-center justify-between">
                Faturamento PDV
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gold" />
              </span>
              <p className="font-display text-xl sm:text-3xl font-extrabold text-ivory tabular-nums">
                {formatBRL(consolidatedMetrics.totalCharged)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-smoke truncate">
                {consolidatedMetrics.activeSalesCount} vendas externas
              </p>
            </div>

            <div className="panel rounded-3xl p-4 sm:p-5 border border-line bg-surface/50 space-y-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-smoke flex items-center justify-between">
                Custo Total (CMV)
                <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-mist" />
              </span>
              <p className="font-display text-xl sm:text-3xl font-extrabold text-mist tabular-nums">
                {formatBRL(consolidatedMetrics.totalCost)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-smoke truncate">Base de custo das peças</p>
            </div>

            <div className="panel rounded-3xl p-4 sm:p-5 border border-gold/30 bg-gold/[0.02] space-y-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gold flex items-center justify-between">
                Lucro Consolidado
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
              </span>
              <p className="font-display text-xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">
                {formatBRL(consolidatedMetrics.grossProfit)}
              </p>
              <p className="text-[10px] sm:text-[11px] text-smoke truncate">
                Margem média: <strong className="text-emerald-400">{consolidatedMetrics.margin.toFixed(0)}%</strong>
              </p>
            </div>

            <div className="panel rounded-3xl p-4 sm:p-5 border border-line bg-surface/50 space-y-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-smoke flex items-center justify-between">
                Peças Baixadas
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gold-light" />
              </span>
              <p className="font-display text-xl sm:text-3xl font-extrabold text-ivory tabular-nums">
                {consolidatedMetrics.totalPieces} <span className="text-xs sm:text-sm font-normal text-mist">peças</span>
              </p>
              <p className="text-[10px] sm:text-[11px] text-smoke truncate">Estoque sincronizado</p>
            </div>
          </div>

          {/* Filtros e Busca */}
          <div className="panel rounded-3xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="no-scrollbar -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
                <span className="text-xs text-smoke font-medium mr-1 whitespace-nowrap">Período:</span>
                <PillOption active={periodFilter === 'todos'} onClick={() => setPeriodFilter('todos')}>
                  <span className="whitespace-nowrap">Todas as Saídas</span>
                </PillOption>
                <PillOption active={periodFilter === 'hoje'} onClick={() => setPeriodFilter('hoje')}>
                  <span className="whitespace-nowrap">Hoje</span>
                </PillOption>
                <PillOption active={periodFilter === '7dias'} onClick={() => setPeriodFilter('7dias')}>
                  <span className="whitespace-nowrap">7 dias</span>
                </PillOption>
                <PillOption active={periodFilter === '30dias'} onClick={() => setPeriodFilter('30dias')}>
                  <span className="whitespace-nowrap">30 dias</span>
                </PillOption>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-smoke font-medium whitespace-nowrap">Pagamento:</span>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="field rounded-2xl text-xs py-1.5"
                >
                  <option value="todos">Todas as Formas</option>
                  <option value="pix">Pix</option>
                  <option value="debito">Débito</option>
                  <option value="credito">Crédito</option>
                  <option value="dinheiro">Dinheiro</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-smoke" />
              <input
                type="text"
                value={outflowSearch}
                onChange={(e) => setOutflowSearch(e.target.value)}
                placeholder="Buscar por número do pedido, nome do cliente, telefone ou peça..."
                className="field rounded-2xl pl-10 text-xs"
              />
            </div>
          </div>

          {/* Tabela de Saídas Consolidadas (Desktop & Tablet) */}
          <div className="panel rounded-3xl overflow-hidden border border-line hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface/80 text-[10px] font-bold uppercase tracking-wider text-smoke border-b border-line">
                  <tr>
                    <th className="px-5 py-3.5">Pedido / Data</th>
                    <th className="px-5 py-3.5">Peças & Detalhes</th>
                    <th className="px-5 py-3.5">Local & Pagamento</th>
                    <th className="px-5 py-3.5 text-right">Custo (CMV)</th>
                    <th className="px-5 py-3.5 text-right">Cobrado</th>
                    <th className="px-5 py-3.5 text-right">Lucro (Margem)</th>
                    <th className="px-5 py-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pdvOutflows.map((order) => {
                    const isCanceled = order.status === 'cancelado';
                    let orderCost = 0;
                    order.items.forEach((item) => {
                      const q = item.quantity || 1;
                      const c = item.costCents ?? Math.round((item.priceCents || 0) * 0.4);
                      orderCost += c * q;
                    });
                    const profit = (order.total_cents ?? 0) - orderCost;
                    const margin = (order.total_cents ?? 0) > 0 ? (profit / (order.total_cents ?? 0)) * 100 : 0;

                    return (
                      <tr
                        key={order.id}
                        className={cn(
                          'hover:bg-surface/40 transition-colors',
                          isCanceled && 'opacity-50 bg-surface/20',
                        )}
                      >
                        {/* Pedido / Data */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="font-mono font-bold text-ivory text-xs flex items-center gap-1.5">
                            {order.id}
                            {isCanceled && (
                              <span className="rounded-full bg-smoke/20 px-2 py-0.5 text-[9px] text-smoke uppercase">
                                Cancelado
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-smoke mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateBR(order.created_at)} às {formatTimeBR(order.created_at)}
                          </p>
                          {order.customer_name && (
                            <p className="text-[11px] text-gold-light mt-1 font-medium truncate max-w-[140px]">
                              {order.customer_name}
                            </p>
                          )}
                        </td>

                        {/* Peças & Detalhes */}
                        <td className="px-5 py-4">
                          <div className="space-y-1 max-w-xs">
                            {order.items.map((item, idx) => (
                              <p key={idx} className="truncate text-xs text-mist">
                                <strong className="text-ivory font-mono">{item.quantity}x</strong> {item.name}{' '}
                                <span className="text-[10px] text-smoke">
                                  ({item.size || 'U'}{item.color ? ` · ${item.color}` : ''})
                                </span>
                              </p>
                            ))}
                          </div>
                        </td>

                        {/* Local & Pagamento */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <p className="text-xs text-ivory font-medium flex items-center gap-1">
                            <Building className="h-3 w-3 text-gold" />
                            {order.shipping_address?.notes?.split('Local: ')?.[1]?.split('; ')?.[0] || 'Ateliê Betim'}
                          </p>
                          <p className="text-[11px] text-smoke mt-0.5 capitalize">
                            {order.payment_method || 'Pix'}
                          </p>
                        </td>

                        {/* Custo */}
                        <td className="px-5 py-4 text-right whitespace-nowrap font-mono text-mist">
                          {formatBRL(orderCost)}
                        </td>

                        {/* Cobrado */}
                        <td className="px-5 py-4 text-right whitespace-nowrap font-display text-sm font-bold text-ivory">
                          {formatBRL(order.total_cents ?? 0)}
                        </td>

                        {/* Lucro & Margem */}
                        <td className="px-5 py-4 text-right whitespace-nowrap font-mono">
                          <p className={profit >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {formatBRL(profit)}
                          </p>
                          <span
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded font-bold',
                              margin >= 40
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400',
                            )}
                          >
                            {margin.toFixed(0)}%
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="px-5 py-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setCompletedOrder(order);
                                setReceiptModalOpen(true);
                              }}
                              className="text-[10px] h-7 px-2.5 border-line text-smoke hover:text-ivory"
                              title="Ver Recibo da Venda"
                            >
                              <Receipt className="h-3.5 w-3.5 mr-1" /> Recibo
                            </Button>

                            {!isCanceled && (
                              <button
                                type="button"
                                onClick={() => handleCancelSale(order.id)}
                                disabled={cancelingId === order.id}
                                className="text-smoke hover:text-rose-400 p-1.5 transition-colors"
                                title="Cancelar Venda e Estornar Saída"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {pdvOutflows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-smoke">
                        Nenhuma venda externa registrada no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards de Saídas Consolidadas (Mobile) */}
          <div className="md:hidden space-y-3">
            {pdvOutflows.map((order) => {
              const isCanceled = order.status === 'cancelado';
              let orderCost = 0;
              order.items.forEach((item) => {
                const q = item.quantity || 1;
                const c = item.costCents ?? Math.round((item.priceCents || 0) * 0.4);
                orderCost += c * q;
              });
              const profit = (order.total_cents ?? 0) - orderCost;
              const margin = (order.total_cents ?? 0) > 0 ? (profit / (order.total_cents ?? 0)) * 100 : 0;
              const location = order.shipping_address?.notes?.split('Local: ')?.[1]?.split('; ')?.[0] || 'Ateliê';

              return (
                <div
                  key={order.id}
                  className={cn(
                    'panel rounded-2xl p-4 border border-line space-y-3 bg-surface/60 transition-colors',
                    isCanceled && 'opacity-60 bg-surface/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-ivory">{order.id}</span>
                        {isCanceled ? (
                          <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold text-rose-400 uppercase">
                            Cancelado
                          </span>
                        ) : (
                          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[9px] font-bold text-gold uppercase capitalize">
                            {order.payment_method || 'Pix'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-smoke mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDateBR(order.created_at)} às {formatTimeBR(order.created_at)} · {location}
                      </p>
                    </div>

                    <div className="text-right font-mono">
                      <p className="text-sm font-bold text-ivory">{formatBRL(order.total_cents ?? 0)}</p>
                      <p className={cn('text-[10px] font-bold', profit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                        Lucro: {formatBRL(profit)} ({margin.toFixed(0)}%)
                      </p>
                    </div>
                  </div>

                  {order.customer_name && (
                    <div className="rounded-xl bg-surface/80 px-2.5 py-1.5 text-[11px] text-smoke border border-line/60 flex items-center justify-between">
                      <span>
                        Cliente: <strong className="text-ivory">{order.customer_name}</strong>
                      </span>
                      {order.customer_phone && (
                        <span className="font-mono text-[10px] text-gold-light">
                          {displayPhone(order.customer_phone)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-1 rounded-xl bg-obsidian-card p-2.5 border border-line/40 text-xs">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="text-mist truncate mr-2">
                          <strong className="text-ivory font-mono mr-1">{item.quantity}x</strong>
                          {item.name}
                        </span>
                        <span className="text-smoke text-[10px] whitespace-nowrap">
                          {item.size || 'U'}{item.color ? ` · ${item.color}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-line/50">
                    <span className="text-[10px] text-smoke font-mono">CMV: {formatBRL(orderCost)}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCompletedOrder(order);
                          setReceiptModalOpen(true);
                        }}
                        className="text-[10px] h-7 px-2.5 border-line text-smoke hover:text-ivory"
                      >
                        <Receipt className="h-3 w-3 mr-1" /> Recibo
                      </Button>
                      {!isCanceled && (
                        <button
                          type="button"
                          onClick={() => handleCancelSale(order.id)}
                          disabled={cancelingId === order.id}
                          className="text-smoke hover:text-rose-400 p-1.5 transition-colors"
                          title="Cancelar Venda"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {pdvOutflows.length === 0 && (
              <div className="panel rounded-2xl py-12 text-center text-xs text-smoke border border-line">
                Nenhuma venda externa registrada no período selecionado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 3: WHATSAPP LOJISTA & EVOLUTION API                       */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'evolution' && (
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Lado Esquerdo: Simulador e Disparador de Alertas */}
          <div className="space-y-6 lg:col-span-6">
            <div className="panel rounded-3xl p-6 space-y-6 border border-gold/30">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gold/15 text-gold flex items-center justify-center border border-gold/30">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-ivory">Notificações Instantâneas do Lojista</h3>
                  <p className="text-xs text-mist">Integração oficial via Evolution API para WhatsApp</p>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-surface/50 p-4 space-y-3 text-xs text-smoke">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ivory">Status da Evolution API:</span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 font-bold uppercase text-[10px]',
                      settings.notifications.evolution_api_url && settings.notifications.evolution_api_key
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-amber-500/15 text-amber-400',
                    )}
                  >
                    {settings.notifications.evolution_api_url ? 'Configurada' : 'Pendente de Configuração'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ivory">Servidor / Endpoint:</span>
                  <span className="font-mono text-mist truncate max-w-[200px]">
                    {settings.notifications.evolution_api_url || 'https://api.seuservidor.com'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ivory">WhatsApp Pessoal do Lojista:</span>
                  <span className="font-mono text-gold-light font-bold">
                    {displayPhone(settings.notifications.merchant_whatsapp_phone) || 'Não configurado'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ivory">Alerta em Pedidos do Site:</span>
                  <span className="text-ivory font-bold">
                    {settings.notifications.merchant_notify_on_order ? '✅ Ativado' : '❌ Desativado'}
                  </span>
                </div>
              </div>

              {/* Formulário de Teste de Disparo */}
              <div className="space-y-4 pt-2 border-t border-line">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Disparar Teste de Pedido Aprovado
                </h4>
                <p className="text-xs text-mist leading-relaxed">
                  Envie uma notificação real de teste simulando a aprovação de uma compra na loja para verificar se a
                  Evolution API está entregando mensagens normalmente no seu WhatsApp.
                </p>

                <div>
                  <label className="text-xs text-smoke block mb-1">
                    Número de Teste (deixe em branco para usar o número salvo nas configurações):
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 5531999999999 (DDI + DDD + Número)"
                    value={customTestPhone}
                    onChange={(e) => setCustomTestPhone(e.target.value.replace(/\D/g, ''))}
                    className="field rounded-2xl text-xs font-mono"
                  />
                </div>

                <Button
                  size="lg"
                  onClick={handleTestEvolution}
                  loading={testingEvolution}
                  disabled={!settings.notifications.evolution_api_url}
                  className="w-full bg-gold text-obsidian font-extrabold hover:bg-gold-light py-3.5 text-xs flex items-center justify-center gap-2 shadow-lg"
                >
                  <Send className="h-4 w-4" /> Disparar Alerta de Teste Agora
                </Button>

                {evolutionResult && (
                  <div
                    className={cn(
                      'p-4 rounded-2xl text-xs space-y-1 border',
                      evolutionResult.success
                        ? 'border-emerald-500/40 bg-emerald-500/[0.06] text-emerald-300'
                        : 'border-rose-500/40 bg-rose-500/[0.06] text-rose-300',
                    )}
                  >
                    <p className="font-bold flex items-center gap-1.5">
                      {evolutionResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                      {evolutionResult.success ? 'Disparo Concluído!' : 'Falha no Disparo'}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">{evolutionResult.message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lado Direito: Preview da Mensagem Elegante do WhatsApp */}
          <div className="space-y-6 lg:col-span-6">
            <div className="panel rounded-3xl p-6 space-y-4 border border-line bg-surface/30">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ivory flex items-center gap-2">
                <WhatsAppIcon className="h-4 w-4 text-emerald-400" /> Prévia da Mensagem Recebida pelo Lojista
              </h3>
              <p className="text-xs text-smoke">
                Esta é a formatação de alta costura enviada diretamente ao seu WhatsApp quando uma nova venda é aprovada:
              </p>

              {/* Bolha de Conversa do WhatsApp */}
              <div className="rounded-2xl border border-emerald-500/20 bg-[#0d1418] p-5 shadow-2xl space-y-3 font-sans text-xs leading-relaxed text-[#e9edef]">
                <p className="font-bold text-amber-300">👑 TITI&apos;S STORE · NOVO PEDIDO APROVADO!</p>
                <div className="border-t border-line/30 pt-2 space-y-1">
                  <p>
                    📦 <strong>Pedido:</strong> <span className="font-mono text-emerald-400">#TITIS-ABC1234-XYZ</span>
                  </p>
                  <p>
                    💰 <strong>Valor Total:</strong> <span className="font-bold text-amber-300">R$ 580,00</span>
                  </p>
                  <p>
                    💳 <strong>Pagamento:</strong> Cartão de Crédito (Mercado Pago)
                  </p>
                  <p>
                    👤 <strong>Cliente:</strong> Dra. Juliana Vasconcelos
                  </p>
                  <p>
                    📱 <strong>WhatsApp:</strong> (31) 99888-7766
                  </p>
                  <p>
                    📍 <strong>Entrega:</strong> Belo Horizonte / MG (Sedex Express)
                  </p>
                </div>

                <div className="border-t border-line/30 pt-2 space-y-1">
                  <p className="font-bold text-amber-200">✨ Itens Comprados (1 un):</p>
                  <p className="text-[#aebac1] pl-2">
                    • 1x Vestido Midi Crepe de Seda - Tam 40 · Preto Noturno (R$ 580,00)
                  </p>
                </div>

                <div className="border-t border-line/30 pt-2 text-[11px] text-[#8696a0]">
                  <p>🔗 Acesse o painel para imprimir a etiqueta de envio:</p>
                  <p className="text-emerald-400 font-mono underline">https://titistore.com.br/admin#pedidos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL DE RECIBO ELEGANTE (IMPRESSÃO & WHATSAPP)                   */}
      {/* ----------------------------------------------------------------- */}
      {receiptModalOpen && completedOrder && (
        <Modal
          onClose={() => setReceiptModalOpen(false)}
          title="Comprovante de Venda Externa · PDV"
          showTitle
          size="md"
          className="max-w-xl"
        >
          <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div id="pdv-printable-receipt" className="rounded-2xl border border-line bg-surface/50 p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div className="text-center pb-4 border-b border-line space-y-1">
                <p className="text-[10px] font-caps tracking-[0.2em] text-gold font-bold">TITI&apos;S STORE · ALTA COSTURA</p>
                <h4 className="font-display text-xl font-bold text-ivory">Recibo de Venda</h4>
                <p className="font-mono text-xs text-smoke">Pedido Nº {completedOrder.id}</p>
                <p className="text-[11px] text-smoke">
                  {formatDateBR(completedOrder.created_at)} às {formatTimeBR(completedOrder.created_at)}
                </p>
              </div>

              {/* Dados do Cliente */}
              {completedOrder.customer_name && (
                <div className="text-xs space-y-1 border-b border-line pb-3">
                  <p className="text-smoke">
                    Cliente: <strong className="text-ivory">{completedOrder.customer_name}</strong>
                  </p>
                  {completedOrder.customer_phone && (
                    <p className="text-smoke">
                      WhatsApp: <span className="font-mono text-mist">{displayPhone(completedOrder.customer_phone)}</span>
                    </p>
                  )}
                  <p className="text-smoke">
                    Forma de Pagamento: <strong className="text-gold-light capitalize">{completedOrder.payment_method}</strong>
                  </p>
                </div>
              )}

              {/* Itens */}
              <div className="space-y-2 border-b border-line pb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-smoke">Peças Selecionadas</p>
                {completedOrder.items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-ivory">
                      <strong className="font-mono">{it.quantity}x</strong> {it.name}{' '}
                      <span className="text-[10px] text-smoke">({it.size})</span>
                    </span>
                    <span className="font-mono text-mist font-bold">
                      {formatBRL((it.priceCents || 0) * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-ivory">Total Pago:</span>
                <span className="font-display text-2xl font-extrabold text-gold tabular-nums">
                  {formatBRL(completedOrder.total_cents ?? 0)}
                </span>
              </div>
            </div>

            {/* Ações do Recibo */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="flex-1 border-line text-ivory text-xs flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" /> Imprimir Recibo / Salvar PDF
              </Button>

              {completedOrder.customer_phone && (
                <a
                  href={
                    waLinkFor(
                      completedOrder.customer_phone,
                      `Olá ${completedOrder.customer_name ?? 'Cliente'}! Segue o comprovante do seu pedido ${completedOrder.id} na Titi's Store no valor de ${formatBRL(completedOrder.total_cents ?? 0)}. Agradecemos imensamente a preferência! ✨`,
                    ) || '#'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 transition-colors"
                >
                  <WhatsAppIcon className="h-4 w-4" /> Enviar no WhatsApp
                </a>
              )}
            </div>

            <Button
              size="lg"
              onClick={() => {
                setReceiptModalOpen(false);
                setCompletedOrder(null);
              }}
              className="w-full bg-surface-2 text-ivory hover:bg-surface text-xs"
            >
              Fechar & Nova Venda
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
