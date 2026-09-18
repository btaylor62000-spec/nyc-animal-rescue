/**
 * Turning discovery candidates into records.
 *
 * These come from authoritative rosters -- the city shelter's rescue partners,
 * the city's own resource pages -- so they are real organizations. What we do
 * not have is any of their detail: we have not seen their site, confirmed a
 * phone number, or worked out which animals they take.
 *
 * So they enter the directory saying exactly that. Low confidence, labelled
 * "newly found, not yet verified" on every card, and excluded from the
 * assistant's answers until a weekly check has actually found a working
 * contact on their own site. Someone browsing can find them; someone in a
 * crisis is not handed one as though it were checked.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { Animal, Need, Org } from '../../src/types.ts';
import { ANIMAL_RULES, NEED_RULES, ORG_TYPE_RULES } from './taxonomy.ts';
import { applyRules } from './tag.ts';
import { formatPhone, slugify } from './normalize.ts';

const DISCOVERED_PATH = 'data/discovered.json';

interface Candidate {
  name: string;
  website: string | null;
  source: string;
  sourceUrl: string;
  firstSeen: string;
  /** Contacts discovery read off the organization's own site. Unconfirmed. */
  phones?: string[];
  emails?: string[];
  contactsFrom?: string;
}

export function loadDiscovered(path = DISCOVERED_PATH): Candidate[] {
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as { candidates?: Candidate[] };
    return parsed.candidates ?? [];
  } catch {
    return [];
  }
}

/**
 * Build a record from a candidate.
 *
 * Tags are guessed from the name only, which is all we have. A rescue called
 * "Long Island Bulldog Rescue" is about dogs; one called "Air Twiga Animal
 * Rescue" tells us nothing, and gets nothing. Guessing wider than the evidence
 * would put these in filter results they do not belong in.
 */
export function candidateToOrg(c: Candidate): Org {
  const src = { name: c.name, type: '', notes: '', section: '', animals_served: '', areas: '' };
  const animals = applyRules(ANIMAL_RULES, src).tags as Animal[];
  const needs = applyRules(NEED_RULES, src).tags as Need[];
  const orgTypes = applyRules(ORG_TYPE_RULES, src).tags;

  return {
    id: slugify(c.name),
    name: c.name,
    aka: [],
    parent_org: null,
    org_types: orgTypes,
    animals,
    needs,
    boroughs: [],
    citywide: false,
    outside_nyc: false,
    neighborhoods: null,
    zips: [],
    region_note: null,
    phones: (c.phones ?? []).map((value) => ({ value, display: formatPhone(value) })),
    emails: (c.emails ?? []).map((value) => ({ value })),
    website: c.website,
    intake_urls: [],
    social: [],
    address: null,
    hours: null,
    notes: c.contactsFrom
      ? `Found on ${c.source} on ${c.firstSeen}. The contact details below were read from their own website ` +
        'on the same day, but nobody has confirmed them, and we do not know whether they are still operating. ' +
        'Confirm before relying on it.'
      : `Found on ${c.source} on ${c.firstSeen}. Nothing about this entry has been checked yet — ` +
        'not the phone number, not the address, not whether they are still operating. Confirm before relying on it.',
    type_raw: null,
    confidence: 'Low',
    status: 'active',
    status_note: null,
    source_urls: [c.sourceUrl],
    last_verified: null,
    section: `Discovered — ${c.source}`,
    source_files: ['discovery'],
    last_checked: null,
    check_status: 'new-unverified',
    consecutive_failures: 0,
    change_log: [
      {
        date: c.firstSeen,
        field: 'record',
        from: null,
        to: 'added',
        evidence_url: c.sourceUrl,
        source: 'monthly-discovery',
        note: `Listed on ${c.source}.`,
      },
      // Where the contacts came from, so the claim is auditable rather than
      // something the record simply asserts.
      ...(c.contactsFrom
        ? [
            {
              date: c.firstSeen,
              field: 'contacts',
              from: null,
              to: [...(c.phones ?? []), ...(c.emails ?? [])].join(', '),
              evidence_url: c.contactsFrom,
              source: 'monthly-discovery',
              note: 'Read from the organization’s own site when it was found. Not confirmed by a person.',
            },
          ]
        : []),
    ],
    privacy_hold: false,
  };
}

export function discoveredOrgs(path = DISCOVERED_PATH): Org[] {
  return loadDiscovered(path).map(candidateToOrg);
}
