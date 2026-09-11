import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { LegalDocument, type LegalSection } from '@/components/account/LegalDocument';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: `Como a ${SITE.name} trata dados pessoais, fotos do rosto e informações de atendimento, em conformidade com a LGPD.`,
};

const sections: LegalSection[] = [
  {
    id: 'controlador',
    title: 'Quem trata seus dados',
    body: (
      <>
        <p>
          A <strong>{SITE.legalName}</strong> é a controladora dos dados pessoais tratados neste site, nos termos da Lei
          Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).
        </p>
        <p>
          Para qualquer assunto relacionado a privacidade, o canal oficial é o WhatsApp{' '}
          <strong>{SITE.whatsappDisplay}</strong>.
        </p>
      </>
    ),
  },
  {
    id: 'dados',
    title: 'Dados que coletamos',
    body: (
      <>
        <p>Tratamos apenas o necessário para oferecer a consultoria e o atendimento:</p>
        <ul>
          <li>
            <strong>Conta:</strong> nome, e-mail e WhatsApp. A senha é guardada de forma cifrada pelo serviço de
            autenticação e não fica visível para a nossa equipe.
          </li>
          <li>
            <strong>Cartela:</strong> tom de pele, subtom, nível de contraste e estação cromática resultantes da sua
            leitura ou escolha.
          </li>
          <li>
            <strong>Looks salvos:</strong> o contexto informado (ocasião, local descrito, horário, clima e estilo) e os
            looks montados para ele.
          </li>
          <li>
            <strong>Pedidos:</strong> peças escolhidas, tamanhos, nome, telefone, observações e o andamento do
            atendimento.
          </li>
        </ul>
        <p>Não coletamos dados de pagamento: o site não processa pagamentos.</p>
      </>
    ),
  },
  {
    id: 'fotos',
    title: 'Fotos do rosto',
    body: (
      <>
        <p>
          A foto do rosto é usada <strong>exclusivamente</strong> para a leitura de colorimetria e para o provador
          virtual, e só é enviada quando você mesmo a seleciona.
        </p>
        <ul>
          <li>
            Dependendo do recurso, a imagem é analisada no próprio navegador ou transmitida, por conexão protegida, a um
            provedor contratado para ser processada por inteligência artificial — apenas para gerar o resultado
            solicitado.
          </li>
          <li>
            A {SITE.name} <strong>não armazena</strong> fotos do rosto em seus servidores ou banco de dados.
          </li>
          <li>
            Se você optar por guardar uma cópia para usar o provador depois, ela fica somente no navegador deste
            aparelho e pode ser apagada a qualquer momento em <Link href="/dashboard?aba=perfil">Minha conta › Perfil</Link>{' '}
            ou limpando os dados do navegador.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'aparelho',
    title: 'Armazenamento no seu aparelho',
    body: (
      <>
        <p>Para que a experiência continue de onde você parou, alguns dados ficam guardados localmente no navegador:</p>
        <ul>
          <li>a sacola de peças;</li>
          <li>a sua cartela de cores;</li>
          <li>a conversa com o concierge;</li>
          <li>a foto do rosto, apenas quando você escolhe guardá-la;</li>
          <li>as informações técnicas que mantêm sua sessão conectada.</li>
        </ul>
        <p>
          Esses dados não são usados para publicidade e podem ser removidos nas configurações do navegador. Ao sair da
          conta, a sessão deste aparelho é encerrada.
        </p>
      </>
    ),
  },
  {
    id: 'finalidades',
    title: 'Como usamos os dados',
    body: (
      <ul>
        <li>criar e manter a sua conta;</li>
        <li>realizar a leitura de colorimetria e montar looks para cada ocasião;</li>
        <li>guardar o histórico de consultorias e pedidos na sua conta;</li>
        <li>atender pedidos, planos e dúvidas pelo WhatsApp;</li>
        <li>proteger o site contra fraudes e acessos indevidos;</li>
        <li>cumprir obrigações legais e regulatórias.</li>
      </ul>
    ),
  },
  {
    id: 'operadores',
    title: 'Com quem compartilhamos',
    body: (
      <>
        <p>
          Não vendemos dados pessoais. O compartilhamento ocorre apenas com operadores necessários ao funcionamento do
          serviço, que tratam os dados conforme as nossas instruções:
        </p>
        <ul>
          <li>
            <strong>Hospedagem, banco de dados e autenticação:</strong> guardam conta, cartela, looks salvos e pedidos.
          </li>
          <li>
            <strong>Processamento por inteligência artificial:</strong> recebe fotos e mensagens somente para gerar a
            leitura, o provador ou a resposta do concierge.
          </li>
          <li>
            <strong>WhatsApp:</strong> quando você envia um pedido ou inicia uma conversa, as informações passam a
            seguir também as políticas do próprio aplicativo.
          </li>
        </ul>
        <p>
          Alguns fornecedores podem processar dados fora do Brasil; nesses casos, adotamos as salvaguardas previstas na
          LGPD. Dados também podem ser fornecidos a autoridades quando houver exigência legal.
        </p>
      </>
    ),
  },
  {
    id: 'bases-legais',
    title: 'Bases legais',
    body: (
      <ul>
        <li>
          <strong>Execução de contrato</strong> e procedimentos preliminares: conta, consultoria, looks salvos e
          pedidos.
        </li>
        <li>
          <strong>Consentimento:</strong> envio de fotos do rosto e recursos opcionais, que você pode revogar a
          qualquer momento.
        </li>
        <li>
          <strong>Legítimo interesse:</strong> segurança do site e melhoria do atendimento, sempre respeitando seus
          direitos.
        </li>
        <li>
          <strong>Cumprimento de obrigação legal</strong> ou regulatória, quando aplicável.
        </li>
      </ul>
    ),
  },
  {
    id: 'retencao',
    title: 'Por quanto tempo guardamos',
    body: (
      <ul>
        <li>dados da conta: enquanto a conta estiver ativa;</li>
        <li>cartela e looks salvos: até que você os apague ou solicite a exclusão da conta;</li>
        <li>pedidos: pelo tempo necessário ao atendimento e ao cumprimento de obrigações legais;</li>
        <li>fotos do rosto: não são retidas pela {SITE.name}.</li>
      </ul>
    ),
  },
  {
    id: 'direitos',
    title: 'Seus direitos',
    body: (
      <>
        <p>Como titular, você pode solicitar a qualquer momento:</p>
        <ul>
          <li>confirmação de tratamento e acesso aos seus dados;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>anonimização, bloqueio ou exclusão de dados desnecessários;</li>
          <li>portabilidade dos dados a outro fornecedor;</li>
          <li>informação sobre com quem os dados foram compartilhados;</li>
          <li>revogação do consentimento.</li>
        </ul>
        <p>
          Os pedidos são feitos pelo WhatsApp <strong>{SITE.whatsappDisplay}</strong> e respondidos nos prazos da LGPD.
          Nome, WhatsApp, cartela e looks salvos também podem ser editados ou apagados diretamente em{' '}
          <Link href="/dashboard">Minha conta</Link>. Você também pode reclamar à Autoridade Nacional de Proteção de
          Dados (ANPD).
        </p>
      </>
    ),
  },
  {
    id: 'seguranca',
    title: 'Segurança',
    body: (
      <p>
        Usamos conexões cifradas, controle de acesso por conta e permissões restritas para que cada cliente veja apenas
        os próprios dados. Nenhum sistema é totalmente imune a incidentes; se algum ocorrer com risco relevante, você e
        a autoridade competente serão comunicados.
      </p>
    ),
  },
  {
    id: 'alteracoes',
    title: 'Alterações desta política',
    body: (
      <p>
        Esta política pode ser atualizada para refletir novos recursos ou exigências legais. A versão vigente fica
        sempre publicada nesta página, com a data da última atualização no topo.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main id="conteudo">
        <LegalDocument
          eyebrow="Privacidade · LGPD"
          title={
            <>
              Política de <span className="text-foil">Privacidade</span>
            </>
          }
          updated="Atualizado em setembro de 2026"
          intro={
            <p>
              Discrição faz parte do ofício de um alfaiate. Aqui explicamos, sem letras miúdas, quais dados a{' '}
              {SITE.name} trata, por quê, e como você mantém o controle sobre eles.
            </p>
          }
          sections={sections}
          related={{ href: '/termos', label: 'Termos de Uso' }}
        />
      </main>
      <Footer />
    </>
  );
}
