// ============================================================
// GROQ AI CLIENT - TITI'S STORE (LLAMA-3 / VISION / STYLE ENGINE)
// ============================================================

export async function analyzeCustomVenueWithGroq(promptText: string) {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.log("Groq API Key não configurada. Utilizando processamento sintético de estilo Titi's Store.");
    return null;
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: 'Você é o consultor de imagem especialista da Titi\'s Store. Analise a ocasião enviada e retorne sugestões curtas de tecidos, contraste e formalidade.',
          },
          {
            role: 'user',
            content: `Analise este compromisso e lugar customizado: "${promptText}".`,
          },
        ],
        temperature: 0.5,
        max_tokens: 300,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error('Erro na chamada da API Groq:', error);
    return null;
  }
}
