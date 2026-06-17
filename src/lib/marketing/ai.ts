import Anthropic from "@anthropic-ai/sdk";

export function buildImprovePrompt(original: string, toneOfVoice: string | null): string {
  const tono = toneOfVoice ? `Tono de voz de la marca: ${toneOfVoice}.` : "";
  return [
    "Eres un editor de marketing. Reescribe la siguiente reseña de un cliente para",
    "usarla como cita en una publicación, en español, breve (máx 200 caracteres),",
    "conservando el sentido y sin inventar hechos. Devuelve SOLO el texto, sin comillas.",
    tono,
    `Reseña original: "${original}"`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Pule el texto con Claude. Lanza si no hay API key configurada. */
export async function improveQuote(original: string, toneOfVoice: string | null): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("NO_API_KEY");
  const client = new Anthropic({ apiKey });
  const msg = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 300,
    messages: [{ role: "user", content: buildImprovePrompt(original, toneOfVoice) }],
  });
  const block = msg.content.find((b) => b.type === "text");
  const text = block && block.type === "text" ? block.text.trim() : "";
  return text || original;
}
