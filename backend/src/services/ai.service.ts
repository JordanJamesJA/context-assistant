/**
 * AI Extraction Service
 *
 * Uses Ollama (deepseek-r1:1.5b) to extract meaningful information from conversations.
 *
 * NEW APPROACH (ChatGPT-style):
 * - Preserves compound sentences and natural language flow
 * - Extracts entries (not atomic facts) that can contain multiple related pieces of info
 * - Allows entries to have multiple category tags
 * - AI determines what's meaningful, we don't chop it up with regex
 *
 * Key Responsibilities:
 * 1. Send conversation text to AI with natural extraction instructions
 * 2. Parse and validate AI JSON response
 * 3. Transform AI format to frontend-compatible format (backwards compatible)
 */

import type {
  AIEntry,
  AIResult,
  FrontendExtractedData,
} from "../types/ai.types.js";
import ollama from "ollama";

/**
 * System prompt for AI extraction - ChatGPT-style natural language processing
 *
 * NEW APPROACH:
 * - Preserve compound sentences and natural language flow
 * - Extract meaningful entries (not atomic facts)
 * - Allow entries to have multiple category tags
 * - Let AI determine what's meaningful without rigid rules
 */
const SYSTEM_PROMPT = `You are a natural language information extraction assistant, like ChatGPT.

Extract meaningful information from conversations as complete, natural sentences.
PRESERVE compound sentences that contain multiple related pieces of information.
DO NOT break up compound sentences into separate atomic facts.

You MUST return ONLY valid JSON. No markdown, no explanation, no extra text.

The JSON must match this exact structure:
{
  "intent": "general",
  "payload": {
    "contact_name": "John Doe",
    "entries": [
      {
        "text": "loves sushi and ramen, especially from that place in Tokyo",
        "categories": ["interest", "place"],
        "source_text": "I love sushi and ramen, especially from that place in Tokyo"
      },
      {
        "text": "birthday is April 5th and celebrating in Paris this year",
        "categories": ["important_date", "place"],
        "source_text": "my birthday is April 5th and I'm celebrating in Paris this year"
      }
    ]
  },
  "confidence": 0.9,
  "needs_clarification": false
}

CRITICAL RULES:

1. "entries" field MUST be an ARRAY (use [] brackets)
2. Each entry has THREE fields: "text", "categories", "source_text"
3. "text" should be natural, readable sentences (can be compound/complex)
4. "categories" is an ARRAY that can contain multiple tags: "interest", "important_date", "place", "note"
5. PRESERVE the natural flow - if someone says "I love sushi and went to Tokyo", keep it together!

CATEGORY TAGGING GUIDELINES (entries can have MULTIPLE categories):

"interest" - hobbies, likes, preferences, activities, favorite things
"important_date" - birthdays, anniversaries, deadlines, holidays, any date mentions
"place" - locations visited, lived in, from, or want to visit
"note" - general information, health notes, family info, dietary restrictions

EXAMPLES OF GOOD EXTRACTION:

Input: "I love sushi and went to Tokyo last April for my birthday"
Output:
{
  "text": "loves sushi, went to Tokyo last April for birthday",
  "categories": ["interest", "place", "important_date"],
  "source_text": "I love sushi and went to Tokyo last April for my birthday"
}

Input: "She's vegetarian, allergic to peanuts, and her birthday is June 10th"
Output:
{
  "text": "vegetarian, allergic to peanuts, birthday June 10th",
  "categories": ["note", "important_date"],
  "source_text": "She's vegetarian, allergic to peanuts, and her birthday is June 10th"
}

Input: "He plays tennis and loves hiking in Colorado"
Output:
{
  "text": "plays tennis and loves hiking in Colorado",
  "categories": ["interest", "place"],
  "source_text": "He plays tennis and loves hiking in Colorado"
}

WHEN TO SPLIT INTO MULTIPLE ENTRIES:

Only split if the pieces of information are COMPLETELY UNRELATED:

Input: "I like pizza. Oh and I'm from Boston. My birthday is May 3rd."
Output THREE separate entries because they're unrelated topics.

But for compound sentences with related info, KEEP THEM TOGETHER:

Input: "I love Italian food and went to Rome last summer"
Output ONE entry with both categories because they're contextually related.

CRITICAL: Work like ChatGPT - understand context, preserve natural language, don't chop things up unnecessarily.
`;

/**
 * Extracts meaningful entries from conversation text using Ollama AI
 *
 * NEW APPROACH - ChatGPT-style:
 * 1. Send text to Ollama with natural language extraction prompt
 * 2. Extract JSON from response (handles markdown-wrapped JSON)
 * 3. Validate entries array structure
 * 4. Filter out invalid/empty entries
 *
 * @param text - The conversation text to extract information from
 * @returns AIResult with validated entries array
 * @throws Error if AI returns unparseable JSON
 */
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
    // Extract JSON from response (AI sometimes wraps in markdown)
    let jsonContent = response.message.content;
    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonContent = jsonMatch[0];
    }

    const parsed: AIResult = JSON.parse(jsonContent);

    // Ensure payload and entries array exist (defensive programming)
    if (!parsed.payload) {
      parsed.payload = { entries: [] };
    }

    if (!parsed.payload.entries) {
      parsed.payload.entries = [];
    } else if (!Array.isArray(parsed.payload.entries)) {
      // Handle case where AI returns single entry object instead of array
      if (
        typeof parsed.payload.entries === "object" &&
        parsed.payload.entries !== null
      ) {
        const entryObj = parsed.payload.entries as any;
        if (entryObj.text && entryObj.categories) {
          parsed.payload.entries = [entryObj];
        } else {
          parsed.payload.entries = [];
        }
      } else {
        parsed.payload.entries = [];
      }
    }

    // Filter out invalid entries (malformed objects, null values, empty text)
    parsed.payload.entries = parsed.payload.entries.filter((entry: any) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }
      if (!entry.text || entry.text === "null" || entry.text.trim() === "") {
        return false;
      }
      if (!Array.isArray(entry.categories) || entry.categories.length === 0) {
        return false;
      }
      return true;
    });

    return parsed;
  } catch (err) {
    throw new Error("AI returned invalid JSON");
  }
}

/**
 * Transforms AI result format to frontend-compatible format
 *
 * NEW APPROACH - Preserves compound sentences:
 * 1. Initialize empty arrays for each category
 * 2. Iterate through AI entries array
 * 3. If entry has multiple categories, add it to ALL relevant category arrays
 * 4. This preserves the compound sentence while making it searchable/filterable
 *
 * Why this works better:
 * - AI returns natural language entries with multiple category tags
 * - We add the same entry to multiple categories so users can find it
 * - The compound sentence is preserved exactly as the AI returned it
 * - No regex chopping, no forced categorization
 *
 * @param aiResult - The validated AI extraction result
 * @param originalText - Optional original text (currently unused, for future enhancements)
 * @returns Object with categorized arrays ready for frontend consumption
 */
export function transformToFrontendFormat(
  aiResult: AIResult,
  originalText?: string
): FrontendExtractedData {
  const result: FrontendExtractedData = {
    interests: [],
    importantDates: [],
    places: [],
    notes: [],
  };

  const entries = aiResult?.payload?.entries || [];
  for (const entry of entries) {
    if (!entry || !entry.text) {
      continue;
    }

    const item = { value: entry.text.trim() };

    // Add entry to ALL categories it belongs to (compound sentences can have multiple)
    for (const category of entry.categories) {
      switch (category) {
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
      }
    }
  }

  return result;
}
