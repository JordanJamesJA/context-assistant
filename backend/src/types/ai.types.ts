export interface AIEntry {
  text: string; // Natural language entry - can be compound sentences
  categories: Array<"interest" | "important_date" | "place" | "note">; // Can have multiple tags
  source_text: string;
}

export interface AIResult {
  intent: string;
  payload: {
    contact_name?: string;
    entries: AIEntry[]; // Changed from "facts" to "entries"
  };
  confidence: number;
  needs_clarification: boolean;
  clarification_reasons?: string;
}

export interface FrontendExtractedData {
  interests: Array<{ value: string }>;

  importantDates: Array<{ value: string }>;

  places: Array<{ value: string }>;

  notes: Array<{ value: string }>;
}
