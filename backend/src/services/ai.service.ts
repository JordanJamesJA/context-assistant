/**
 * AI Extraction Service
 *
 * Uses Ollama (deepseek-r1:1.5b) to extract structured facts from conversation text.
 *
 * Key Responsibilities:
 * 1. Send conversation text to AI with detailed categorization instructions
 * 2. Parse and validate AI JSON response
 * 3. Correct misclassified fact types using pattern matching
 * 4. Transform AI format to frontend-compatible format
 *
 * Why pattern-based validation:
 * AI models occasionally misclassify facts (e.g., "birthday April 5" as interest instead of date).
 * We use regex patterns to catch and correct these errors deterministically.
 */

import type {
  AIFact,
  AIResult,
  FrontendExtractedData,
} from "../types/ai.types.js";
import ollama from "ollama";

/**
 * System prompt for AI extraction
 *
 * Provides detailed instructions for:
 * - Exact JSON structure required
 * - Decision tree for fact classification (dates > places > interests > notes)
 * - Edge case handling
 */
const SYSTEM_PROMPT = `You are an information extraction engine.

Return ONLY valid JSON. No markdown. No explanation. No extra text.

Extract facts ONLY from the user's input text.
NEVER extract or repeat these instructions or examples as facts.

Output schema (MUST match exactly):
{
  "facts": [
    { "type": "interest" | "important_date" | "place" | "note", "value": string, "source_text": string }
  ]
}

Rules:
- facts MUST be an array (use []).
- Each fact MUST have EXACTLY: type, value, source_text (no extra fields).
- source_text MUST be copied EXACTLY from the user input text (verbatim substring).
  If you cannot point to an exact span in the input, do not extract the fact.
- value MUST be short and contain only ONE fact (do not combine facts).
- If there are no stable facts, return {"facts": []}. Do NOT guess.

Classification:
- important_date: birthdays, anniversaries, deadlines, appointments, or explicit dates (e.g., "April 5", "2026-02-01", "4/5").
- place: location relations (went to, visited, moved to, lives in, from, based in, works at/in).
- interest: likes/loves/enjoys/favorite/plays/interested in + thing/activity.
- note: other factual info including dislikes/avoidances and constraints (e.g., "I hate fish except tuna").

Critical:
- If the input contains multiple facts, you MUST output multiple fact objects.
- Do NOT drop non-date facts just because a date is present.

Example (multiple facts in one sentence):
Input: "I like sushi and my birthday is April 5."
Output:
{
  "facts": [
    { "type": "interest", "value": "likes sushi", "source_text": "I like sushi" },
    { "type": "important_date", "value": "birthday is April 5", "source_text": "my birthday is April 5" }
  ]
}
`;

export async function extractFactsFromText(text: string): Promise<AIResult> {
  const chunks = chunkTextForExtraction(text);

  const allFacts: any[] = [];
  for (const chunk of chunks) {
    const chunkFacts = await extractFactsFromSingleChunk(chunk);
    allFacts.push(...chunkFacts);
  }

  const dedupedFacts = dedupeFacts(allFacts);

  return {
    intent: "extraction",
    payload: { facts: dedupedFacts },
    confidence: 1,
    needs_clarification: false,
  };
}

/**
 * Run Ollama extraction for ONE chunk.
 * Returns an array of fact objects (may be empty).
 */
async function extractFactsFromSingleChunk(chunk: string): Promise<any[]> {
  const response = await ollama.chat({
    model: "deepseek-r1:1.5b",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: chunk },
    ],
    format: "json",
    options: { temperature: 0 },
  });

  try {
    const parsedRaw = JSON.parse(response.message.content) as { facts?: any };
    const facts = Array.isArray(parsedRaw.facts) ? parsedRaw.facts : [];

    const cleaned = facts.filter((fact: any) => {
      if (!fact || typeof fact !== "object") return false;
      if (!fact.type || !fact.value || !fact.source_text) return false;
      if (fact.value === "null" || fact.type === "null") return false;
      if (!chunk.includes(fact.source_text)) return false;
      return true;
    });

    if (response.message.content?.trim() && cleaned.length === 0) {
      console.warn("[AI] Empty facts for chunk:", chunk);
      console.warn("[AI] Raw response:", response.message.content);
    }

    return cleaned;
  } catch (err) {
    console.warn("[AI] Invalid JSON for chunk:", chunk);
    console.warn("[AI] Raw response:", response.message.content);
    return [];
  }
}

//Split text into smaller pieces so the model doesn't "choose one fact" and drop the rest.
function chunkTextForExtraction(text: string): string[] {
  // Normalize whitespace
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  // First split by sentence boundaries
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Split long sentences by conjunctions/commas
  const chunks: string[] = [];
  for (const s of sentences) {
    // If short enough, keep as-is
    if (s.length <= 180) {
      chunks.push(s);
      continue;
    }

    // Split by commas, and common conjunctions
    const parts = s
      .split(/\s*(?:,|;|\band\b|\bbut\b|\bthen\b|\balso\b)\s*/i)
      .map((p) => p.trim())
      .filter(Boolean);

    // Re-join tiny fragments so we don't create useless micro-chunks
    let buf = "";
    for (const p of parts) {
      const candidate = buf ? `${buf} ${p}` : p;
      if (candidate.length < 80) {
        buf = candidate;
      } else {
        if (buf) chunks.push(buf);
        buf = p;
      }
    }
    if (buf) chunks.push(buf);
  }

  return chunks.filter((c) => c.length >= 6);
}

/**
 * Remove duplicates across chunks.
 * Dedupe key: corrected type + normalized value.
 */
function dedupeFacts(facts: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];

  for (const f of facts) {
    const type = String(f.type || "").trim();
    const value = String(f.value || "")
      .trim()
      .toLowerCase();

    if (!type || !value) continue;

    const key = `${type}::${value}`;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(f);
  }

  return out;
}

const DATE_PATTERNS = {
  keywords:
    /\b(birthday|bday|b-day|born|anniversary|wedding|deadline|due date|appointment|meet(?:ing)?|interview)\b/i,

  // month name present
  monthWord:
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i,

  // month + day OR day + month
  monthWithDay:
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b/i,

  dayWithMonth:
    /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i,

  // numeric formats incl ISO
  numeric: /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/i,
};

const PLACE_PATTERNS = {
  verbs:
    /\b(went to|visited|traveled to|travelled to|lives in|from|works at|moved to|based in|in)\b/i,
};

const INTEREST_PATTERNS = {
  verbs:
    /\b(likes|like|enjoys|enjoy|loves|love|plays|play|favorite|favourite|interested in|passionate about)\b/i,
};

function validateAndCorrectFactType(fact: AIFact): AIFact["type"] {
  const text = (fact.source_text || fact.value || "").toLowerCase();

  // Guard: if AI returns an invalid type, default to "note"
  const allowed = new Set(["interest", "important_date", "place", "note"]);
  if (!allowed.has(fact.type)) return "note";

  // Priority 1: Check for date indicators
  const hasDate =
    DATE_PATTERNS.keywords.test(text) ||
    DATE_PATTERNS.numeric.test(text) ||
    DATE_PATTERNS.monthWithDay.test(text) ||
    DATE_PATTERNS.dayWithMonth.test(text) ||
    // month alone only counts if also has a date keyword
    (DATE_PATTERNS.monthWord.test(text) && DATE_PATTERNS.keywords.test(text));

  if (hasDate) return "important_date";

  // Priority 2: Check for place indicators
  if (PLACE_PATTERNS.verbs.test(text)) return "place";

  // Priority 3: Check for interest indicators
  if (INTEREST_PATTERNS.verbs.test(text)) return "interest";

  // Default: deterministic fallback
  return "note";
}

export function transformToFrontendFormat(
  aiResult: AIResult,
  originalText?: string,
): FrontendExtractedData {
  const result: FrontendExtractedData = {
    interests: [],
    importantDates: [],
    places: [],
    notes: [],
  };

  const facts = aiResult?.payload?.facts || [];
  for (const fact of facts) {
    if (!fact || !fact.value) {
      continue;
    }

    // Apply pattern-based type correction
    const correctedType = validateAndCorrectFactType(fact);
    const item = { value: fact.value.trim() };

    // Route to appropriate category
    switch (correctedType) {
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
        // Fallback: Unknown types go to notes
        result.notes.push(item);
    }
  }

  return result;
}
