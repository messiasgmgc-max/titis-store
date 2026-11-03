# Central de pedidos e Pushover

Implementação local em `/pedidos`, com o tema da loja, lista por data, filtros, detalhes, endereço copiável, mapa e contato WhatsApp. O WhatsApp abre uma conversa manual; nenhuma integração Evolution nova foi adicionada. O código do Mercado Pago foi preservado.

## Ativação

1. Executar `supabase/order_push_reminders.sql` no SQL Editor do Supabase. O script cria somente as tabelas privadas e a fila de avisos, com gatilho em novos pedidos. Não altera o status dos pedidos e não notifica pedidos antigos.
2. Publicar esta versão do site. Em `/pedidos`, entrar com a conta administrativa **do Titi**, abrir “Configurar avisos”, informar User Key e App Token do Pushover e salvar. A conta logada será vinculada ao recebimento; só ela pode encerrar os lembretes por visualização. Usar User Key individual do Titi, não grupo. Instalar Pushover no iPhone, permitir notificações e conferir som/ajustes do aparelho. Não enviar chaves pelo chat ou colocar no código.
3. Definir um `CRON_SECRET` forte no servidor e `NEXT_PUBLIC_SITE_URL` com o domínio HTTPS real da loja. O token de serviço do Supabase já usado pelo sistema precisa estar disponível.
4. Agendar uma chamada GET para `https://www.titisstore.com.br/api/admin/order-push/run` **a cada minuto**, com header `Authorization: Bearer <CRON_SECRET>`. Usar um agendador externo que suporte cabeçalho secreto, ou Vercel Pro. Os arquivos `vercel.json` existentes foram preservados: a Vercel Hobby não aceita frequência maior que diária e uma entrada por minuto quebraria o deploy nesse plano. Caso use Vercel Pro, adicionar a entrada abaixo ao array `crons` do arquivo efetivamente usado pela hospedagem, preservando as entradas existentes:

```json
{ "path": "/api/admin/order-push/run", "schedule": "* * * * *" }
```

5. Enviar o teste pelo painel e verificar o recebimento no iPhone. Fazer um pedido de homologação pelo fluxo existente. Verificar fila → primeiro aviso → lembrete após pelo menos 60 minutos → abrir link e autenticar como Titi → confirmar que os próximos lembretes param. Abrir apenas a lista, fechar o Pushover ou outro admin abrir o pedido não deve encerrar os lembretes.

## Comportamento e limites

- Novos pedidos dos canais online, mercadopago e whatsapp entram na fila quando os avisos estão habilitados. PDV e vendas externas não entram. Não há backfill automático.
- O primeiro envio ocorre no próximo ciclo do agendador (habitualmente até cerca de um minuto, sujeito à execução). Repetição: 60 minutos após o último envio aceito; falhas: nova tentativa após cinco minutos. A fila usa reserva atômica e vence a reserva em dois minutos se o processo morrer. Um ciclo processa até cinco avisos, para caber no tempo de execução.
- Som e prioridade alta foram solicitados ao Pushover, inclusive à noite. A entrega e o som dependem do aparelho, rede e serviço; não há garantia de instante exato.
- Pedidos visualizados, cancelados, despachados ou concluídos não recebem novos avisos. Pedido visualizado não volta a notificar só porque o pagamento mudou. Pagamento continua seguindo o fluxo existente.
- O link não contém credenciais nem realiza confirmação por GET. A confirmação ocorre por POST autenticado depois que os detalhes são carregados e a página está visível. Links escaneados/pré-carregados e a listagem não confirmam. Isto comprova abertura da página, não leitura humana. Se um envio já estiver em trânsito ao abrir, ainda pode chegar um último aviso.
- A reserva evita envios simultâneos normais. Uma queda depois da aceitação no Pushover e antes da gravação no banco pode gerar duplicata em nova tentativa: não há garantia de envio exatamente uma vez entre dois serviços.
- Chaves armazenadas em tabela privada, sem leitura pública ou por sessões comuns e sem retorno ao navegador. Administradores do banco ainda têm acesso; não é armazenamento em cofre criptografado. O aviso contém somente referência do pedido; dados de cliente ficam no painel autenticado.
- Painel mostra até 500 pedidos recentes. Detalhe por link funciona mesmo fora dessa janela. Atualização de lista/detalhe a cada 30 segundos enquanto visível. Frete/etiquetas e edição continuam no painel existente.
- “Últimos avisos” permite consultar os últimos dez registros e erros. Para operação contínua, configurar monitoramento de falhas/ausência de execução no agendador e acompanhar a cota de mensagens do Pushover. A tela não comprova que o agendador foi ativado.

## Validação local

`cd web && npm run build`

`node --test scripts/test-order-center.cjs` — autorização das APIs, confirmação vinculada à conta, envio e erros do Pushover sem chamadas reais, autenticação do agendador.

`node --test scripts/test-order-push.cjs` — PostgreSQL local em memória com PGlite, sem conexão à produção. Requer instalar `@electric-sql/pglite` em ambiente de teste ou indicar a instalação temporária por `PGLITE_MODULE`. Exercita migração repetível, permissões, criação de fila, reservas, intervalo, visualização, cancelamento, despacho e perda de privilégio de administrador.

Documentação: https://pushover.net/api e https://vercel.com/docs/cron-jobs/usage-and-pricing
