import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas exceto:
     * - /api (endpoints REST globais)
     * - /_next (arquivos de compilação interna e chunks do Next.js)
     * - Arquivos estáticos (.ico, .jpg, .jpeg, .png, .svg, .webp, .css, .js, .pdf, .txt)
     */
    '/((?!api/|_next/|[\\w-]+\\.\\w+).*)',
  ],
};

// Rotas globais compartilhadas acessíveis diretamente em ambos os domínios
const SHARED_ROUTES = [
  '/login',
  '/redefinir-senha',
  '/admin',
  '/termos',
  '/privacidade',
];

export default function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const pathname = url.pathname;

  // Sanitiza hostname removendo porta (ex: consultor.localhost:3000 -> consultor.localhost)
  const hostname = host.split(':')[0].toLowerCase();

  // Permite forçar via query param para testes (ex: ?app=consultor ou ?app=store)
  const queryApp = req.nextUrl.searchParams.get('app');

  // Domínios configurados
  const consultorDomain = (process.env.NEXT_PUBLIC_CONSULTOR_DOMAIN || 'consultor.titisstore.com.br').toLowerCase();

  // Em deploys da Vercel (*.vercel.app), a raiz deve sempre abrir a Loja Principal por padrão
  const isVercel = hostname.endsWith('.vercel.app');

  // Detecção de host do consultor (produção e dev)
  const isConsultorHost =
    queryApp === 'consultor' ||
    (!isVercel && (
      hostname === consultorDomain ||
      hostname === 'consultor.localhost' ||
      hostname.startsWith('consultor.')
    ));

  // Se for rota compartilhada (login, admin, legal), não aplica rewrite de tenant
  if (SHARED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  // Previne loop se a URL já estiver com o prefixo interno
  if (pathname.startsWith('/consultor') || pathname.startsWith('/store')) {
    return NextResponse.next();
  }

  // 1. Roteamento para a aplicação do Consultor
  if (isConsultorHost) {
    url.pathname = `/consultor${pathname === '/' ? '' : pathname}`;
    return NextResponse.rewrite(url);
  }

  // 2. Roteamento para o E-commerce / Loja Principal
  if (pathname === '/') {
    // A raiz já renderiza a Loja diretamente via app/page.tsx
    return NextResponse.next();
  }

  url.pathname = `/store${pathname}`;
  return NextResponse.rewrite(url);
}
