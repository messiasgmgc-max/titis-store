# Titi's Store — Alta Alfaiataria Masculina & Consultor Digital

Plataforma unificada de comércio eletrônico de luxo e consultoria de imagem masculina digital baseada em inteligência artificial.

---

## 🚀 Arquitetura & Tecnologias

- **Frontend & Backend:** Next.js 16 (App Router + Turbopack), React 19, TypeScript, Tailwind CSS
- **Banco de Dados & Auth:** Supabase (PostgreSQL, Row Level Security, Storage)
- **Checkout & Pagamentos:** Mercado Pago (Checkout Transparente, Pix com confirmação em tempo real e Cartão de Crédito)
- **Logística & Entregas:** SuperFrete API Oficial (Correios PAC, SEDEX, Mini Envios e Jadlog com desconto e emissão de etiquetas PDF)
- **Notificações:** Evolution API (WhatsApp pós-venda automatizado) e Resend (E-mails transacionais e newsletter)
- **Inteligência Artificial:** Google Gemini & Groq (Visão computacional e colorimetria masculina)

---

## 🔑 Configuração de Variáveis de Ambiente (.env)

Copie este bloco para as configurações de ambiente da **Vercel** ou **Coolify**:

```dotenv
# 1. SUPABASE (BANCO DE DADOS & AUTH)
NEXT_PUBLIC_SUPABASE_URL=https://dusavcbgomdosfjodups.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_YH8NQJfUpbnItrGmVYFtJQ_DDXgZDPh
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_secreta_aqui

# 2. MERCADO PAGO (PAGAMENTOS, PIX & CARTÃO)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-seu_access_token_aqui
MERCADOPAGO_PUBLIC_KEY=APP_USR-sua_public_key_aqui
MERCADOPAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui

# 3. SUPERFRETE (FRETE CORREIOS / JADLOG & ETIQUETAS)
FRETE_PROVIDER=superfrete
SUPERFRETE_TOKEN=seu_token_superfrete_jwt_aqui
SUPERFRETE_ORIGIN_CEP=30130000
SUPERFRETE_SANDBOX=false

# 4. EVOLUTION API (WHATSAPP AUTOMATIZADO)
EVOLUTION_API_URL=https://api.suaevolution.com.br
EVOLUTION_API_KEY=sua_chave_evolution
EVOLUTION_INSTANCE_NAME=titis-store

# 5. RESEND (DISPARO DE E-MAILS & NEWSLETTER)
RESEND_API_KEY=re_sua_chave_resend_aqui
EMAIL_FROM="Titi's Store <pedidos@titisstore.com.br>"

# 6. DOMÍNIOS
NEXT_PUBLIC_SITE_URL=https://www.titisstore.com.br
NEXT_PUBLIC_CONSULTOR_URL=https://consultor.titisstore.com.br
NEXT_PUBLIC_CONSULTOR_DOMAIN=consultor.titisstore.com.br
NEXT_PUBLIC_CHECKOUT_PROVIDER=mercadopago

# 7. IA CONSULTORIA & PRODUTOS (OPCIONAL)
GEMINI_API_KEY=sua_chave_gemini_aqui
GROQ_API_KEY=sua_chave_groq_aqui
```

---

## 💳 Como obter as credenciais do Mercado Pago

1. Acesse o [Painel de Desenvolvedores do Mercado Pago](https://www.mercadopago.com.br/developers/panel/app).
2. Selecione ou crie sua aplicação (ex: `Titis Store`).
3. Vá em **Credenciais de Produção** e copie:
   - **Access Token:** Começa com `APP_USR-...` -> adicione em `MERCADOPAGO_ACCESS_TOKEN`
   - **Public Key:** Começa com `APP_USR-...` -> adicione em `MERCADOPAGO_PUBLIC_KEY`
4. Na aba **Webhooks**:
   - URL de Notificação: `https://www.titisstore.com.br/api/webhooks/mercadopago`
   - Eventos: Marque **Pagamentos (payment)**.
   - Copie a **Chave Secreta de Assinatura** e adicione em `MERCADOPAGO_WEBHOOK_SECRET`.

---

## 📦 Como obter as credenciais da SuperFrete

1. Acesse o painel da [SuperFrete](https://superfrete.com/) ou [Web SuperFrete](https://web.superfrete.com/).
2. Vá em **Integrações** -> Gerar Token de API.
3. Copie o token JWT gerado e adicione em `SUPERFRETE_TOKEN`.
4. Defina `FRETE_PROVIDER=superfrete` e `SUPERFRETE_ORIGIN_CEP` com o CEP de saída dos pacotes.

---

## 🔍 Rota de Diagnóstico em Produção

Para testar e auditar se todas as variáveis estão conectadas no servidor:
- Diagnóstico JSON: `GET /api/admin/env-status`
- Exportação em texto puro: `GET /api/admin/env-status?format=raw`
