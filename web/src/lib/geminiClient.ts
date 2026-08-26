// ============================================================
// GEMINI VISION AI CLIENT - TITI'S STORE (GEMINI FLASH 2.0 / 1.5)
// ============================================================

export interface GeminiSkinAnalysisResult {
  skinTone: 'Clara' | 'Morena Dourada' | 'Parda' | 'Negra Profunda';
  subtone: 'frio' | 'quente' | 'neutro';
  seasonPalette: string;
  melaninAndHemoglobinAnalysis: string;
  contrastLevel: string;
  recommendedClothingTypes: string[];
  proTip: string;
  melaninLevel?: string;
}

export async function analyzeSkinWithGeminiVision(base64Image: string): Promise<GeminiSkinAnalysisResult | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("Gemini API Key não encontrada nas variáveis de ambiente.");
    return null;
  }

  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = base64Image.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Você é o maior cientista visagista e consultor de imagem masculina da Titi's Store.
Analise a imagem facial enviada e determine com precisão milimétrica a colorimetria humana real (Teoria de Munsell & 12 Estações Sazonais).

Responda EXCLUSIVAMENTE em formato JSON válido com a seguinte estrutura estrita:
{
  "skinTone": "Clara" | "Morena Dourada" | "Parda" | "Negra Profunda",
  "subtone": "frio" | "quente" | "neutro",
  "seasonPalette": "Nome da Estação (ex: Inverno Frio & Brilhante, Outono Quente, etc)",
  "melaninAndHemoglobinAnalysis": "Descrição detalhada de pigmentação de melanina, tom de fundo e iluminação",
  "contrastLevel": "Nível de contraste entre cabelo/olhos/pele (Alto, Médio ou Baixo)",
  "recommendedClothingTypes": ["Tipo de tecido 1", "Modelo de Blazer 2", "Paleta de camisa 3"],
  "proTip": "Parecer técnico altamente personalizado de consultoria Titi's Store"
}`
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      console.error("Erro no status HTTP da API Gemini:", response.statusText);
      return null;
    }

    const data = await response.json();
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (rawJson) {
      const parsed: GeminiSkinAnalysisResult = JSON.parse(rawJson);
      return parsed;
    }

    return null;
  } catch (error) {
    console.error("Erro na análise de visão do Gemini Flash:", error);
    return null;
  }
}
