export interface AIFact {
  type: "interest" | "importantDate" | "place" | "note";
  label?: string;
  value: string;
  source_text?: string;
}

export interface AIResult {
  intent: string;
  payload: {
    content_name?: string;
    facts: AIFact[];
    notes?: string;
  };
  confidence: number;
  needs_clarification: boolean;
  clarification_reasons?: string;
}
