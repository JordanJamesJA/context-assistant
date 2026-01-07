import type { AIResult } from "../types/ai.types.js";
import ollama from "ollama";

const SYSTEM_PROMPT = `You are an information extraction engine.

You MUST return ONLY valid JSON.
No markdown.
No explanation.
No extra text.

The JSON must match this exact structure:

{
  "intent": string,
  "payload": {
    "contact_name"?: string,
    "facts": {
      "type": "interest" | "important_date" | "note" | "place",
      "label"?: string,
      "value": string,
      "source_text": string
    }[]
  },
  "confidence": number,
  "needs_clarification": boolean,
  "clarification_reason"?: string
}
`;

export async function extractFactsFromText(text: string): Promise<AIResult> {
  const response = await ollama.chat({
    model: "deepseek-r1:1.5b",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    format: "json",
  });

  try {
    const parsed: AIResult = JSON.parse(response.message.content);
    return parsed;
  } catch (err) {
    throw new Error("AI returned invalid JSON");
  }
}
