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
  'exotic-pet-legality': [{ heading: 'Rescues for exotic pets', need: 'adoption', animals: EXOTIC }],
  'found-an-injured-bird': [{ heading: 'Wildlife rehabilitators who take birds', need: 'wildlife-rehab', animals: ['bird-wild', 'pigeon'] }],
  'found-wildlife': [{ heading: 'Wildlife rehabilitators', need: 'wildlife-rehab' }],
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
  ],
  'keeping-your-dog': [
    { heading: "NYC's free pet food pantries (the city's programme)", cityPantries: true, anchor: 'city-pet-food-pantries' },
    { heading: 'Other free pet food', need: 'food-assistance', animals: ['dog'], notCityPantries: true },
    { heading: 'Help paying vet bills', need: 'financial-aid', animals: ['dog'] },
    { heading: 'Help keeping your dog', need: 'owner-support', animals: ['dog'] },
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
      heading: 'Where to report',
      ids: ['nyc-311', 'your-local-nypd-precinct', 'nypd-crime-stoppers', 'hsus-dogfighting-tip-line', 'aspca-community-engagement', 'nyc-domestic-violence-hotline', 'uri-pals'],
    },
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
  const isCityPantry = (o: Org) => o.source_files.some((f) => f.includes('pet-food-pantries'));
  return orgs
    .filter((o) => block.need !== undefined && o.needs.includes(block.need))
    .filter((o) => !block.notCityPantries || !isCityPantry(o))
    .filter((o) => !block.animals || o.animals.length === 0 || block.animals.some((a) => o.animals.includes(a)))
    .sort((a, b) => CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence] || a.name.localeCompare(b.name));
}

/** The same list in the directory, where it can be ordered by distance. */
export function directoryHref(block: ListingBlock): string | null {
  if (block.cityPantries) return '/directory?need=food-assistance';
  if (!block.need) return null;
  const p = new URLSearchParams({ need: block.need });
  // The directory's animal filter takes one; a list of exotic animals goes unfiltered.
  if (block.animals?.length === 1) p.set('animal', block.animals[0]!);
  return `/directory?${p.toString()}`;
}
