-- =============================================================================
--  TITI'S STORE · Schema do Supabase
--  Consultoria de imagem masculina · Atelier · Catálogo · Pedidos via WhatsApp
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
--    1. Perfis ............. public.profiles, is_admin(), gatilhos de auth
--    2. Catálogo ........... public.products e acervo inicial
--    3. Consultorias ....... public.consultations
--    4. Pedidos ............ public.orders
--    5. Storage ............ bucket "products"
--    6. Recarregar a API
--    Rodapé ................ comandos úteis (promover admin/VIP, verificações)
-- =============================================================================

begin;


-- =============================================================================
-- 0. BASE
-- =============================================================================

-- gen_random_uuid() é nativa no Postgres 13+; pgcrypto mantém compatibilidade.
create extension if not exists pgcrypto with schema extensions;

-- Carimba updated_at em todo UPDATE (usada por profiles, products e orders).
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
       and tablename in ('profiles', 'products', 'consultations', 'orders')
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
  add column if not exists created_at          timestamptz not null default now(),
  add column if not exists updated_at          timestamptz default now();

-- A versão anterior exigia full_name; cadastros sem nome passam a ser aceitos.
alter table public.profiles alter column full_name drop not null;

comment on table public.profiles is
  'Perfil de cada conta (1:1 com auth.users). role: client | vip | admin.';

-- 1.2 Normalização de dados legados e CHECKs ----------------------------------
-- Remove os CHECKs (inclusive os nomes automáticos da versão anterior) antes de
-- normalizar, para recriá-los no formato atual.
alter table public.profiles
  drop constraint if exists profiles_role_check,
  drop constraint if exists profiles_skin_subtone_check,
  drop constraint if exists profiles_contrast_level_check,
  drop constraint if exists profiles_preferred_style_check;

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

alter table public.profiles
  alter column role       set default 'client',
  alter column role       set not null,
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
    check (preferred_style is null or preferred_style in ('classico', 'contemporaneo', 'ousado'));

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

-- 1.5 Proteção contra escalonamento de privilégio ------------------------------
-- Requisições de usuários comuns (JWT anon ou authenticated, sem ser admin):
--   • INSERT: role é sempre 'client' e o e-mail vem de auth.users;
--   • UPDATE: trocar role ou id gera erro; e-mail e created_at são preservados
--     (o e-mail oficial é o da conta; ele é sincronizado pelo gatilho 1.7).
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
    new.role       := 'client';
    new.email      := (select u.email from auth.users u where u.id = new.id);
    new.created_at := now();
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

  new.email      := old.email;
  new.created_at := old.created_at;
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
  'Consultorias salvas pelos clientes: contexto informado e looks gerados no Atelier (results = Look[]).';

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

create policy "Consultorias: registro pelo titular"
  on public.consultations
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

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
-- 5. STORAGE · bucket "products"
-- =============================================================================
-- Fotos das peças: leitura pública; envio, substituição e remoção só por admins.
--
-- O schema "storage" pertence ao Supabase. Se o papel do editor não tiver
-- permissão sobre ele, cada bloco abaixo desfaz apenas a própria parte e
-- mostra um WARNING com a instrução — sem cancelar as seções 0 a 4.

-- 5.1 Bucket ------------------------------------------------------------------
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

-- 5.2 Políticas ---------------------------------------------------------------
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
-- 6. RECARREGAR A API
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
-- Conceder acesso VIP (Clube / Passe) a um cliente:
--
--   update public.profiles set role = 'vip' where lower(email) = lower('EMAIL_DO_CLIENTE');
--
-- Voltar um cliente ao acesso padrão:
--
--   update public.profiles set role = 'client' where lower(email) = lower('EMAIL_DO_CLIENTE');
--
-- Quem tem acesso especial:
--
--   select email, full_name, role, updated_at
--     from public.profiles
--    where role <> 'client'
--    order by role, email;
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
--      and relname in ('profiles', 'products', 'consultations', 'orders');
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
