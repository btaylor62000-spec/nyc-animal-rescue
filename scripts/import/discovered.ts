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
import type { Animal, Borough, Need, Org } from '../../src/types.ts';
import { BOROUGH_PATTERNS } from '../../src/data/geo.ts';
import { ANIMAL_RULES, NEED_RULES, ORG_TYPE_RULES, inferRegion } from './taxonomy.ts';
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
  contactsChecked?: string;
  /**
   * Set by a person, after looking. Discovery finds mostly out-of-city
   * rescues, so nothing it finds is published until someone marks it.
   */
  publish?: boolean;
  publishedOn?: string;
  /** Set by the person who marked it, when they confirmed where it is. */
  boroughs?: Borough[];
  /** A foster network or programme that works across the city. */
  citywide?: boolean;
  animals?: Animal[];
  checkedBy?: string;
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
  const animals = [...new Set([...(c.animals ?? []), ...(applyRules(ANIMAL_RULES, src).tags as Animal[])])];
  const needs = applyRules(NEED_RULES, src).tags as Need[];
  const orgTypes = applyRules(ORG_TYPE_RULES, src).tags;

  // The roster these come from lists rescues that pull animals out of NYC
  // shelters, which is not the same as being in New York. Say where they are,
  // so a group in Connecticut does not compete with a local one in search.
  const region = inferRegion({ name: c.name, phones: c.phones ?? [] });

  // A borough in the name is as good as the research workbooks get, and the
  // person who marked the candidate may have confirmed one.
  const boroughs = new Set<Borough>(c.boroughs ?? []);
  for (const bp of BOROUGH_PATTERNS) if (bp.pattern.test(c.name)) boroughs.add(bp.tag);
  if (c.citywide) for (const b of ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'] as Borough[]) boroughs.add(b);

  return {
    id: slugify(c.name),
    name: c.name,
    aka: [],
    parent_org: null,
    org_types: orgTypes,
    animals,
    needs,
    boroughs: [...boroughs],
    citywide: c.citywide === true,
    outside_nyc: region.outsideNyc && boroughs.size === 0,
    neighborhoods: null,
    zips: [],
    region_note: region.note,
    phones: (c.phones ?? []).map((value) => ({ value, display: formatPhone(value) })),
    emails: (c.emails ?? []).map((value) => ({ value })),
    website: c.website,
    intake_urls: [],
    social: [],
    address: null,
    hours: null,
    notes: `${c.checkedBy ? `${c.checkedBy} ` : ''}` + (c.contactsFrom
      ? `${region.note ? `${region.note} ` : ''}Found on ${c.source} on ${c.firstSeen}. ` +
        'The contact details below were read from their own website ' +
        'on the same day, but nobody has confirmed them, and we do not know whether they are still operating. ' +
        'Confirm before relying on it.'
      : `${region.note ? `${region.note} ` : ''}Found on ${c.source} on ${c.firstSeen}. ` +
        'Nothing about this entry has been checked yet — ' +
        'not the phone number, not the address, not whether they are still operating. Confirm before relying on it.'),
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
    community: null,
  };
}

/** The candidates a person has marked for publishing, or all of them when asked. */
export function discoveredOrgs(path = DISCOVERED_PATH, all = false): Org[] {
  return loadDiscovered(path)
    .filter((c) => all || c.publish === true)
    .map(candidateToOrg);
}

export function unpublishedCandidateCount(path = DISCOVERED_PATH): number {
  return loadDiscovered(path).filter((c) => c.publish !== true).length;
}
