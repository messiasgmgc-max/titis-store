import { Injectable } from '@nestjs/common';

@Injectable()
export class LooksService {
  getFeaturedLooks() {
    return [
      {
        id: 'feat-1',
        title: 'Executivo Noir Gold',
        category: 'Alfaiataria Premium',
        rating: 4.9,
        views: 1420,
        colors: ['#0B0C10', '#1B2A4A', '#D4AF37'],
        description: 'Corte slim em lã fria super 130 com caimento milimétrico. Desenvolvido para reuniões de conselho e negociações de alto impacto.',
      },
      {
        id: 'feat-2',
        title: 'Casual Chic Champagne',
        category: 'Modern Elegance',
        rating: 4.8,
        views: 980,
        colors: ['#E6D7C3', '#A0522D', '#2C3539'],
        description: 'Tricô fino em algodão egípcio combinado com calça chino tailored e sapatos minimalistas de couro premium.',
      },
      {
        id: 'feat-3',
        title: 'Noturno Velour Velvet',
        category: 'Gala & Eventos',
        rating: 5.0,
        views: 2100,
        colors: ['#58111A', '#0B0C10', '#C0C0C0'],
        description: 'Blazer em veludo italiano bordô com acabamento de alfaiataria artesanal e botões em madrepérola escura.',
      },
    ];
  }
}
