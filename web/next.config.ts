import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Há um package-lock.json também na pasta pai; fixa a raiz do app nesta pasta.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // Imagens do catálogo vêm do Supabase Storage/URLs externas; mantemos sem otimização
    // para não depender de remotePatterns nem consumir cota de otimização da Vercel.
    unoptimized: true,
  },
};

export default nextConfig;
