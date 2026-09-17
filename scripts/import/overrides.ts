/**
 * Curated corrections that sit above the rule engine.
 *
 * Keep this small and justified. Anything that could be fixed by improving a
 * rule in `taxonomy.ts` belongs there instead -- this file is for facts the
 * source genuinely does not state, and for merge decisions a heuristic cannot
 * safely make on its own.
 */
import type { Animal, Need, Org } from '../../src/types.ts';

export interface Override {
  /** Matched against the record id after slugification. */
  id: string;
  reason: string;
  addAnimals?: Animal[];
  addNeeds?: Need[];
  set?: Partial<Pick<Org, 'parent_org' | 'citywide' | 'outside_nyc' | 'status' | 'status_note'>>;
}

export const OVERRIDES: Override[] = [
  {
    id: 'animal-care-centers-of-nyc',
    reason:
      "ACC is the city's only open-admission shelter and takes in every species, but it appears in the dog workbook, so the rules only ever see dogs. Its cat, rabbit and small-animal intake is real and is the first call for most surrenders.",
    addAnimals: ['cat', 'dog', 'rabbit', 'small-mammal', 'bird-companion', 'reptile'],
    addNeeds: ['adoption', 'surrender', 'lost-found', 'owner-support'],
  },
  {
    id: 'mayors-alliance-for-nycs-animals',
    reason:
      'A citywide referral hub for every species; the directory rows only describe the dog and exotic views of it.',
    addAnimals: ['cat', 'dog', 'rabbit', 'small-mammal', 'bird-companion', 'reptile'],
    addNeeds: ['referral', 'adoption'],
  },
  {
    id: 'acc-working-cats-program',
    reason: 'A programme of ACC rather than an independent organization.',
    set: { parent_org: 'animal-care-centers-of-nyc' },
  },
  {
    id: 'acc-new-hope-program',
    reason: 'A programme of ACC rather than an independent organization.',
    set: { parent_org: 'animal-care-centers-of-nyc' },
  },
  {
    id: 'animal-care-centers-of-nyc-brooklyn',
    reason: 'A site of ACC rather than an independent organization.',
    set: { parent_org: 'animal-care-centers-of-nyc' },
  },
  {
    id: 'animal-care-centers-of-nyc-guinea-pigs-and-small-animals',
    reason: 'A programme of ACC rather than an independent organization.',
    set: { parent_org: 'animal-care-centers-of-nyc' },
  },
  {
    id: 'the-toby-project-feral-spay-neuter-clinic',
    reason: 'The clinic arm of The Toby Project.',
    set: { parent_org: 'the-toby-project' },
  },
];

/**
 * Organizations that must never be merged with each other despite similar
 * names, because they are physically different places.
 */
export const NEVER_MERGE: Array<[string, string]> = [
  // Same operator, three different hospitals with different addresses.
  ['verg-veterinary-emergency-and-referral-group', 'verg-north-veterinary-emergency-and-referral-group'],
  ['verg-north-veterinary-emergency-and-referral-group', 'verg-south'],
];

/**
 * Programme-level records extracted from guide prose that belong to a larger
 * organization already in the directory.
 *
 * They are kept as separate records rather than folded in, because someone
 * searching for "pet food" should find "ACC Pet Food Pantry" directly. Linking
 * them to a parent lets the site group them on the parent's page.
 */
export const PARENT_PREFIXES: Array<{ prefix: RegExp; parent: string }> = [
  { prefix: /^ACC\b|^ACC's\b|^Animal Care Centers\b/i, parent: 'animal-care-centers-of-nyc' },
  { prefix: /^Toby Project\b|^The Toby Project\b/i, parent: 'the-toby-project' },
];

/**
 * Domains that identify a platform rather than an organization, so they can
 * never be used as evidence that two records are the same group.
 */
export const AGGREGATOR_DOMAINS = new Set([
  'facebook.com',
  'instagram.com',
  'linktr.ee',
  'petfinder.com',
  'adoptapet.com',
  'petango.com',
  'forms.monday.com',
  'docs.google.com',
  'forms.gle',
  'linktree.com',
  'x.com',
  'twitter.com',
  'gofundme.com',
  'nyswrc.org',
  'dec.ny.gov',
  'data.ny.gov',
]);
