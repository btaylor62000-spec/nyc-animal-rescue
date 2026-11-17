/**
 * The directory's own listings, shown at the foot of a guide.
 *
 * Guide prose comes from the research workbooks; listings come from the
 * records, which the weekly check and people's corrections keep current. A
 * reviewer found the two disagreeing -- numbers in a guide that were not on
 * the organization's site, funds and the city's pet food pantries in the
 * directory but not in the guide. Writing every listing into the prose by hand
 * would drift again, so these guides carry a list built from the records at
 * every build, with each one's current phone and a link to its entry.
 */
import type { Animal, Need, Org } from '../types.ts';
import { CONFIDENCE_ORDER, LISTED_ORGS } from './orgs.ts';
import { matchesTopic, topicQuery, type TopicFilter } from './topics.ts';

export interface ListingBlock {
  heading: string;
  need?: Need;
  /** Only records serving one of these animals (or no animal recorded). */
  animals?: Animal[];
  /** A fixed set of entries, for a guide whose list is not one tag. */
  ids?: string[];
  /**
   * Every pantry in the city's pet food programme (data/pet-food-pantries.json),
   * by borough. A reviewer followed the guide's "all of them" link on
   * 2026-11-06 and could not find them among thirty other food listings.
   */
  cityPantries?: true;
  /** Leave the city's pantries out, when the guide lists them in their own block. */
  notCityPantries?: true;
  /** An anchor on the guide page, so a line in the guide can point at this list. */
  anchor?: string;
  /**
   * Places that lead the list, in this order, whether or not they carry the
   * need: the bird list opens with the Wild Bird Fund, the Animal Medical
   * Center (its ER takes critically ill birds; owner's call to AMC,
   * 2026-11-15) and Animal Help Now, as the bird card does. The assistant
   * keeps the same lead (owner, 2026-11-17: AMC was missing for birds).
   */
  lead?: string[];
}

const EXOTIC: Animal[] = ['rabbit', 'small-mammal', 'bird-companion', 'reptile', 'amphibian', 'fish'];

/** Every guide, so every guide's list of places comes from the listings. */
export const GUIDE_LISTINGS: Record<string, ListingBlock[]> = {
  'animal-emergency': [
    { heading: 'Emergency and urgent-care vets', need: 'emergency-vet' },
    { heading: 'Poison control lines', need: 'poison-control' },
  ],
  'breed-specific-dog-rescue': [{ heading: 'Breed-specific rescues', need: 'breed-specific', animals: ['dog'] }],
  'cats-with-special-needs': [
    { heading: 'Newborn kittens', need: 'neonatal', animals: ['cat'] },
    { heading: 'Cats with medical needs', need: 'medical-special-needs', animals: ['cat'] },
    { heading: 'Senior cats', need: 'senior', animals: ['cat'] },
  ],
  'dog-behavior-and-legal': [
    { heading: 'Behaviour and training help', need: 'behavior-training', animals: ['dog'] },
    { heading: 'Legal help and reporting', need: 'legal' },
  ],
  'exotic-boarding-and-planning': [
    { heading: 'Avian and exotic vets', need: 'exotic-vet' },
    { heading: 'Boarding and temporary care', need: 'boarding' },
  ],
  'exotic-pet-emergency': [{ heading: 'Avian and exotic vets', need: 'exotic-vet' }],
  'found-an-injured-bird': [{
    heading: 'Who takes injured birds',
    need: 'wildlife-rehab',
    animals: ['bird-wild', 'pigeon'],
    lead: ['the-wild-bird-fund', 'animal-medical-center', 'animal-help-now-wildlife-emergency-finder'],
  }],
  'found-wildlife': [{
    heading: 'Wildlife rehabilitators',
    need: 'wildlife-rehab',
    // As the wildlife card: find one open now, then the city's main rehab.
    lead: ['animal-help-now-wildlife-emergency-finder', 'the-wild-bird-fund'],
  }],
  'found-kittens-outside': [
    { heading: 'Kitten nurseries: newborn kittens and pregnant cats', need: 'neonatal', animals: ['cat'] },
    { heading: 'TNR groups, for the mother cat', need: 'tnr', animals: ['cat'] },
  ],
  'leaving-abuse-with-your-pet': [
    {
      heading: 'Hotlines, shelters and safe-keeping for survivors and their pets',
      ids: ['nyc-domestic-violence-hotline', 'national-domestic-violence-hotline', 'uri-pals', 'safe-horizon', 'volunteers-of-america-greater-new-york', 'safe-haven-program-map-foster', 'paws-ny', 'helping-pets-and-people-in-crisis', 'animal-haven', 'redrover-relief', 'safe-havens-for-pets', 'domesticsheltersorg'],
    },
  ],
  'help-paying-for-care': [{ heading: 'Help paying vet bills', need: 'financial-aid' }],
  'pets-in-a-disaster': [
    { heading: 'Emergency and urgent-care vets', need: 'emergency-vet' },
    { heading: 'Somewhere safe for your pet meanwhile', need: 'boarding' },
  ],
  'keep-your-pet-if-you-lose-your-home': [
    { heading: 'Somewhere safe for your pet meanwhile', need: 'boarding' },
    { heading: 'Help keeping your pet', need: 'owner-support' },
  ],
  'keeping-your-cat': [
    { heading: "NYC's free pet food pantries (the city's programme)", cityPantries: true, anchor: 'city-pet-food-pantries' },
    { heading: 'Other free pet food', need: 'food-assistance', animals: ['cat'], notCityPantries: true },
    { heading: 'Help paying vet bills', need: 'financial-aid', animals: ['cat'] },
    { heading: 'Help keeping your cat', need: 'owner-support', animals: ['cat'] },
    // The "I have to give up my cat" tile names these; the list was missing.
    { heading: 'Rescues that take a cat from its owner', need: 'surrender', animals: ['cat'] },
  ],
  'keeping-your-dog': [
    { heading: "NYC's free pet food pantries (the city's programme)", cityPantries: true, anchor: 'city-pet-food-pantries' },
    { heading: 'Other free pet food', need: 'food-assistance', animals: ['dog'], notCityPantries: true },
    { heading: 'Help paying vet bills', need: 'financial-aid', animals: ['dog'] },
    { heading: 'Help keeping your dog', need: 'owner-support', animals: ['dog'] },
    { heading: 'Rescues that take a dog from its owner', need: 'surrender', animals: ['dog'] },
  ],
  'lost-and-found-cat': [
    { heading: 'Lost and found', need: 'lost-found', animals: ['cat'] },
    { heading: 'Microchip registries', need: 'microchip' },
  ],
  'lost-and-found-dog': [
    { heading: 'Lost and found', need: 'lost-found', animals: ['dog'] },
    { heading: 'Microchip registries', need: 'microchip' },
  ],
  'lost-and-found-exotic': [{ heading: 'Lost and found', need: 'lost-found', animals: EXOTIC }],
  'low-cost-dog-care': [
    { heading: "NYC's free pet food pantries (the city's programme)", cityPantries: true, anchor: 'city-pet-food-pantries' },
    { heading: 'Other free pet food', need: 'food-assistance', animals: ['dog'], notCityPantries: true },
    { heading: 'Low-cost vet care', need: 'low-cost-vet', animals: ['dog'] },
    { heading: 'Low-cost spay and neuter', need: 'spay-neuter', animals: ['dog'] },
  ],
  'low-cost-clinics-and-trap-banks': [
    { heading: 'Low-cost vet care', need: 'low-cost-vet', animals: ['cat'] },
    { heading: 'Low-cost spay and neuter', need: 'spay-neuter', animals: ['cat'] },
    { heading: 'Trap banks', need: 'trap-bank' },
  ],
  'rehoming-an-exotic-pet': [{ heading: 'Rescues that take exotic pets', need: 'surrender', animals: EXOTIC }],
  'report-animal-abuse': [
    {
      heading: 'Who to call',
      ids: ['nyc-311', 'nyc-mayors-office-of-animal-welfare', 'your-city-council-member', 'nyc-council-animal-welfare-caucus', 'nypd-crime-stoppers', 'your-local-nypd-precinct', 'hsus-dogfighting-tip-line'],
    },
    {
      heading: 'A pet shop, breeder, shelter, rescue or other business',
      ids: ['new-york-state-department-of-agriculture-and-markets', 'better-business-bureau'],
    },
    { heading: 'Something online', ids: ['fbi-tips', 'fbi-internet-crime-complaint-center'] },
    { heading: 'If people are at risk too', ids: ['nyc-domestic-violence-hotline', 'uri-pals'] },
  ],
  'animal-trapped': [
    { heading: 'Who to call', ids: ['nyc-311', 'animal-care-centers-of-nyc', 'nys-dec-region-2'] },
    { heading: 'Emergency and urgent-care vets', need: 'emergency-vet' },
  ],
  'animal-left-alone': [
    { heading: 'Who to call', ids: ['nyc-311', 'animal-care-centers-of-nyc', 'your-local-nypd-precinct'] },
    { heading: 'Somewhere safe for a pet meanwhile', need: 'boarding' },
  ],

  'save-an-at-risk-animal': [{ heading: 'Rescue groups that pull from the city shelter', need: 'advocacy' }],
  'starting-tnr': [
    { heading: 'Trap banks', need: 'trap-bank' },
    { heading: 'Help with community cats', need: 'colony-care', animals: ['cat'] },
    { heading: 'TNR groups', need: 'tnr', animals: ['cat'] },
  ],
};

/** Records for a block: firmest evidence first, then name. */
const BOROUGH_ORDER = ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'];

export function listingsFor(block: ListingBlock, orgs: Org[] = LISTED_ORGS): Org[] {
  if (block.cityPantries) {
    return orgs
      .filter((o) => o.source_files.some((f) => f.includes('pet-food-pantries')))
      .sort((a, b) => BOROUGH_ORDER.indexOf(a.boroughs[0] ?? '') - BOROUGH_ORDER.indexOf(b.boroughs[0] ?? '') || a.name.localeCompare(b.name));
  }
  if (block.ids) return block.ids.map((id) => orgs.find((o) => o.id === id)).filter((o): o is Org => Boolean(o));
  if (block.lead) {
    const lead = block.lead.map((id) => orgs.find((o) => o.id === id)).filter((o): o is Org => Boolean(o));
    const rest = listingsFor({ ...block, lead: undefined }, orgs).filter((o) => !block.lead!.includes(o.id));
    return [...lead, ...rest];
  }
  const isCityPantry = (o: Org) => o.source_files.some((f) => f.includes('pet-food-pantries'));
  return orgs
    // The site's one rule for a topic (topics.ts): the directory and the
    // assistant use it too, so the same topic lists the same places.
    .filter((o) => block.need !== undefined && matchesTopic(o, { need: block.need, animals: block.animals }))
    .filter((o) => !block.notCityPantries || !isCityPantry(o))
    // Places in the city first; outside the city after them (owner, 2026-11-15).
    .sort((a, b) => Number(a.outside_nyc) - Number(b.outside_nyc) || CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence] || a.name.localeCompare(b.name));
}

/** A list's name and, where the filter panel can say it, its plain filter. */
export interface Topic {
  /** `<guide>.<n>`: the n-th list at the foot of that guide. */
  key: string;
  guide: string;
  heading: string;
  need?: string;
  plain: TopicFilter | null;
  block: ListingBlock;
}

export function topicOf(slug: string, index: number): Topic {
  const block = GUIDE_LISTINGS[slug]![index]!;
  const plain = !block.ids && !block.lead && !block.cityPantries && !block.notCityPantries && (block.animals?.length ?? 0) <= 1 && block.need
    ? { need: block.need, animals: block.animals }
    : null;
  // The city's pantries are food help, though the block names no need.
  const need = block.need ?? (block.cityPantries ? 'food-assistance' : undefined);
  return { key: `${slug}.${index}`, guide: slug, heading: block.heading, need, plain, block };
}

/** Every list on the site, one per block at the foot of a guide. */
export const TOPICS: Topic[] = Object.entries(GUIDE_LISTINGS).flatMap(([slug, blocks]) => blocks.map((_, i) => topicOf(slug, i)));

/** The places in each list, by key: written into the directory page so `list=` shows exactly these. */
export function topicIdsByKey(orgs: Org[] = LISTED_ORGS): Record<string, string[]> {
  return Object.fromEntries(TOPICS.map((t) => [t.key, listingsFor(t.block, orgs).map((o) => o.id)]));
}

/** The same, with each list's heading, for the directory page. */
export function topicListsForPage(orgs: Org[] = LISTED_ORGS): Record<string, { heading: string; ids: string[] }> {
  const ids = topicIdsByKey(orgs);
  return Object.fromEntries(TOPICS.map((t) => [t.key, { heading: t.heading, ids: ids[t.key]! }]));
}

/** The same list in the directory, where it can be ordered by distance. */
export function topicHref(topic: Topic, extra: Record<string, string> = {}): string {
  const p = topicQuery(topic);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return `/directory?${p.toString()}`;
}

/** The same list in the directory, where it can be ordered by distance. */
export function directoryHref(block: ListingBlock): string | null {
  const t = TOPICS.find((x) => x.block === block);
  return t ? topicHref(t) : null;
}

/*
 * Where each guide's line on Find help leads (owner, 2026-11-16: one map of
 * help across the site, the same 26 lines as the home page). A number opens
 * that list from the foot of the guide (since 2026-11-17, so Find help and
 * the guide cannot list different places); null opens the guide itself, because the
 * answer is steps rather than a place (911 or 311, the at-risk list's forms),
 * or because the directory cannot filter "rabbits, birds and reptiles"
 * together. A test checks every guide is here and every list has listings.
 */
export const FIND_HELP: Record<string, number | null> = {
  'animal-emergency': 0,
  'found-an-injured-bird': 0,
  'found-wildlife': 0,
  'exotic-pet-emergency': 0,
  'report-animal-abuse': null,
  'leaving-abuse-with-your-pet': null,
  'pets-in-a-disaster': null,
  'animal-trapped': null,
  'animal-left-alone': null,
  'lost-and-found-dog': 0,
  'lost-and-found-cat': 0,
  'lost-and-found-exotic': 0,
  'found-kittens-outside': 0,
  'save-an-at-risk-animal': null,
  'keeping-your-dog': 3,
  'keeping-your-cat': 3,
  'keep-your-pet-if-you-lose-your-home': null,
  'help-paying-for-care': 0,
  'low-cost-dog-care': 2,
  'low-cost-clinics-and-trap-banks': 0,
  'starting-tnr': 2,
  'cats-with-special-needs': 1,
  'breed-specific-dog-rescue': 0,
  'dog-behavior-and-legal': 0,
  'rehoming-an-exotic-pet': 0,
  'exotic-boarding-and-planning': 1,
};

/* Help that is a place to go: these lists ask for a location or zip first. */
const PLACE_NEEDS = new Set<string>(['emergency-vet', 'wildlife-rehab', 'exotic-vet', 'food-assistance', 'low-cost-vet', 'spay-neuter', 'tnr', 'neonatal']);

/**
 * The link for a guide's line on Find help: its directory list, carrying the
 * guide so the page shows "Guide: what to do" above the list, or the guide.
 */
export function findHelpHref(slug: string): string {
  const index = FIND_HELP[slug];
  if (index === null || index === undefined) return `/guides/${slug}`;
  const t = topicOf(slug, index);
  return topicHref(t, { ...(t.need && PLACE_NEEDS.has(t.need) ? { near: '1' } : {}), guide: slug });
}
