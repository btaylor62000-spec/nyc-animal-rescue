/**
 * Loading the organization records at build time.
 *
 * `data/orgs/*.json` is the source of truth. Nothing here transforms the data;
 * it only reads, sorts and derives the small lookup tables the pages need.
 */
import { readFileSync, readdirSync } from 'node:fs';
import type { Animal, Borough, Confidence, Need, Org, OrgType } from '../types.ts';
import { ANIMALS, BOROUGHS, NEEDS } from '../types.ts';
import { keywordsFor } from './synonyms.ts';

const DIR = 'data/orgs';

function load(): Org[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as Org)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export const ORGS: Org[] = load();
export const ORGS_BY_ID = new Map(ORGS.map((o) => [o.id, o]));

/**
 * A short fingerprint of the current data, appended to the search index URL.
 *
 * The index can then be cached hard, while a deploy that changes the data
 * changes the URL -- so nobody searches a stale index and silently misses an
 * organization that was added or corrected.
 */
export const DATA_VERSION: string = (() => {
  let hash = 0;
  for (const o of ORGS) {
    const line = `${o.id}|${o.last_checked ?? ''}|${o.last_verified ?? ''}|${o.phones.length}|${o.status}`;
    for (let i = 0; i < line.length; i++) hash = (Math.imul(31, hash) + line.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
})();

/** Days after which an entry carries a "confirm before relying on it" note. */
export const STALE_DAYS = 90;

export function daysSinceVerified(org: Org, today = new Date()): number | null {
  if (!org.last_verified) return null;
  return Math.round((today.getTime() - new Date(org.last_verified).getTime()) / 86_400_000);
}

/** A record found by the monthly discovery run that nothing has checked yet. */
export function isNewlyFound(org: Org): boolean {
  return org.check_status === 'new-unverified';
}

/** Should this entry be shown with a "confirm this is still active" note? */
export function needsConfirmation(org: Org, today = new Date()): boolean {
  if (org.confidence === 'Low') return true;
  if (org.status !== 'active') return true;
  const age = daysSinceVerified(org, today);
  return age === null || age > STALE_DAYS;
}

/** Programme records that belong to a parent organization. */
export function programmesOf(id: string): Org[] {
  return ORGS.filter((o) => o.parent_org === id);
}

// --- human-readable labels -------------------------------------------------

export const ANIMAL_LABELS: Record<Animal, string> = {
  cat: 'Cats',
  dog: 'Dogs',
  rabbit: 'Rabbits',
  'small-mammal': 'Small mammals',
  'bird-companion': 'Pet birds',
  'bird-wild': 'Wild birds',
  pigeon: 'Pigeons & doves',
  reptile: 'Reptiles',
  amphibian: 'Amphibians',
  fish: 'Fish',
  farm: 'Farm animals',
  equine: 'Horses',
  wildlife: 'Wildlife',
  marine: 'Marine animals',
  invertebrate: 'Invertebrates',
};

export const NEED_LABELS: Record<Need, string> = {
  'emergency-vet': 'Emergency vet',
  'poison-control': 'Poison control',
  'wildlife-rehab': 'Wildlife rehab',
  adoption: 'Adoption',
  surrender: 'Surrender / rehoming',
  foster: 'Fostering',
  tnr: 'TNR',
  'colony-care': 'Colony care',
  'trap-bank': 'Borrow a trap',
  'spay-neuter': 'Spay / neuter',
  'low-cost-vet': 'Low-cost vet',
  'exotic-vet': 'Exotic vet',
  neonatal: 'Newborn / bottle babies',
  'medical-special-needs': 'Medical & special needs',
  senior: 'Senior animals',
  retrovirus: 'FeLV+ / FIV+',
  'lost-found': 'Lost & found',
  microchip: 'Microchip',
  'behavior-training': 'Behaviour & training',
  'financial-aid': 'Help with vet bills',
  'food-assistance': 'Pet food help',
  'owner-support': 'Help keeping your pet',
  boarding: 'Boarding & sitting',
  sanctuary: 'Sanctuary',
  'working-cat': 'Working cats',
  transport: 'Transport',
  legal: 'Legal & cruelty',
  'breed-specific': 'Breed-specific',
  education: 'Education',
  advocacy: 'Advocacy',
  licensing: 'Licensing',
  'pet-loss': 'Pet loss support',
  referral: 'Referral hub',
};

export const BOROUGH_LABELS: Record<Borough, string> = {
  manhattan: 'Manhattan',
  brooklyn: 'Brooklyn',
  queens: 'Queens',
  bronx: 'The Bronx',
  'staten-island': 'Staten Island',
};

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  'shelter-open-admission': 'Open-admission shelter',
  'shelter-no-kill': 'No-kill shelter',
  'rescue-foster': 'Rescue & adoption',
  'tnr-group': 'TNR group',
  'solo-rescuer': 'Solo rescuer',
  clinic: 'Clinic',
  'emergency-vet': 'Emergency vet',
  'exotic-vet': 'Exotic vet',
  'wildlife-rehabber': 'Wildlife rehabilitator',
  sanctuary: 'Sanctuary',
  'referral-hub': 'Referral hub',
  advocacy: 'Advocacy',
  hotline: 'Hotline',
  government: 'City or state service',
  'club-society': 'Club or society',
  directory: 'Directory',
  'support-program': 'Support programme',
};

export const STATUS_LABELS: Record<Org['status'], string> = {
  active: 'Active',
  verify: 'Needs confirming',
  hiatus: 'Paused',
  relocated: 'Moved out of NYC',
  retired: 'Closed',
};

/** Only the facets that actually appear in the data, in a sensible order. */
function present<T extends string>(all: readonly T[], pick: (o: Org) => T[]): T[] {
  const seen = new Set(ORGS.flatMap(pick));
  return all.filter((t) => seen.has(t));
}

export const ANIMAL_FACETS = present<Animal>(ANIMALS, (o) => o.animals);
export const NEED_FACETS = present<Need>(NEEDS, (o) => o.needs);
export const BOROUGH_FACETS = present<Borough>(BOROUGHS, (o) => o.boroughs);

export const CONFIDENCE_ORDER: Record<Confidence, number> = { High: 0, Medium: 1, Low: 2 };

/**
 * The shape shipped to the browser for free-text search.
 *
 * Deliberately search-only: boroughs, needs, confidence and the rest are read
 * from data attributes already in the page, so this file carries nothing the
 * DOM already knows. Keeping it small matters because it is fetched on a
 * phone, mid-crisis, the moment someone starts typing.
 */
export interface SearchRecord {
  id: string;
  name: string;
  aka: string[];
  animals: Animal[];
  needs: Need[];
  boroughs: Borough[];
  zips: string[];
  /** Neighbourhoods and notes, trimmed -- enough to match on, not to display. */
  text: string;
  /** Words people actually type, derived from this record's tags. */
  keywords: string;
}

export function toSearchRecord(o: Org): SearchRecord {
  return {
    id: o.id,
    name: o.name,
    aka: o.aka,
    animals: o.animals,
    needs: o.needs,
    boroughs: o.boroughs,
    zips: o.zips,
    text: [o.neighborhoods, o.type_raw, o.notes]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .slice(0, 280),
    keywords: keywordsFor(o.animals, o.needs, o.org_types),
  };
}
