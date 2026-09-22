/**
 * What a visitor may submit, and the checks that need no network.
 *
 * Shared by the form on the site, the Pages Function that receives it, the
 * importer that publishes it, and the tests, so all four agree on what a
 * valid submission is.
 *
 * The rules a submission has to satisfy are deliberately short: a name, a
 * website, one way to reach them, one sentence on what they do. Asking for
 * more loses the rescuer typing this on a phone; asking for less publishes
 * something nobody can act on.
 */
import { ANIMALS, BOROUGHS, type Animal, type Borough } from '../types.ts';

export const LIMITS = {
  nameMin: 2,
  nameMax: 120,
  whatMin: 12,
  whatMax: 700,
  addressMax: 160,
  hoursMax: 160,
  reasonMax: 400,
  /** Submissions per client per hour. Generous for a person, tight for a script. */
  perHour: 6,
} as const;

/** The fields a visitor can supply. Everything optional at this level; `validate` says what is required for each kind. */
export interface SubmittedFields {
  name?: string;
  website?: string;
  /** Digits only, ten of them. */
  phone?: string;
  email?: string;
  /** What they do, in the visitor's words. */
  what?: string;
  boroughs?: Borough[];
  zip?: string;
  animals?: Animal[];
  address?: string;
  hours?: string;
}

export interface ContributeRequest {
  kind: 'add' | 'correct';
  /** For a correction: the record being corrected. */
  orgId?: string;
  fields: SubmittedFields;
  /** Why, for a correction. Shown in the record's change log. */
  reason?: string;
  submitterEmail?: string;
  turnstileToken?: string;
}

/** What the Function writes to the repository. One file per submission. */
export interface Submission {
  version: 1;
  kind: 'add' | 'correct';
  /** The record id: the existing one for a correction, the slug that will be created for an addition. */
  org_id: string;
  /** ISO timestamp. */
  submitted_at: string;
  submitter_email: string | null;
  reason: string | null;
  fields: SubmittedFields;
  /** What the quick check saw on the organization's own website. */
  check: {
    page: string;
    phone_seen: boolean;
    email_seen: boolean;
    checked_at: string;
  };
}

export interface ContributeResponse {
  ok: boolean;
  /** Plain-language outcome for the visitor. */
  message: string;
  /** The record page, once the site has rebuilt. */
  url?: string;
  /** When the check found the group already listed: where to correct it instead. */
  existing?: { id: string; name: string };
}

export function normalizePhoneInput(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  const ten = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(ten) ? ten : null;
}

export function normalizeEmailInput(raw: string): string | null {
  const v = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) && v.length <= 120 ? v : null;
}

export function normalizeWebsiteInput(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    if (!/^https?:$/.test(u.protocol)) return null;
    if (!u.hostname.includes('.')) return null;
    // Nothing on a social platform counts as "their own website": the check
    // reads the page for the contact, and those pages render nothing to a
    // plain fetch.
    if (/(^|\.)(facebook|instagram|twitter|x|tiktok|linktr|bio)\.(com|ee|site)$/i.test(u.hostname)) return null;
    u.hash = '';
    return u.toString();
  } catch {
    return null;
  }
}

function clean(s: unknown, max: number): string {
  return typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

export interface Validated {
  ok: true;
  fields: SubmittedFields;
}
export interface Invalid {
  ok: false;
  /** One sentence the visitor can act on. */
  message: string;
}

/**
 * Normalise and check a request. Pure: the website check that needs the
 * network lives in the Function.
 */
export function validate(req: ContributeRequest): Validated | Invalid {
  const f = req.fields ?? {};
  const out: SubmittedFields = {};

  const name = clean(f.name, LIMITS.nameMax);
  const website = f.website === undefined || f.website === '' ? undefined : normalizeWebsiteInput(String(f.website));
  const phone = f.phone === undefined || f.phone === '' ? undefined : normalizePhoneInput(String(f.phone));
  const email = f.email === undefined || f.email === '' ? undefined : normalizeEmailInput(String(f.email));
  const what = clean(f.what, LIMITS.whatMax);
  const zip = clean(f.zip, 5);
  const address = clean(f.address, LIMITS.addressMax);
  const hours = clean(f.hours, LIMITS.hoursMax);
  const boroughs = Array.isArray(f.boroughs) ? f.boroughs.filter((b): b is Borough => (BOROUGHS as readonly string[]).includes(b)) : [];
  const animals = Array.isArray(f.animals) ? f.animals.filter((a): a is Animal => (ANIMALS as readonly string[]).includes(a)) : [];

  if (f.website && website === null) return { ok: false, message: 'That website address does not look right. It should be the organization’s own site, not a social media page.' };
  if (f.phone && phone === null) return { ok: false, message: 'That phone number does not look like a ten-digit US number.' };
  if (f.email && email === null) return { ok: false, message: 'That email address does not look right.' };
  if (zip && !/^\d{5}$/.test(zip)) return { ok: false, message: 'A zip code is five digits.' };

  if (req.kind === 'add') {
    if (name.length < LIMITS.nameMin) return { ok: false, message: 'Give the organization’s name.' };
    if (!website) return { ok: false, message: 'Give the organization’s own website. It is how the details are checked.' };
    if (!phone && !email) return { ok: false, message: 'Give a phone number or an email address someone can use.' };
    if (what.length < LIMITS.whatMin) return { ok: false, message: 'Say in a sentence what they do and who they help.' };
    if (!boroughs.length && !zip) return { ok: false, message: 'Say which borough they serve, or give a zip code.' };
  } else if (req.kind === 'correct') {
    if (!req.orgId || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(req.orgId)) return { ok: false, message: 'Which entry is this about?' };
    const anything = website || phone || email || what || zip || address || hours || boroughs.length || animals.length;
    if (!anything) return { ok: false, message: 'Change at least one thing.' };
    if (name) return { ok: false, message: 'Names cannot be changed here. If the organization has been renamed, say so in the reason and a person will do it.' };
  } else {
    return { ok: false, message: 'That request did not make sense.' };
  }

  if (name) out.name = name;
  if (website) out.website = website;
  if (phone) out.phone = phone;
  if (email) out.email = email;
  if (what) out.what = what;
  if (zip) out.zip = zip;
  if (address) out.address = address;
  if (hours) out.hours = hours;
  if (boroughs.length) out.boroughs = [...new Set(boroughs)];
  if (animals.length) out.animals = [...new Set(animals)];
  return { ok: true, fields: out };
}
