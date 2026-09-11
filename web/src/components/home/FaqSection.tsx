import { Plus } from 'lucide-react';
import { WhatsAppIcon } from '@/components/ui/icons';
import { whatsappLink } from '@/lib/format';
import { CHECKOUT_PROVIDER, getPlan } from '@/lib/site';
import { SectionTitle } from './Heading';
import { DOUBT_TEXT } from './links';

const PASSE_PRICE = getPlan('passe')?.priceLabel ?? '';
const CLUBE_PRICE = getPlan('clube')?.priceLabel ?? '';

const PAYMENT_ANSWER =
  CHECKOUT_PROVIDER === 'mercadopago'
    ? 'Você escolhe o plano, entra na sua conta e paga pelo Mercado Pago, com Pix ou cartão. Após a confirmação do pagamento, o acesso é liberado na sua conta. Se precisar, o Titi atende pelo WhatsApp.'
    : 'Você escolhe o plano, entra na sua conta e finaliza a contratação pelo WhatsApp, direto com o Titi. Após a confirmação do pagamento, o acesso é liberado na sua conta.';

const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Como funciona a leitura por foto?',
    answer:
      'Você envia uma selfie com luz natural e sem filtro. A leitura considera o tom de pele, o subtom e o contraste entre pele, cabelo e barba para indicar a sua estação entre as 12 do método. A partir dela saem a sua cartela e os seus looks.',
  },
  {
    question: 'Preciso ir até a loja?',
    answer:
      'Não. A consultoria digital é 100% online e funciona pelo celular. Se você quiser um atendimento aprofundado, com análise do armário, existe a Consultoria Presencial, agendada com o Titi.',
  },
  {
    question: 'Qual a diferença entre o Passe Digital e o Clube?',
    answer: `O Passe Digital (${PASSE_PRICE}) libera a consultoria por 30 dias: leitura, cartela, looks e provador virtual. O Clube Titi's Store (${CLUBE_PRICE} por mês) inclui tudo isso sem limite de uso, linha direta com o Titi no WhatsApp, acervo com os seus looks salvos e curadoria de peças da loja para a sua cartela.`,
  },
  { question: 'Como pago e quando o acesso é liberado?', answer: PAYMENT_ANSWER },
  { question: 'Posso cancelar o Clube?', answer: 'Sim. Para cancelar, fale com o Titi pelo WhatsApp.' },
  {
    question: 'Minha foto fica salva?',
    answer:
      'A foto é usada apenas para gerar a leitura e o provador virtual e não é armazenada nos servidores da Titi’s Store. Detalhes na Política de Privacidade.',
  },
  {
    question: 'Serve para qualquer tom de pele?',
    answer:
      'Sim. O método das 12 estações cruza quatro profundidades de pele (clara, morena, parda e negra) com três subtons (frio, neutro e quente).',
  },
];

export function FaqSection() {
  return (
    <section id="duvidas" aria-labelledby="duvidas-title" className="border-t border-line py-20 sm:py-28">
      <div className="container-luxe grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <SectionTitle
            id="duvidas-title"
            eyebrow="Dúvidas"
            title={
              <>
                Perguntas <span className="text-foil">frequentes.</span>
              </>
            }
            lead="O essencial antes de começar. Se ficar alguma dúvida, o Titi responde."
          />
          <a
            href={whatsappLink(DOUBT_TEXT)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-7 inline-flex items-center gap-2 text-[15px] font-semibold text-ivory transition-colors duration-300 hover:text-gold-light"
          >
            <WhatsAppIcon className="h-4 w-4 text-gold" />
            Falar com o Titi no WhatsApp
          </a>
        </div>

        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-[17px] font-bold leading-snug text-ivory transition-colors duration-300 hover:text-gold-light [&::-webkit-details-marker]:hidden">
                {item.question}
                <span
                  aria-hidden
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-gold text-gold transition-transform duration-300 group-open:rotate-45"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </span>
              </summary>
              <p className="pb-6 pr-10 text-[15px] leading-relaxed text-mist sm:pr-14">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
