/**
 * Reading contacts and closure signals out of a page.
 *
 * Regex first, deliberately. The overwhelming majority of what we need -- is
 * this phone number still on their site? -- is a literal string comparison,
 * and a literal comparison is auditable, free, and cannot hallucinate. A
 * language model is only worth reaching for when the page is genuinely
 * ambiguous, and that is handled separately in `disambiguate.ts`.
 */
import { CLOSURE_PATTERNS } from './config.ts';

/** Strip markup, scripts and styles down to the words a reader would see. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Ten digits, as dialled. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return digits.length === 10 ? digits : null;
}

const PHONE_RE = /(?:\+?1[-. ]?)?\(?\d{3}\)?[-. –]?\d{3}[-. –]?\d{4}(?!\d)/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

/**
 * Sequences that look like phone numbers but are not: dates, prices, long
 * identifiers, and EINs, which appear on almost every charity's site.
 */
function looksLikeRealPhone(match: string, context: string): boolean {
  const digits = match.replace(/\D/g, '');
  if (/^(\d)\1+$/.test(digits)) return false;
  if (/\b(ein|tax id|federal id|account|invoice|order)\b/i.test(context)) return false;
  // Dates written as 2024-01-15 or similar runs.
  if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(match.trim())) return false;
  return true;
}

export interface PageContacts {
  phones: string[];
  emails: string[];
  /** Phone numbers exactly as written, for quoting as evidence. */
  phoneDisplays: Map<string, string>;
}

export function extractContacts(text: string): PageContacts {
  const phones: string[] = [];
  const phoneDisplays = new Map<string, string>();

  for (const m of text.matchAll(PHONE_RE)) {
    const raw = m[0];
    const start = Math.max(0, (m.index ?? 0) - 40);
    const context = text.slice(start, (m.index ?? 0) + raw.length + 20);
    if (!looksLikeRealPhone(raw, context)) continue;
    const normalized = normalizePhone(raw);
    if (!normalized) continue;
    if (!phones.includes(normalized)) {
      phones.push(normalized);
      phoneDisplays.set(normalized, raw.trim());
    }
  }

  const emails: string[] = [];
  for (const m of text.matchAll(EMAIL_RE)) {
    const value = m[0].toLowerCase();
    // Image files and tracking pixels regularly look like addresses.
    if (/\.(png|jpe?g|gif|svg|webp|css|js)$/i.test(value)) continue;
    if (/^(example|test|no-?reply|your|name|email)@/i.test(value)) continue;
    if (!emails.includes(value)) emails.push(value);
  }

  return { phones, emails, phoneDisplays };
}

export interface ClosureSignal {
  /**
   * `review` is a signal that something may have changed without being clear
   * enough to act on. "At capacity" is the case that forced it: it appears in
   * conditionals ("if we are currently at capacity, adopters join a waitlist")
   * and about parts of an organization rather than the whole ("our foster
   * homes are at capacity"), and neither means it has stopped operating.
   */
  severity: 'closed' | 'paused' | 'review';
  label: string;
  /** The sentence it was found in, for the evidence link and the banner. */
  quote: string;
}

/** Look for language saying the organization has stopped or paused. */
export function detectClosure(text: string): ClosureSignal[] {
  const found: ClosureSignal[] = [];
  for (const { pattern, severity, label } of CLOSURE_PATTERNS) {
    const m = pattern.exec(text);
    if (!m) continue;
    const start = Math.max(0, (m.index ?? 0) - 100);
    const quote = text
      .slice(start, (m.index ?? 0) + m[0].length + 140)
      .replace(/\s+/g, ' ')
      .trim();
    found.push({ severity, label, quote });
  }
  return found;
}

/** Does this exact contact still appear on the page? */
export function containsPhone(text: string, phoneDigits: string): boolean {
  return extractContacts(text).phones.includes(phoneDigits);
}

export function containsEmail(text: string, email: string): boolean {
  return text.toLowerCase().includes(email.toLowerCase());
}
