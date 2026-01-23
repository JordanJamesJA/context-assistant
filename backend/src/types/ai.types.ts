export interface AIFact {
  type: "interest" | "important_date" | "place" | "note";
  label?: string;
  value: string;
  source_text?: string;
}

export interface AIResult {
  intent: string;
  payload: {
    content_name?: string;
    facts: AIFact[];
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
