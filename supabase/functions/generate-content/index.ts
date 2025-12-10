import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateRequest {
  toolType: string;
  businessType: string;
  customPrompt?: string;
}

const toolPrompts: Record<string, string> = {
  posts: "Crie 3 posts criativos e virais para Instagram para o seguinte tipo de negócio: {{business}}. Cada post deve ter emojis relevantes, hashtags populares e texto engajador. Separe cada post com '---'.",
  legendas: "Crie 3 legendas curtas, diretas e profissionais para Instagram para: {{business}}. Cada legenda deve ter no máximo 150 caracteres. Separe cada legenda com '---'.",
  promocoes: "Liste 3 promoções fortes e irresistíveis que aumentem vendas para uma {{business}}. Inclua porcentagens, datas limite e senso de urgência. Separe cada promoção com '---'.",
  anuncios: "Crie 3 anúncios profissionais para Facebook Ads e Instagram Ads para: {{business}}. Inclua headline chamativa, copy persuasivo e CTA claro. Separe cada anúncio com '---'.",
  chat: "Crie 3 respostas automáticas profissionais para atendimento ao cliente de uma {{business}}. Inclua saudação, resposta útil e despedida cordial. Separe cada resposta com '---'.",
  whatsapp: "Crie 3 mensagens de atendimento para WhatsApp para: {{business}}. Inclua mensagem de boas-vindas, acompanhamento e fechamento de vendas. Separe cada mensagem com '---'.",
  produtos: "Crie descrições detalhadas e persuasivas de 3 produtos vendidos por uma {{business}}. Destaque benefícios, diferenciais e gatilhos de compra. Separe cada descrição com '---'.",
  cardapio: "Com base no tipo de negócio {{business}}, crie um cardápio moderno com 3 seções diferentes, cada uma com 4-5 itens e preços sugeridos em reais. Formate de forma elegante.",
  bio: "Crie 5 opções de bio profissional para Instagram para o tipo de negócio: {{business}}. Cada bio deve ter no máximo 150 caracteres e incluir emojis. Separe cada bio com '---'.",
  campanhas: "Crie 3 campanhas completas de tráfego pago para: {{business}}. Inclua: objetivo, público-alvo detalhado, copy do anúncio, sugestão de criativo e orçamento sugerido. Separe cada campanha com '---'.",
  analisador: "Analise o perfil de Instagram de uma {{business}} e forneça: 5 pontos fortes, 5 pontos fracos, 5 sugestões de conteúdo, nota de 1-10 e plano de melhoria para 30 dias.",
  sites: "Crie 3 estruturas de site completas para uma {{business}}. Inclua: seções recomendadas, textos para cada seção, cores sugeridas e elementos visuais. Separe cada estrutura com '---'.",
  landing: "Crie 3 landing pages completas para {{business}}. Inclua: headline matadora, subheadline, bullet points de benefícios, 3 depoimentos fictícios e CTA irresistível. Separe cada landing com '---'.",
  loja: "Crie a estrutura de 3 lojas virtuais para {{business}}. Inclua: categorias de produtos, descrições, políticas de entrega/troca e copy persuasivo para a home. Separe cada estrutura com '---'.",
  ebooks: "Crie 3 estruturas de ebook para {{business}}. Inclua: título chamativo, subtítulo, 5 capítulos com descrição detalhada e ideia de capa. Separe cada estrutura com '---'.",
  vendas: "Crie 3 scripts de vendas avançados para {{business}}. Inclua: abertura magnética, qualificação, apresentação de valor, quebra de objeções e fechamento. Separe cada script com '---'.",
  planejador: "Crie um plano de conteúdo semanal completo para {{business}}. Inclua: 7 dias com horários ideais, tipo de conteúdo (post, reels, stories), copy completo e hashtags relevantes.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { toolType, businessType, customPrompt }: GenerateRequest = await req.json();

    if (!toolType || !businessType) {
      return new Response(
        JSON.stringify({ error: "toolType and businessType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const basePrompt = toolPrompts[toolType] || customPrompt || "Gere conteúdo criativo para {{business}}.";
    const finalPrompt = basePrompt.replace(/\{\{business\}\}/g, businessType);

    console.log(`Generating content for toolType: ${toolType}, business: ${businessType}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em marketing digital e criação de conteúdo para pequenos negócios no Brasil. 
Seu trabalho é criar conteúdo profissional, criativo e otimizado para conversão.
Sempre responda em português brasileiro.
Use emojis de forma estratégica.
Seja direto e prático.
Foque em resultados e vendas.`,
          },
          {
            role: "user",
            content: finalPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Split content by separator
    const results = content
      .split("---")
      .map((r: string) => r.trim())
      .filter((r: string) => r.length > 0);

    console.log(`Generated ${results.length} results`);

    return new Response(
      JSON.stringify({ results: results.length > 0 ? results : [content] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro ao gerar conteúdo" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
