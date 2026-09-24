import { Injectable } from '@nestjs/common';
import { GenerateConsultationDto } from './dto/consultation.dto';

export interface LookRecommendation {
  id: string;
  title: string;
  subtitle: string;
  presenceIntensity: number; // 1 to 100
  styleCategory: string;
  palette: { name: string; hex: string }[];
  pieces: { category: string; name: string; color: string; hex: string }[];
  proTip: string;
  imageUrl?: string;
}

export interface ConsultationResponse {
  clientProfile: {
    skinTone: string;
    skinToneTitle: string;
    idealColors: string[];
    contrastAdvice: string;
  };
  occasionContext: {
    occasion: string;
    timeOfDay: string;
    climate: string;
  };
  recommendations: LookRecommendation[];
}

@Injectable()
export class ConsultationService {
  generateConsultation(dto: GenerateConsultationDto): ConsultationResponse {
    const skinToneProfiles: Record<string, { title: string; colors: string[]; advice: string }> = {
      clara: {
        title: 'Pele Clara com Tons Frios ou Neutros',
        colors: ['Azul Marinho', 'Cinza Grafite', 'Vinho Burgandi', 'Verde Esmeralda'],
        advice: 'Cores de alto contraste como azul escuro e vinho ressaltam seu tom natural. Evite beges desbotados que possam apagar sua presença.',
      },
      morena: {
        title: 'Pele Morena com Tons Dourados e Quentes',
        colors: ['Terracota', 'Beige Champagne', 'Verde Oliva', 'Azul Petróleo'],
        advice: 'Tons terrosos e aquecidos valorizam seu bronzeado natural e trazem refinamento magnético aos seus looks.',
      },
      parda: {
        title: 'Pele Parda com Tons Médios e Profundos',
        colors: ['Preto Obsidian', 'Branco Névoa', 'Caramelo Premium', 'Azul Cobalto'],
        advice: 'O equilíbrio de cores neutras escuras combinadas com pontos de cor quentes gera um visual imponente e equilibrado.',
      },
      negra: {
        title: 'Pele Negra Profunda com Tons Ricos',
        colors: ['Branco Marfim', 'Amarelo Mostarda Premium', 'Bordô Imperial', 'Azul Real'],
        advice: 'Cores luminosas e contrastantes criam um efeito esculpido e extremamente sofisticado na pele negra.',
      },
      neutra: {
        title: 'Pele Versátil com Subtom Neutro',
        colors: ['Cinza Chumbo', 'Azul Marinho Classic', 'Areia', 'Caqui'],
        advice: 'Você possui a versatilidade de mesclar tons frios e quentes. Aposte em sobreposições estruturadas.',
      },
    };

    const profile = skinToneProfiles[dto.skinTone.toLowerCase()] || skinToneProfiles.morena;

    // Generate dynamic look recommendations
    const recommendations: LookRecommendation[] = [
      {
        id: 'look-1',
        title: dto.occasion === 'trabalho' ? 'Executivo de Alto Impacto' : 'Smart Casual Signature',
        subtitle: 'Combinação atemporal que transmite autoridade, elegância e confiança natural.',
        presenceIntensity: 95,
        styleCategory: 'Alfaiataria Premium',
        palette: [
          { name: 'Azul Marinho', hex: '#1B2A4A' },
          { name: 'Branco Marfim', hex: '#F7F7F7' },
          { name: 'Preto Absoluto', hex: '#111111' },
          { name: 'Champagne Gold', hex: '#D4AF37' },
        ],
        pieces: [
          { category: 'Sobreposição', name: 'Blazer Slim Ajustado Lã Fria', color: 'Azul Marinho', hex: '#1B2A4A' },
          { category: 'Superior', name: 'Camisa Pima Cotton Gola Italiana', color: 'Branco Marfim', hex: '#F7F7F7' },
          { category: 'Inferior', name: 'Calça Alfaiataria Chino Premium', color: 'Cinza Chumbo', hex: '#2C3539' },
          { category: 'Calçado', name: 'Loafer Couro Italiano Brogue', color: 'Preto Absoluto', hex: '#111111' },
          { category: 'Acessório', name: 'Relógio Cronógrafo Aço / Couro', color: 'Champagne Gold', hex: '#D4AF37' },
        ],
        proTip: 'Dica Titi: Mantenha o punho da camisa aparecendo exatamente 1,5 cm sob o blazer para uma assinatura impecável.',
      },
      {
        id: 'look-2',
        title: 'Casual Contemporâneo Luxury',
        subtitle: 'Sofisticação moderna perfeita para ambientes dinâmicos e encontros de alto nível.',
        presenceIntensity: 88,
        styleCategory: 'Modern Luxury',
        palette: [
          { name: 'Terracota', hex: '#A0522D' },
          { name: 'Areia Champagne', hex: '#E6D7C3' },
          { name: 'Cinza Asfalto', hex: '#4A5568' },
        ],
        pieces: [
          { category: 'Superior', name: 'Tricô Cashmere Gola Careca', color: 'Terracota', hex: '#A0522D' },
          { category: 'Inferior', name: 'Calça Chino Tailored Fit', color: 'Areia Champagne', hex: '#E6D7C3' },
          { category: 'Calçado', name: 'Sneaker Minimalista Couro Nappa', color: 'Branco Gelo', hex: '#F0F4F8' },
        ],
        proTip: 'Dica Titi: O segredo deste look é o caimento do tricô nos ombros sem desleixo.',
      },
      {
        id: 'look-3',
        title: 'Noite & Celebração Obsidian',
        subtitle: 'Presença magnética e refinada para jantares, celebrações e eventos Noturnos.',
        presenceIntensity: 98,
        styleCategory: 'Glamour Noturno',
        palette: [
          { name: 'Preto Obsidian', hex: '#0B0C10' },
          { name: 'Vinho Bordô', hex: '#58111A' },
          { name: 'Prata Escovado', hex: '#C0C0C0' },
        ],
        pieces: [
          { category: 'Sobreposição', name: 'Jaqueta Couro Pelica ou Blazer Veludo', color: 'Preto Obsidian', hex: '#0B0C10' },
          { category: 'Superior', name: 'Camisa Modal Preta Botoes Ocultos', color: 'Preto Absoluto', hex: '#111111' },
          { category: 'Inferior', name: 'Calça Alfaiataria Slim Velvet', color: 'Vinho Bordô', hex: '#58111A' },
          { category: 'Calçado', name: 'Chelsea Boot Couro Polido', color: 'Preto Obsidian', hex: '#0B0C10' },
        ],
        proTip: 'Dica Titi: Looks monocromáticos escuros com variação de texturas elevam sua estatura visual em 5%.',
      },
    ];

    return {
      clientProfile: {
        skinTone: dto.skinTone,
        skinToneTitle: profile.title,
        idealColors: profile.colors,
        contrastAdvice: profile.advice,
      },
      occasionContext: {
        occasion: dto.occasion,
        timeOfDay: dto.timeOfDay,
        climate: dto.climate,
      },
      recommendations,
    };
  }
}
