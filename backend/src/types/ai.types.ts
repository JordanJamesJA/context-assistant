export interface AIFact {
  type: "interest" | "important_date" | "place" | "note";
  label?: string;
  value: string;
  source_text?: string;
}

export interface AIResult {
  intent: string;
  payload: {
    contact_name?: string;
    facts: AIFact[];
  };
  confidence: number;
  needs_clarification: boolean;
  clarification_reason?: string;
}

// Frontend-expected format
export interface FrontendExtractedData {
  interests: Array<{ value: string }>;
  importantDates: Array<{ value: string }>;
  places: Array<{ value: string }>;
  notes: Array<{ value: string }>;
}
