-- =============================================================================
--  TITI'S STORE · Schema do Supabase
--  Consultoria de imagem masculina online · Catálogo · Pedidos via WhatsApp
-- -----------------------------------------------------------------------------
--  Como usar
--    Supabase → SQL Editor → New query → cole ESTE ARQUIVO INTEIRO → Run.
--    Rode com o papel padrão do editor (postgres), sem "impersonate role".
--
--  Garantias
--    • Idempotente: pode rodar quantas vezes precisar, em projeto novo ou no
--      projeto que já executou a versão anterior deste arquivo.
--    • Transacional: tudo roda entre BEGIN e COMMIT; se um comando falhar,
--      nenhuma alteração é aplicada.
--    • Não apaga dados de clientes; apenas normaliza valores inválidos.
--
--  Seções
--    0. Base ............... extensões, set_updated_at(), limpeza de políticas
--    1. Perfis ............. public.profiles (inclui bloqueio e observações do
--                            admin), is_admin(), has_consulting_access(),
--                            gatilhos de auth
--    2. Catálogo ........... public.products e acervo inicial
--    3. Consultorias ....... public.consultations (exige plano ativo para salvar)
--    4. Pedidos ............ public.orders
--    5. Pagamentos ......... public.payments (com desconto/cupom),
--                            grant_consulting_access() e set_client_access()
--    6. Cupons ............. public.coupons, quote_coupon() e redeem_coupon()
--    7. Configurações ...... public.settings (WhatsApp, checkout, planos, aviso)
--    8. Storage ............ bucket "products"
--    9. Recarregar a API
--    Rodapé ................ comandos úteis (admin, liberar acesso, verificações)
-- =============================================================================

begin;


-- =============================================================================
-- 0. BASE
-- =============================================================================

-- gen_random_uuid() é nativa no Postgres 13+; pgcrypto mantém compatibilidade.
create extension if not exists pgcrypto with schema extensions;

-- Carimba updated_at em todo UPDATE (usada por profiles, products, orders e payments).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Remove TODAS as políticas atuais das tabelas do app: as recursivas da versão
-- anterior e qualquer uma criada manualmente pelo Dashboard. Todas são
-- recriadas nas seções abaixo, dentro desta mesma transação.
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
      from pg_catalog.pg_policies
     where schemaname = 'public'
       and tablename in ('profiles', 'products', 'consultations', 'orders', 'payments', 'coupons', 'settings')
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end;
$$;


-- =============================================================================
-- 1. PERFIS · public.profiles
-- =============================================================================

-- 1.1 Tabela e colunas --------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text,
  email               text,
  phone               text,
  role                text not null default 'client',
  avatar_url          text,
  preferred_skin_tone text,
  skin_subtone        text,
  contrast_level      text,
  seasonal_palette    text,
  preferred_style     text,
  plan                text,
  access_until        timestamptz,
  is_blocked          boolean not null default false,
  admin_notes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz default now()
);

alter table public.profiles
  add column if not exists full_name           text,
  add column if not exists email               text,
  add column if not exists phone               text,
  add column if not exists role                text default 'client',
  add column if not exists avatar_url          text,
  add column if not exists preferred_skin_tone text,
  add column if not exists skin_subtone        text,
  add column if not exists contrast_level      text,
  add column if not exists seasonal_palette    text,
  add column if not exists preferred_style     text,
  add column if not exists plan                text,
  add column if not exists access_until        timestamptz,
  add column if not exists is_blocked          boolean not null default false,
  add column if not exists admin_notes         text,
  add column if not exists weight_kg           numeric,
  add column if not exists height_cm           numeric,
  add column if not exists age                 integer,
  add column if not exists gender              text,
  add column if not exists body_type           text,
  add column if not exists cpf                 text,
  add column if not exists shipping_address    jsonb,
  add column if not exists created_at          timestamptz not null default now(),
  add column if not exists updated_at          timestamptz default now();

-- A versão anterior exigia full_name; cadastros sem nome passam a ser aceitos.
alter table public.profiles alter column full_name drop not null;

comment on table public.profiles is
  'Perfil de cada conta (1:1 com auth.users). role: client | vip | admin. plan/access_until: último plano e fim do acesso VIP (null = sem prazo).';

comment on column public.profiles.plan is
  'Último plano contratado: passe | clube | presencial. Alterado só por admin, service_role ou SQL Editor.';
comment on column public.profiles.access_until is
  'Fim do acesso à consultoria digital para role = vip (null = sem prazo). Alterado só por admin, service_role ou SQL Editor.';
comment on column public.profiles.is_blocked is
  'Bloqueio manual pelo admin: derruba o acesso à consultoria mesmo com plano vigente (admins nunca são afetados).';
comment on column public.profiles.admin_notes is
  'Observações internas da administração sobre o cliente (motivo de bloqueio, combinados). O cliente não vê nem edita.';

-- 1.2 Normalização de dados legados e CHECKs ----------------------------------
-- Remove os CHECKs (inclusive os nomes automáticos da versão anterior) antes de
-- normalizar, para recriá-los no formato atual.
alter table public.profiles
  drop constraint if exists profiles_role_check,
  drop constraint if exists profiles_skin_subtone_check,
  drop constraint if exists profiles_contrast_level_check,
  drop constraint if exists profiles_preferred_style_check,
  drop constraint if exists profiles_plan_check;

update public.profiles
   set plan = case lower(btrim(plan))
                when 'passe'      then 'passe'
                when 'clube'      then 'clube'
                when 'presencial' then 'presencial'
                else null
              end
 where plan is not null
   and plan not in ('passe', 'clube', 'presencial');

update public.profiles
   set role = case lower(btrim(coalesce(role, '')))
                when 'admin' then 'admin'
                when 'vip'   then 'vip'
                else 'client'
              end
 where role is null
    or role not in ('client', 'vip', 'admin');

update public.profiles
   set skin_subtone = case lower(btrim(skin_subtone))
                        when 'frio'   then 'frio'
                        when 'neutro' then 'neutro'
                        when 'quente' then 'quente'
                        else null
                      end
 where skin_subtone is not null
   and skin_subtone not in ('frio', 'neutro', 'quente');

update public.profiles
   set contrast_level = case lower(btrim(contrast_level))
                          when 'alto'  then 'alto'
                          when 'medio' then 'medio'
                          when 'médio' then 'medio'
                          when 'baixo' then 'baixo'
                          else null
                        end
 where contrast_level is not null
   and contrast_level not in ('alto', 'medio', 'baixo');

update public.profiles
   set preferred_style = case lower(btrim(preferred_style))
                           when 'classico'      then 'classico'
                           when 'clássico'      then 'classico'
                           when 'contemporaneo' then 'contemporaneo'
                           when 'contemporâneo' then 'contemporaneo'
                           when 'ousado'        then 'ousado'
                           else null
                         end
 where preferred_style is not null
   and preferred_style not in ('classico', 'contemporaneo', 'ousado');

-- O gatilho antigo gravava a mesma foto de banco de imagens como avatar de todos.
update public.profiles
   set avatar_url = null
 where avatar_url like 'https://images.unsplash.com/photo-1534528741775-53994a69daeb%';

update public.profiles
   set created_at = coalesce(updated_at, now())
 where created_at is null;

update public.profiles
   set is_blocked = false
 where is_blocked is null;

alter table public.profiles
  alter column role       set default 'client',
  alter column role       set not null,
  alter column is_blocked set default false,
  alter column is_blocked set not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now();

alter table public.profiles
  add constraint profiles_role_check
    check (role in ('client', 'vip', 'admin')),
  add constraint profiles_skin_subtone_check
    check (skin_subtone is null or skin_subtone in ('frio', 'neutro', 'quente')),
  add constraint profiles_contrast_level_check
    check (contrast_level is null or contrast_level in ('alto', 'medio', 'baixo')),
  add constraint profiles_preferred_style_check
    check (preferred_style is null or preferred_style in ('classico', 'contemporaneo', 'ousado')),
  add constraint profiles_plan_check
    check (plan is null or plan in ('passe', 'clube', 'presencial'));

-- 1.3 is_admin() --------------------------------------------------------------
-- Verdadeiro quando o usuário autenticado da requisição tem role = 'admin'.
-- SECURITY DEFINER: consulta profiles com os privilégios do dono da função, sem
-- reentrar no RLS. É isso que elimina o erro
-- "infinite recursion detected in policy for relation profiles".
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and role = 'admin'
  );
$$;

comment on function public.is_admin() is
  'true quando auth.uid() pertence a um perfil com role = admin (SECURITY DEFINER, evita recursão de RLS).';

grant execute on function public.is_admin() to anon, authenticated;

-- 1.3b has_consulting_access() ------------------------------------------------
-- Regra única de acesso à consultoria digital (espelha src/lib/access.ts):
-- admin sempre; vip não bloqueado enquanto access_until for nulo (sem prazo)
-- ou futuro. SECURITY DEFINER pelo mesmo motivo de is_admin(): pode ser usada
-- em políticas.
create or replace function public.has_consulting_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and (
             role = 'admin'
          or (
               role = 'vip'
               and not is_blocked
               and (access_until is null or access_until > now())
             )
       )
  );
$$;

comment on function public.has_consulting_access() is
  'true quando auth.uid() é admin, ou vip não bloqueado com access_until nulo ou futuro (SECURITY DEFINER).';

grant execute on function public.has_consulting_access() to anon, authenticated;

-- 1.4 RLS ---------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Políticas da versão anterior (a última era recursiva).
drop policy if exists "Usuários podem visualizar o próprio perfil" on public.profiles;
drop policy if exists "Usuários podem atualizar o próprio perfil"  on public.profiles;
drop policy if exists "Admins possuem controle total de perfis"    on public.profiles;
-- Políticas atuais (recriadas abaixo).
drop policy if exists "Perfis: leitura do próprio perfil ou admin" on public.profiles;
drop policy if exists "Perfis: criação do próprio perfil"          on public.profiles;
drop policy if exists "Perfis: edição do próprio perfil ou admin"  on public.profiles;
drop policy if exists "Perfis: exclusão apenas por admin"          on public.profiles;

create policy "Perfis: leitura do próprio perfil ou admin"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "Perfis: criação do próprio perfil"
  on public.profiles
  for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "Perfis: edição do próprio perfil ou admin"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

create policy "Perfis: exclusão apenas por admin"
  on public.profiles
  for delete
  to authenticated
  using ((select public.is_admin()));

grant select, insert, update, delete on public.profiles to authenticated;
-- O webhook do Mercado Pago (service_role) estende o acesso do cliente.
grant select, update on public.profiles to service_role;

-- 1.5 Proteção contra escalonamento de privilégio ------------------------------
-- Requisições de usuários comuns (JWT anon ou authenticated, sem ser admin):
--   • INSERT: role é sempre 'client', plan e access_until são nulos, o bloqueio
--     começa desligado, as observações do admin ficam vazias e o e-mail vem de
--     auth.users;
--   • UPDATE: trocar role ou id gera erro; plan, access_until, is_blocked,
--     admin_notes, e-mail e created_at são preservados (um perfil salvo com
--     valores antigos não falha, mas também não altera o acesso; o e-mail
--     oficial é o da conta e é sincronizado pelo gatilho 1.7).
-- Passam livremente: SQL Editor e processos internos do Supabase (sem JWT, como
-- o cadastro feito pelo Auth e o handle_new_user), a service_role e admins.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  if jwt_role in ('', 'service_role') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role         := 'client';
    new.plan         := null;
    new.access_until := null;
    new.is_blocked   := false;
    new.admin_notes  := null;
    new.email        := (select u.email from auth.users u where u.id = new.id);
    new.created_at   := now();
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Não é permitido alterar o identificador do perfil.'
      using errcode = '42501';
  end if;

  if new.role is distinct from old.role then
    raise exception 'Apenas administradores podem alterar o nível de acesso.'
      using errcode = '42501';
  end if;

  -- Plano, prazo, bloqueio e observações só mudam por admin, service_role
  -- (webhook) ou SQL Editor.
  new.plan         := old.plan;
  new.access_until := old.access_until;
  new.is_blocked   := old.is_blocked;
  new.admin_notes  := old.admin_notes;
  new.email        := old.email;
  new.created_at   := old.created_at;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before insert or update on public.profiles
  for each row
  execute function public.protect_profile_privileges();

-- 1.6 updated_at --------------------------------------------------------------
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- 1.7 Gatilhos de autenticação -------------------------------------------------
-- Cria o perfil a cada cadastro. Um erro aqui nunca bloqueia o cadastro: ele é
-- registrado como WARNING nos logs do Postgres e o perfil pode ser recriado
-- rodando este script de novo (backfill 1.8).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.profiles as p (id, email, full_name, phone, role)
    values (
      new.id,
      new.email,
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), '')
      ),
      nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
      'client'
    )
    on conflict (id) do update
      set email     = coalesce(excluded.email, p.email),
          full_name = coalesce(p.full_name, excluded.full_name),
          phone     = coalesce(p.phone, excluded.phone);
  exception
    when others then
      raise warning 'handle_new_user: perfil não criado para %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Mantém profiles.email igual ao e-mail da conta quando ele é alterado no Auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    update public.profiles
       set email = new.email
     where id = new.id
       and email is distinct from new.email;
  exception
    when others then
      raise warning 'handle_user_email_change: e-mail do perfil % não sincronizado: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- 1.8 Backfill ----------------------------------------------------------------
-- Perfis faltantes para contas que já existem.
insert into public.profiles (id, email, full_name, phone, role)
select u.id,
       u.email,
       coalesce(
         nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
         nullif(split_part(coalesce(u.email, ''), '@', 1), '')
       ),
       nullif(btrim(u.raw_user_meta_data ->> 'phone'), ''),
       'client'
  from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- E-mail do perfil = e-mail da conta (preenche vazios e corrige divergências).
update public.profiles p
   set email = u.email
  from auth.users u
 where u.id = p.id
   and u.email is not null
   and p.email is distinct from u.email;

-- Nome vazio, ou igual ao e-mail (padrão do gatilho antigo), vira o nome do
-- cadastro ou a parte do e-mail antes do @.
update public.profiles p
   set full_name = src.name
  from (
    select u.id,
           coalesce(
             nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
             nullif(split_part(coalesce(u.email, ''), '@', 1), '')
           ) as name,
           lower(coalesce(u.email, '')) as email_lower
      from auth.users u
  ) as src
 where src.id = p.id
   and src.name is not null
   and p.full_name is distinct from src.name
   and (
         nullif(btrim(p.full_name), '') is null
      or lower(btrim(p.full_name)) = src.email_lower
   );


-- =============================================================================
-- 2. CATÁLOGO · public.products
-- =============================================================================

-- 2.1 Tabela e colunas --------------------------------------------------------
create table if not exists public.products (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text,
  name                 text not null,
  category             text not null default 'Alfaiataria',
  slot                 text not null default 'sobreposicao',
  description          text,
  fabric               text,
  color_name           text,
  hex_color            text,
  image_url            text,
  gallery              text[] not null default '{}',
  price_cents          integer,
  sizes                text[] not null default '{}',
  skin_tones           text[] not null default '{}',
  occasions            text[] not null default '{}',
  climates             text[] not null default '{}',
  formality            smallint not null default 3,
  season_compatibility text[] not null default '{}',
  is_active            boolean not null default true,
  is_featured          boolean not null default false,
  sort_order           integer not null default 100,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.products
  add column if not exists slug                 text,
  add column if not exists category             text not null default 'Alfaiataria',
  add column if not exists slot                 text not null default 'sobreposicao',
  add column if not exists description          text,
  add column if not exists fabric               text,
  add column if not exists color_name           text,
  add column if not exists hex_color            text,
  add column if not exists image_url            text,
  add column if not exists gallery              text[] not null default '{}',
  add column if not exists price_cents          integer,
  add column if not exists sizes                text[] not null default '{}',
  add column if not exists skin_tones           text[] not null default '{}',
  add column if not exists occasions            text[] not null default '{}',
  add column if not exists climates             text[] not null default '{}',
  add column if not exists formality            smallint not null default 3,
  add column if not exists season_compatibility text[] not null default '{}',
  add column if not exists is_active            boolean not null default true,
  add column if not exists is_featured          boolean not null default false,
  add column if not exists sort_order           integer not null default 100,
  add column if not exists created_at           timestamptz not null default now(),
  add column if not exists updated_at           timestamptz not null default now();

comment on table public.products is
  'Catálogo da loja. Leitura pública das peças ativas; escrita apenas por administradores.';

-- 2.2 Normalização de dados legados -------------------------------------------
alter table public.products
  drop constraint if exists products_slot_check,
  drop constraint if exists products_hex_color_check,
  drop constraint if exists products_price_cents_check,
  drop constraint if exists products_formality_check;

update public.products
   set category = 'Alfaiataria'
 where category is null
    or btrim(category) = '';

-- Categorias antigas → catálogo atual, com o slot correspondente.
-- Nomes atuais escritos com outra grafia só têm a categoria corrigida
-- (o slot escolhido no painel é preservado).
update public.products as p
   set category = m.category,
       slot     = case when m.is_legacy then m.slot else p.slot end
  from (values
    ('sobreposição', 'Alfaiataria', 'sobreposicao', true),
    ('sobreposicao', 'Alfaiataria', 'sobreposicao', true),
    ('camisa',       'Camisaria',   'superior',     true),
    ('camisas',      'Camisaria',   'superior',     true),
    ('calça',        'Calças',      'inferior',     true),
    ('calca',        'Calças',      'inferior',     true),
    ('calçado',      'Calçados',    'calcado',      true),
    ('calcado',      'Calçados',    'calcado',      true),
    ('acessório',    'Acessórios',  'acessorio',    true),
    ('acessorio',    'Acessórios',  'acessorio',    true),
    ('alfaiataria',  'Alfaiataria', 'sobreposicao', false),
    ('camisaria',    'Camisaria',   'superior',     false),
    ('malharia',     'Malharia',    'superior',     false),
    ('calças',       'Calças',      'inferior',     false),
    ('calcas',       'Calças',      'inferior',     false),
    ('calçados',     'Calçados',    'calcado',      false),
    ('calcados',     'Calçados',    'calcado',      false),
    ('acessórios',   'Acessórios',  'acessorio',    false),
    ('acessorios',   'Acessórios',  'acessorio',    false)
  ) as m (legacy_key, category, slot, is_legacy)
 where lower(btrim(p.category)) = m.legacy_key
   and (
         p.category is distinct from m.category
      or (m.is_legacy and p.slot is distinct from m.slot)
   );

-- Slot inválido → deduzido da categoria.
update public.products
   set slot = case
                when lower(btrim(slot)) in ('sobreposicao', 'superior', 'inferior', 'calcado', 'acessorio')
                  then lower(btrim(slot))
                when lower(btrim(category)) in ('camisaria', 'malharia')   then 'superior'
                when lower(btrim(category)) in ('calças', 'calcas')        then 'inferior'
                when lower(btrim(category)) in ('calçados', 'calcados')    then 'calcado'
                when lower(btrim(category)) in ('acessórios', 'acessorios') then 'acessorio'
                else 'sobreposicao'
              end
 where slot is null
    or slot not in ('sobreposicao', 'superior', 'inferior', 'calcado', 'acessorio');

-- Cor: aceita "1B2A4A" sem cerquilha; qualquer outro formato inválido vira null.
update public.products
   set hex_color = case
                     when btrim(hex_color) ~* '^#[0-9a-f]{6}$' then btrim(hex_color)
                     when btrim(hex_color) ~* '^[0-9a-f]{6}$'  then '#' || btrim(hex_color)
                     else null
                   end
 where hex_color is not null
   and hex_color !~* '^#[0-9a-f]{6}$';

-- Listas nulas → '{}'; formalidade fora de 1..5 é ajustada; preço negativo → null.
update public.products
   set gallery              = coalesce(gallery, '{}'),
       sizes                = coalesce(sizes, '{}'),
       skin_tones           = coalesce(skin_tones, '{}'),
       occasions            = coalesce(occasions, '{}'),
       climates             = coalesce(climates, '{}'),
       season_compatibility = coalesce(season_compatibility, '{}'),
       formality            = least(greatest(coalesce(formality, 3), 1), 5),
       price_cents          = case when price_cents < 0 then null else price_cents end,
       is_active            = coalesce(is_active, true),
       is_featured          = coalesce(is_featured, false),
       sort_order           = coalesce(sort_order, 100),
       created_at           = coalesce(created_at, now()),
       updated_at           = coalesce(updated_at, now())
 where gallery is null
    or sizes is null
    or skin_tones is null
    or occasions is null
    or climates is null
    or season_compatibility is null
    or formality is null
    or formality not between 1 and 5
    or price_cents < 0
    or is_active is null
    or is_featured is null
    or sort_order is null
    or created_at is null
    or updated_at is null;

-- Slugs: vazio → null; duplicados recebem sufixo com o id (o mais antigo mantém).
update public.products
   set slug = nullif(btrim(slug), '')
 where slug is not null
   and slug is distinct from nullif(btrim(slug), '');

with ranked as (
  select id,
         row_number() over (partition by slug order by created_at, id) as rn
    from public.products
   where slug is not null
)
update public.products as p
   set slug = p.slug || '-' || replace(p.id::text, '-', '')
  from ranked
 where ranked.id = p.id
   and ranked.rn > 1;

-- 2.3 Padrões, NOT NULL, CHECKs e índices --------------------------------------
alter table public.products
  alter column category             set default 'Alfaiataria',
  alter column category             set not null,
  alter column slot                 set default 'sobreposicao',
  alter column slot                 set not null,
  alter column gallery              set default '{}',
  alter column gallery              set not null,
  alter column sizes                set default '{}',
  alter column sizes                set not null,
  alter column skin_tones           set default '{}',
  alter column skin_tones           set not null,
  alter column occasions            set default '{}',
  alter column occasions            set not null,
  alter column climates             set default '{}',
  alter column climates             set not null,
  alter column season_compatibility set default '{}',
  alter column season_compatibility set not null,
  alter column formality            set default 3,
  alter column formality            set not null,
  alter column is_active            set default true,
  alter column is_active            set not null,
  alter column is_featured          set default false,
  alter column is_featured          set not null,
  alter column sort_order           set default 100,
  alter column sort_order           set not null,
  alter column created_at           set default now(),
  alter column created_at           set not null,
  alter column updated_at           set default now(),
  alter column updated_at           set not null,
  alter column id                   set default gen_random_uuid();

alter table public.products
  add constraint products_slot_check
    check (slot in ('sobreposicao', 'superior', 'inferior', 'calcado', 'acessorio')),
  add constraint products_hex_color_check
    check (hex_color is null or hex_color ~* '^#[0-9a-f]{6}$'),
  add constraint products_price_cents_check
    check (price_cents is null or price_cents >= 0),
  add constraint products_formality_check
    check (formality between 1 and 5);

create unique index if not exists products_slug_unique_idx
  on public.products (slug)
  where slug is not null;

create index if not exists products_active_sort_idx
  on public.products (is_active, sort_order);

create index if not exists products_category_idx
  on public.products (category);

-- 2.4 updated_at --------------------------------------------------------------
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- 2.5 RLS ---------------------------------------------------------------------
alter table public.products enable row level security;

-- Políticas da versão anterior.
drop policy if exists "Todos podem visualizar catálogo de produtos" on public.products;
drop policy if exists "Apenas admins podem modificar produtos"      on public.products;
-- Políticas atuais (recriadas abaixo).
drop policy if exists "Catálogo: leitura pública das peças ativas"  on public.products;
drop policy if exists "Catálogo: cadastro apenas por admin"         on public.products;
drop policy if exists "Catálogo: edição apenas por admin"           on public.products;
drop policy if exists "Catálogo: exclusão apenas por admin"         on public.products;

create policy "Catálogo: leitura pública das peças ativas"
  on public.products
  for select
  to anon, authenticated
  using (is_active or (select public.is_admin()));

create policy "Catálogo: cadastro apenas por admin"
  on public.products
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Catálogo: edição apenas por admin"
  on public.products
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Catálogo: exclusão apenas por admin"
  on public.products
  for delete
  to authenticated
  using ((select public.is_admin()));

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- 2.6 Acervo inicial ----------------------------------------------------------
-- As mesmas 5 peças de web/src/lib/catalog-seed.ts, inseridas SOMENTE quando o
-- catálogo está vazio (nunca duplica nem se mistura a um catálogo existente).
-- Preço fica "sob consulta" (price_cents null).
insert into public.products (
  slug, name, category, slot, description, fabric, color_name, hex_color, image_url,
  sizes, skin_tones, occasions, climates, formality, is_featured, sort_order
)
select v.slug, v.name, v.category, v.slot, v.description, v.fabric, v.color_name, v.hex_color, v.image_url,
       v.sizes, v.skin_tones, v.occasions, v.climates, v.formality, v.is_featured, v.sort_order
  from (values
    (
      'blazer-tailored-super-120s-marinho',
      'Blazer Tailored Super 120s',
      'Alfaiataria',
      'sobreposicao',
      'Corte italiano slim com ombros estruturados e forro acetinado. A peça que resolve da reunião ao jantar.',
      'Lã fria Super 120s',
      'Azul Marinho',
      '#1B2A4A',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=900&q=80',
      array['46', '48', '50', '52', '54']::text[],
      array['clara', 'morena', 'parda', 'negra']::text[],
      array['trabalho', 'jantar', 'festa', 'esporte']::text[],
      array['frio', 'ameno']::text[],
      4,
      true,
      10
    ),
    (
      'trico-cashmere-italiano-terracota',
      'Tricô Cashmere Italiano',
      'Malharia',
      'superior',
      'Fios nobres de cashmere, gola careca reforçada e caimento fluido que não marca.',
      'Cashmere',
      'Terracota',
      '#A0522D',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=900&q=80',
      array['P', 'M', 'G', 'GG']::text[],
      array['morena', 'parda', 'negra']::text[],
      array['casual', 'barzinho', 'jantar']::text[],
      array['frio', 'ameno']::text[],
      2,
      true,
      20
    ),
    (
      'camisa-pima-cotton-giza-marfim',
      'Camisa Pima Cotton Giza',
      'Camisaria',
      'superior',
      'Algodão egípcio de fibra extralonga, brilho discreto e colarinho que se mantém firme o dia todo.',
      'Algodão egípcio Giza',
      'Branco Marfim',
      '#F4EFE4',
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=80',
      array['P', 'M', 'G', 'GG']::text[],
      '{}'::text[],
      array['trabalho', 'jantar', 'festa', 'esporte', 'casual']::text[],
      '{}'::text[],
      3,
      false,
      30
    ),
    (
      'chino-tailored-cinza-grafite',
      'Chino Tailored',
      'Calças',
      'inferior',
      'Bolsos faca, cós ajustado sem necessidade de cinto e elastano na medida certa para o movimento.',
      'Algodão com elastano',
      'Cinza Grafite',
      '#2C3539',
      'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?w=900&q=80',
      array['38', '40', '42', '44', '46']::text[],
      '{}'::text[],
      array['trabalho', 'casual', 'barzinho', 'jantar', 'esporte']::text[],
      '{}'::text[],
      3,
      false,
      40
    ),
    (
      'costume-noturno-obsidian',
      'Costume Noturno',
      'Alfaiataria',
      'sobreposicao',
      'Paletó e calça em lã fria com toque acetinado. Silhueta limpa para casamentos e noites de gala.',
      'Lã fria acetinada',
      'Preto Obsidian',
      '#0B0C10',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=900&q=80',
      array['46', '48', '50', '52', '54']::text[],
      array['parda', 'negra', 'clara']::text[],
      array['festa', 'jantar', 'trabalho']::text[],
      array['frio', 'ameno']::text[],
      5,
      true,
      50
    )
  ) as v (
    slug, name, category, slot, description, fabric, color_name, hex_color, image_url,
    sizes, skin_tones, occasions, climates, formality, is_featured, sort_order
  )
 where not exists (select 1 from public.products);


-- =============================================================================
-- 3. CONSULTORIAS · public.consultations
-- =============================================================================

-- 3.1 Tabela e colunas --------------------------------------------------------
create table if not exists public.consultations (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text,
  skin_tone        text not null,
  skin_subtone     text,
  contrast_level   text,
  seasonal_palette text,
  occasion         text not null,
  custom_venue     text,
  time_of_day      text not null,
  climate          text not null,
  style_preference text,
  results          jsonb not null default '[]'::jsonb,
  source           text not null default 'atelier',
  created_at       timestamptz not null default now()
);

alter table public.consultations
  add column if not exists title            text,
  add column if not exists skin_subtone     text,
  add column if not exists contrast_level   text,
  add column if not exists seasonal_palette text,
  add column if not exists custom_venue     text,
  add column if not exists style_preference text,
  add column if not exists results          jsonb not null default '[]'::jsonb,
  add column if not exists source           text not null default 'atelier',
  add column if not exists created_at       timestamptz not null default now();

comment on table public.consultations is
  'Consultorias salvas pelos clientes: contexto informado e looks gerados na consultoria online (results = Look[]).';

-- 3.2 Normalização, CHECK e índice --------------------------------------------
alter table public.consultations
  drop constraint if exists consultations_source_check;

update public.consultations
   set source = case
                  when lower(btrim(source)) in ('ai', 'atelier') then lower(btrim(source))
                  else 'atelier'
                end
 where source is null
    or source not in ('ai', 'atelier');

update public.consultations set results = '[]'::jsonb where results is null;
update public.consultations set created_at = now()   where created_at is null;

alter table public.consultations
  alter column id         set default gen_random_uuid(),
  alter column results    set default '[]'::jsonb,
  alter column results    set not null,
  alter column source     set default 'atelier',
  alter column source     set not null,
  alter column created_at set default now(),
  alter column created_at set not null;

alter table public.consultations
  add constraint consultations_source_check
    check (source in ('ai', 'atelier'));

-- Na versão anterior user_id era opcional. Linhas sem titular não aparecem para
-- ninguém; se existirem, a coluna segue opcional (nada é apagado) e o aviso
-- aparece no resultado. Novas linhas sempre exigem user_id pela política de INSERT.
do $$
begin
  if exists (select 1 from public.consultations where user_id is null) then
    raise notice 'consultations.user_id: existem registros sem titular; a coluna permanece opcional até que sejam removidos.';
  else
    alter table public.consultations alter column user_id set not null;
  end if;
end;
$$;

create index if not exists consultations_user_created_idx
  on public.consultations (user_id, created_at desc);

-- 3.3 RLS ---------------------------------------------------------------------
alter table public.consultations enable row level security;

-- Política da versão anterior.
drop policy if exists "Usuários gerenciam suas próprias consultas"   on public.consultations;
-- Políticas atuais (recriadas abaixo).
drop policy if exists "Consultorias: leitura do titular ou admin"    on public.consultations;
drop policy if exists "Consultorias: registro pelo titular"          on public.consultations;
drop policy if exists "Consultorias: edição pelo titular"            on public.consultations;
drop policy if exists "Consultorias: exclusão pelo titular ou admin" on public.consultations;

create policy "Consultorias: leitura do titular ou admin"
  on public.consultations
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Salvar consultorias faz parte da consultoria paga: exige plano ativo.
create policy "Consultorias: registro pelo titular"
  on public.consultations
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.has_consulting_access())
  );

create policy "Consultorias: edição pelo titular"
  on public.consultations
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Consultorias: exclusão pelo titular ou admin"
  on public.consultations
  for delete
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

grant select, insert, update, delete on public.consultations to authenticated;


-- =============================================================================
-- 4. PEDIDOS · public.orders
-- =============================================================================
-- Pedidos enviados pela sacola antes de abrir o WhatsApp. Visitantes podem
-- CRIAR um pedido (com id gerado no navegador), mas não podem LER pedidos —
-- por isso o front nunca deve usar .insert().select() sem sessão.

-- 4.1 Tabela e colunas --------------------------------------------------------
create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete set null,
  customer_name  text not null,
  customer_phone text,
  notes          text,
  items          jsonb not null default '[]'::jsonb,
  total_cents    integer,
  status         text not null default 'novo',
  channel        text not null default 'whatsapp',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.orders
  add column if not exists user_id        uuid references auth.users (id) on delete set null,
  add column if not exists customer_phone text,
  add column if not exists notes          text,
  add column if not exists items          jsonb not null default '[]'::jsonb,
  add column if not exists total_cents    integer,
  add column if not exists status         text not null default 'novo',
  add column if not exists channel        text not null default 'whatsapp',
  add column if not exists created_at     timestamptz not null default now(),
  add column if not exists updated_at     timestamptz not null default now();

comment on table public.orders is
  'Pedidos da sacola (atendimento via WhatsApp). items = CartItem[]. Visitantes criam, não leem.';

-- 4.2 CHECKs e índices --------------------------------------------------------
alter table public.orders
  drop constraint if exists orders_customer_name_check,
  drop constraint if exists orders_customer_phone_check,
  drop constraint if exists orders_notes_check,
  drop constraint if exists orders_items_check,
  drop constraint if exists orders_total_cents_check,
  drop constraint if exists orders_status_check,
  drop constraint if exists orders_channel_check;

alter table public.orders
  alter column id set default gen_random_uuid();

alter table public.orders
  add constraint orders_customer_name_check
    check (char_length(customer_name) <= 120 and char_length(btrim(customer_name)) >= 2),
  add constraint orders_customer_phone_check
    check (customer_phone is null or char_length(customer_phone) <= 30),
  add constraint orders_notes_check
    check (notes is null or char_length(notes) <= 2000),
  -- CASE garante que jsonb_array_length só roda quando items é um array.
  add constraint orders_items_check
    check (
      case
        when jsonb_typeof(items) = 'array' then jsonb_array_length(items) between 1 and 60
        else false
      end
    ),
  add constraint orders_total_cents_check
    check (total_cents is null or total_cents >= 0),
  add constraint orders_status_check
    check (status in ('novo', 'em_atendimento', 'concluido', 'cancelado')),
  add constraint orders_channel_check
    check (channel = 'whatsapp');

create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);

create index if not exists orders_user_idx
  on public.orders (user_id);

-- 4.3 updated_at --------------------------------------------------------------
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row
  execute function public.set_updated_at();

-- 4.4 RLS ---------------------------------------------------------------------
alter table public.orders enable row level security;

drop policy if exists "Pedidos: envio por visitantes e clientes" on public.orders;
drop policy if exists "Pedidos: leitura do titular ou admin"     on public.orders;
drop policy if exists "Pedidos: atualização apenas por admin"    on public.orders;
drop policy if exists "Pedidos: exclusão apenas por admin"       on public.orders;

create policy "Pedidos: envio por visitantes e clientes"
  on public.orders
  for insert
  to anon, authenticated
  with check (
    (user_id is null or user_id = (select auth.uid()))
    and status = 'novo'
  );

create policy "Pedidos: leitura do titular ou admin"
  on public.orders
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Pedidos: atualização apenas por admin"
  on public.orders
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Pedidos: exclusão apenas por admin"
  on public.orders
  for delete
  to authenticated
  using ((select public.is_admin()));

grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;


-- =============================================================================
-- 5. PAGAMENTOS · public.payments
-- =============================================================================
-- Um registro por compra de plano. O checkout do Mercado Pago cria a linha
-- 'pending' (service_role) e o webhook atualiza o status; applied_at marca que o
-- acesso já foi liberado, para nunca somar o mesmo pagamento duas vezes.
-- Liberações manuais do painel entram como provider 'manual'.

-- 5.1 Tabela e colunas --------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  plan                text not null,
  amount_cents        integer not null,
  provider            text not null default 'manual',
  provider_payment_id text,
  status              text not null default 'pending',
  discount_cents      integer not null default 0,
  coupon_code         text,
  applied_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.payments
  add column if not exists provider_payment_id text,
  add column if not exists discount_cents      integer not null default 0,
  add column if not exists coupon_code         text,
  add column if not exists applied_at          timestamptz,
  add column if not exists created_at          timestamptz not null default now(),
  add column if not exists updated_at          timestamptz not null default now();

comment on table public.payments is
  'Pagamentos de planos da consultoria (Mercado Pago, WhatsApp ou manual). amount_cents = valor final já com desconto; applied_at = acesso já liberado.';
comment on column public.payments.discount_cents is
  'Desconto aplicado (cupom ou manual), em centavos. amount_cents já é o valor cobrado.';
comment on column public.payments.coupon_code is
  'Código do cupom usado nesta compra (caixa-alta), se houver.';

-- 5.2 CHECKs e índices --------------------------------------------------------
alter table public.payments
  drop constraint if exists payments_plan_check,
  drop constraint if exists payments_amount_cents_check,
  drop constraint if exists payments_provider_check,
  drop constraint if exists payments_status_check,
  drop constraint if exists payments_discount_cents_check;

update public.payments
   set discount_cents = 0
 where discount_cents is null
    or discount_cents < 0;

alter table public.payments
  alter column id             set default gen_random_uuid(),
  alter column provider       set default 'manual',
  alter column status         set default 'pending',
  alter column discount_cents set default 0,
  alter column discount_cents set not null;

alter table public.payments
  add constraint payments_plan_check
    check (plan in ('passe', 'clube', 'presencial')),
  add constraint payments_amount_cents_check
    check (amount_cents >= 0),
  add constraint payments_discount_cents_check
    check (discount_cents >= 0),
  add constraint payments_provider_check
    check (provider in ('whatsapp', 'mercadopago', 'manual')),
  add constraint payments_status_check
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded'));

create index if not exists payments_user_created_idx
  on public.payments (user_id, created_at desc);

create unique index if not exists payments_provider_payment_id_unique_idx
  on public.payments (provider_payment_id)
  where provider_payment_id is not null;

-- 5.3 updated_at --------------------------------------------------------------
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row
  execute function public.set_updated_at();

-- 5.4 RLS ---------------------------------------------------------------------
-- A service_role (checkout e webhook) ignora o RLS.
alter table public.payments enable row level security;

drop policy if exists "Pagamentos: leitura do titular ou admin" on public.payments;
drop policy if exists "Pagamentos: registro apenas por admin"   on public.payments;
drop policy if exists "Pagamentos: edição apenas por admin"     on public.payments;
drop policy if exists "Pagamentos: exclusão apenas por admin"   on public.payments;

create policy "Pagamentos: leitura do titular ou admin"
  on public.payments
  for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Pagamentos: registro apenas por admin"
  on public.payments
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Pagamentos: edição apenas por admin"
  on public.payments
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Pagamentos: exclusão apenas por admin"
  on public.payments
  for delete
  to authenticated
  using ((select public.is_admin()));

grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.payments to service_role;

-- 5.5 grant_consulting_access() -----------------------------------------------
-- Liberação manual do acesso (painel admin ou SQL Editor):
--   • role vira 'vip' (admins continuam admin) e plan = p_plan;
--   • p_days informado: access_until = greatest(now(), access_until) + p_days dias;
--   • p_days nulo: sem prazo (access_until = null);
--   • registra o pagamento como provider 'manual', status 'approved', com o
--     desconto e o cupom informados (amount_cents = preço do plano − desconto).
-- Só executa para administradores logados, service_role ou SQL Editor (sem JWT).
-- A assinatura antiga (3 parâmetros) é removida para não haver ambiguidade
-- entre as duas versões; chamadas com 3 argumentos continuam funcionando.
drop function if exists public.grant_consulting_access(uuid, text, integer);

create or replace function public.grant_consulting_access(
  p_user uuid,
  p_plan text,
  p_days integer default null,
  p_discount_cents integer default 0,
  p_coupon_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role   text := coalesce(auth.jwt() ->> 'role', '');
  v_current  timestamptz;
  v_role     text;
  v_until    timestamptz;
  v_price    integer;
  v_discount integer;
  v_coupon   text;
begin
  if not (jwt_role in ('', 'service_role') or public.is_admin()) then
    raise exception 'Apenas administradores podem liberar acesso à consultoria.'
      using errcode = '42501';
  end if;

  if p_user is null then
    raise exception 'Informe o cliente.' using errcode = '22023';
  end if;

  if p_plan is null or p_plan not in ('passe', 'clube', 'presencial') then
    raise exception 'Plano inválido: %.', coalesce(p_plan, 'nulo') using errcode = '22023';
  end if;

  if p_days is not null and (p_days < 1 or p_days > 3660) then
    raise exception 'Duração inválida: informe de 1 a 3660 dias ou deixe sem prazo.' using errcode = '22023';
  end if;

  select p.role, p.access_until
    into v_role, v_current
    from public.profiles p
   where p.id = p_user
     for update;

  if not found then
    raise exception 'Perfil não encontrado para o cliente informado.' using errcode = 'P0002';
  end if;

  v_role  := case when v_role = 'admin' then 'admin' else 'vip' end;
  v_until := case
               when p_days is null then null
               else greatest(now(), v_current) + make_interval(days => p_days)
             end;
  v_price    := case p_plan when 'passe' then 2990 when 'clube' then 4990 else 0 end;
  v_discount := least(greatest(coalesce(p_discount_cents, 0), 0), v_price);
  v_coupon   := nullif(upper(btrim(coalesce(p_coupon_code, ''))), '');

  update public.profiles
     set role         = v_role,
         plan         = p_plan,
         access_until = v_until
   where id = p_user;

  insert into public.payments (user_id, plan, amount_cents, discount_cents, coupon_code, provider, status, applied_at)
  values (p_user, p_plan, v_price - v_discount, v_discount, v_coupon, 'manual', 'approved', now());

  return jsonb_build_object(
    'id',             p_user,
    'role',           v_role,
    'plan',           p_plan,
    'access_until',   v_until,
    'amount_cents',   v_price - v_discount,
    'discount_cents', v_discount
  );
end;
$$;

comment on function public.grant_consulting_access(uuid, text, integer, integer, text) is
  'Admin: libera a consultoria digital (role vip, plano e prazo) e registra pagamento manual aprovado, com desconto/cupom opcionais.';

revoke all on function public.grant_consulting_access(uuid, text, integer, integer, text) from public, anon;
grant execute on function public.grant_consulting_access(uuid, text, integer, integer, text) to authenticated, service_role;

-- 5.6 set_client_access() -----------------------------------------------------
-- Ficha do cliente no painel admin: define de uma vez plano, validade, bloqueio
-- e observações internas (sem registrar pagamento — para isso use 5.5).
--   • p_plan: 'passe' | 'clube' | 'presencial' | null (sem plano);
--   • p_access_until: fim do acesso (null = sem prazo quando há plano);
--   • p_role: nulo = automático — 'vip' quando há plano, 'client' quando não há;
--     administradores nunca são rebaixados nem promovidos por aqui, a não ser
--     que p_role seja informado explicitamente ('client' | 'vip' | 'admin');
--   • p_blocked: nulo = mantém; true/false = liga/desliga o bloqueio;
--   • p_notes: nulo = mantém; texto = substitui; '' = apaga as observações.
-- Só executa para administradores logados, service_role ou SQL Editor (sem JWT).
-- Um admin não altera a própria conta por esta função (use o SQL Editor).
create or replace function public.set_client_access(
  p_user uuid,
  p_plan text,
  p_access_until timestamptz,
  p_role text default null,
  p_blocked boolean default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role  text := coalesce(auth.jwt() ->> 'role', '');
  v_old     public.profiles%rowtype;
  v_role    text;
  v_until   timestamptz;
  v_blocked boolean;
  v_notes   text;
begin
  if not (jwt_role in ('', 'service_role') or public.is_admin()) then
    raise exception 'Apenas administradores podem alterar o acesso de clientes.'
      using errcode = '42501';
  end if;

  if p_user is null then
    raise exception 'Informe o cliente.' using errcode = '22023';
  end if;

  if p_user = auth.uid() then
    raise exception 'A própria conta não pode ser alterada por aqui. Use o SQL Editor.'
      using errcode = '42501';
  end if;

  if p_plan is not null and p_plan not in ('passe', 'clube', 'presencial') then
    raise exception 'Plano inválido: %.', p_plan using errcode = '22023';
  end if;

  if p_role is not null and p_role not in ('client', 'vip', 'admin') then
    raise exception 'Nível de acesso inválido: %.', p_role using errcode = '22023';
  end if;

  if p_notes is not null and char_length(p_notes) > 4000 then
    raise exception 'As observações podem ter no máximo 4000 caracteres.' using errcode = '22023';
  end if;

  select * into v_old
    from public.profiles p
   where p.id = p_user
     for update;

  if not found then
    raise exception 'Perfil não encontrado para o cliente informado.' using errcode = 'P0002';
  end if;

  v_role := case
              when p_role is not null    then p_role
              when v_old.role = 'admin'  then 'admin'
              when p_plan is not null    then 'vip'
              else 'client'
            end;
  -- Sem plano não há prazo a guardar.
  v_until   := case when p_plan is null then null else p_access_until end;
  v_blocked := coalesce(p_blocked, v_old.is_blocked);
  v_notes   := case
                 when p_notes is null then v_old.admin_notes
                 else nullif(btrim(p_notes), '')
               end;

  update public.profiles
     set role         = v_role,
         plan         = p_plan,
         access_until = v_until,
         is_blocked   = v_blocked,
         admin_notes  = v_notes
   where id = p_user;

  return jsonb_build_object(
    'id',           p_user,
    'role',         v_role,
    'plan',         p_plan,
    'access_until', v_until,
    'is_blocked',   v_blocked,
    'admin_notes',  v_notes
  );
end;
$$;

comment on function public.set_client_access(uuid, text, timestamptz, text, boolean, text) is
  'Admin: define plano, validade, nível, bloqueio e observações internas de um cliente (sem registrar pagamento).';

revoke all on function public.set_client_access(uuid, text, timestamptz, text, boolean, text) from public, anon;
grant execute on function public.set_client_access(uuid, text, timestamptz, text, boolean, text) to authenticated, service_role;


-- =============================================================================
-- 6. CUPONS · public.coupons
-- =============================================================================
-- Cupons de desconto do checkout. A tabela só é lida e escrita por admins
-- (e pela service_role); o site consulta um código pela função quote_coupon(),
-- que devolve apenas o resultado do cálculo — nunca a lista de cupons.
-- Regras: um desconto por cupom (percentual OU valor fixo), planos opcionais
-- (lista vazia = todos os planos com checkout), limite de usos e validade.

-- 6.1 Tabela e colunas --------------------------------------------------------
create table if not exists public.coupons (
  id               uuid primary key default gen_random_uuid(),
  code             text not null,
  description      text,
  percent_off      smallint,
  amount_off_cents integer,
  plans            text[] not null default '{}',
  max_uses         integer,
  used_count       integer not null default 0,
  expires_at       timestamptz,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.coupons
  add column if not exists description      text,
  add column if not exists percent_off      smallint,
  add column if not exists amount_off_cents integer,
  add column if not exists plans            text[] not null default '{}',
  add column if not exists max_uses         integer,
  add column if not exists used_count       integer not null default 0,
  add column if not exists expires_at       timestamptz,
  add column if not exists is_active        boolean not null default true,
  add column if not exists created_at       timestamptz not null default now(),
  add column if not exists updated_at       timestamptz not null default now();

comment on table public.coupons is
  'Cupons de desconto do checkout (só admin). code em caixa-alta; percent_off OU amount_off_cents; plans vazio = todos os planos com checkout.';

-- 6.2 Normalização, CHECKs e índices ------------------------------------------
alter table public.coupons
  drop constraint if exists coupons_code_check,
  drop constraint if exists coupons_code_key,
  drop constraint if exists coupons_percent_off_check,
  drop constraint if exists coupons_amount_off_cents_check,
  drop constraint if exists coupons_one_discount_check,
  drop constraint if exists coupons_max_uses_check,
  drop constraint if exists coupons_used_count_check,
  drop constraint if exists coupons_plans_check;

update public.coupons
   set code = upper(btrim(code))
 where code is distinct from upper(btrim(code));

update public.coupons
   set plans      = coalesce(plans, '{}'),
       used_count = greatest(coalesce(used_count, 0), 0),
       is_active  = coalesce(is_active, true)
 where plans is null
    or used_count is null
    or used_count < 0
    or is_active is null;

alter table public.coupons
  alter column id         set default gen_random_uuid(),
  alter column plans      set default '{}',
  alter column plans      set not null,
  alter column used_count set default 0,
  alter column used_count set not null,
  alter column is_active  set default true,
  alter column is_active  set not null;

alter table public.coupons
  add constraint coupons_code_check
    check (code ~ '^[A-Z0-9_-]{3,24}$'),
  add constraint coupons_code_key
    unique (code),
  add constraint coupons_percent_off_check
    check (percent_off is null or percent_off between 1 and 100),
  add constraint coupons_amount_off_cents_check
    check (amount_off_cents is null or amount_off_cents >= 0),
  add constraint coupons_one_discount_check
    check ((percent_off is null) <> (amount_off_cents is null)),
  add constraint coupons_max_uses_check
    check (max_uses is null or max_uses >= 1),
  add constraint coupons_used_count_check
    check (used_count >= 0),
  add constraint coupons_plans_check
    check (plans <@ array['passe', 'clube', 'presencial']::text[]);

create index if not exists coupons_active_idx
  on public.coupons (is_active, expires_at);

-- 6.3 Gatilhos ----------------------------------------------------------------
-- Guarda o código sempre em caixa-alta e sem espaços, e a descrição aparada.
create or replace function public.normalize_coupon()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.code        := upper(btrim(coalesce(new.code, '')));
  new.description := nullif(btrim(coalesce(new.description, '')), '');
  return new;
end;
$$;

drop trigger if exists coupons_normalize on public.coupons;
create trigger coupons_normalize
  before insert or update on public.coupons
  for each row
  execute function public.normalize_coupon();

drop trigger if exists coupons_set_updated_at on public.coupons;
create trigger coupons_set_updated_at
  before update on public.coupons
  for each row
  execute function public.set_updated_at();

-- 6.4 RLS ---------------------------------------------------------------------
-- Tudo só para administradores. A service_role (checkout e webhook) ignora o RLS.
alter table public.coupons enable row level security;

drop policy if exists "Cupons: leitura apenas por admin"  on public.coupons;
drop policy if exists "Cupons: cadastro apenas por admin" on public.coupons;
drop policy if exists "Cupons: edição apenas por admin"   on public.coupons;
drop policy if exists "Cupons: exclusão apenas por admin" on public.coupons;

create policy "Cupons: leitura apenas por admin"
  on public.coupons
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "Cupons: cadastro apenas por admin"
  on public.coupons
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Cupons: edição apenas por admin"
  on public.coupons
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Cupons: exclusão apenas por admin"
  on public.coupons
  for delete
  to authenticated
  using ((select public.is_admin()));

grant select, insert, update, delete on public.coupons to authenticated;
grant select, insert, update, delete on public.coupons to service_role;

-- 6.5 quote_coupon() ----------------------------------------------------------
-- Calcula o desconto de um código para um plano e um valor, sem expor a tabela.
-- Devolve sempre um JSON:
--   { ok: true,  code, discount_cents, final_cents, message }
--   { ok: false, code, discount_cents: 0, final_cents: p_amount_cents, message }
-- Regras: cupom ativo, dentro da validade, com usos disponíveis e válido para
-- o plano. Percentual: floor(valor × pct / 100); fixo: até o valor da compra.
-- SECURITY DEFINER para ler coupons; pode ser chamada por visitantes (anon).
create or replace function public.quote_coupon(
  p_code text,
  p_plan text,
  p_amount_cents integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_code     text := upper(btrim(coalesce(p_code, '')));
  v_amount   integer := greatest(coalesce(p_amount_cents, 0), 0);
  v_coupon   public.coupons%rowtype;
  v_discount integer;
begin
  if v_code !~ '^[A-Z0-9_-]{3,24}$' then
    return jsonb_build_object('ok', false, 'code', v_code, 'discount_cents', 0, 'final_cents', v_amount,
                              'message', 'Código de cupom inválido.');
  end if;

  if p_plan is null or p_plan not in ('passe', 'clube') then
    return jsonb_build_object('ok', false, 'code', v_code, 'discount_cents', 0, 'final_cents', v_amount,
                              'message', 'Este plano não aceita cupom.');
  end if;

  select * into v_coupon from public.coupons c where c.code = v_code;

  if not found or not v_coupon.is_active then
    return jsonb_build_object('ok', false, 'code', v_code, 'discount_cents', 0, 'final_cents', v_amount,
                              'message', 'Cupom não encontrado ou inativo.');
  end if;

  if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', v_code, 'discount_cents', 0, 'final_cents', v_amount,
                              'message', 'Este cupom expirou.');
  end if;

  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    return jsonb_build_object('ok', false, 'code', v_code, 'discount_cents', 0, 'final_cents', v_amount,
                              'message', 'Este cupom atingiu o limite de usos.');
  end if;

  if cardinality(v_coupon.plans) > 0 and not (p_plan = any (v_coupon.plans)) then
    return jsonb_build_object('ok', false, 'code', v_code, 'discount_cents', 0, 'final_cents', v_amount,
                              'message', 'Este cupom não vale para o plano escolhido.');
  end if;

  v_discount := case
                  when v_coupon.percent_off is not null then floor(v_amount * v_coupon.percent_off / 100.0)::integer
                  else least(coalesce(v_coupon.amount_off_cents, 0), v_amount)
                end;
  v_discount := least(greatest(v_discount, 0), v_amount);

  return jsonb_build_object(
    'ok',             true,
    'code',           v_coupon.code,
    'discount_cents', v_discount,
    'final_cents',    v_amount - v_discount,
    'message',        case
                        when v_coupon.percent_off is not null then format('%s%% de desconto aplicado.', v_coupon.percent_off)
                        else 'Desconto aplicado.'
                      end
  );
end;
$$;

comment on function public.quote_coupon(text, text, integer) is
  'Calcula o desconto de um cupom para um plano/valor: {ok, code, discount_cents, final_cents, message}. Não expõe a tabela.';

revoke all on function public.quote_coupon(text, text, integer) from public;
grant execute on function public.quote_coupon(text, text, integer) to anon, authenticated, service_role;

-- 6.6 redeem_coupon() ---------------------------------------------------------
-- Marca um uso do cupom (used_count + 1) após o pagamento aprovado. Chamada
-- pelo webhook (service_role) ou por admin; visitantes e clientes não podem.
create or replace function public.redeem_coupon(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  v_code   text := upper(btrim(coalesce(p_code, '')));
  v_used   integer;
begin
  if not (jwt_role in ('', 'service_role') or public.is_admin()) then
    raise exception 'Apenas o servidor ou administradores podem registrar o uso de cupons.'
      using errcode = '42501';
  end if;

  update public.coupons
     set used_count = used_count + 1
   where code = v_code
  returning used_count into v_used;

  if not found then
    return jsonb_build_object('ok', false, 'code', v_code, 'message', 'Cupom não encontrado.');
  end if;

  return jsonb_build_object('ok', true, 'code', v_code, 'used_count', v_used);
end;
$$;

comment on function public.redeem_coupon(text) is
  'Servidor/admin: incrementa used_count do cupom após pagamento aprovado.';

revoke all on function public.redeem_coupon(text) from public, anon;
grant execute on function public.redeem_coupon(text) to authenticated, service_role;


-- =============================================================================
-- 7. CONFIGURAÇÕES · public.settings
-- =============================================================================
-- Ajustes editáveis pelo painel (WhatsApp da loja, provedor de checkout,
-- preços/dias dos planos e aviso do site). Leitura pública; escrita só admin.
-- O site lê estes valores no servidor com cache curto (src/lib/server/settings.ts).

-- 7.1 Tabela ------------------------------------------------------------------
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.settings
  add column if not exists value      jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

comment on table public.settings is
  'Configurações do site editadas pelo painel admin (whatsapp, checkout, plans, announcement). Leitura pública.';

alter table public.settings
  drop constraint if exists settings_key_check,
  drop constraint if exists settings_value_check;

alter table public.settings
  add constraint settings_key_check
    check (key ~ '^[a-z0-9_]{1,40}$'),
  add constraint settings_value_check
    check (jsonb_typeof(value) = 'object');

-- 7.2 updated_at --------------------------------------------------------------
drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
  before update on public.settings
  for each row
  execute function public.set_updated_at();

-- 7.3 RLS ---------------------------------------------------------------------
alter table public.settings enable row level security;

drop policy if exists "Configurações: leitura pública"           on public.settings;
drop policy if exists "Configurações: cadastro apenas por admin" on public.settings;
drop policy if exists "Configurações: edição apenas por admin"   on public.settings;
drop policy if exists "Configurações: exclusão apenas por admin" on public.settings;

create policy "Configurações: leitura pública"
  on public.settings
  for select
  to anon, authenticated
  using (true);

create policy "Configurações: cadastro apenas por admin"
  on public.settings
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Configurações: edição apenas por admin"
  on public.settings
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Configurações: exclusão apenas por admin"
  on public.settings
  for delete
  to authenticated
  using ((select public.is_admin()));

grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;
grant select, insert, update, delete on public.settings to service_role;

-- 7.4 Valores iniciais --------------------------------------------------------
-- Só insere as chaves que ainda não existem (nunca sobrescreve o que o painel salvou).
insert into public.settings (key, value)
values
  ('whatsapp',     '{"number": "5531996000213"}'::jsonb),
  ('checkout',     '{"provider": "whatsapp"}'::jsonb),
  ('plans',        '{"passe": {"price_cents": 2990, "access_days": 30, "active": true}, "clube": {"price_cents": 4990, "access_days": 30, "active": true}, "presencial": {"active": true}}'::jsonb),
  ('announcement', '{"text": "", "active": false}'::jsonb)
on conflict (key) do nothing;


-- =============================================================================
-- 8. STORAGE · bucket "products"
-- =============================================================================
-- Fotos das peças: leitura pública; envio, substituição e remoção só por admins.
--
-- O schema "storage" pertence ao Supabase. Se o papel do editor não tiver
-- permissão sobre ele, cada bloco abaixo desfaz apenas a própria parte e
-- mostra um WARNING com a instrução — sem cancelar as seções 0 a 7.

-- 8.1 Bucket ------------------------------------------------------------------
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'products',
    'products',
    true,
    5242880, -- 5 MB
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
  )
  on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
exception
  when insufficient_privilege then
    raise warning 'Storage: sem permissão para criar o bucket "products" (%). Crie-o em Storage → New bucket: público, 5 MB, JPEG/PNG/WebP/AVIF.', sqlerrm;
end;
$$;

-- 8.2 Políticas ---------------------------------------------------------------
do $$
begin
  drop policy if exists "Produtos: leitura pública das imagens"       on storage.objects;
  drop policy if exists "Produtos: envio de imagens por admin"        on storage.objects;
  drop policy if exists "Produtos: substituição de imagens por admin" on storage.objects;
  drop policy if exists "Produtos: remoção de imagens por admin"      on storage.objects;

  create policy "Produtos: leitura pública das imagens"
    on storage.objects
    for select
    to anon, authenticated
    using (bucket_id = 'products');

  create policy "Produtos: envio de imagens por admin"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'products' and (select public.is_admin()));

  create policy "Produtos: substituição de imagens por admin"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'products' and (select public.is_admin()))
    with check (bucket_id = 'products' and (select public.is_admin()));

  create policy "Produtos: remoção de imagens por admin"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'products' and (select public.is_admin()));
exception
  when insufficient_privilege then
    raise warning 'Storage: sem permissão para criar as políticas de storage.objects (%). Crie-as em Storage → Policies (bucket products): SELECT para todos; INSERT, UPDATE e DELETE para authenticated com a expressão public.is_admin().', sqlerrm;
end;
$$;


-- =============================================================================
-- 9. RECARREGAR A API
-- =============================================================================
-- Faz o PostgREST enxergar colunas e funções novas assim que o COMMIT ocorrer.
notify pgrst, 'reload schema';

commit;


-- =============================================================================
-- COMANDOS ÚTEIS · rode separadamente, depois do script acima
-- =============================================================================
--
-- Promover um administrador (a conta precisa já existir no site):
--
--   update public.profiles set role = 'admin' where lower(email) = lower('SEU_EMAIL');
--
--   O e-mail do perfil é copiado de auth.users e não pode ser alterado por
--   clientes, então o filtro por e-mail é seguro.
--
-- Liberar a consultoria digital por 30 dias (soma ao prazo atual, se ainda
-- estiver ativo) e registrar o pagamento manual:
--
--   select public.grant_consulting_access((select id from public.profiles where lower(email)=lower('EMAIL')), 'clube', 30);
--
--   Planos: 'passe' (R$ 29,90) · 'clube' (R$ 49,90) · 'presencial' (R$ 0).
--   Sem prazo: troque 30 por null.
--   Com desconto/cupom registrados no pagamento (R$ 10,00 com o cupom BEMVINDO):
--   select public.grant_consulting_access((select id from public.profiles where lower(email)=lower('EMAIL')), 'clube', 30, 1000, 'BEMVINDO');
--
-- Ajustar a ficha do cliente (plano, validade, bloqueio e observações), sem
-- registrar pagamento — é o que o painel Admin → Clientes → ficha usa:
--
--   -- Clube até 31/12 deste ano, desbloqueado, com observação
--   select public.set_client_access(
--     (select id from public.profiles where lower(email)=lower('EMAIL')),
--     'clube', date_trunc('year', now()) + interval '1 year' - interval '1 second',
--     null, false, 'Combinado pelo WhatsApp em setembro.');
--
--   -- Bloquear (mantém plano e prazo; o acesso cai na hora)
--   select public.set_client_access((select id from public.profiles where lower(email)=lower('EMAIL')), 'clube', null, null, true, 'Chargeback em análise.');
--
--   -- Remover o plano (volta a cliente comum)
--   select public.set_client_access((select id from public.profiles where lower(email)=lower('EMAIL')), null, null);
--
-- Revogar o acesso (volta a cliente comum; o histórico de pagamentos fica):
--
--   update public.profiles set role = 'client', access_until = null where lower(email) = lower('EMAIL');
--
-- Quem tem acesso e até quando:
--
--   select email, full_name, role, plan, access_until, is_blocked,
--          (role = 'admin' or (role = 'vip' and not is_blocked and (access_until is null or access_until > now()))) as ativo
--     from public.profiles
--    where role <> 'client' or plan is not null or is_blocked
--    order by ativo desc, access_until nulls first, email;
--
-- Últimos pagamentos:
--
--   select pay.created_at, p.email, pay.plan, pay.amount_cents, pay.discount_cents, pay.coupon_code,
--          pay.provider, pay.status, pay.provider_payment_id, pay.applied_at
--     from public.payments pay
--     left join public.profiles p on p.id = pay.user_id
--    order by pay.created_at desc
--    limit 50;
--
-- Cupons: criar, testar e conferir usos:
--
--   insert into public.coupons (code, description, percent_off, plans, max_uses, expires_at)
--   values ('BEMVINDO', '20% na primeira compra', 20, '{}', 100, now() + interval '90 days');
--
--   insert into public.coupons (code, description, amount_off_cents, plans)
--   values ('CLUBE10', 'R$ 10 no Clube', 1000, array['clube']);
--
--   select public.quote_coupon('BEMVINDO', 'clube', 4990);
--   select code, percent_off, amount_off_cents, plans, used_count, max_uses, expires_at, is_active from public.coupons order by created_at desc;
--
-- Configurações do site (o painel Admin → Configurações edita as mesmas chaves):
--
--   select key, value, updated_at from public.settings order by key;
--   update public.settings set value = '{"number": "5531999999999"}' where key = 'whatsapp';
--
-- Políticas de segurança (RLS) aplicadas:
--
--   select schemaname, tablename, policyname, cmd, roles, qual, with_check
--     from pg_policies
--    where schemaname = 'public'
--       or (schemaname = 'storage' and tablename = 'objects')
--    order by schemaname, tablename, cmd, policyname;
--
-- RLS ativo nas tabelas do app (relrowsecurity deve ser true):
--
--   select relname, relrowsecurity
--     from pg_class
--    where relnamespace = 'public'::regnamespace
--      and relname in ('profiles', 'products', 'consultations', 'orders', 'payments', 'coupons', 'settings');
--
-- Produtos antigos com a foto embutida em base64 (deixam o catálogo pesado):
--
--   select id, name, category, pg_size_pretty(octet_length(image_url)::bigint) as tamanho
--     from public.products
--    where image_url like 'data:%'
--    order by octet_length(image_url) desc;
--
--   Sugestão: despublicar até reenviar as fotos pelo painel.
--   update public.products set is_active = false where image_url like 'data:%';
-- =============================================================================
