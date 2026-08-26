-- ============================================================
-- SCHEMA SQL SUPABASE - TITI'S STORE (CIÊNCIA CROMÁTICA & ADMIN)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'client' CHECK (role IN ('client', 'admin', 'vip')),
  preferred_skin_tone TEXT,
  skin_subtone TEXT CHECK (skin_subtone IN ('frio', 'quente', 'neutro')),
  seasonal_palette TEXT, -- Ex: 'Outono Quente', 'Inverno Frio', 'Primavera Brilhante', 'Verão Suave'
  preferred_style TEXT,
  avatar_url TEXT
);

-- Colunas garantidas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_skin_tone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS skin_subtone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS seasonal_palette TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_style TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Habilitar RLS em Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins possuem controle total de perfis" ON public.profiles;

CREATE POLICY "Usuários podem visualizar o próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar o próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins possuem controle total de perfis"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 2. TRIGGER AUTOMÁTICO PARA PERFIL
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
    'client'
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. TABELA DE PRODUTOS DO CATÁLOGO (GERENCIADA POR ADMINS)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- Sobreposição, Camisa, Calça, Calçado, Acessório
  description TEXT,
  image_url TEXT,
  hex_color TEXT,
  season_compatibility TEXT[], -- Outono Quente, Inverno Frio, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem visualizar catálogo de produtos" ON public.products;
CREATE POLICY "Todos podem visualizar catálogo de produtos"
  ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Apenas admins podem modificar produtos" ON public.products;
CREATE POLICY "Apenas admins podem modificar produtos"
  ON public.products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. CONSULTAS & LOOKBOOKS SALVOS
CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  skin_tone TEXT NOT NULL,
  skin_subtone TEXT,
  seasonal_palette TEXT,
  occasion TEXT NOT NULL,
  time_of_day TEXT NOT NULL,
  climate TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam suas próprias consultas" ON public.consultations;
CREATE POLICY "Usuários gerenciam suas próprias consultas"
  ON public.consultations FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- COMANDO SQL PARA PROMOVER UM USUÁRIO A ADMIN:
-- Execute o comando abaixo no SQL Editor do Supabase substituindo o e-mail:
--
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'SEU_EMAIL_AQUI');
-- ============================================================
