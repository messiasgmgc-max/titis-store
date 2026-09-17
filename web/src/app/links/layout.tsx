import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TITIS STORE | Links Oficiais & Atendimento',
  description: 'Referência em estilo masculino! Roupas masculinas com consultoria de imagem para qualquer ocasião.',
  openGraph: {
    title: 'TITIS STORE | Links Oficiais & Atendimento',
    description: 'Referência em estilo masculino! Roupas masculinas com consultoria de imagem para qualquer ocasião.',
    url: 'https://www.titisstore.com.br/links',
    siteName: 'TITIS STORE',
    images: [
      {
        url: '/bio/bio_1_175995817900077876.jpg',
        width: 400,
        height: 400,
        alt: 'TITIS STORE',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'TITIS STORE | Links Oficiais & Atendimento',
    description: 'Referência em estilo masculino! Roupas masculinas com consultoria de imagem para qualquer ocasião.',
    images: ['/bio/bio_1_175995817900077876.jpg'],
  },
};

export default function LinksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
