-- =============================================================================
--  TITI'S STORE · Atualização de Biometria, Endereço e CPF no Perfil
-- -----------------------------------------------------------------------------
--  Execute no Supabase SQL Editor para adicionar os campos de biometria,
--  medidas corporais, CPF e endereço de entrega na tabela public.profiles.
-- =============================================================================

begin;

alter table public.profiles
  add column if not exists weight_kg        numeric,
  add column if not exists height_cm        numeric,
  add column if not exists age              integer,
  add column if not exists gender           text,
  add column if not exists body_type        text,
  add column if not exists cpf              text,
  add column if not exists shipping_address jsonb;

-- Comentários descritivos
comment on column public.profiles.weight_kg is 'Peso corporal em kg para recomendação de looks e caimento de alfaiataria';
comment on column public.profiles.height_cm is 'Altura em cm';
comment on column public.profiles.age is 'Idade do cliente';
comment on column public.profiles.gender is 'Gênero: masculino | feminino | outro';
comment on column public.profiles.body_type is 'Biotipo: trapezio | atletico | retangular | oval | ectomorfo | mesomorfo | endomorfo';
comment on column public.profiles.cpf is 'CPF do cliente para faturamento e emissão de frete';
comment on column public.profiles.shipping_address is 'Endereço de entrega principal salvo pelo cliente (JSON com cep, logradouro, numero, etc.)';

commit;
