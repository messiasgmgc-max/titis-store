# Supabase · Titi's Store

Banco de dados, autenticação e armazenamento de fotos do site. Tudo o que o app precisa está em [`schema.sql`](./schema.sql): tabelas, regras de segurança (RLS), gatilhos, bucket de imagens e o acervo inicial do catálogo.

| Recurso | Para que serve | Quem acessa |
| --- | --- | --- |
| `profiles` | Perfil de cada conta (1:1 com `auth.users`), nível de acesso e preferências de estilo | O próprio cliente; administradores veem todos |
| `products` | Catálogo da loja | Público lê as peças ativas; só administradores cadastram, editam e removem |
| `consultations` | Consultorias e looks salvos no Atelier | O próprio cliente; administradores podem ler e remover |
| `orders` | Pedidos enviados pela sacola antes do atendimento no WhatsApp | Visitantes e clientes criam; o cliente lê os próprios; só administradores alteram |
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

### Outros níveis

```sql
-- Cliente do Clube ou do Passe (acesso completo ao Atelier e ao provador)
update public.profiles set role = 'vip' where lower(email) = lower('EMAIL_DO_CLIENTE');

-- Voltar ao acesso padrão
update public.profiles set role = 'client' where lower(email) = lower('EMAIL_DO_CLIENTE');
```

> O nível de acesso só muda pelo SQL Editor, pela `service_role` (servidor) ou por um administrador logado. O e-mail do perfil é sempre o da conta em `auth.users`: um cliente não consegue trocar o e-mail do próprio perfil para ser promovido no lugar de outra pessoa.

---

## 3. Authentication → URL Configuration

- **Site URL**: o endereço de produção, por exemplo `https://SEU-DOMINIO.com.br` (sem barra no final).
- **Redirect URLs**: adicione
  - `https://SEU-DOMINIO.com.br/dashboard`
  - `https://SEU-DOMINIO.com.br/redefinir-senha`
  - `http://localhost:3000/dashboard` e `http://localhost:3000/redefinir-senha`, para desenvolvimento
  - opcional, para previews da Vercel: `https://*-SEU-TIME.vercel.app/**`

Sem essas URLs, os links de confirmação de cadastro e de redefinição de senha caem na Site URL em vez da página certa.

---

## 4. Confirmação de e-mail

Em **Authentication → Sign In / Providers → Email**:

- Mantenha **Confirm email** ativado (recomendado). Depois do cadastro, o cliente recebe um link e volta ao `/dashboard` já autenticado.
- Com a opção desativada, a conta entra logada logo após o cadastro.

Em **Authentication → Emails**:

- Traduza os modelos *Confirm signup* e *Reset password* para português, com o tom da marca.
- O SMTP padrão do Supabase tem limite baixo de envios e serve apenas para testes. Em produção, configure um SMTP próprio em **SMTP Settings**.

---

## 5. Variáveis de ambiente na Vercel

Em **Vercel → Project → Settings → Environment Variables** (Production, Preview e Development):

| Variável | Uso | Onde encontrar | Observação |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Obrigatória | Supabase → botão **Connect** ou Project Settings → API | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Obrigatória | Supabase → Project Settings → API Keys (`anon` / publishable) | Pública; o acesso aos dados é protegido pelo RLS |
| `GEMINI_API_KEY` | Recomendada | Google AI Studio → API keys | **Somente servidor**. Leitura de colorimetria por foto, composição de looks, provador virtual e leitura de fotos no painel |
| `GROQ_API_KEY` | Recomendada | console.groq.com → API Keys | **Somente servidor**. Concierge de estilo (chat) |
| `GEMINI_TEXT_MODEL` | Opcional | — | Substitui o modelo padrão de texto e visão |
| `GEMINI_IMAGE_MODEL` | Opcional | — | Substitui o modelo padrão de imagem do provador |
| `GROQ_MODEL` | Opcional | — | Substitui o modelo padrão do concierge |
| `NEXT_PUBLIC_SITE_URL` | Opcional | — | URL canônica, por exemplo `https://SEU-DOMINIO.com.br` |

Sem as chaves de IA, os recursos que dependem delas ficam indisponíveis ou usam o motor local do Atelier.

### Remova as variáveis antigas

Apague `NEXT_PUBLIC_GEMINI_API_KEY` e `NEXT_PUBLIC_GROQ_API_KEY`. Tudo o que começa com `NEXT_PUBLIC_` é embutido no JavaScript enviado ao navegador, ou seja, essas chaves ficaram expostas publicamente. Além de apagar as variáveis:

1. gere chaves novas no Google AI Studio e no Groq;
2. revogue as chaves antigas;
3. cadastre as novas com os nomes **sem** o prefixo (`GEMINI_API_KEY`, `GROQ_API_KEY`).

Depois de alterar variáveis, faça **Redeploy**: elas só valem para deploys novos.

Nunca coloque a `service_role` / secret key do Supabase em uma variável `NEXT_PUBLIC_`.

Para desenvolvimento local, crie `web/.env.local` com as mesmas variáveis.

---

## 6. Produtos antigos com imagem em base64

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

## 7. Verificação

```sql
-- RLS ativo nas tabelas do app (relrowsecurity = true)
select relname, relrowsecurity
  from pg_class
 where relnamespace = 'public'::regnamespace
   and relname in ('profiles', 'products', 'consultations', 'orders');

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

---

## Como a segurança funciona

- **RLS em todas as tabelas.** Nenhuma leitura ou escrita acontece fora das políticas do script.
- **`public.is_admin()`** é a única verificação de administrador, usada pelas políticas das tabelas e do Storage.
- **Gatilho `profiles_protect_privileges`**: clientes não escolhem o próprio nível, não trocam o `id` e não mudam o e-mail do perfil. O SQL Editor, os processos internos do Supabase (como o cadastro) e a `service_role` não são afetados.
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
| Colunas novas não aparecem na API | O script já recarrega o cache do PostgREST. Se necessário, rode `notify pgrst, 'reload schema';`. |
