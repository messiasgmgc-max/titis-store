import type { Metadata, Viewport } from 'next';
import { Urbanist } from 'next/font/google';
import { Providers } from '@/providers/Providers';
import { SITE } from '@/lib/site';
import './globals.css';

// Tipografia única da marca: geométrica e arredondada, peso alto nos títulos.
const urbanist = Urbanist({
  variable: '--font-urbanist',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
});

// URL pública: variável própria do site ou, na Vercel, o domínio de produção do projeto.
const publicUrl =
  SITE.siteUrl ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '');

export const metadata: Metadata = {
  ...(publicUrl ? { metadataBase: new URL(publicUrl) } : {}),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "Titi's Store",
    'consultoria de imagem masculina',
    'colorimetria masculina',
    'alfaiataria',
    'estilo masculino',
    'cartela de cores',
    'personal stylist',
  ],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: '/titislogo.jpeg', width: 838, height: 838, alt: "Titi's Store" }],
  },
  twitter: {
    card: 'summary',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ['/titislogo.jpeg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0C10',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={urbanist.variable}
    >
      <body className="min-h-dvh bg-obsidian font-sans text-ivory antialiased overflow-x-hidden w-full max-w-full relative">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-gold focus:px-4 focus:py-2 focus:text-obsidian"
        >
          Pular para o conteúdo
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
