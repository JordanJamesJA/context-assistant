import type { AIResult, FrontendExtractedData } from "../types/ai.types.js";
import ollama from "ollama";

const SYSTEM_PROMPT = `You are an information extraction engine.

You MUST return ONLY valid JSON.
No markdown.
No explanation.
No extra text.

CRITICAL REQUIREMENTS:
1. The "facts" field MUST be an ARRAY [] (not an object {})
2. The "type" field MUST be EXACTLY one of these 4 values: "interest", "important_date", "place", or "note"
3. DO NOT create new type names like "sushi" or "hiking" - use the 4 valid types only

VALID TYPES (use EXACTLY these strings):
- "interest" - for hobbies, likes, preferences, activities the person enjoys
- "important_date" - for birthdays, anniversaries, deadlines, specific dates
- "place" - for locations, addresses, venues, cities, countries
- "note" - for any other general information

Example input: "I love sushi and hiking"
CORRECT output:
{
  "intent": "personal_preferences",
  "payload": {
    "contact_name": null,
    "facts": [
      {
        "type": "interest",
        "value": "loves sushi",
        "source_text": "I love sushi"
      },
      {
        "type": "interest",
        "value": "loves hiking",
        "source_text": "hiking"
      }
    ]
  },
  "confidence": 0.9,
  "needs_clarification": false
}

WRONG output examples (DO NOT DO THIS):
- "type": "sushi" ❌ (should be "interest")
- "type": "hiking" ❌ (should be "interest")
- "value": "/here" ❌ (not meaningful)
- "facts": {} ❌ (should be an array)

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
    console.log("=== PARSED AI RESULT (RAW) ===");
    console.log(JSON.stringify(parsed, null, 2));
    console.log("==============================");

    // Ensure payload exists
    if (!parsed.payload) {
      console.warn("⚠️  Missing payload, creating default");
      parsed.payload = { facts: [] };
    }

    // CRITICAL FIX: Ensure facts is ALWAYS an array
    if (!parsed.payload.facts) {
      console.warn("⚠️  Missing facts field, creating empty array");
      parsed.payload.facts = [];
    } else if (!Array.isArray(parsed.payload.facts)) {
      console.warn("⚠️  Facts is not an array, received:", typeof parsed.payload.facts);
      console.warn("⚠️  Facts value:", JSON.stringify(parsed.payload.facts));

      // If facts is a single object, try to convert it to an array
      if (typeof parsed.payload.facts === 'object' && parsed.payload.facts !== null) {
        const factObj = parsed.payload.facts as any;
        // Check if it has valid fact properties
        if (factObj.type && factObj.value) {
          console.log("✓ Converting single fact object to array");
          parsed.payload.facts = [factObj];
        } else {
          console.warn("⚠️  Invalid fact object, using empty array");
          parsed.payload.facts = [];
        }
      } else {
        console.warn("⚠️  Facts is invalid type, using empty array");
        parsed.payload.facts = [];
      }
    }

    // Normalize and validate facts
    const validTypes = ['interest', 'important_date', 'place', 'note'];
    parsed.payload.facts = parsed.payload.facts
      .filter((fact: any) => {
        if (!fact || typeof fact !== 'object') {
          console.warn("⚠️  Removing invalid fact (not an object):", fact);
          return false;
        }
        if (!fact.value || fact.value === 'null' || fact.type === 'null' || fact.value.trim() === '') {
          console.warn("⚠️  Removing invalid fact (null/empty values):", fact);
          return false;
        }
        // Filter out nonsensical values
        if (fact.value === '/here' || fact.value.length < 2) {
          console.warn("⚠️  Removing invalid fact (nonsensical value):", fact);
          return false;
        }
        return true;
      })
      .map((fact: any) => {
        // Normalize invalid types to valid ones
        if (!validTypes.includes(fact.type)) {
          console.warn(`⚠️  Invalid type "${fact.type}", normalizing to "note"`);
          fact.type = 'note';
        }
        return fact;
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
  console.log("=== TRANSFORM FUNCTION CALLED ===");
  console.log("Input AIResult:", JSON.stringify(aiResult, null, 2));

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
