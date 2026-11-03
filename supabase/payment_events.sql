-- ============================================================
-- Migration: Criação da tabela de auditoria de pagamentos (payment_events)
-- Idempotente e versionada para Supabase / PostgreSQL
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id TEXT NOT NULL,
  order_id TEXT,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  source TEXT NOT NULL, -- 'webhook', 'status_polling', 'cron_reconciliation', 'admin_manual'
  amount_cents INTEGER,
  currency TEXT DEFAULT 'BRL',
  payload_snapshot JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para buscas rápidas de auditoria e reconciliação
CREATE INDEX IF NOT EXISTS idx_payment_events_payment_id ON public.payment_events (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_order_id ON public.payment_events (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON public.payment_events (created_at DESC);

-- Habilitar RLS
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança: Leitura para admins autenticados, inserção liberada para a service role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'payment_events' AND policyname = 'Admins can view payment_events'
  ) THEN
    CREATE POLICY "Admins can view payment_events"
      ON public.payment_events
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE public.profiles.id = auth.uid()
          AND public.profiles.role = 'admin'
        )
      );
  END IF;
END $$;

-- ============================================================
-- ROLLBACK SCRIPT (Execute caso queira reverter a migração):
--
-- DROP POLICY IF EXISTS "Admins can view payment_events" ON public.payment_events;
-- DROP TABLE IF EXISTS public.payment_events;
-- ============================================================
