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
  need: Need;
  /** Only records serving this animal (or no animal recorded). */
  animal?: Animal;
}

export const GUIDE_LISTINGS: Record<string, ListingBlock[]> = {
  'help-paying-for-care': [{ heading: 'Help paying vet bills', need: 'financial-aid' }],
  'keeping-your-cat': [
    { heading: 'Free pet food', need: 'food-assistance', animal: 'cat' },
    { heading: 'Help paying vet bills', need: 'financial-aid', animal: 'cat' },
  ],
  'keeping-your-dog': [
    { heading: 'Free pet food', need: 'food-assistance', animal: 'dog' },
    { heading: 'Help paying vet bills', need: 'financial-aid', animal: 'dog' },
  ],
  'low-cost-dog-care': [
    { heading: 'Low-cost vet care', need: 'low-cost-vet', animal: 'dog' },
    { heading: 'Low-cost spay and neuter', need: 'spay-neuter', animal: 'dog' },
  ],
  'low-cost-clinics-and-trap-banks': [
    { heading: 'Low-cost vet care', need: 'low-cost-vet', animal: 'cat' },
    { heading: 'Low-cost spay and neuter', need: 'spay-neuter', animal: 'cat' },
    { heading: 'Trap banks', need: 'trap-bank' },
  ],
};

/** Records for a block: firmest evidence first, then name. */
export function listingsFor(block: ListingBlock, orgs: Org[] = LISTED_ORGS): Org[] {
  return orgs
    .filter((o) => o.needs.includes(block.need))
    .filter((o) => !block.animal || o.animals.length === 0 || o.animals.includes(block.animal))
    .sort((a, b) => CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence] || a.name.localeCompare(b.name));
}

/** The same list in the directory, where it can be ordered by distance. */
export function directoryHref(block: ListingBlock): string {
  const p = new URLSearchParams({ need: block.need });
  if (block.animal) p.set('animal', block.animal);
  return `/directory?${p.toString()}`;
}
