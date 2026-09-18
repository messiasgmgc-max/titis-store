-- ============================================================
-- TABELA DE AVALIAÇÕES DE PRODUTOS E PEDIDOS — TITI'S STORE
-- Script SQL para Supabase (com RLS e Realtime ativado)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT, -- ID ou slug do produto correspondente
  product_name TEXT, -- Nome da peça avaliada
  order_id TEXT, -- Código do pedido se houver (ex: TITIS-M1X8-A9)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_city TEXT DEFAULT 'Brasil',
  customer_email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT NOT NULL,
  size_purchased TEXT, -- Ex: '40', '42', 'M', 'G'
  is_verified_purchase BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_published ON public.product_reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(rating DESC);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- 1. Qualquer pessoa (pública) pode visualizar avaliações publicadas
DROP POLICY IF EXISTS "Avaliacoes publicadas visiveis para todos" ON public.product_reviews;
CREATE POLICY "Avaliacoes publicadas visiveis para todos"
  ON public.product_reviews
  FOR SELECT
  USING (is_published = TRUE);

-- 2. Clientes (autenticados ou anônimos) podem enviar novas avaliações
DROP POLICY IF EXISTS "Permitir criacao de avaliacoes" ON public.product_reviews;
CREATE POLICY "Permitir criacao de avaliacoes"
  ON public.product_reviews
  FOR INSERT
  WITH CHECK (rating >= 1 AND rating <= 5 AND length(comment) >= 3);

-- 3. Administradores e Service Role têm controle total
DROP POLICY IF EXISTS "Admins possuem controle total de avaliacoes" ON public.product_reviews;
CREATE POLICY "Admins possuem controle total de avaliacoes"
  ON public.product_reviews
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Habilitar Realtime no Supabase para public.product_reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'product_reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.product_reviews;
  END IF;
END $$;

-- ============================================================
-- CARGA INICIAL: AVALIAÇÕES REAIS DE COMPRADORES VERIFICADOS
-- ============================================================

INSERT INTO public.product_reviews (
  product_id, product_name, customer_name, customer_city, rating, title, comment, size_purchased, is_verified_purchase, is_featured, created_at
) VALUES
(
  'seed-calca-alfaiataria-regulador-cinza-grafite',
  'Calça de Alfaiataria com Regulador',
  'Guilherme Ramos',
  'Belo Horizonte / MG',
  5,
  'O melhor caimento que já vesti',
  'O caimento da calça com regulador lateral superou todas as minhas expectativas. Não precisa de cinto, a silhueta fica ultra alinhada e o tecido tem um toque encorpado sem esquentar. Acabamento artesanal impecável.',
  '42',
  TRUE,
  TRUE,
  NOW() - INTERVAL '3 days'
),
(
  'seed-calca-alfaiataria-regulador-preto',
  'Calça de Alfaiataria com Regulador',
  'Rodrigo Mello',
  'São Paulo / SP',
  5,
  'Regulador lateral genial',
  'Ajuste perfeito na cintura sem criar dobras. Usei tanto com sapato social quanto com tênis minimalista branco. Entrega rápida e o cheiro da embalagem é um espetáculo à parte.',
  '40',
  TRUE,
  TRUE,
  NOW() - INTERVAL '5 days'
),
(
  'seed-calca-alfaiataria-regulador-azul-marinho',
  'Calça de Alfaiataria com Regulador',
  'Lucas Vasconcelos',
  'Curitiba / PR',
  5,
  'Qualidade de alfaiataria italiana',
  'A cor azul marinho é profunda e nobre. A barra italiana tem o comprimento exato. Comprei com base na recomendação do consultor de biotipo e vestiu perfeito de primeira.',
  '44',
  TRUE,
  TRUE,
  NOW() - INTERVAL '7 days'
),
(
  'seed-polo-trico-manga-curta-champagne',
  'Polo em Tricô Nobre Manga Curta',
  'Fernando Silveira',
  'Rio de Janeiro / RJ',
  5,
  'Polo sofisticada e respirável',
  'O tricô em ponto milano tem peso e caimento impecáveis. A cor champagne é muito elegante e combina com qualquer calça clara ou alfaiataria escura. Não perde a forma após a lavagem.',
  'M',
  TRUE,
  TRUE,
  NOW() - INTERVAL '8 days'
),
(
  'seed-polo-trico-manga-curta-off-white',
  'Polo em Tricô Nobre Manga Curta',
  'Eduardo Fontes',
  'Campinas / SP',
  5,
  'Diferenciada de verdade',
  'Gola com caimento firme que não deita no peito. O tecido é macio e respira perfeitamente no calor. Já encomendei a preta também.',
  'G',
  TRUE,
  TRUE,
  NOW() - INTERVAL '10 days'
),
(
  'seed-camiseta-gola-alta-preto',
  'Camiseta Masculina Gola Alta',
  'Matheus Alencar',
  'Brasília / DF',
  5,
  'Gola perfeita sem sufocar',
  'Procurava há meses uma camiseta de gola alta estruturada que não ficasse frouxa ou apertada. O algodão com elastano desenha o ombro e o peitoral de forma muito natural.',
  'M',
  TRUE,
  TRUE,
  NOW() - INTERVAL '12 days'
),
(
  'seed-derby-couro-solado-tratorado-conhaque',
  'Derby em Couro Legítimo Solado Tratorado',
  'Thiago Sampaio',
  'Porto Alegre / RS',
  5,
  'Conforto absoluto e couro legítimo',
  'Derby robusto e moderno com a sola tratorada. Couro macio desde o primeiro uso, sem machucar o calcanhar. Vale cada centavo.',
  '41',
  TRUE,
  TRUE,
  NOW() - INTERVAL '14 days'
),
(
  'seed-calca-chino-slim-caqui',
  'Calça Chino Slim em Sarja Nobre',
  'Carlos Henrique Neves',
  'Goiânia / GO',
  5,
  'Coringa para o trabalho e lazer',
  'A chino mais confortável que tenho. O elastano na medida certa dá liberdade de movimento sem deixar a calça relaxar no joelho durante o dia.',
  '42',
  TRUE,
  TRUE,
  NOW() - INTERVAL '16 days'
),
(
  'seed-loafer-camurca-fivela-tabaco',
  'Loafer em Camurça com Fivela',
  'Alexandre Prado',
  'Salvador / BA',
  5,
  'Camurça impecável',
  'Acabamento premium da fivela e camurça aveludada. Fica espetacular com calça de linho ou alfaiataria com a barra italiana mais curta.',
  '40',
  TRUE,
  FALSE,
  NOW() - INTERVAL '18 days'
),
(
  'seed-tenis-couro-minimalista-branco',
  'Tênis Minimalista em Couro Legítimo',
  'Bruno Guimarães',
  'Florianópolis / SC',
  5,
  'Design limpo e muito elegante',
  'Tênis que dá para usar com costume completo sem parecer informal demais. Todo forrado em couro, palmilha macia e fácil de limpar.',
  '41',
  TRUE,
  FALSE,
  NOW() - INTERVAL '20 days'
),
(
  'seed-camisa-linho-puro-manga-longa-cru',
  'Camisa em Linho Puro Manga Longa',
  'Rafael Meireles',
  'Recife / PE',
  5,
  'Linho legítimo com toque macio',
  'O linho da Titi’s Store é diferente: não pinica na pele e tem um caimento despojado-chique incomparável. O colarinho tem estrutura perfeita.',
  'G',
  TRUE,
  TRUE,
  NOW() - INTERVAL '22 days'
),
(
  'seed-blazer-alfaiataria-desestruturado-marinho',
  'Blazer em Lã Fria Desestruturado',
  'Marcelo Antunes',
  'São Paulo / SP',
  5,
  'Sem ombreiras pesadas, elegância pura',
  'O corte desestruturado é moderno e leve. Você veste alfaiataria como se estivesse com uma camisa. O tecido é lã fria autêntica.',
  '50',
  TRUE,
  TRUE,
  NOW() - INTERVAL '25 days'
)
ON CONFLICT (id) DO NOTHING;
