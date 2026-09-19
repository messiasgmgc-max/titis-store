import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Titi's Store — Alfaiataria & Consultoria",
    short_name: "Titi's Store",
    description: SITE.description || 'E-commerce e Consultoria de Imagem Masculina com IA e Colometria Científica.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0C10',
    theme_color: '#0B0C10',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/titislogo.jpeg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
      {
        src: '/titislogo.jpeg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/logo_titis.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
    categories: ['shopping', 'lifestyle', 'fashion'],
  };
}
