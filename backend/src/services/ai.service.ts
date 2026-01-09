import type { AIResult, FrontendExtractedData } from "../types/ai.types.js";
import ollama from "ollama";

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

export async function extractFactsFromText(text: string): Promise<AIResult> {
  const response = await ollama.chat({
    model: "deepseek-r1:1.5b",

    messages: [
      { role: "system", content: SYSTEM_PROMPT },

      { role: "user", content: text },
    ],

    format: "json",
  });

  console.log("=== RAW AI RESPONSE ===");
  console.log(response.message.content);
  console.log("======================");

  try {
    let jsonContent = response.message.content;

    // DeepSeek-R1 models output reasoning first, then JSON

    // Try to extract JSON from the response

    // Look for content between curly braces

    const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      jsonContent = jsonMatch[0];

      console.log("=== EXTRACTED JSON ===");
      console.log(jsonContent);
      console.log("=====================");
    }

    const parsed: AIResult = JSON.parse(jsonContent);
    console.log("=== PARSED AI RESULT ===");
    console.log(JSON.stringify(parsed, null, 2));
    console.log("========================");

    if (!parsed.payload) {
      parsed.payload = { facts: [] };
    }

    if (!parsed.payload.facts) {
      parsed.payload.facts = [];
    } else if (!Array.isArray(parsed.payload.facts)) {
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

    // Filter out any null or invalid facts from the array

    parsed.payload.facts = parsed.payload.facts.filter((fact: any) => {
      if (!fact || typeof fact !== "object") {
        console.warn("⚠️  Removing invalid fact (not an object):", fact);

        return false;
      }

      if (!fact.value || fact.value === "null" || fact.type === "null") {
        console.warn("⚠️  Removing invalid fact (null values):", fact);

        return false;
      }

      return true;
    });

    console.log("=== VALIDATED FACTS COUNT ===");

    console.log(`Found ${parsed.payload.facts.length} valid facts`);

    console.log("=============================");
    return parsed;
  } catch (err) {
    console.error("Failed to parse AI response:", err);
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

  console.log("=== TRANSFORMING FACTS ===");
  console.log(`Processing ${facts.length} facts`);

  for (const fact of facts) {
    if (!fact || !fact.value) {
      console.log("Skipping invalid fact:", fact);
      continue;
    }

    const item = { value: fact.value.trim() };
    console.log(`Adding ${fact.type}: "${item.value}"`);

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

  console.log("=== FINAL RESULT ===");
  console.log(JSON.stringify(result, null, 2));
  console.log("====================");

  return result;
}
