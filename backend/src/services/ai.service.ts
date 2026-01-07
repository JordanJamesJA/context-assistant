import type { AIResult, FrontendExtractedData } from "../types/ai.types.js";
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
    "facts": [
      {
        "type": "interest" | "important_date" | "place" | "note",
        "value": string,
        "source_text": string
      }
    ]
  },
  "confidence": number,
  "needs_clarification": boolean,
  "clarification_reason"?: string
}
 

Types:
- "interest": hobbies, likes, preferences (e.g., "I like sushi", "I enjoy hiking")
- "important_date": birthdays, anniversaries, deadlines (e.g., "my birthday is April 5", "anniversary on June 10")
- "place": locations, addresses, venues (e.g., "I live in Seattle", "works at Microsoft")
- "note": general information that doesn't fit other categories

Extract ALL facts from the text. Be thorough.

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

    if (!parsed.payload) {
      parsed.payload = { facts: [] };
    }

    if (!Array.isArray(parsed.payload.facts)) {
      parsed.payload.facts = [];
    }

    return parsed;
  } catch (err) {
    throw new Error("AI returned invalid JSON");
  }
}

export function transformToFrontendFormat(
  aiResult: AIResult
): FrontendExtractedData {
  const result: FrontendExtractedData = {
    interests: [],
    importantDates: [],
    places: [],
    notes: [],
  };

  const facts = aiResult?.payload?.facts || [];

  for (const fact of facts) {
    if (!fact || !fact.value) continue;

    const item = { value: fact.value.trim() };

    switch (fact.type) {
      case "interest":
        result.interests.push(item);
        break;

      case "important_date":
        result.importantDates.push(item);
        break;

      case "place":
        result.places.push(item);
        break;

      case "note":
        result.notes.push(item);
        break;

      default:
        result.notes.push(item);
    }
  }

  return result;
}
