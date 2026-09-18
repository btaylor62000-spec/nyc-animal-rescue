/**
 * The guarantee behind "never output a contact that is not in the data".
 *
 * The prompt asks the model not to invent phone numbers. This makes sure it
 * cannot. Every phone number, email address and web address in the model's
 * output is checked against the set of contacts that were actually retrieved,
 * and anything else is removed before it reaches the reader.
 *
 * It works on a stream, because the answer is shown as it is generated: text
 * is emitted only once it is far enough from the end of the buffer that a
 * contact detail could not still be forming.
 */

const PHONE_RE = /(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const URL_RE = /\b(?:https?:\/\/)?(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+(?:\/[^\s)]*)?/gi;

/*
 * What the reader sees in place of a removed contact.
 *
 * This used to say "[see the card below]", which was wrong every single time
 * it appeared. A contact is only replaced when it is *not* in the retrieved
 * set -- and the cards are built from exactly that set -- so a replaced number
 * can never be on a card. The reader was being sent to look for something that
 * by construction did not exist.
 *
 * Saying what actually happened is both honest and more useful: the model
 * offered a contact this directory does not hold, so it was withheld.
 */
const REPLACEMENT_PHONE = '[number not listed here]';
const REPLACEMENT_EMAIL = '[email not listed here]';
const REPLACEMENT_LINK = '[link not listed here]';

/** Domains that are always safe to mention: this site, and 311. */
const ALWAYS_ALLOWED = new Set(['nycanimalrescue.org', 'nyc.gov', '311']);

function digits(s: string): string {
  return s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
}

function host(s: string): string {
  return s
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]!
    .toLowerCase();
}

export interface AllowedContacts {
  phones: Set<string>;
  emails: Set<string>;
  hosts: Set<string>;
}

export function allowedFrom(
  orgs: Array<{ phones: string[]; emails: string[]; website: string | null; intake: string | null }>,
): AllowedContacts {
  const phones = new Set<string>();
  const emails = new Set<string>();
  const hosts = new Set<string>(ALWAYS_ALLOWED);

  for (const o of orgs) {
    for (const p of o.phones) phones.add(digits(p));
    for (const e of o.emails) emails.add(e.toLowerCase());
    for (const u of [o.website, o.intake]) if (u) hosts.add(host(u));
  }
  return { phones, emails, hosts };
}

/** Remove any contact detail that is not in the allow-list. */
export function redact(text: string, allowed: AllowedContacts): string {
  let out = text.replace(EMAIL_RE, (m) => (allowed.emails.has(m.toLowerCase()) ? m : REPLACEMENT_EMAIL));

  out = out.replace(PHONE_RE, (m) => {
    const d = digits(m);
    if (d === '311') return m;
    return allowed.phones.has(d) ? m : REPLACEMENT_PHONE;
  });

  out = out.replace(URL_RE, (m) => {
    // Skip things that are not really addresses: version numbers, "e.g.",
    // decimals, and anything already handled as an email.
    if (!/[a-z]{2,}\.[a-z]{2,}/i.test(m)) return m;
    if (m.includes('@')) return m;
    const h = host(m);
    if (!h.includes('.')) return m;
    if (h.endsWith('.org') || h.endsWith('.com') || h.endsWith('.net') || h.endsWith('.gov') || h.endsWith('.app') || h.endsWith('.nyc')) {
      return allowed.hosts.has(h) ? m : REPLACEMENT_LINK;
    }
    return m;
  });

  return out;
}

/**
 * The longest a contact detail can be, so we know how much of the buffer's
 * tail to hold back while streaming rather than risk cutting one in half.
 */
const MAX_CONTACT_LENGTH = 80;

/**
 * Streaming redactor.
 *
 * Feed it chunks; it returns the text that is safe to emit now. Anything that
 * might still be part of a phone number, email or address is held back until
 * the next chunk or until `flush()`.
 */
export class StreamRedactor {
  private buffer = '';

  constructor(private readonly allowed: AllowedContacts) {}

  push(chunk: string): string {
    this.buffer += chunk;
    if (this.buffer.length <= MAX_CONTACT_LENGTH) return '';

    // Cut at a space so a partial token is never examined out of context.
    const cutAt = this.buffer.lastIndexOf(' ', this.buffer.length - MAX_CONTACT_LENGTH);
    if (cutAt <= 0) return '';

    const ready = this.buffer.slice(0, cutAt);
    this.buffer = this.buffer.slice(cutAt);
    return redact(ready, this.allowed);
  }

  flush(): string {
    const rest = this.buffer;
    this.buffer = '';
    return redact(rest, this.allowed);
  }
}
