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
          A sacola do site organiza as peças de interesse e gera uma mensagem de pedido enviada pelo WhatsApp. O envio{' '}
          <strong>não conclui uma compra</strong>: ele inicia o atendimento.
        </p>
        <ul>
          <li>Preços, disponibilidade, tamanhos, ajustes, prazos e frete são confirmados durante o atendimento.</li>
          <li>Peças indicadas como “sob consulta” têm valor informado no atendimento.</li>
          <li>O site não processa pagamentos; forma e condições são combinadas diretamente com a equipe.</li>
          <li>Imagens e cores das peças são ilustrativas e podem variar em relação ao produto físico.</li>
        </ul>
        <p>Ficam preservados todos os direitos garantidos pelo Código de Defesa do Consumidor.</p>
      </>
    ),
  },
  {
    id: 'planos',
    title: 'Planos e Clube',
    body: (
      <ul>
        <li>Os planos apresentados no site são contratados e ativados pelo WhatsApp, após confirmação do atendimento.</li>
        <li>Os benefícios são os descritos no momento da contratação.</li>
        <li>Condições de pagamento, renovação e cancelamento são informadas antes da ativação.</li>
        <li>Alguns recursos do site podem ficar disponíveis apenas para contas com plano ativo.</li>
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
              Termos de <em className="italic text-foil">Uso</em>
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
