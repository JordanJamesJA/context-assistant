import express from "express";
import cors from "cors";

interface ExtractRequest {
  text: string;
}

interface ExtractedItem {
  value: string;
}

interface ExtractResponse {
  interests: ExtractedItem[];
  importantDates: ExtractedItem[];
  places: ExtractedItem[];
  notes: ExtractedItem[];
}

const PATTERNS = {
  interests: [
    /(?:likes?|loves?|enjoys?|into|interested in|passionate about|obsessed with|fan of|really likes?)\s+([a-zA-Z\s,]+?)(?:\s+(?:a lot|so much|too|and|but|\.)|$)/gi,
    /(?:hobby|hobbies|passion|pastime)(?:\s+(?:is|are|include))?\s*:?\s*([a-zA-Z\s,]+?)(?:\s+(?:and|but|\.)|$)/gi,
    /(?:playing|watching|doing|practicing|learning|studying|collecting)\s+([a-zA-Z\s]+?)(?:\s+(?:a lot|often|regularly|and|but|\.)|$)/gi,
  ],
  importantDates: [
    /(?:birthday|anniversary|wedding|graduation|deadline|event|meeting|appointment|celebration)(?:\s+(?:on|is|at|in))?\s*([a-zA-Z0-9\s,/\-]+?)(?:\s+(?:and|but|\.)|$)/gi,
    /(?:on|scheduled for|happening on|taking place on)\s+([A-Z][a-zA-Z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)/gi,
    /\b(\d{1,2}[/\-]\d{1,2}(?:[/\-]\d{2,4})?)\b/gi,
    /(?:tomorrow|next (?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this (?:weekend|week|month))\b/gi,
  ],
  places: [
    /(?:restaurant|cafe|club|pub|bistro|diner|eatery)(?:\s+called| named)?\s*:?\s*([A-Z][a-zA-Z'\s]+?)(?:\s+(?:on|in|at|and|but|\.)|$)/gi,
    /(?:go(?:ing)? to|visit(?:ing)?|heading to|went to|been to|wanna go to|want to go to)\s+([A-Z][a-zA-Z'\s]+?)(?:\s+(?:on|in|for|and|but|last|next|this|\.)|$)/gi,
    /(?:location|place|venue|city|country|town|neighborhood|area|spot)\s*:?\s*([A-Z][a-zA-Z\s]+?)(?:\s+(?:and|but|\.)|$)/gi,
  ],
};

const KEYWORDS = {
  interests: [
    "sushi", "coffee", "gaming", "reading", "travel", "music", "sports", "cooking", "photography",
    "hiking", "running", "yoga", "meditation", "painting", "drawing", "writing", "dancing", "singing",
    "cycling", "swimming", "skiing", "surfing", "climbing", "camping", "fishing", "gardening",
    "movies", "films", "cinema", "theater", "theatre", "concerts", "festivals", "anime", "manga",
    "podcasts", "audiobooks", "netflix", "streaming", "tv shows", "series",
    "coding", "programming", "design", "woodworking", "crafts", "knitting", "pottery", "sculpting",
    "tech", "gadgets", "electronics", "robotics", "drones",
    "wine", "beer", "cocktails", "tea", "chocolate", "baking", "grilling", "bbq",
    "fashion", "shopping", "makeup", "skincare", "fitness", "gym", "weightlifting",
    "chess", "puzzles", "board games", "video games", "history", "science", "astronomy", "languages"
  ],
  importantDates: [
    "birthday", "anniversary", "wedding", "graduation", "deadline", "exam", "test",
    "appointment", "meeting", "conference", "interview", "reunion", "party", "celebration",
    "vacation", "trip", "holiday", "festival", "concert date", "show", "performance"
  ],
  places: [
    "restaurant", "cafe", "coffee shop", "bar", "club", "pub", "bistro", "diner", "bakery",
    "gym", "park", "library", "museum", "gallery", "theater", "cinema", "mall", "market",
    "office", "home", "school", "university", "hospital", "airport", "station",
    "tokyo", "paris", "london", "new york", "nyc", "los angeles", "la", "chicago", "miami",
    "boston", "seattle", "portland", "austin", "denver", "san francisco", "sf",
    "rome", "barcelona", "madrid", "berlin", "amsterdam", "dubai", "singapore", "hong kong",
    "sydney", "melbourne", "toronto", "vancouver", "montreal",
    "downtown", "uptown", "midtown", "suburb", "beach", "mountain", "lake", "river"
  ],
};

function extractStructuredData(text: string): ExtractResponse {
  const normalized = text.toLowerCase().trim();

  const extract = (patterns: RegExp | RegExp[], keywords: string[]): ExtractedItem[] => {
    const results = new Map<string, string>();
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];

    for (const pattern of patternArray) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const captured = match[1]?.trim();
        if (captured && captured.length > 1) {
          const cleaned = cleanExtractedValue(captured);
          if (cleaned) {
            const key = cleaned.toLowerCase();
            if (!results.has(key)) {
              results.set(key, cleaned);
            }
          }
        }
      }
    }

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const wordBoundaryPattern = new RegExp(`\\b${keywordLower.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (wordBoundaryPattern.test(normalized)) {
        const key = keywordLower;
        if (!results.has(key)) {
          const formatted = keyword
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          results.set(key, formatted);
        }
      }
    }

    return Array.from(results.values()).map(value => ({ value }));
  };

  const cleanExtractedValue = (value: string): string => {
    return value
      .replace(/[,;.!?]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const filterGenericWords = (items: ExtractedItem[], genericWords: string[]): ExtractedItem[] => {
    const genericSet = new Set(genericWords.map(w => w.toLowerCase()));
    return items.filter(item => !genericSet.has(item.value.toLowerCase()));
  };

  const removeSubstringDuplicates = (items: ExtractedItem[]): ExtractedItem[] => {
    if (items.length <= 1) return items;

    const sorted = [...items].sort((a, b) => a.value.length - b.value.length);
    const result: ExtractedItem[] = [];

    for (const item of sorted) {
      const itemLower = item.value.toLowerCase().trim();

      const isSuperstring = result.some(existing => {
        const existingLower = existing.value.toLowerCase().trim();
        return itemLower.includes(existingLower);
      });

      const hasSubstring = result.some(existing => {
        const existingLower = existing.value.toLowerCase().trim();
        return existingLower !== itemLower && itemLower.includes(existingLower);
      });

      if (!hasSubstring && !result.some(r => r.value.toLowerCase() === itemLower)) {
        result.push(item);
      }
    }

    return result;
  };

  const GENERIC_FILTERS = {
    places: [
      'a lot', 'so much', 'often', 'regularly', 'sometimes', 'usually',
      'restaurant', 'cafe', 'bar', 'place', 'location', 'venue', 'city', 'area'
    ],
    interests: ['a lot', 'so much', 'too', 'really', 'very'],
  };

  const rawInterests = extract(PATTERNS.interests, KEYWORDS.interests);
  const rawDates = extract(PATTERNS.importantDates, KEYWORDS.importantDates);
  const rawPlaces = extract(PATTERNS.places, KEYWORDS.places);

  const interests = removeSubstringDuplicates(
    filterGenericWords(rawInterests, GENERIC_FILTERS.interests)
  );
  const importantDates = removeSubstringDuplicates(rawDates);
  const places = removeSubstringDuplicates(
    filterGenericWords(rawPlaces, GENERIC_FILTERS.places)
  );

  return {
    interests,
    importantDates,
    places,
    notes: [{ value: text }],
  };
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/ping", (_req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
  });
});

app.post("/extract", (req, res) => {
  const { text } = req.body as ExtractRequest;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({
      error: "ValidationError",
      message: "Missing or invalid 'text' field in request body",
    });
  }

  const data = extractStructuredData(text);
  res.json(data);
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT);
