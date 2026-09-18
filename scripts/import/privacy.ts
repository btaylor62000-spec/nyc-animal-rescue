/**
 * Withholding personal contact details.
 *
 * The research files contain a handful of private individuals' phone numbers --
 * a volunteer's mobile offered for questions, a home line for a rehab operation
 * run out of someone's house. Those people have not agreed to appear on a
 * public website, so the importer removes them before anything is written and
 * records that it did so.
 *
 * This runs last, over the finished records, so a value cannot slip through by
 * arriving via a path that was added later.
 */
import { readFileSync } from 'node:fs';
import type { Org } from '../../src/types.ts';

interface HeldEntry {
  id: string;
  kind: string;
  value: string | string[];
  person?: string;
  reason: string;
  found_in?: string;
  ask?: string;
}

interface NameHold {
  id: string;
  value: string;
  reason: string;
  action: string;
}

export interface PrivacyReport {
  /** Every record a held value was removed from. */
  removals: Array<{ org_id: string; org_name: string; hold_id: string; where: string }>;
  held: HeldEntry[];
  nameHolds: NameHold[];
}

export function loadHolds(path = 'data/privacy-holds.json'): { held: HeldEntry[]; nameHolds: NameHold[] } {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as {
    held: HeldEntry[];
    name_holds: NameHold[];
  };
  return { held: raw.held ?? [], nameHolds: raw.name_holds ?? [] };
}

/** Digits only, so a held number is matched however it happens to be written. */
function digits(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * Contact prose left stranded when a hold removes the numbers it described.
 *
 * The importer files prose that was sitting in a contact column into the notes,
 * tagged with the column it came from ("Phone: Home Phone: cell (Bobby)"). That
 * is useful while the numbers are there. Once a hold strips them it is worse
 * than useless: it still names the person, still reads as an invitation, and
 * "call directly (numbers at left)" points at numbers that are no longer on the
 * page. This is the same failure `scrubText` exists to prevent in guide prose --
 * cutting the digits and leaving "contact Divya at [withheld]" -- so records get
 * the same treatment.
 */
/** Every label the importer writes when filing contact-column prose into notes. */
const ANY_LABEL = /(?:^|\s)(?:Phone|Email|Cell|Home Phone|Other channel|Intake|Website):/gi;

/** The subset describing a route that a hold has just taken away. */
const WITHHELD_LABEL = /^(?:Phone|Email|Cell|Home Phone|Other channel):/i;

/** Segments that only make sense if the withheld contacts were still shown. */
const POINTS_AT_CONTACTS = /\b(?:numbers? (?:at left|above|below)|at left|call directly|reach by phone|contact by phone)\b/i;

function stripStrandedContactProse(notes: string): string {
  // Split on every label, not just the ones being dropped: bounding a segment
  // by the next label of any kind is what stops "Phone: ..." swallowing the
  // "Intake: ..." text that follows it and is still perfectly valid.
  const parts: string[] = [];
  const marks = [...notes.matchAll(ANY_LABEL)].map((m) => m.index!);
  if (marks.length === 0) return notes;
  if (marks[0]! > 0) parts.push(notes.slice(0, marks[0]!));
  for (let i = 0; i < marks.length; i++) {
    parts.push(notes.slice(marks[i]!, marks[i + 1] ?? notes.length));
  }

  const kept: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // A segment labelled with a route that has just been withheld goes whole.
    if (WITHHELD_LABEL.test(trimmed)) continue;

    // Any other segment is kept, minus only the sentences that send the reader
    // to the missing numbers. Dropping the whole segment would also lose true
    // statements sitting beside them -- "Listed by NYC Bird Alliance" is the
    // route that still works, and it shared a segment with "call directly".
    if (POINTS_AT_CONTACTS.test(trimmed)) {
      const sentences = trimmed.split(/(?<=[.!?])\s+/).filter((x) => !POINTS_AT_CONTACTS.test(x));
      const rest = sentences.join(' ').trim();
      if (rest) kept.push(rest);
      continue;
    }
    kept.push(trimmed);
  }

  return kept.join(' ').replace(/\s{2,}/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
}

export function applyPrivacyHolds(orgs: Org[], path?: string): PrivacyReport {
  const { held, nameHolds } = loadHolds(path);
  const removals: PrivacyReport['removals'] = [];

  const heldNumbers = new Map<string, string>(); // digits -> hold id
  for (const h of held) {
    const values = Array.isArray(h.value) ? h.value : [h.value];
    for (const v of values) heldNumbers.set(digits(v), h.id);
  }

  for (const org of orgs) {
    let touched = false;
    // A name hold is not a reason to rewrite contact prose; only a withheld
    // phone or email leaves that prose describing something that is gone.
    let contactWithheld = false;

    // Structured phone fields.
    const keptPhones = org.phones.filter((p) => {
      const holdId = heldNumbers.get(digits(p.value));
      if (!holdId) return true;
      removals.push({ org_id: org.id, org_name: org.name, hold_id: holdId, where: 'phones' });
      touched = true;
      contactWithheld = true;
      return false;
    });
    org.phones = keptPhones;

    // Free text can repeat the same number, so scrub notes, hours and status
    // notes too rather than trusting that it only ever landed in one place.
    for (const field of ['notes', 'hours', 'status_note', 'neighborhoods'] as const) {
      const value = org[field];
      if (typeof value !== 'string') continue;
      let next = value;
      for (const [num, holdId] of heldNumbers) {
        // Match the number however it is punctuated in prose.
        const pattern = new RegExp(
          num.split('').map((d) => `${d}`).join('[-.()\\s]*'),
          'g',
        );
        if (!pattern.test(next)) continue;
        next = next.replace(pattern, '[contact withheld pending permission]');
        removals.push({ org_id: org.id, org_name: org.name, hold_id: holdId, where: field });
        touched = true;
        contactWithheld = true;
      }
      if (next !== value) (org[field] as string) = next;
    }

    // Personal names we keep out of otherwise-public organization entries.
    for (const nh of nameHolds) {
      const re = new RegExp(`\\s*\\(${nh.value}\\)|\\b${nh.value}\\b`, 'g');
      for (const field of ['name', 'notes'] as const) {
        const value = org[field];
        if (typeof value !== 'string' || !re.test(value)) continue;
        (org[field] as string) = value.replace(re, '').replace(/\s{2,}/g, ' ').replace(/\s+,/g, ',').trim();
        removals.push({ org_id: org.id, org_name: org.name, hold_id: nh.id, where: field });
        touched = true;
      }
    }

    if (touched) {
      org.privacy_hold = true;

      // The numbers are gone from the fields; take the prose that described
      // them out of the notes as well, or the page still reads as though a
      // phone route exists.
      if (contactWithheld && typeof org.notes === 'string') {
        const cleaned = stripStrandedContactProse(org.notes);
        if (cleaned !== org.notes) {
          org.notes = cleaned;
          removals.push({ org_id: org.id, org_name: org.name, hold_id: 'stranded-contact-prose', where: 'notes' });
        }
      }
      const note = 'Some contact details for this entry are personal and are withheld until the individual confirms they want to be listed publicly.';
      org.notes = org.notes ? `${org.notes}\n\n${note}` : note;
    }
  }

  return { removals, held, nameHolds };
}

/**
 * Scrub held values out of guide prose before it becomes a Markdown page.
 *
 * A held number is removed together with the sentence around it. Replacing
 * just the digits leaves behind "contact Divya at ([number withheld]." -- which
 * still names the person, still reads as an invitation to contact them, and
 * looks broken. Removing the sentence is the only version that actually
 * honours the hold.
 */
export function scrubText(text: string, path?: string): { text: string; removed: string[] } {
  const { held, nameHolds } = loadHolds(path);
  const removed: string[] = [];
  let out = text;

  for (const h of held) {
    const values = Array.isArray(h.value) ? h.value : [h.value];
    for (const v of values) {
      const num = digits(v);
      const numPattern = new RegExp(num.split('').join('[-.()\\s]*'));
      if (!numPattern.test(out)) continue;

      // A personal number is almost always introduced by a sentence that names
      // the person and followed by sentences about them ("She is the
      // cofounder of..."). Cutting only the sentence with the digits in it
      // leaves those dangling and still pointing at someone who has not
      // agreed to be listed, so the whole block goes.
      if (h.kind === 'personal-phone') {
        removed.push(h.id);
        return { text: '', removed: [...new Set(removed)] };
      }

      const sentences = out.split(/(?<=[.!?])\s+/);
      out = sentences.filter((sentence) => !numPattern.test(sentence)).join(' ').trim();
      if (numPattern.test(out)) {
        out = out.replace(new RegExp(num.split('').join('[-.()\\s]*'), 'g'), '[withheld]');
      }
      removed.push(h.id);
    }
  }
  for (const nh of nameHolds) {
    const re = new RegExp(`\\s*\\(${nh.value}\\)`, 'g');
    if (!re.test(out)) continue;
    out = out.replace(re, '');
    removed.push(nh.id);
  }
  return { text: out, removed: [...new Set(removed)] };
}
