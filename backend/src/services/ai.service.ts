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
 * - Decision tree for fact classification (dates → places → interests → notes)
 * - Examples of each category
 * - Edge case handling
 */
const SYSTEM_PROMPT = `You are an information extraction engine.

You MUST return ONLY valid JSON.
No markdown.
No explanation.
No extra text.

CRITICAL RULES:
1. The "facts" field MUST be an ARRAY (use [] brackets), even if empty or containing one item
2. Each fact MUST have EXACTLY these fields: "type", "value", "source_text"
3. DO NOT add extra fields like "label" or any other fields
4. The "type" field MUST be one of these EXACT values: "interest", "important_date", "place", or "note"

The JSON must match this exact structure:
{
  "intent": "food_and_activity",
  "payload": {
    "contact_name": "John Doe",
    "facts": [
      {
        "type": "interest",
        "value": "likes sushi",
        "source_text": "I like sushi"
      },
      {
        "type": "important_date",
        "value": "birthday is April 5",
        "source_text": "my birthday is April 5"
      },
      {
        "type": "place",
        "value": "went to Bali",
        "source_text": "I went to Bali"
      }
    ]
  },
  "confidence": 0.9,
  "needs_clarification": false
}

FACT TYPE CLASSIFICATION - FOLLOW THIS DECISION TREE:

STEP 1: CHECK FOR IMPORTANT_DATE (HIGHEST PRIORITY)
- If the text contains ANY of these keywords, it is an "important_date":
  * birthday, birth day, born, bday, b-day
  * anniversary, wedding day
  * deadline, due date
  * holiday, celebration date
  * ANY month name (January, February, March, April, May, June, July, August, September, October, November, December)
  * ANY date pattern (April 5, 4/5, April 5th, 5th of April, etc.)

EXAMPLES OF IMPORTANT_DATE:
  ✓ "my birthday is April 1" → type: "important_date", value: "birthday is April 1"
  ✓ "birthday april 1" → type: "important_date", value: "birthday April 1"
  ✓ "born on January 15" → type: "important_date", value: "born on January 15"
  ✓ "our anniversary is June 10" → type: "important_date", value: "anniversary is June 10"
  ✓ "deadline January 15" → type: "important_date", value: "deadline January 15"

STEP 2: CHECK FOR PLACE (SECOND PRIORITY)
- If the text contains ANY of these patterns, it is a "place":
  * "went to [location]" → type: "place"
  * "visited [location]" → type: "place"
  * "traveled to [location]" → type: "place"
  * "lives in [location]" → type: "place"
  * "from [location]" → type: "place"
  * "works at [location]" → type: "place"
  * ANY city, country, state, or location name (Bali, Seattle, Paris, Tokyo, New York, etc.)

EXAMPLES OF PLACE:
  ✓ "I went to Bali" → type: "place", value: "went to Bali"
  ✓ "went to bali" → type: "place", value: "went to Bali"
  ✓ "visited Paris" → type: "place", value: "visited Paris"
  ✓ "lives in Seattle" → type: "place", value: "lives in Seattle"
  ✓ "from New York" → type: "place", value: "from New York"
  ✗ "hiking in the mountains" → NOT a place (it's an interest/activity)

STEP 3: CHECK FOR INTEREST
- If the text describes hobbies, activities, likes, preferences, or favorite things:
  * "likes [thing]" → type: "interest"
  * "enjoys [activity]" → type: "interest"
  * "loves [thing]" → type: "interest"
  * "plays [sport/game]" → type: "interest"
  * "favorite [thing]" → type: "interest"

EXAMPLES OF INTEREST:
  ✓ "likes sushi" → type: "interest", value: "likes sushi"
  ✓ "enjoys hiking" → type: "interest", value: "enjoys hiking"
  ✓ "plays tennis" → type: "interest", value: "plays tennis"
  ✓ "loves cooking" → type: "interest", value: "loves cooking"

STEP 4: EVERYTHING ELSE IS A NOTE
- Use "note" for general information that doesn't fit the above categories:
  * "has two cats" → type: "note"
  * "allergic to peanuts" → type: "note"
  * "vegetarian" → type: "note"

CRITICAL REMINDERS:
1. ALWAYS extract at least one fact if there's any information in the text
2. "went to [location]" is ALWAYS a "place", NOT an "interest"
3. "birthday" or any month name ALWAYS means "important_date"
4. DO NOT create custom types. Use only: "interest", "important_date", "place", "note"
5. Be thorough - extract ALL facts from the text

`;

/**
 * Extracts facts from conversation text using Ollama AI
 *
 * Process:
 * 1. Send text to Ollama with system prompt
 * 2. Extract JSON from response (handles markdown-wrapped JSON)
 * 3. Validate facts array structure
 * 4. Filter out invalid/null facts
 *
 * @param text - The conversation text to extract facts from
 * @returns AIResult with validated facts array
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

    // Ensure payload and facts array exist (defensive programming)
    if (!parsed.payload) {
      parsed.payload = { facts: [] };
    }

    if (!parsed.payload.facts) {
      parsed.payload.facts = [];
    } else if (!Array.isArray(parsed.payload.facts)) {
      // Handle case where AI returns single fact object instead of array
      if (
        typeof parsed.payload.facts === "object" &&
        parsed.payload.facts !== null
      ) {
        const factObj = parsed.payload.facts as any;
        if (factObj.type && factObj.value) {
          parsed.payload.facts = [factObj];
        } else {
          parsed.payload.facts = [];
        }
      } else {
        parsed.payload.facts = [];
      }
    }

    // Filter out invalid facts (malformed objects, null values)
    parsed.payload.facts = parsed.payload.facts.filter((fact: any) => {
      if (!fact || typeof fact !== "object") {
        return false;
      }
      if (!fact.value || fact.value === "null" || fact.type === "null") {
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
 * Pattern matching rules for fact type validation
 *
 * Priority order (highest to lowest):
 * 1. DATE_PATTERNS - Birthday, anniversary, month names, date formats
 * 2. PLACE_PATTERNS - Location verbs (went to, lives in, from)
 * 3. INTEREST_PATTERNS - Preference verbs (likes, enjoys, loves, plays)
 *
 * Why this order: Dates are most specific, places are next, interests are broad
 */
const DATE_PATTERNS = {
  keywords:
    /\b(birthday|bday|b-day|born|anniversary|wedding|deadline|due date|holiday|celebration)\b/i,
  months:
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/i,
  dateFormats:
    /\b(\d{1,2}\/\d{1,2}|\d{1,2}th|\d{1,2}st|\d{1,2}nd|\d{1,2}rd)\b/i,
};

const PLACE_PATTERNS = {
  verbs:
    /\b(went to|visited|traveled to|travelled to|lives in|from|works at|moved to|based in)\b/i,
  locations:
    /\b(city|country|state|town|village|island|beach|mountain|park|restaurant|cafe|hotel|airport)\b/i,
};

const INTEREST_PATTERNS = {
  verbs:
    /\b(likes|like|enjoys|enjoy|loves|love|plays|play|favorite|favourite|interested in|passionate about)\b/i,
};

/**
 * Validates and corrects fact type using pattern matching
 *
 * AI sometimes misclassifies facts. This function uses regex patterns to:
 * - Detect dates by keywords, month names, or date formats
 * - Detect places by location-related verbs
 * - Detect interests by preference verbs
 *
 * @param fact - The fact to validate
 * @returns The corrected fact type
 */
function validateAndCorrectFactType(fact: AIFact): AIFact["type"] {
  const text = (fact.source_text || fact.value).toLowerCase();

  // Priority 1: Check for date indicators
  if (
    DATE_PATTERNS.keywords.test(text) ||
    DATE_PATTERNS.months.test(text) ||
    DATE_PATTERNS.dateFormats.test(text)
  ) {
    return "important_date";
  }

  // Priority 2: Check for place indicators
  if (PLACE_PATTERNS.verbs.test(text)) {
    return "place";
  }

  // Priority 3: Check for interest indicators
  if (INTEREST_PATTERNS.verbs.test(text)) {
    return "interest";
  }

  // Default: Keep AI's original classification
  return fact.type;
}

/**
 * Transforms AI result format to frontend-compatible format
 *
 * Process:
 * 1. Initialize empty arrays for each category
 * 2. Iterate through AI facts array
 * 3. Validate and correct each fact's type
 * 4. Sort fact into appropriate category array
 *
 * Why transformation needed:
 * - AI returns array of heterogeneous facts with "type" field
 * - Frontend expects separate arrays for each category
 * - This transformation makes frontend code simpler (no filtering needed)
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
