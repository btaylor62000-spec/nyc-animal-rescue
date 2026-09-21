/**
 * Turning source cells into structured fields.
 *
 * Guiding rule (from the project's working agreements): when a cell holds prose
 * rather than a value -- "(no public phone; contact via site)" -- the structured
 * field stays empty and the prose is handed back as `residue` for the notes.
 * We never store junk in a field the site will render as a tap-to-call link.
 */
import type { Email, LabeledUrl, Phone, SocialLink } from '../../src/types.ts';

/** A parse that separates real values from leftover prose. */
export interface Parsed<T> {
  values: T[];
  /** Text that was not a value and belongs in notes. */
  residue: string[];
}

/**
 * Split a multi-value cell on the separators the source actually uses, while
 * respecting brackets: "(via site forms; surrender questionnaire online)" is
 * one parenthetical remark, not two values.
 */
function segments(raw: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]!;
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

    if (depth === 0) {
      if (ch === ';' || ch === '•') {
        out.push(cur);
        cur = '';
        continue;
      }
      // " | " separates values; a bare "|" inside a URL query string does not.
      if (ch === '|' && /\s$/.test(cur) && /^\s/.test(raw.slice(i + 1))) {
        out.push(cur);
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim()).filter(Boolean);
}

/**
 * Pull a trailing or leading parenthetical off a segment and use it as the
 * label: "help@x.org (certified caretakers)" -> label "certified caretakers".
 */
function splitLabel(segment: string): { core: string; label?: string } {
  const trailing = /^(.*?)\s*\(([^()]{2,60})\)\s*$/.exec(segment);
  if (trailing) return { core: trailing[1]!.trim(), label: trailing[2]!.trim() };
  // Leading role label: "Adopt: ...", "Surrender (by appt): ...".
  const leading = /^([A-Za-z][A-Za-z0-9 /&'().-]{1,40}?)\s*:\s*(.+)$/.exec(segment);
  if (leading) return { core: leading[2]!.trim(), label: leading[1]!.trim() };
  return { core: segment };
}

const VANITY: Record<string, string> = {
  A: '2', B: '2', C: '2', D: '3', E: '3', F: '3', G: '4', H: '4', I: '4',
  J: '5', K: '5', L: '5', M: '6', N: '6', O: '6', P: '7', Q: '7', R: '7',
  S: '7', T: '8', U: '8', V: '8', W: '9', X: '9', Y: '9', Z: '9',
};

/** Convert a vanity number's letters to their keypad digits. */
function dial(s: string): string {
  return s
    .toUpperCase()
    .split('')
    .map((ch) => (/[0-9]/.test(ch) ? ch : (VANITY[ch] ?? '')))
    .join('');
}

export function formatPhone(digits: string): string {
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith('1')) {
    return `1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return digits;
}

// Matches ordinary and vanity US numbers, plus extensions we keep as labels.
const PHONE_RE =
  /(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?[\dA-Za-z]{4}\b|\b1[-. ]?8\d{2}[-. ]?\d{3}[-. ]?[A-Za-z]{4}\b/g;

export function parsePhones(raw: string | null): Parsed<Phone> {
  const values: Phone[] = [];
  const residue: string[] = [];
  if (!raw) return { values, residue };

  /*
   * Civic short codes are real, dialable numbers that the ten-digit pattern
   * cannot see. Until now one was only recognised when it was the entire cell,
   * so a listing written as "NYC 311 - 311 - portal.311.nyc.gov" produced a
   * record with no number at all — for 311, which is the most important number
   * in the whole directory for reporting cruelty.
   *
   * Matched as a whole token only, and never when it is glued to a dot, slash
   * or another digit, so the 311 in "portal.311.nyc.gov" and the 988 in a ZIP
   * or a street number are left alone.
   *
   * 911 is deliberately absent. "Call 911 if..." is ordinary safety prose all
   * over this directory, so reading it as a contact gave a Facebook group a
   * phone number of 911 — and, because records sharing a number are merged,
   * pulled an unrelated entry into it. Nobody needs a directory to find 911.
   */
  for (const m of raw.matchAll(/(^|[^\w.\/-])(311|988)(?![\w.\/-])/g)) {
    const code = m[2]!;
    if (!values.some((v) => v.value === code)) values.push({ value: code, display: code });
  }

  for (const seg of segments(raw)) {
    // Short municipal codes are real numbers but do not match the pattern.
    if (/^3-?1-?1$/.test(seg.trim())) {
      if (!values.some((v) => v.value === '311')) values.push({ value: '311', display: '311' });
      continue;
    }
    const { core, label } = splitLabel(seg);
    const matches = core.match(PHONE_RE);
    if (!matches || matches.length === 0) {
      residue.push(seg);
      continue;
    }
    for (const m of matches) {
      let digits = dial(m);
      if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
      if (digits.length !== 10) {
        residue.push(seg);
        continue;
      }
      if (values.some((p) => p.value === digits)) continue;
      const phone: Phone = { value: digits, display: formatPhone(digits) };
      if (label) phone.label = label;
      values.push(phone);
    }
    // Keep any surrounding words that carried meaning ("ext. 112", hours).
    const leftover = core.replace(PHONE_RE, '').replace(/[\s,;|-]+/g, ' ').trim();
    if (leftover.length > 3) residue.push(leftover);
  }
  return { values, residue };
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;

export function parseEmails(raw: string | null): Parsed<Email> {
  const values: Email[] = [];
  const residue: string[] = [];
  if (!raw) return { values, residue };

  for (const seg of segments(raw)) {
    const { core, label } = splitLabel(seg);
    const matches = core.match(EMAIL_RE);
    if (!matches) {
      residue.push(seg);
      continue;
    }
    for (const m of matches) {
      const value = m.toLowerCase();
      if (values.some((e) => e.value === value)) continue;
      const email: Email = { value };
      if (label) email.label = label;
      values.push(email);
    }
    const leftover = core.replace(EMAIL_RE, '').replace(/[\s,;|-]+/g, ' ').trim();
    if (leftover.length > 3) residue.push(leftover);
  }
  return { values, residue };
}

const URL_RE = /https?:\/\/[^\s|,)]+/gi;

/**
 * A bare domain, with or without a path: "muffins.org", "nycacc.app",
 * "neighborhoodcats.org/tnr-in-nyc/trap-banks". The host is checked separately
 * from the path so a trailing path segment does not defeat the TLD test.
 */
function bareDomain(token: string): string | null {
  const cleaned = token.replace(/^[("'\[]+/, '').replace(/[)"'\].,;:]+$/, '');
  if (!cleaned || cleaned.includes('@') || /^https?:/i.test(cleaned)) return null;
  const host = cleaned.split('/')[0]!;
  if (!/^(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+$/i.test(host)) return null;
  if (!/\.[a-z]{2,}$/i.test(host)) return null;
  return cleaned;
}

/** Trim trailing punctuation that the source glued onto a URL. */
function tidyUrl(u: string): string {
  return u.replace(/[.,;:)\]]+$/, '');
}

/**
 * Extract URLs from a cell that may also contain descriptive text, e.g.
 * "Adopt: nycacc.app  |  Surrender (by appt): https://www.nycacc.org/...".
 */
export function parseUrls(raw: string | null): Parsed<string> {
  const values: string[] = [];
  const residue: string[] = [];
  if (!raw) return { values, residue };

  for (const seg of segments(raw)) {
    const explicit = seg.match(URL_RE);
    if (explicit) {
      for (const u of explicit) {
        const url = tidyUrl(u);
        if (!values.includes(url)) values.push(url);
      }
      const leftover = seg.replace(URL_RE, '').replace(/^[\s:|-]+|[\s:|-]+$/g, '').trim();
      if (leftover.length > 3) residue.push(leftover);
      continue;
    }
    const { core } = splitLabel(seg);
    // A bare domain such as "nycacc.app" or "neighborhoodcats.org/trap-banks".
    let found: { token: string; domain: string } | null = null;
    for (const t of core.split(/\s+/)) {
      const d = bareDomain(t);
      if (d) {
        found = { token: t, domain: d };
        break;
      }
    }
    if (found) {
      const url = `https://${found.domain.replace(/^www\./, '')}`;
      if (!values.includes(url)) values.push(url);
      const leftover = core.replace(found.token, '').replace(/^[\s:|-]+|[\s:|-]+$/g, '').trim();
      if (leftover.length > 3) residue.push(leftover);
    } else if (seg.length > 3) {
      residue.push(seg);
    }
  }
  return { values, residue };
}

/**
 * Like `parseUrls`, but keeps the role each URL plays. Intake cells routinely
 * read "Adopt: nycacc.app  |  Surrender (by appt): https://..." and which link
 * someone needs depends entirely on why they came.
 */
export function parseLabeledUrls(raw: string | null): Parsed<LabeledUrl> {
  const values: LabeledUrl[] = [];
  const residue: string[] = [];
  if (!raw) return { values, residue };

  for (const seg of segments(raw)) {
    const { core, label } = splitLabel(seg);
    const found = parseUrls(core);
    for (const url of found.values) {
      if (values.some((v) => v.url === url)) continue;
      const entry: LabeledUrl = { url };
      if (label && !/^https?$/i.test(label)) entry.label = label;
      values.push(entry);
    }
    residue.push(...found.residue);
  }
  return { values, residue };
}

const SOCIAL_PATTERNS: Array<{ platform: SocialLink['platform']; pattern: RegExp; url: (h: string) => string }> = [
  { platform: 'instagram', pattern: /\bIG\b[: ]*@?([\w.]+)|instagram\.com\/([\w.]+)/i, url: (h) => `https://instagram.com/${h}` },
  { platform: 'facebook', pattern: /\bFB\b[: ]*\/?([\w.\- ]+?)(?:;|$)|facebook\.com\/([\w.-]+)/i, url: (h) => `https://facebook.com/${h}` },
  { platform: 'x', pattern: /\b(?:X|Twitter)\b[: ]*@?([\w]+)/i, url: (h) => `https://x.com/${h}` },
  { platform: 'tiktok', pattern: /tiktok\.com\/@?([\w.]+)|\bTikTok\b[: ]*@?([\w.]+)/i, url: (h) => `https://tiktok.com/@${h}` },
  { platform: 'linktree', pattern: /linktr\.ee\/([\w.-]+)/i, url: (h) => `https://linktr.ee/${h}` },
  { platform: 'petfinder', pattern: /petfinder\.com\/([\w./-]+)/i, url: (h) => `https://petfinder.com/${h}` },
];

export function parseSocial(raw: string | null): Parsed<SocialLink> {
  const values: SocialLink[] = [];
  const residue: string[] = [];
  if (!raw) return { values, residue };

  for (const seg of segments(raw)) {
    let matched = false;
    for (const p of SOCIAL_PATTERNS) {
      const m = p.pattern.exec(seg);
      if (!m) continue;
      const handle = (m[1] ?? m[2] ?? '').trim().replace(/\s+\(.*$/, '');
      if (!handle) continue;
      if (values.some((s) => s.platform === p.platform && s.handle === handle)) {
        matched = true;
        continue;
      }
      // Sources sometimes give a page's display name rather than its slug
      // ("FB /WINORR - Wildlife In Need of Rescue and Rehabilitation"). That
      // cannot be turned into a working URL, so keep the name and omit the
      // link rather than publishing one that 404s.
      const linkable = /^[\w.-]+$/.test(handle);
      values.push(linkable ? { platform: p.platform, handle, url: p.url(handle) } : { platform: p.platform, handle });
      matched = true;
    }
    if (!matched && seg.length > 3) residue.push(seg);
  }
  return { values, residue };
}

/** ZIPs, including ranges the source writes as "11201-11256". */
export function parseZips(raw: string | null): { zips: string[]; citywide: boolean; residue: string[] } {
  const zips: string[] = [];
  const residue: string[] = [];
  let citywide = false;
  if (!raw) return { zips, citywide, residue };

  if (/citywide|all (5|five) boroughs|all boroughs/i.test(raw)) citywide = true;

  for (const m of raw.matchAll(/\b(\d{5})\s*[-–]\s*(\d{5})\b/g)) {
    const from = Number(m[1]);
    const to = Number(m[2]);
    // Only expand plausible same-borough ranges; anything wider is a typo.
    if (to > from && to - from <= 100) {
      for (let z = from; z <= to; z++) zips.push(String(z));
    }
  }
  for (const m of raw.matchAll(/\b\d{5}\b/g)) {
    if (!zips.includes(m[0])) zips.push(m[0]);
  }

  const leftover = raw.replace(/\b\d{5}\b/g, '').replace(/citywide/gi, '').replace(/[\s,;|-]+/g, ' ').trim();
  if (leftover.length > 3) residue.push(leftover);

  return { zips: [...new Set(zips)].sort(), citywide, residue };
}

/** Normalise the workbook's date cells to a plain ISO date. */
export function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(raw);
  if (us) return `${us[3]}-${us[1]!.padStart(2, '0')}-${us[2]!.padStart(2, '0')}`;
  return null;
}

/** Stable, URL-safe id derived from the organization's name. */
export function slugify(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’.]/g, '')
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
    .replace(/-+$/g, '');
}

/**
 * Key used to spot the same organization across workbooks. Strips corporate
 * boilerplate and generic rescue words so "Animal Haven" and
 * "Animal Haven, Inc." collapse, while keeping enough to stay distinctive.
 */
/**
 * The words of a merge key, before they are squashed together.
 *
 * Prefix comparison has to happen on words: "brooklyn" is a prefix of the
 * string "brooklynkittycommittee" but not of the words
 * ["brooklyn", "kitty", "committee"] in any sense that means they are the same
 * organization.
 */
export function mergeTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    .replace(/['\u2019]s\b/g, '')
    .replace(/\b(inc|llc|corp|co|nyc|ny|new york|the|a|of|and|for)\b/g, ' ')
    .replace(/\b(rescue|rescues|animal|animals|foundation|society|project|group|adoption|adoptions)\b/g, ' ')
    .replace(/\b(program|programme|programs|programmes|initiative|services|service|center|centre|centers|centres)\b/g, ' ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function mergeKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
    // Possessives: "ACC's Community Pets" and "ACC Community Pets" are one thing.
    .replace(/['\u2019]s\b/g, '')
    .replace(/\b(inc|llc|corp|co|nyc|ny|new york|the|a|of|and|for)\b/g, ' ')
    .replace(/\b(rescue|rescues|animal|animals|foundation|society|project|group|adoption|adoptions)\b/g, ' ')
    // Words that describe the kind of thing rather than name it. Without this
    // "ACC Community Pets Program", "ACC CommunityPets" and "ACC's Community
    // Pets Program" stay three separate records for one service.
    .replace(/\b(program|programme|programs|programmes|initiative|services|service|center|centre|centers|centres)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '');
}
