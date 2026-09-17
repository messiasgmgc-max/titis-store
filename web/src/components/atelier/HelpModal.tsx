'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  HelpCircle,
  Info,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export type HelpTopic =
  | 'tone'
  | 'subtone'
  | 'contrast'
  | 'biometrics'
  | 'bodyType'
  | 'occasion'
  | 'timeOfDay'
  | 'climate'
  | 'style';

interface TopicData {
  title: string;
  badge: string;
  intro: string;
  tests?: Array<{
    name: string;
    description: string;
    options: Array<{ label: string; outcome: string; detail: string }>;
  }>;
  tips: string[];
}

const TOPICS: Record<HelpTopic, TopicData> = {
  tone: {
    title: 'Como Descobrir a Profundidade da sua Pele',
    badge: 'Colorimetria Científica',
    intro:
      'A profundidade da pele corresponde ao grau de luminosidade e pigmentação da sua cútis (do mais claro ao mais escuro), servindo de base para calcular a saturação das roupas.',
    tests: [
      {
        name: 'Teste da Luz Natural da Manhã',
        description:
          'Fique em frente a uma janela durante o dia, sem iluminação artificial direta e sem maquiagem ou filtros:',
        options: [
          {
            label: 'Pele Clara',
            outcome: 'Tom Claro',
            detail: 'Pele marfim, bege clarinho ou rosada, que se queima com facilidade ao sol.',
          },
          {
            label: 'Pele Morena',
            outcome: 'Tom Morena',
            detail: 'Pele bege médio a morena média, com nuances douradas ou amêndoas.',
          },
          {
            label: 'Pele Parda',
            outcome: 'Tom Parda',
            detail: 'Pele morena intermediária com fundo canela, oliva ou âmbar natural.',
          },
          {
            label: 'Pele Negra',
            outcome: 'Tom Negra',
            detail: 'Pele marrom médio a retinto profundo com rica concentração de melanina.',
          },
        ],
      },
    ],
    tips: [
      'Evite lâmpadas amarelas ou fluorescentes no teste, pois alteram a percepção de profundidade.',
      'A cor do colo e pescoço costuma ser mais fiel que a do rosto exposto ao sol diário.',
    ],
  },
  subtone: {
    title: 'Como Descobrir o seu Subtom de Pele',
    badge: 'Temperatura Biológica',
    intro:
      'O subtom é a temperatura de cor sob a sua pele. Ele não muda com o bronzeado e é o fator determinante para saber se você fica melhor com tons frios (azul, prata) ou quentes (caramelo, ouro).',
    tests: [
      {
        name: '1. O Teste das Veias do Pulso (Mais Rápido)',
        description: 'Observe a parte interna do seu pulso sob a luz do sol natural:',
        options: [
          {
            label: 'Veias Azuis ou Arroxeadas',
            outcome: 'Subtom Frio',
            detail: 'Sua pele tem fundo rosado, azulado ou acinzentado. Fica radiante com tons frios e prata.',
          },
          {
            label: 'Veias Verdes ou Oliva',
            outcome: 'Subtom Quente',
            detail: 'Sua pele tem fundo amarelado, dourado ou pêssego. Fica impecável com terrosos e dourado.',
          },
          {
            label: 'Veias Verdes e Azuis Mescladas',
            outcome: 'Subtom Neutro',
            detail: 'Você tem equilíbrio entre frio e quente, transitando bem entre ambas as cartelas.',
          },
        ],
      },
      {
        name: '2. O Teste da Reação ao Sol',
        description: 'O que acontece quando você fica 30 minutos sob o sol de verão sem protetor?',
        options: [
          {
            label: 'Fica vermelho e queima fácil',
            outcome: 'Subtom Frio',
            detail: 'Pele mais sensível ao calor, raramente bronzeia.',
          },
          {
            label: 'Bronzeia com facilidade e ganha tom dourado',
            outcome: 'Subtom Quente',
            detail: 'A pele ganha pigmentação dourada com rapidez.',
          },
          {
            label: 'Queima um pouco e depois bronzeia suavemente',
            outcome: 'Subtom Neutro',
            detail: 'Reação balanceada à exposição solar.',
          },
        ],
      },
      {
        name: '3. O Teste dos Acessórios / Metais',
        description: 'Qual metal ilumina seu rosto e parece fazer parte de você?',
        options: [
          {
            label: 'Prata / Aço inoxidável',
            outcome: 'Subtom Frio',
            detail: 'O metal prateado destaca seus traços sem parecer artificial.',
          },
          {
            label: 'Ouro Amarelo / Latão polido',
            outcome: 'Subtom Quente',
            detail: 'O ouro se funde naturalmente à sua pele com calor e brilho nobre.',
          },
        ],
      },
    ],
    tips: [
      'Na dúvida entre frio e quente após os 3 testes, opte por Neutro.',
      'O subtom neutro é comum em peles brasileiras devido à nossa rica miscigenação.',
    ],
  },
  contrast: {
    title: 'Como Descobrir seu Contraste Pessoal',
    badge: 'O Teste Infalível da Foto P&B',
    intro:
      'O contraste pessoal é a diferença de luminosidade (claro versus escuro) entre seus olhos, cabelo, sobrancelha/barba e o tom da sua pele.',
    tests: [
      {
        name: 'Passo a Passo: O Teste do Celular em Preto e Branco',
        description:
          '1. Tire uma selfie do rosto em iluminação natural do dia (sem maquiagem).\n2. Abra a foto e aplique o filtro Preto e Branco (Monocromático / Escala de Cinza).\n3. Compare a diferença de luminosidade entre sua pele e seu cabelo/olhos:',
        options: [
          {
            label: 'Alto Contraste',
            outcome: 'Diferença Marcante',
            detail:
              'Exemplo: Pele muito clara com cabelo preto/castanho escuro; ou pele negra retinta com olhos e dentes luminosos. Pede looks com contraste claro x escuro marcado.',
          },
          {
            label: 'Médio Contraste',
            outcome: 'Diferença Moderada',
            detail:
              'Exemplo: Pele morena clara com cabelo castanho médio; ou pele parda com olhos castanhos. Pede harmonia clássica e equilíbrio.',
          },
          {
            label: 'Baixo Contraste',
            outcome: 'Diferença Suave / Homogênea',
            detail:
              'Exemplo: Pele clara com cabelos e olhos claros; ou pele negra com cabelo e olhos igualmente escuros. Pede looks tom-sobre-tom com baixa discrepância.',
          },
        ],
      },
    ],
    tips: [
      'Respeitar seu contraste evita que a roupa "engula" seu rosto ou o deixe com aspecto cansado.',
      'Pessoas com barba volumosa costumam ter o contraste elevado caso a barba seja escura.',
    ],
  },
  biometrics: {
    title: 'Por Que Medidas & Biometria Importam na Alfaiataria',
    badge: 'Cálculo Antropométrico',
    intro:
      'Na alta alfaiataria, o vestuário deve obedecer às proporções áureas do corpo masculino. Peso, altura e idade permitem que a inteligência determine o caimento exato das peças do catálogo.',
    tests: [
      {
        name: 'O Que a Nossa IA Calcula Automaticamente:',
        description: 'A partir do seu peso (kg) e altura (cm), o sistema identifica:',
        options: [
          {
            label: 'Tamanhos Ideais do Catálogo',
            outcome: 'Tamanho Numérico Exato',
            detail:
              'Calcula se você veste P, M, G ou GG para superiores (Polos, Malhas) e 38, 40, 42, 44 ou 46 para calças de alfaiataria e chinos.',
          },
          {
            label: 'Linhas Visuais de Proporção',
            outcome: 'Alongamento de Silhueta',
            detail:
              'Define se o seu corpo pede barras retas, cós sem cinto com regulador lateral para afinar a linha de cintura ou peças monocromáticas para alongar a estatura.',
          },
        ],
      },
    ],
    tips: [
      'Informe suas medidas aproximadas; nossa tabela de alfaiataria tem margem de conforto elástico em sarja e malha.',
      'Ao clicar em Comprar no Checkout, todas as peças já serão sugeridas nas suas medidas calculadas.',
    ],
  },
  bodyType: {
    title: 'Como Identificar o seu Biotipo Corporal',
    badge: 'Silhueta Masculina',
    intro:
      'O biotipo corporal é definido pela relação geométrica entre a largura dos seus ombros, do seu tórax, da sua cintura e do seu quadril.',
    tests: [
      {
        name: 'Observe-se no Espelho de Corpo Inteiro:',
        description: 'Fique em pé com postura natural e observe a geometria do seu tronco:',
        options: [
          {
            label: 'Trapézio',
            outcome: 'Ombros Largos + Cintura Levemente Estreita',
            detail:
              'Considerada a proporção harmônica da alfaiataria. Suporta qualquer tipo de corte, do slim ao tradicional.',
          },
          {
            label: 'Atlético',
            outcome: 'Ombros e Peitoral Muito Largos + Cintura Fina (V)',
            detail:
              'Pede peças que não apertem nos ombros e calças retas para equilibrar o volume superior.',
          },
          {
            label: 'Retangular',
            outcome: 'Ombros, Cintura e Quadril Alinhados',
            detail:
              'Pede peças estruturadas que criem a ilusão de cintura mais marcada e ombros definidos.',
          },
          {
            label: 'Oval',
            outcome: 'Volume Concentrado no Abdômen',
            detail:
              'Pede calças de alfaiataria com regulador lateral, linhas verticais limpas e tecidos que não marquem.',
          },
          {
            label: 'Ectomorfo / Magro',
            outcome: 'Estrutura Óssea Fina e Membros Longos',
            detail:
              'Valorizado por peças bem ajustadas e sobreposições em camadas que criem presença física.',
          },
          {
            label: 'Endomorfo / Pesado',
            outcome: 'Estrutura Óssea Larga e Silhueta Densa',
            detail:
              'Valorizado por tons sóbrios, cortes retos sem excesso de tecido e caimento estruturado.',
          },
        ],
      },
    ],
    tips: [
      'Você pode alterar seu biotipo a qualquer momento; o sistema sugere um padrão pelo cálculo de peso x altura.',
    ],
  },
  occasion: {
    title: 'Como Escolher a Ocasião & Dress Code',
    badge: 'Formalidade & Etiqueta',
    intro:
      'A ocasião dita a formalidade do look, indo do nível 1 (casual despojado) ao nível 5 (traje a rigor ou black tie).',
    tips: [
      'Trabalho: Foco em sobriedade e autoridade (alfaiataria estruturada, calças chino ou de sarja e sapatos derby/oxford).',
      'Jantar / Encontro: Elegância noturna e refinamento descontraído (polos de tricô nobres, loafers de camurça ou tênis de couro minimalista com calça de corte limpo).',
      'Festa / Cerimônia: Atende a casamentos e formaturas, ajustando cores e tecidos para não conflitar com a celebração.',
      'Outro / Local Personalizado: Ao selecionar "Outro", digite o local (ex: "Casamento na praia às 16h" ou "Jantar em vinícola"). A IA lerá o ambiente e adaptará tecidos e calçados para o terreno!',
    ],
  },
  timeOfDay: {
    title: 'A Influência do Horário no Vestuário',
    badge: 'Comportamento da Luz',
    intro:
      'A luz natural da manhã e da tarde interage com os tecidos de maneira diferente da iluminação artificial e noturna.',
    tips: [
      'Manhã: Pede tecidos respiráveis, luminosidade aberta e acabamentos foscos naturais.',
      'Tarde: Perfeito para tons médios, camurça e texturas ricas (o "golden hour" valoriza tons quentes e neutros).',
      'Noite: Pede contraste acentuado, tons profundos (marinho, grafite, preto absoluto, conhaque) e tecidos nobres.',
    ],
  },
  climate: {
    title: 'Clima & Gramatura dos Tecidos',
    badge: 'Conforto Térmico',
    intro:
      'O clima define quais peças e tecidos compõem cada camada do look para garantir conforto sem perder a elegância.',
    tips: [
      'Frio: Aciona sobreposições elegantes (blazers encorpados, sobretudos, malhas de gola alta e forros térmicos).',
      'Ameno: O clima mais versátil da moda masculina, combinando perfeitamente malhas de algodão, camisas e calças chino.',
      'Quente: Prioriza tramas abertas, tricôs de algodão respiráveis, calças leves e calçados sem meia visível.',
    ],
  },
  style: {
    title: 'Seu Estilo Pessoal de Assinatura',
    badge: 'Identidade Visual',
    intro:
      'O estilo pessoal define como as peças dialogam com a sua personalidade e presença.',
    tips: [
      'Clássico: Linhas atemporais, proporções tradicionais de alfaiataria e segurança impecável.',
      'Contemporâneo: O visual da Titi\'s Store por excelência — une a alfaiataria ao conforto do tênis minimalista e do tricô nobre.',
      'Ousado: Cores de destaque da sua cartela no protagonismo, contrastes magnéticos e personalidade forte.',
    ],
  },
};

export function HelpButton({
  topic,
  onOpen,
  className,
}: {
  topic: HelpTopic;
  onOpen: (topic: HelpTopic) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(topic)}
      className={`group inline-flex items-center justify-center rounded-full border border-gold/35 bg-gold/[0.08] p-1 text-gold transition-all duration-350 hover:border-gold hover:bg-gold/20 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold ${className ?? ''}`}
      title="Como identificar? Clique para ver o guia prático."
      aria-label={`Guia de ajuda para ${topic}`}
    >
      <HelpCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
    </button>
  );
}

export function HelpModal({
  topic,
  onClose,
}: {
  topic: HelpTopic | null;
  onClose: () => void;
}) {
  if (!topic) return null;
  const data = TOPICS[topic];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-obsidian/85 backdrop-blur-md"
          aria-hidden
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 my-8 w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-line-gold/70 bg-surface p-6 sm:p-9 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)]"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full border border-line p-2 text-mist transition-colors hover:border-gold hover:text-gold"
            aria-label="Fechar guia de ajuda"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>

          <div className="flex items-center gap-2 text-gold">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em]">{data.badge}</span>
          </div>

          <h2 className="mt-2.5 text-2xl font-extrabold leading-tight tracking-[-0.02em] text-ivory sm:text-3xl">
            {data.title}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-parchment/90">{data.intro}</p>

          <div className="stitch my-6" aria-hidden />

          {data.tests && data.tests.length > 0 && (
            <div className="space-y-6">
              {data.tests.map((test, idx) => (
                <div key={idx} className="rounded-2xl border border-line bg-coal/60 p-5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gold-light">{test.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-mist whitespace-pre-line">{test.description}</p>

                  <div className="mt-4 grid gap-2.5">
                    {test.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className="rounded-xl border border-line/60 bg-surface/80 p-3.5 transition-colors hover:border-gold/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-ivory">{opt.label}</span>
                          <span className="rounded-full border border-gold/30 bg-gold/[0.08] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-gold">
                            {opt.outcome}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-mist">{opt.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {data.tips.length > 0 && (
            <div className="mt-6 rounded-2xl border border-line-gold/40 bg-gold/[0.03] p-5">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
                <Info className="h-3.5 w-3.5" /> Dicas do Alfaiate
              </h4>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-parchment/80">
                {data.tips.map((tip, tIdx) => (
                  <li key={tIdx} className="flex items-start gap-2">
                    <span className="text-gold font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <Button onClick={onClose} className="px-6 py-2.5 text-xs uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              Entendi, aplicar à minha consulta
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
