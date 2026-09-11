'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { SettingRow } from '@/lib/settings';
import type { OrderRow, Product } from '@/lib/types';
import {
  describeError,
  fetchAdminCoupons,
  fetchAdminOrders,
  fetchAdminPayments,
  fetchAdminProducts,
  fetchAdminProfiles,
  fetchAdminSettings,
  type AdminCoupon,
  type AdminPayment,
  type ClientProfile,
} from './admin-utils';

export interface Resource<T> {
  data: T[];
  /** Primeira carga. */
  loading: boolean;
  /** Recarga manual ou após mutação (a lista continua visível). */
  refreshing: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Atualizações otimistas locais. */
  setData: Dispatch<SetStateAction<T[]>>;
}

function useResource<T>(fetcher: () => Promise<T[]>, fallbackMessage: string): Resource<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const rows = await fetcher();
      if (!mounted.current) return;
      setData(rows);
      setError(null);
    } catch (err) {
      if (!mounted.current) return;
      setError(describeError(err, fallbackMessage));
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [fetcher, fallbackMessage]);

  // Primeira carga: o estado só muda no retorno da requisição (assinatura de um sistema externo).
  useEffect(() => {
    mounted.current = true;
    fetcher().then(
      (rows) => {
        if (!mounted.current) return;
        setData(rows);
        setError(null);
        setLoading(false);
      },
      (err: unknown) => {
        if (!mounted.current) return;
        setError(describeError(err, fallbackMessage));
        setLoading(false);
      },
    );
    return () => {
      mounted.current = false;
    };
  }, [fetcher, fallbackMessage]);

  const reload = useCallback(async () => {
    setRefreshing(true);
    await load();
  }, [load]);

  return { data, loading, refreshing, error, reload, setData };
}

export function useAdminProducts(): Resource<Product> {
  return useResource(fetchAdminProducts, 'Não foi possível carregar o acervo.');
}

export function useAdminOrders(): Resource<OrderRow> {
  return useResource(fetchAdminOrders, 'Não foi possível carregar os pedidos.');
}

export function useAdminClients(): Resource<ClientProfile> {
  return useResource(fetchAdminProfiles, 'Não foi possível carregar os clientes.');
}

export function useAdminPayments(): Resource<AdminPayment> {
  return useResource(fetchAdminPayments, 'Não foi possível carregar os pagamentos.');
}

export function useAdminCoupons(): Resource<AdminCoupon> {
  return useResource(fetchAdminCoupons, 'Não foi possível carregar os cupons.');
}

export function useAdminSettings(): Resource<SettingRow> {
  return useResource(fetchAdminSettings, 'Não foi possível carregar as configurações.');
}
