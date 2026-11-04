/**
 * The wire format between the chat UI and /api/chat.
 *
 * Server-sent events, one JSON object per event:
 *   {"cards": [...]}   the organizations retrieved, sent before any text so
 *                      the reader sees real contacts immediately
 *   {"t": "..."}       a piece of the answer
 *   {"done": true}     finished
 *   {"error": "..."}   something went wrong; `degraded` means fall back to
 *                      search rather than showing a failure
 */
export interface ChatCard {
  id: string;
  name: string;
  url: string;
  phones: string[];
  website: string | null;
  boroughs: string[];
  citywide: boolean;
  /** Based outside the city, though serving it. */
  outside?: boolean;
  confidence: string;
  status: string;
  statusNote: string | null;
  lastVerified: string | null;
  needsConfirmation: boolean;
  /** "0.7 mi", only when the reader shared a location. */
  distance?: string | null;
  /** "Open now · until 7pm" or "Closed now · opens 9am", for vets with readable hours. */
  openNow?: string | null;
}

export type ChatEvent =
  | { cards: ChatCard[]; guide?: { slug: string; title: string } | null }
  | { t: string }
  | { done: true }
  | { error: string; degraded?: boolean };

export interface ChatRequest {
  /** The latest message. */
  message: string;
  /** Prior turns, oldest first. Trimmed by the server. */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Turnstile token, on the first message of a session. */
  turnstileToken?: string;
  /** Short-lived pass issued after Turnstile, for later messages. */
  pass?: string;
  /**
   * Only when the reader ticks "Use my location". Rounded to two decimal
   * places (about a kilometre) in the browser and again on the server, used to
   * order results, and never logged or stored.
   */
  origin?: { lat: number; lon: number };
}

export const LIMITS = {
  /** A question longer than this is not a question. */
  maxMessageChars: 600,
  /** Turns kept from the history, so the prompt cannot grow without bound. */
  maxHistoryTurns: 6,
  /** Messages per IP per minute. */
  perMinute: 6,
  /** Messages per IP per hour. */
  perHour: 40,
  /** How long a pass is valid, in seconds. */
  passTtlSeconds: 60 * 45,
  /** Records put in front of the model. */
  retrieveCount: 10,
} as const;
