# Supabase · Titi's Store

Banco de dados, autenticação e armazenamento de fotos do site. Tudo o que o app precisa está em [`schema.sql`](./schema.sql): tabelas, regras de segurança (RLS), gatilhos, bucket de imagens e o acervo inicial do catálogo.

| Recurso | Para que serve | Quem acessa |
| --- | --- | --- |
| `profiles` | Perfil de cada conta (1:1 com `auth.users`), nível de acesso e preferências de estilo | O próprio cliente; administradores veem todos |
| `products` | Catálogo da loja | Público lê as peças ativas; só administradores cadastram, editam e removem |
| `consultations` | Consultorias e looks salvos na consultoria online | O próprio cliente; administradores podem ler e remover |
| `orders` | Pedidos enviados pela sacola antes do atendimento no WhatsApp | Visitantes e clientes criam; o cliente lê os próprios; só administradores alteram |
| `payments` | Compras dos planos da consultoria (Mercado Pago, WhatsApp ou liberação manual) | O cliente lê os próprios; administradores veem todos; o servidor (service role) registra os do Mercado Pago |
| Storage `products` | Fotos das peças (público, até 5 MB, JPEG, PNG, WebP ou AVIF) | Leitura pública; envio apenas por administradores |

---

## 1. Rodar o schema

1. No painel do Supabase, abra **SQL Editor → New query**.
2. Cole **todo** o conteúdo de `schema.sql` e clique em **Run**. Mantenha o papel padrão do editor (`postgres`), sem *impersonate role*.
3. O editor pode pedir confirmação por causa dos comandos `drop policy` e `drop trigger`. É esperado: eles só recriam regras, não apagam dados.
4. O resultado deve terminar em `Success. No rows returned`.

O script é **idempotente** e **transacional**:

- funciona em projeto novo e no projeto que já rodou a versão anterior, migrando as tabelas existentes sem apagar dados de clientes;
- se qualquer comando falhar, nada é aplicado;
- pode ser executado de novo sempre que o arquivo mudar.

### O que ele corrige na versão anterior

- **`infinite recursion detected in policy for relation "profiles"`**: as políticas agora usam `public.is_admin()`, uma função `SECURITY DEFINER` que consulta o perfil sem reentrar no RLS.
- **Escalonamento de privilégio**: antes, qualquer cliente podia se tornar `admin` editando o próprio perfil. Agora um gatilho impede que não administradores alterem `role`, `id` ou o e-mail do perfil.
- **Políticas soltas**: todas as políticas das quatro tabelas do app são removidas e recriadas pelo script, inclusive as que tenham sido criadas manualmente pelo Dashboard. As regras ficam versionadas neste repositório.
- **Dados legados**: categorias antigas (`Sobreposição`, `Camisa`, `Calça`, `Calçado`, `Acessório`) passam para as atuais com o encaixe no look correspondente; cores fora do formato `#RRGGBB` são limpas; perfis sem e-mail ou com o e-mail no lugar do nome são corrigidos a partir de `auth.users`; o avatar genérico que o gatilho antigo gravava para todos é removido.

---

## 2. Promover o administrador

1. Crie a conta pelo próprio site e confirme o e-mail.
2. No SQL Editor, rode (troque pelo e-mail da conta):

   ```sql
   update public.profiles set role = 'admin' where lower(email) = lower('SEU_EMAIL');
   ```

3. Saia e entre novamente no site para que o painel reconheça o novo nível.

Se o comando retornar `0 rows`, a conta ainda não existe ou o e-mail está diferente. Confira com:

```sql
select id, email, full_name, role, created_at from public.profiles order by created_at desc;
```

Se a conta existe em **Authentication → Users** mas não aparece em `profiles`, rode o `schema.sql` de novo: ele cria os perfis que estiverem faltando.

> O nível de acesso, o plano e o prazo só mudam pelo SQL Editor, pela `service_role` (servidor) ou por um administrador logado. O e-mail do perfil é sempre o da conta em `auth.users`: um cliente não consegue trocar o e-mail do próprio perfil para ser promovido no lugar de outra pessoa.

Para liberar a consultoria para clientes, veja a seção 3.

---

## 3. Planos e acesso

A consultoria digital (leitura de colorimetria, looks sob medida, provador virtual e consultorias salvas) é **paga**. Quem pode usar:

- `role = 'admin'`: sempre;
- `role = 'vip'` com `access_until` vazio (sem prazo) ou no futuro.

A regra existe em dois lugares idênticos: `public.has_consulting_access()` no banco (usada pela política de INSERT de `consultations`) e `hasConsultingAccess()` em `web/src/lib/access.ts` (usada pelas rotas `/api/diagnosis`, `/api/looks` e `/api/try-on`, que respondem **401** sem login e **402** sem plano ativo).

| Plano | Valor | Acesso liberado |
| --- | --- | --- |
| `passe` · Passe Digital | R$ 29,90 | 30 dias |
| `clube` · Clube Titi's Store | R$ 49,90 | 30 dias por pagamento |
| `presencial` · Consultoria Presencial | Sob consulta | Agendada pelo WhatsApp (sem checkout) |

Cada liberação **soma** os dias ao prazo atual quando ele ainda está ativo (`greatest(now(), access_until) + dias`). Todo pagamento fica registrado em `public.payments`; `applied_at` marca que o acesso daquele pagamento já foi aplicado, para que nunca seja somado duas vezes.

### Liberar manualmente (compra pelo WhatsApp)

Pelo painel: **Admin → Clientes → Liberar acesso**, escolha o plano (Passe ou Clube) e a duração (30 dias, 90 dias, 1 ano ou sem prazo). O pagamento aparece na aba **Pagamentos** como `Manual · Aprovado`. **Revogar** volta a conta para cliente comum imediatamente.

Pelo SQL Editor:

```sql
-- Liberar 30 dias do Clube (troque 30 por null para "sem prazo")
select public.grant_consulting_access((select id from public.profiles where lower(email)=lower('EMAIL')), 'clube', 30);

-- Revogar
update public.profiles set role = 'client', access_until = null where lower(email) = lower('EMAIL');

-- Conferir
select email, role, plan, access_until from public.profiles where lower(email) = lower('EMAIL');
```

`grant_consulting_access` só executa para administradores logados, para a `service_role` ou no SQL Editor. Ela registra o pagamento manual com o valor do plano (R$ 29,90, R$ 49,90 ou R$ 0 no presencial).

### Ativar o Mercado Pago (liberação automática)

1. **Crie a aplicação**: em [Mercado Pago Developers → Suas integrações](https://www.mercadopago.com.br/developers/panel/app), clique em **Criar aplicação**, escolha **Pagamentos online → Checkout Pro**.
2. **Copie o Access Token**: em **Credenciais de produção** (ou **Credenciais de teste** para homologar; tokens `TEST-` abrem o checkout sandbox).
3. **Cadastre o webhook**: na aplicação, abra **Webhooks → Configurar notificações**:
   - URL de produção: `https://SEU-DOMINIO/api/webhooks/mercadopago`
   - Evento: **Pagamentos**
   - Salve e copie a **assinatura secreta** gerada.
4. **Pegue a service role do Supabase**: Project Settings → API Keys → `service_role` (ou *secret key*).
5. **Cadastre as variáveis na Vercel** (Production; Preview se for testar lá):

   | Variável | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_CHECKOUT_PROVIDER` | `mercadopago` |
   | `MERCADOPAGO_ACCESS_TOKEN` | Access Token do passo 2 |
   | `MERCADOPAGO_WEBHOOK_SECRET` | Assinatura secreta do passo 3 |
   | `SUPABASE_SERVICE_ROLE_KEY` | Chave do passo 4 |
   | `NEXT_PUBLIC_SITE_URL` | `https://SEU-DOMINIO` (usado nos links de retorno e na URL do webhook) |

6. Faça **Redeploy** e rode o `schema.sql` atualizado, se ainda não rodou.
7. **Teste**: compre um plano com uma conta de teste. O pagamento aparece em **Admin → Pagamentos** como `Pendente` e, após a aprovação, `Aprovado · Acesso liberado`; a conta passa a `vip` com o prazo somado. Em **Webhooks → Simular notificação**, uma resposta `401` indica assinatura secreta incorreta.

Como funciona: `POST /api/checkout` exige login, cria a linha `pending` em `payments` e a preferência do Checkout Pro com `external_reference` igual ao id da linha. O Mercado Pago chama `/api/webhooks/mercadopago`; a rota valida o cabeçalho `x-signature` (HMAC-SHA256 com a assinatura secreta; sem ela, **toda** notificação é recusada), consulta o pagamento na API, atualiza o status e, quando aprovado com o valor correto, libera o acesso uma única vez.

> `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` e `SUPABASE_SERVICE_ROLE_KEY` são **somente servidor**: nunca use o prefixo `NEXT_PUBLIC_`. A service role ignora todas as regras de RLS.
>
> Com `NEXT_PUBLIC_CHECKOUT_PROVIDER=whatsapp` (padrão) o checkout online fica desligado e a compra segue pelo WhatsApp com liberação manual.

---

## 4. Authentication → URL Configuration

- **Site URL**: o endereço de produção, por exemplo `https://SEU-DOMINIO.com.br` (sem barra no final).
- **Redirect URLs**: adicione
  - `https://SEU-DOMINIO.com.br/dashboard`
  - `https://SEU-DOMINIO.com.br/redefinir-senha`
  - `https://SEU-DOMINIO.com.br/assinar` e `https://SEU-DOMINIO.com.br/consultoria` (retorno de quem cria a conta durante a compra)
  - `http://localhost:3000/dashboard`, `http://localhost:3000/redefinir-senha`, `http://localhost:3000/assinar` e `http://localhost:3000/consultoria`, para desenvolvimento
  - opcional, para previews da Vercel: `https://*-SEU-TIME.vercel.app/**`

Sem essas URLs, os links de confirmação de cadastro e de redefinição de senha caem na Site URL em vez da página certa.

---

## 5. Confirmação de e-mail

Em **Authentication → Sign In / Providers → Email**:

- Mantenha **Confirm email** ativado (recomendado). Depois do cadastro, o cliente recebe um link e volta ao `/dashboard` já autenticado.
- Com a opção desativada, a conta entra logada logo após o cadastro.

Em **Authentication → Emails**:

- Traduza os modelos *Confirm signup* e *Reset password* para português, com o tom da marca.
- O SMTP padrão do Supabase tem limite baixo de envios e serve apenas para testes. Em produção, configure um SMTP próprio em **SMTP Settings**.

---

## 6. Variáveis de ambiente na Vercel

Em **Vercel → Project → Settings → Environment Variables** (Production, Preview e Development):

| Variável | Uso | Onde encontrar | Observação |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Obrigatória | Supabase → botão **Connect** ou Project Settings → API | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Obrigatória | Supabase → Project Settings → API Keys (`anon` / publishable) | Pública; o acesso aos dados é protegido pelo RLS |
| `GEMINI_API_KEY` | Recomendada | Google AI Studio → API keys | **Somente servidor**. Leitura de colorimetria por foto, composição de looks, provador virtual e leitura de fotos no painel |
| `GROQ_API_KEY` | Recomendada | console.groq.com → API Keys | **Somente servidor**. Assistente de estilo (chat) |
| `GEMINI_TEXT_MODEL` | Opcional | — | Substitui o modelo padrão de texto e visão |
| `GEMINI_IMAGE_MODEL` | Opcional | — | Substitui o modelo padrão de imagem do provador |
| `GROQ_MODEL` | Opcional | — | Substitui o modelo padrão do concierge |
| `NEXT_PUBLIC_SITE_URL` | Opcional (recomendada com Mercado Pago) | — | URL canônica, por exemplo `https://SEU-DOMINIO.com.br` |
| `NEXT_PUBLIC_CHECKOUT_PROVIDER` | Opcional | — | `whatsapp` (padrão) ou `mercadopago`. Veja a seção 3 |
| `MERCADOPAGO_ACCESS_TOKEN` | Com Mercado Pago | Mercado Pago Developers → Credenciais | **Somente servidor** |
| `MERCADOPAGO_WEBHOOK_SECRET` | Com Mercado Pago | Webhooks → assinatura secreta | **Somente servidor**. Sem ela o webhook recusa tudo |
| `SUPABASE_SERVICE_ROLE_KEY` | Com Mercado Pago | Supabase → Project Settings → API Keys (`service_role` / secret) | **Somente servidor. Ignora o RLS**: nunca com `NEXT_PUBLIC_` |

Sem as chaves de IA, os recursos que dependem delas ficam indisponíveis ou usam o motor local de looks.

### Remova as variáveis antigas

Apague `NEXT_PUBLIC_GEMINI_API_KEY` e `NEXT_PUBLIC_GROQ_API_KEY`. Tudo o que começa com `NEXT_PUBLIC_` é embutido no JavaScript enviado ao navegador, ou seja, essas chaves ficaram expostas publicamente. Além de apagar as variáveis:

1. gere chaves novas no Google AI Studio e no Groq;
2. revogue as chaves antigas;
3. cadastre as novas com os nomes **sem** o prefixo (`GEMINI_API_KEY`, `GROQ_API_KEY`).

Depois de alterar variáveis, faça **Redeploy**: elas só valem para deploys novos.

Nunca coloque a `service_role` / secret key do Supabase em uma variável `NEXT_PUBLIC_`.

Para desenvolvimento local, crie `web/.env.local` com as mesmas variáveis.

---

## 7. Produtos antigos com imagem em base64

O painel anterior gravava a foto inteira dentro de `image_url` (texto `data:image/...;base64,...`). Cada peça assim pode ter vários megabytes e deixa o catálogo lento. O painel novo envia as fotos para o bucket `products` e grava só o endereço da imagem.

Para conferir:

```sql
select id, name, category, pg_size_pretty(octet_length(image_url)::bigint) as tamanho
  from public.products
 where image_url like 'data:%'
 order by octet_length(image_url) desc;
```

Sugestão: despublique essas peças e reenvie as fotos pelo painel antes de reativá-las.

```sql
update public.products set is_active = false where image_url like 'data:%';
```

Peças inativas continuam visíveis para administradores. Se nenhuma peça ativa restar, o site exibe o acervo inicial até que novas peças sejam publicadas.

> O script só insere o acervo inicial (5 peças) quando a tabela `products` está vazia, para não duplicar nem misturar com um catálogo existente.

---

## 8. Verificação

```sql
-- RLS ativo nas tabelas do app (relrowsecurity = true)
select relname, relrowsecurity
  from pg_class
 where relnamespace = 'public'::regnamespace
   and relname in ('profiles', 'products', 'consultations', 'orders', 'payments');

-- Políticas aplicadas
select schemaname, tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public'
    or (schemaname = 'storage' and tablename = 'objects')
 order by schemaname, tablename, cmd, policyname;

-- Bucket de fotos
select id, public, file_size_limit, allowed_mime_types
  from storage.buckets
 where id = 'products';
```

Roteiro rápido no site:

1. Em uma janela anônima, o catálogo carrega.
2. Crie uma conta de teste: o perfil aparece em `public.profiles` com `role = 'client'`.
3. Envie um pedido pela sacola sem estar logado: ele aparece em `public.orders` com `status = 'novo'`.
4. Com a conta de administrador, cadastre uma peça com foto: o arquivo aparece em **Storage → products**.
5. Com a conta de teste sem plano, a leitura por foto e os looks respondem "Sua consultoria precisa de um plano ativo.". Libere 30 dias pelo painel: o recurso volta a funcionar e o pagamento manual aparece na aba **Pagamentos**.

---

## Como a segurança funciona

- **RLS em todas as tabelas.** Nenhuma leitura ou escrita acontece fora das políticas do script.
- **`public.is_admin()`** é a única verificação de administrador, usada pelas políticas das tabelas e do Storage.
- **Gatilho `profiles_protect_privileges`**: clientes não escolhem o próprio nível, não trocam o `id`, não mudam o e-mail do perfil e não alteram `plan` nem `access_until` (no cadastro eles ficam vazios; em edições, os valores atuais são mantidos). O SQL Editor, os processos internos do Supabase (como o cadastro), a `service_role` e administradores não são afetados.
- **`public.has_consulting_access()`**: regra da consultoria paga no banco; salvar consultorias exige plano ativo.
- **Pagamentos**: o cliente só lê os próprios; criação e alteração apenas por administradores ou pelo servidor (`service_role`). O webhook do Mercado Pago só é aceito com assinatura válida e nunca aplica o mesmo pagamento duas vezes (`applied_at`).
- **Gatilhos em `auth.users`**: `on_auth_user_created` cria o perfil no cadastro sem nunca bloqueá-lo; `on_auth_user_email_changed` mantém o e-mail do perfil igual ao da conta.
- **Pedidos**: visitantes só criam pedidos com `status = 'novo'` e sem vínculo com outra conta; não podem ler pedidos. Os limites de tamanho (nome, telefone, observações, até 60 itens) evitam abuso do formulário.
- **Storage**: leitura pública das fotos; envio, substituição e remoção apenas por administradores.

---

## Problemas comuns

| Mensagem ou sintoma | Causa e solução |
| --- | --- |
| `infinite recursion detected in policy for relation "profiles"` | Políticas da versão anterior ainda ativas. Rode o `schema.sql` atual. |
| `Apenas administradores podem alterar o nível de acesso.` | Um usuário comum tentou mudar `role`. Use o SQL Editor (seção 2). |
| `new row violates row-level security policy for table "orders"` | O pedido foi enviado com `status` diferente de `novo` ou com `user_id` de outra conta. |
| Pedido de visitante falha só ao ler a resposta | O front usou `.insert().select()` sem sessão. Visitantes podem criar pedidos, mas não lê-los: envie o `id` gerado no navegador e não peça o retorno. |
| `Database error saving new user` no cadastro | O gatilho `handle_new_user` não bloqueia cadastros (ele só registra um aviso). Verifique **Logs → Postgres**: a causa está em outro gatilho de `auth.users`. |
| Upload de foto recusado | O bucket aceita até 5 MB e apenas JPEG, PNG, WebP ou AVIF. O envio exige conta `admin`. |
| `WARNING: Storage: sem permissão…` ao rodar o script | O papel do editor não pode alterar o schema `storage` neste projeto. As seções de tabelas foram aplicadas normalmente; crie o bucket e as políticas pelo painel, seguindo o texto do aviso (use `public.is_admin()` como expressão de INSERT, UPDATE e DELETE). |
| Promoção retorna `0 rows` | A conta não existe ou o e-mail está diferente. Veja a seção 2. |
| `Sua consultoria precisa de um plano ativo.` (HTTP 402) | A conta não é `vip` ou o `access_until` venceu. Libere o acesso (seção 3). |
| `new row violates row-level security policy for table "consultations"` | O cliente tentou salvar uma consultoria sem plano ativo. |
| `Apenas administradores podem liberar acesso à consultoria.` | `grant_consulting_access` foi chamada por uma conta que não é admin. |
| Pagamento aprovado no Mercado Pago, mas o acesso não foi liberado | Veja **Webhooks → notificações** no Mercado Pago: `401` = `MERCADOPAGO_WEBHOOK_SECRET` incorreta; `503` = variáveis ausentes na Vercel; `500` = veja os logs da função. O pagamento também não é aplicado se o valor pago for menor que o do plano. |
| Colunas novas não aparecem na API | O script já recarrega o cache do PostgREST. Se necessário, rode `notify pgrst, 'reload schema';`. |
