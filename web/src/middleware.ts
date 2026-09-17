import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas exceto:
     * - /api (endpoints REST globais)
     * - /_next (arquivos de compilação interna e chunks do Next.js)
     * - /produtos e /bio (fotos estáticas em public/)
     * - Arquivos estáticos com extensão (.ico, .jpg, .jpeg, .png, .svg, .webp, etc.)
     */
    '/((?!api|_next|produtos|bio|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif|css|js|woff|woff2|ttf|eot|pdf|json|txt)$).*)',
  ],
};

// Rotas globais compartilhadas acessíveis diretamente em ambos os domínios
const SHARED_ROUTES = [
  '/login',
  '/redefinir-senha',
  '/admin',
  '/termos',
  '/privacidade',
  '/links',
];

export default function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const pathname = url.pathname;

  // Ignora imediatamente se for asset estático, subpasta pública ou API
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/produtos') ||
    pathname.startsWith('/bio') ||
    /\.(?:ico|png|jpg|jpeg|svg|webp|gif|css|js|woff|woff2|ttf|eot|pdf|json|txt)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 1. Identificação precisa do Host
  // Em proxies reversos e Vercel, lê o Host original enviado pelo cliente
  const rawHost = req.headers.get('host') || req.headers.get('x-forwarded-host') || req.nextUrl.host || '';
  const firstHost = rawHost.split(',')[0].trim();
  const hostname = firstHost.split(':')[0].toLowerCase();

  // Permite forçar via query param para testes (ex: ?app=consultor ou ?app=store)
  const queryApp = req.nextUrl.searchParams.get('app');

  // Domínio do consultor configurado nas variáveis de ambiente
  const consultorDomain = (process.env.NEXT_PUBLIC_CONSULTOR_DOMAIN || 'consultor.titisstore.com.br')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .trim();

  // Detecção de host do consultor (produção e dev)
  const isConsultorHost =
    queryApp === 'consultor' ||
    hostname === consultorDomain ||
    hostname === 'consultor.localhost' ||
    hostname.startsWith('consultor.');

  // Se for rota compartilhada (login, admin, legal, links), não aplica rewrite de tenant
  if (SHARED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  // Previne loop se a URL já estiver com o prefixo interno
  // ATENÇÃO: NÃO usar startsWith('/consultor') sem barra pois capturaria '/consultoria'!
  if (
    pathname === '/consultor' ||
    pathname.startsWith('/consultor/') ||
    pathname === '/store' ||
    pathname.startsWith('/store/')
  ) {
    return NextResponse.next();
  }

  // 1. Roteamento para a aplicação do Consultor (subdomínio consultor.titisstore.com.br)
  if (isConsultorHost) {
    // Se tentar acessar páginas da loja no subdomínio do consultor, redireciona para a loja principal
    const STORE_SECTIONS = ['/colecao', '/carrinho', '/checkout', '/loja'];
    if (STORE_SECTIONS.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
      const storeOrigin =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (hostname.includes('localhost') ? 'http://localhost:3000' : 'https://www.titisstore.com.br');
      const redirectUrl = new URL(`${pathname}${req.nextUrl.search}`, storeOrigin);
      return NextResponse.redirect(redirectUrl);
    }

    url.pathname = `/consultor${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // 2. Roteamento para o E-commerce / Loja Principal (www.titisstore.com.br)
  // Se tentar acessar a consultoria pelo domínio da loja, redireciona para o subdomínio oficial
  const CONSULTOR_SECTIONS = ['/consultoria', '/assinar'];
  if (CONSULTOR_SECTIONS.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    const consultorOrigin =
      process.env.NEXT_PUBLIC_CONSULTOR_URL ||
      (hostname.includes('localhost') ? 'http://consultor.localhost:3000' : 'https://consultor.titisstore.com.br');
    const redirectUrl = new URL(`${pathname}${req.nextUrl.search}`, consultorOrigin);
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === '/') {
    // A raiz já renderiza a Loja diretamente via app/page.tsx
    return NextResponse.next();
  }

  url.pathname = `/store${pathname}`;
  return NextResponse.rewrite(url);
}
