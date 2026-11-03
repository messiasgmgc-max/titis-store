-- Execute uma vez no SQL Editor do Supabase antes de habilitar o Pushover.
-- Sem backfill: pedidos antigos não disparam notificações inesperadas.
begin;
create table if not exists public.order_push_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  recipient_user_id uuid references auth.users(id),
  user_key text not null default '',
  app_token text not null default '',
  device text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.order_push_settings(id) values(true) on conflict do nothing;
create table if not exists public.order_push_reminders (
  order_id text primary key references public.orders(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id),
  next_send_at timestamptz not null default now(),
  viewed_at timestamptz,
  last_sent_at timestamptz,
  sent_count integer not null default 0,
  last_error text,
  lease_id uuid,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists order_push_due on public.order_push_reminders(next_send_at) where viewed_at is null;
alter table public.order_push_settings enable row level security;
alter table public.order_push_reminders enable row level security;
revoke all on public.order_push_settings, public.order_push_reminders from anon, authenticated;
grant all on public.order_push_settings, public.order_push_reminders to service_role;

create or replace function public.enqueue_order_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.channel in ('online','mercadopago','whatsapp') and new.status not in ('cancelado','concluido') then
    insert into public.order_push_reminders(order_id, recipient_user_id)
      select new.id, s.recipient_user_id from public.order_push_settings s
      where s.id and s.enabled and s.recipient_user_id is not null
      on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists order_push_after_insert on public.orders;
create trigger order_push_after_insert after insert on public.orders for each row execute function public.enqueue_order_push();

-- Uma execução concorrente não pode reivindicar a mesma entrega.
create or replace function public.claim_order_push(p_limit integer default 10)
returns setof public.order_push_reminders language plpgsql security definer set search_path = public as $$
begin
  return query
    with due as (
      select r.order_id from public.order_push_reminders r
      join public.orders o on o.id = r.order_id
      join public.order_push_settings s on s.id and s.enabled and s.recipient_user_id = r.recipient_user_id
      join public.profiles p on p.id = s.recipient_user_id and p.role = 'admin'
      where r.viewed_at is null and r.next_send_at <= now()
        and (r.locked_until is null or r.locked_until < now())
        and o.status not in ('cancelado','concluido')
        and o.dispatched_at is null
      order by r.next_send_at limit least(greatest(p_limit, 1), 20)
      for update of r skip locked
    )
    update public.order_push_reminders r set lease_id = gen_random_uuid(), locked_until = now() + interval '2 minutes'
    from due where r.order_id = due.order_id returning r.*;
end $$;
revoke all on function public.enqueue_order_push() from public, anon, authenticated;
revoke all on function public.claim_order_push(integer) from public, anon, authenticated;
grant execute on function public.claim_order_push(integer) to service_role;
commit;
