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
        "value": "lives in Seattle",
        "source_text": "I live in Seattle"
      }
    ]
  },
  "confidence": 0.9,
  "needs_clarification": false
}

FACT TYPE RULES - YOU MUST FOLLOW THESE EXACTLY:

*** IMPORTANT_DATE DETECTION - HIGHEST PRIORITY ***
- "important_date": Use this type for ANY mention of dates, birthdays, anniversaries, deadlines, events with dates
  CRITICAL: If you see ANY of these words, it is an "important_date" type:
    - birthday, birth day, born, bday, b-day
    - anniversary, wedding day
    - deadline, due date
    - holiday, celebration date
    - ANY month name (January, February, March, April, May, June, July, August, September, October, November, December)
    - ANY date pattern (April 5, 4/5, April 5th, 5th of April, etc.)

  Examples of important_date:
    - "my birthday is April 5" → type: "important_date"
    - "birthday is April 5" → type: "important_date"
    - "born on January 15" → type: "important_date"
    - "our anniversary is June 10" → type: "important_date"
    - "deadline January 15" → type: "important_date"
    - "wedding on December 20" → type: "important_date"

- "interest": Use this type for hobbies, activities, likes, preferences, favorite things
  Examples: "likes sushi", "enjoys hiking", "plays tennis", "loves cooking", "likes burger"
  NOTE: If it mentions a date or birthday, it is NOT an interest, it is an "important_date"

- "place": Use this type for locations, addresses, venues, cities, countries
  Examples: "lives in Seattle", "works at Microsoft", "visited Paris"

- "note": Use this type for general information that doesn't fit other categories
  Examples: "has two cats", "allergic to peanuts", "vegetarian"

IMPORTANT REMINDERS:
- ANY text containing "birthday", "anniversary", or month names MUST be type "important_date"
- "I like burger" is type "interest" (it's a food preference)
- "my birthday is april 5" is type "important_date" (it contains "birthday" and a date)
- When you see activities like "hiking" or "sushi", these are interests, NOT place types
- DO NOT create custom types. Use the four types above ONLY.

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
