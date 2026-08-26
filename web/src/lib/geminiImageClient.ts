// ============================================================
// GEMINI IMAGE / NANO BANANA GENERATION CLIENT - TITI'S STORE
// ============================================================

export async function generateVirtualTryOnImageWithGemini(
  userFaceBase64: string,
  outfitDescription: string
): Promise<string | null> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn("Gemini API Key não configurada para Geração de Imagem Nano.");
    return null;
  }

  try {
    const cleanBase64 = userFaceBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = userFaceBase64.match(/^data:(image\/\w+);base64,/)?.[1] || 'image/jpeg';

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
                text: `Substitua a roupa do manequim mantendo as feições e tom de pele do rosto fornecido. Vista o manequim com o seguinte look: ${outfitDescription}.`
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Erro na geração de imagem do Gemini Nano:", error);
    return null;
  }
}
