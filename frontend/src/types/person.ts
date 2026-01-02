/**
 * Speaker types for conversation tracking
 */
export const Speaker = {
  USER: 'user',      // The logged-in user
  PERSON: 'person',  // The person being tracked
} as const;

export type Speaker = typeof Speaker[keyof typeof Speaker];

/**
 * Conversation message record
 * Core primitive for source tracking - avoids duplicating text across items
 */
export type Message = {
  id: string;                    // Unique identifier (UUID or timestamp-based)
  personId: string;              // Which person this conversation is with
  text: string;                  // The actual message content
  speaker: Speaker;              // Who said it
  timestamp: number;             // Unix timestamp (ms)
};

/**
 * Extracted context item
 * Now references a message ID instead of duplicating source text
 */
export type InfoItem = {
  id: string;                    // Unique identifier for the item itself
  value: string;                 // The extracted information (e.g., "sushi", "birthday")
  messageId: string;             // References the source message
};

/**
 * Person being tracked
 */
export type Person = {
  id: string;
  name: string;
  interests: InfoItem[];
  importantDates: InfoItem[];
  places: InfoItem[];
  notes: InfoItem[];
};

/**
 * Application state structure
 * Centralizes messages for scalability
 */
export type AppState = {
  people: Person[];
  messages: Message[];           // Shared message store
  selectedPersonId: string | null;
};
