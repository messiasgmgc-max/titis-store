-- ============================================================
-- SCHEMA SQL SUPABASE - TITI'S CONSULTORIA DE IMAGEM & AUTH
-- (Execução segura para tabelas novas ou existentes)
-- ============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'client',
  preferred_skin_tone TEXT,
  preferred_style TEXT,
  avatar_url TEXT
);

-- Garantir que todas as colunas existam caso a tabela já tenha sido criada anteriormente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'client';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_skin_tone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_style TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Habilitar RLS em Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para evitar duplicação ou erros
DROP POLICY IF EXISTS "Usuários podem visualizar o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem visualizar todos os perfis" ON public.profiles;

-- Criar políticas seguras RLS
CREATE POLICY "Usuários podem visualizar o próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar o próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir o próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. TRIGGER AUTOMÁTICO PARA CRIAR PERFIL NO CADASTRO DE USUÁRIO
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

-- Trigger ao criar usuário na auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. TABELA DE GUIA CROMÁTICO (TOMS DE PELE)
CREATE TABLE IF NOT EXISTS public.skin_tone_guides (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  contrast_rules TEXT,
  recommended_hex_colors TEXT[],
  avoid_hex_colors TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed de Toms de Pele
INSERT INTO public.skin_tone_guides (id, name, description, contrast_rules, recommended_hex_colors, avoid_hex_colors)
VALUES 
  ('clara', 'Pele Clara', 'Pele clara com subtons frios ou neutros', 'Aposte em cores de alto contraste para destacar sua presença', ARRAY['#1B2A4A', '#58111A', '#2C3539', '#0F382C'], ARRAY['#F5F5DC', '#FFFDD0']),
  ('morena', 'Morena Dourada', 'Pele morena com subtons quentes e dourados', 'Tons terrosos e champagne valorizam seu tom de pele', ARRAY['#A0522D', '#E6D7C3', '#4A5568', '#D4AF37'], ARRAY['#E0E0E0']),
  ('parda', 'Parda', 'Pele parda com subtons médios e profundos', 'Combinações de preto obsidian com contrastes metálicos', ARRAY['#0B0C10', '#F7F7F7', '#C0C0C0', '#111111'], ARRAY['#808000']),
  ('negra', 'Negra Profunda', 'Pele negra com alta luminosidade e riqueza', 'Cores vibrantes e brancos marfim criam um contraste elegante', ARRAY['#FFFFFF', '#D4AF37', '#58111A', '#0F382C'], ARRAY['#2F4F4F'])
ON CONFLICT (id) DO NOTHING;

-- 4. TABELA DE CONSULTAS & LOOKBOOKS SALVOS
CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  skin_tone TEXT NOT NULL,
  occasion TEXT NOT NULL,
  time_of_day TEXT NOT NULL,
  climate TEXT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em Consultations
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem visualizar e criar suas próprias consultas" ON public.consultations;
CREATE POLICY "Usuários podem visualizar e criar suas próprias consultas"
  ON public.consultations FOR ALL
  USING (auth.uid() = user_id);
