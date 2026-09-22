import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas exceto:
     * - api (endpoints REST globais)
     * - _next/static, _next/image (arquivos internos do Next.js)
     * - favicon.ico e extensões de arquivos estáticos
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif|css|js|woff|woff2|ttf|eot|pdf|json|txt)$).*)',
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
  '/dashboard',
  '/minha-conta',
  '/conta',
];

export default function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Resposta imediata para preflight CORS
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers':
          'X-Requested-With, Content-Type, Authorization, next-router-prefetch, next-router-state-tree, next-url, rsc',
      },
    });
  }

  // Garante bypass absoluto e imediato para todas as APIs e recursos estáticos
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/bio/') ||
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
    const STORE_SECTIONS = [
      '/colecao',
      '/carrinho',
      '/checkout',
      '/loja',
      '/produtos',
      '/alfaiataria',
      '/camisaria',
      '/malharia',
      '/calcas',
      '/calcados',
      '/acessorios',
    ];
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
