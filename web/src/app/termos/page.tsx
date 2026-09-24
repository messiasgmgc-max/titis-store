import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { LegalDocument, type LegalSection } from '@/components/account/LegalDocument';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: `Condições de uso do site da ${SITE.name}: consultoria digital, pedidos pelo WhatsApp, planos e conta do usuário.`,
};

const sections: LegalSection[] = [
  {
    id: 'sobre',
    title: 'Sobre estes termos',
    body: (
      <p>
        Estes termos regulam o uso do site da <strong>{SITE.name}</strong>, que reúne consultoria de imagem digital,
        vitrine de peças e atendimento pelo WhatsApp. Ao navegar, criar uma conta ou enviar um pedido, você declara que
        leu e concorda com estas condições.
      </p>
    ),
  },
  {
    id: 'consultoria',
    title: 'Natureza da consultoria digital',
    body: (
      <>
        <p>
          A leitura de colorimetria, a cartela de cores, os looks sugeridos e o provador virtual têm caráter{' '}
          <strong>orientativo</strong>. São recomendações de estilo, não garantias de resultado.
        </p>
        <ul>
          <li>
            Os resultados dependem da foto enviada: iluminação, câmera, filtros e maquiagem podem alterar a leitura.
          </li>
          <li>As cores exibidas podem variar conforme a tela e a calibração de cada aparelho.</li>
          <li>
            Recursos processados por inteligência artificial podem conter imprecisões; o provador virtual é uma
            simulação ilustrativa.
          </li>
          <li>Para um diagnóstico aprofundado, recomendamos a consultoria presencial.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'conta',
    title: 'Sua conta',
    body: (
      <ul>
        <li>As informações de cadastro devem ser verdadeiras e mantidas atualizadas.</li>
        <li>O acesso é pessoal: guarde sua senha com cuidado e não a compartilhe.</li>
        <li>Você é responsável pelas atividades realizadas com a sua conta.</li>
        <li>
          A exclusão da conta pode ser solicitada a qualquer momento pelo WhatsApp {SITE.whatsappDisplay}; cartela e
          looks salvos podem ser apagados diretamente em <Link href="/dashboard">Minha conta</Link>.
        </li>
      </ul>
    ),
  },
  {
    id: 'pedidos',
    title: 'Pedidos e pagamentos',
    body: (
      <>
        <p>
          O site da <strong>{SITE.name}</strong> disponibiliza checkout seguro integrado via Mercado Pago (Pix à vista e Cartão de Crédito em até 12x), além de atendimento personalizado via WhatsApp para quem preferir assessoria direta com nossos consultores.
        </p>
        <ul>
          <li>Preços, disponibilidade de tamanhos e opções de frete (Correios, Jadlog ou Retirada em Betim/MG) são calculados em tempo real no checkout.</li>
          <li>Pagamentos com cartão de crédito passam por análise antifraude segura do Mercado Pago.</li>
          <li>Pagamentos via Pix contam com compensação instantânea e liberação imediata do pedido ou plano digital.</li>
          <li>Imagens, cores e medidas são fiéis ao catálogo, respeitando as variações naturais de iluminação e telas.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'devolucoes',
    title: 'Trocas, devoluções e direito de arrependimento (Art. 49 do CDC)',
    body: (
      <>
        <p>
          Em conformidade estrita com o <strong>Artigo 49 do Código de Defesa do Consumidor (Lei nº 8.078/1990)</strong> e o Decreto do Comércio Eletrônico (Decreto nº 7.962/2013):
        </p>
        <ul>
          <li>
            <strong>Prazo Legal de 7 Dias:</strong> Para compras online de peças físicas ou contratação de planos digitais, o consumidor tem o direito de desistir da compra em até <strong>7 (sete) dias corridos</strong>, contados do recebimento do produto físico ou da ativação do plano digital.
          </li>
          <li>
            <strong>Primeira Troca Grátis:</strong> A {SITE.name} oferece a 1ª troca de numeração ou cor com frete reverso gratuito para o cliente.
          </li>
          <li>
            <strong>Reembolso Integral:</strong> No caso de exercício do direito de arrependimento no prazo de 7 dias, todos os valores pagos (incluindo o frete inicial) serão reembolsados integralmente via Pix imediato ou estorno na fatura do cartão.
          </li>
          <li>
            <strong>Condições das Peças:</strong> Os produtos devolvidos devem estar acompanhados de suas etiquetas originais, sem indícios de uso, lavagem ou ajustes de alfaiataria já realizados sob medida.
          </li>
          <li>
            <strong>Canal de Atendimento:</strong> Para solicitar troca ou devolução, basta entrar em contato pelo WhatsApp {SITE.whatsappDisplay} ou e-mail de suporte informando o número do pedido.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'planos',
    title: 'Planos e Clube VIP',
    body: (
      <ul>
        <li>Os planos e assinaturas da consultoria de estilo digital podem ser contratados diretamente pelo site ou pelo WhatsApp.</li>
        <li>O acesso às ferramentas digitais (cartela de cores, sugestão de looks, provador virtual) permanece ativo durante a vigência do plano contratado.</li>
        <li>O assinante pode solicitar o cancelamento a qualquer momento através do painel da sua conta ou pelo suporte.</li>
        <li>Fica garantido o direito de arrependimento legal de 7 dias a contar da primeira contratação.</li>
      </ul>
    ),
  },
  {
    id: 'uso',
    title: 'Uso aceitável',
    body: (
      <>
        <p>Ao usar o site, você se compromete a não:</p>
        <ul>
          <li>enviar fotos de outras pessoas sem autorização delas;</li>
          <li>enviar conteúdo ilícito, ofensivo ou que viole direitos de terceiros;</li>
          <li>tentar acessar áreas restritas, contas alheias ou burlar mecanismos de segurança;</li>
          <li>copiar o conteúdo em massa ou usar automações que sobrecarreguem o serviço;</li>
          <li>usar o site para fins diferentes da consultoria e do atendimento oferecidos.</li>
        </ul>
        <p>Contas que descumprirem estas regras podem ser suspensas.</p>
      </>
    ),
  },
  {
    id: 'propriedade',
    title: 'Propriedade intelectual',
    body: (
      <>
        <p>
          A marca <strong>{SITE.name}</strong>, o logotipo com o medalhão “T”, textos, fotografias, identidade visual e
          o método de consultoria apresentados no site são protegidos por direitos de propriedade intelectual e não podem
          ser reproduzidos sem autorização prévia e por escrito.
        </p>
        <p>
          As fotos que você envia continuam sendo suas. Ao enviá-las, você autoriza apenas o uso necessário para gerar a
          leitura ou a simulação solicitada.
        </p>
      </>
    ),
  },
  {
    id: 'responsabilidade',
    title: 'Limitação de responsabilidade',
    body: (
      <>
        <p>
          Empregamos cuidado para manter o site disponível e as informações corretas, mas não garantimos funcionamento
          ininterrupto. Na extensão permitida pela lei, a {SITE.name} não se responsabiliza por:
        </p>
        <ul>
          <li>decisões de compra tomadas exclusivamente com base nas sugestões automáticas;</li>
          <li>diferenças de cor decorrentes de fotos, iluminação ou telas;</li>
          <li>instabilidades de serviços de terceiros, como provedores de internet e o WhatsApp.</li>
        </ul>
        <p>Nada nestes termos afasta direitos que a legislação assegura ao consumidor.</p>
      </>
    ),
  },
  {
    id: 'privacidade',
    title: 'Privacidade',
    body: (
      <p>
        O tratamento de dados pessoais, incluindo fotos do rosto, segue a nossa{' '}
        <Link href="/privacidade">Política de Privacidade</Link>, que integra estes termos.
      </p>
    ),
  },
  {
    id: 'alteracoes',
    title: 'Alterações',
    body: (
      <p>
        Estes termos podem ser atualizados a qualquer tempo. A versão vigente fica publicada nesta página, com a data
        da última atualização. O uso continuado do site após as mudanças indica concordância com a nova versão.
      </p>
    ),
  },
  {
    id: 'contato',
    title: 'Lei aplicável e contato',
    body: (
      <p>
        Estes termos são regidos pelas leis brasileiras, e fica eleito o foro do domicílio do consumidor. Dúvidas,
        solicitações e reclamações podem ser encaminhadas pelo WhatsApp <strong>{SITE.whatsappDisplay}</strong>.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <LegalDocument
          eyebrow="Condições de uso"
          title={
            <>
              Termos de <span className="text-foil">Uso</span>
            </>
          }
          updated="Atualizado em setembro de 2026"
          intro={
            <p>
              As regras que acompanham cada consultoria, pedido e plano da {SITE.name} — escritas com a mesma
              clareza que dedicamos a um bom corte.
            </p>
          }
          sections={sections}
          related={{ href: '/privacidade', label: 'Política de Privacidade' }}
        />
      </main>
      <Footer />
    </>
  );
}
