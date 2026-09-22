/**
 * The tagging map.
 *
 * Every derived tag on a record comes from one of the rule tables below, so a
 * maintainer can answer "why is this org tagged `neonatal`?" by reading this
 * file. Rules are pure and order-independent: a record collects every tag whose
 * pattern matches, and the importer records which rule fired for each tag.
 *
 * Precedence, highest first:
 *   1. Explicit curation (`scripts/import/overrides.ts`)
 *   2. Specialty-tab membership (the source already groups orgs by need)
 *   3. Section heading the row sat under
 *   4. Keyword rules over Type / Notes / Name / Animals-served
 */
import type { Animal, Borough, Need, OrgType, Status } from '../../src/types.ts';

/** Which text fields a rule is allowed to look at. */
export type Field = 'name' | 'type' | 'notes' | 'section' | 'animals_served' | 'areas';

export interface Rule<T> {
  tag: T;
  pattern: RegExp;
  /** Defaults to Type + Notes + Name. */
  fields?: Field[];
  /** Human-readable justification shown in the tagging report. */
  why?: string;
}

const TYPE_NOTES: Field[] = ['type', 'notes'];
const TYPE_ONLY: Field[] = ['type'];
const ALL: Field[] = ['name', 'type', 'notes', 'section', 'animals_served', 'areas'];

// ---------------------------------------------------------------------------
// Animals
// ---------------------------------------------------------------------------

/** Section headings in the exotic workbook map straight onto animal tags. */
export const SECTION_ANIMALS: Array<{ pattern: RegExp; tags: Animal[] }> = [
  { pattern: /^RABBITS/i, tags: ['rabbit'] },
  { pattern: /^SMALL MAMMALS/i, tags: ['small-mammal'] },
  { pattern: /^COMPANION BIRDS/i, tags: ['bird-companion'] },
  { pattern: /^FERAL \/ URBAN BIRDS/i, tags: ['pigeon', 'bird-wild'] },
  { pattern: /^REPTILES & AMPHIBIANS/i, tags: ['reptile', 'amphibian'] },
  { pattern: /^FISH & AQUATIC/i, tags: ['fish'] },
  { pattern: /^FARMED ANIMALS/i, tags: ['farm'] },
  { pattern: /^EQUINES/i, tags: ['equine'] },
  { pattern: /^WILDLIFE/i, tags: ['wildlife'] },
  { pattern: /^INVERTEBRATES/i, tags: ['invertebrate'] },
];

export const ANIMAL_RULES: Rule<Animal>[] = [
  { tag: 'cat', pattern: /\bcats?\b|\bfeline|\bkitten|\bTNR\b|\bferal\b|colony/i, fields: ALL },
  {
    // "Bulldog Rescue" and "Sheepdog Rescue" are dog rescues, but the word
    // boundary in \bdogs?\b does not see the "dog" inside them.
    tag: 'dog',
    pattern: /\bdogs?\b|\b(bull|sheep|lap|guard|sled|bird)dogs?\b|\bcanine|\bpupp(y|ies)|\bsato\b|bully breed|\bpit\b|\bhounds?\b|\bterriers?\b|\bretrievers?\b|\bshepherds?\b/i,
    fields: ALL,
  },
  { tag: 'rabbit', pattern: /\brabbits?\b|\bbunn(y|ies)\b|\blagomorph/i, fields: ALL },
  {
    tag: 'small-mammal',
    pattern: /\bguinea pigs?\b|\bhamsters?\b|\bgerbils?\b|\brats?\b|\bmice\b|\bmouse\b|\bchinchillas?\b|\bferrets?\b|pocket pets?|small mammals?|small.{0,3}animals?/i,
    fields: ALL,
  },
  {
    tag: 'bird-companion',
    pattern: /\bparrots?\b|\bbudgies?\b|\bcockatiels?\b|\bfinch(es)?\b|\bcockatoo|\bmacaw|\bconure|\bavian\b|companion bird|domestic bird|backyard poultry|\bchickens?\b/i,
    fields: ALL,
  },
  { tag: 'pigeon', pattern: /\bpigeons?\b|\bking pigeon|\bdoves?\b/i, fields: ALL },
  {
    tag: 'bird-wild',
    pattern: /\bwild birds?\b|\bsongbird|\braptors?\b|\bhawks?\b|\bowls?\b|\beagles?\b|\bfalcons?\b|birds? of prey|\bwaterfowl\b|\bgeese\b|\bducks?\b|\bgulls?\b|window.?strike|fledgling/i,
    fields: ALL,
  },
  {
    tag: 'reptile',
    pattern: /\breptiles?\b|\bturtles?\b|\btortoises?\b|\blizards?\b|\bsnakes?\b|\biguanas?\b|\bgeckos?\b|red-eared slider|\bterrapin/i,
    fields: ALL,
  },
  { tag: 'amphibian', pattern: /\bamphibians?\b|\bfrogs?\b|\btoads?\b|\bsalamander/i, fields: ALL },
  { tag: 'fish', pattern: /\bfish\b|\baquarium\b|\bgoldfish\b|\bbettas?\b|\baquatic\b/i, fields: ALL },
  {
    tag: 'farm',
    pattern: /\bfarm(ed)? animals?\b|\broosters?\b|\bpigs?\b|\bgoats?\b|\bsheep\b|\bcows?\b|\bturkeys?\b|\bpoultry\b|\bhens?\b|\blivestock\b/i,
    fields: ALL,
  },
  { tag: 'equine', pattern: /\bequines?\b|\bhorses?\b|\bponies\b|\bpony\b|\bdonkeys?\b|\bmules?\b/i, fields: ALL },
  {
    tag: 'wildlife',
    pattern: /\bwildlife\b|\brehabilitat|\bsquirrels?\b|\bopossums?\b|\braccoons?\b|\bskunks?\b|\bbats?\b|\bdeer\b|\bcottontail/i,
    fields: ALL,
  },
  { tag: 'marine', pattern: /\bmarine mammal|\bseals?\b|\bwhales?\b|\bdolphins?\b|sea turtle|\bstranding\b/i, fields: ALL },
  {
    tag: 'invertebrate',
    pattern: /\binvertebrates?\b|\btarantulas?\b|\bhermit crabs?\b|\binsects?\b|\bspiders?\b/i,
    fields: ALL,
  },
];

// ---------------------------------------------------------------------------
// Needs
// ---------------------------------------------------------------------------

export const NEED_RULES: Rule<Need>[] = [
  { tag: 'emergency-vet', pattern: /\b24\/7\b|\b24.?hours?\b|\b24hr\b|emergency (vet|hospital|care)|\bER\b|urgent care/i, fields: ALL },
  { tag: 'poison-control', pattern: /poison control|poison helpline|toxicolog/i, fields: ALL },
  { tag: 'wildlife-rehab', pattern: /rehabilitat|\brehabber/i, fields: ALL },
  { tag: 'adoption', pattern: /\badopt/i, fields: TYPE_NOTES },
  { tag: 'surrender', pattern: /\bsurrender|\brehom(e|ing)|\bintake\b|\bgive up\b|owner.?relinquish/i, fields: TYPE_NOTES },
  { tag: 'foster', pattern: /\bfoster/i, fields: TYPE_NOTES },
  { tag: 'tnr', pattern: /\bTNR\b|trap.?neuter.?return/i, fields: ALL },
  { tag: 'colony-care', pattern: /\bcolony\b|colony care|colony feeding|community cats?\b/i, fields: ALL },
  { tag: 'trap-bank', pattern: /trap bank|trap rental|trap loan|lend(s|ing)? traps?|borrow.{0,20}trap/i, fields: ALL },
  { tag: 'spay-neuter', pattern: /\bspay|\bneuter|\bs\/n\b/i, fields: ALL },
  { tag: 'low-cost-vet', pattern: /low.?cost|free (vet|clinic|spay)|discounted|sliding scale|affordable (vet|care)/i, fields: ALL },
  { tag: 'exotic-vet', pattern: /\bavian (&|and) exotic|exotic (vet|medicine|day.?practice)|treats? exotics?/i, fields: ALL },
  { tag: 'neonatal', pattern: /\bneonatal\b|bottle.?bab(y|ies)|bottle.?feed|unweaned|kitten nursery|one day old|tube.?feed/i, fields: ALL },
  {
    tag: 'medical-special-needs',
    pattern: /special.?needs|special.?care|critical.?medical|critical(ly)? (injured|ill)|medical (focus|cases|hard)|hard cases|disabled|three.?legged|3-legged|neurolog|\bblind\b|hospice|fospice|cruelty cases/i,
    fields: ALL,
  },
  { tag: 'senior', pattern: /\bseniors?\b|\bgeriatric\b|older (cats?|dogs?|pets?)/i, fields: ALL },
  { tag: 'retrovirus', pattern: /\bFeLV\b|\bFIV\b|retrovirus/i, fields: ALL },
  { tag: 'lost-found', pattern: /lost.{0,4}(&|and|\/).{0,4}found|lost (cat|dog|pet)|missing pet|\bfound pet/i, fields: ALL },
  { tag: 'microchip', pattern: /microchip/i, fields: ALL },
  { tag: 'behavior-training', pattern: /\bbehaviou?r|\btrainer\b|\btraining\b|\bobedience\b/i, fields: ALL },
  { tag: 'financial-aid', pattern: /financial aid|\bgrants?\b|\bvouchers?\b|certificate program|assistance fund|help (with|paying)|can'?t afford|copay/i, fields: ALL },
  { tag: 'food-assistance', pattern: /pet food|food pantry|food bank|\bpet.?food assistance/i, fields: ALL },
  {
    tag: 'owner-support',
    pattern: /surrender prevention|keep.{0,5}your pet|owner support|crisis (support|boarding)|temporary (care|boarding)|housing (support|help)|domestic violence|eviction/i,
    fields: ALL,
  },
  { tag: 'boarding', pattern: /\bboarding\b|pet.?sitting|\bsitters?\b|\bdaycare\b/i, fields: ALL },
  { tag: 'sanctuary', pattern: /\bsanctuary\b|lifelong care|lifetime (care|foster)|non-?releasable/i, fields: ALL },
  { tag: 'working-cat', pattern: /working cats?|barn cats?/i, fields: ALL },
  { tag: 'transport', pattern: /\btransport/i, fields: ALL },
  { tag: 'legal', pattern: /\blegal\b|law enforcement|\bcruelty\b|bite report|\blegality\b|\bpermit/i, fields: ALL },
  { tag: 'breed-specific', pattern: /breed.?specific|bully.?breeds?|\bpit\b|pit.?bull|small-?breed|\bsatos?\b|specific breed/i, fields: TYPE_NOTES },
  { tag: 'advocacy', pattern: /\badvocacy\b|\bat-risk\b|death row|pull(s|ing)? from ACC|New Hope partner/i, fields: ALL },
  { tag: 'education', pattern: /\beducation|\boutreach\b|\bworkshop|\bcertification\b|\btrain(s|ing)? (volunteers|caretakers)/i, fields: ALL },
  { tag: 'licensing', pattern: /(dog|pet) licens|licensing (program|requirement)/i, fields: ALL },
  { tag: 'pet-loss', pattern: /pet.?loss|bereavement|\bgrief\b|\beuthanas/i, fields: ALL },
  {
    tag: 'referral',
    pattern: /referral|\bdirectory\b|information hub|resource (hub|directory)|routing entry|participating.?org|advice hub|\bhub\b/i,
    fields: ALL,
  },
];

// ---------------------------------------------------------------------------
// Organization types
// ---------------------------------------------------------------------------

export const ORG_TYPE_RULES: Rule<OrgType>[] = [
  { tag: 'shelter-open-admission', pattern: /open-?admission/i, fields: TYPE_NOTES },
  { tag: 'shelter-no-kill', pattern: /no-?kill (shelter|rescue)|physical shelter|shelter \(walk-in\)|shelter \(by appt\)/i, fields: TYPE_NOTES },
  { tag: 'rescue-foster', pattern: /rescue|adoption|foster/i, fields: TYPE_ONLY },
  { tag: 'tnr-group', pattern: /\bTNR\b/i, fields: TYPE_ONLY },
  { tag: 'solo-rescuer', pattern: /solo rescuer|one-?person|solo\/hyper-local/i, fields: TYPE_NOTES },
  { tag: 'clinic', pattern: /\bclinic\b|veterinary (hospital|center|centre|group)|animal hospital/i, fields: ALL },
  { tag: 'emergency-vet', pattern: /\b24\/7\b|\b24.?hours?\b|emergency (&|and)? ?(referral|vet|hospital)|\bER\b|urgent care/i, fields: ALL },
  { tag: 'exotic-vet', pattern: /avian (&|and) exotic|exotic (vet|medicine)/i, fields: ALL },
  { tag: 'wildlife-rehabber', pattern: /wildlife rehab|licensed rehabilitator|rehabber/i, fields: ALL },
  { tag: 'sanctuary', pattern: /\bsanctuary\b/i, fields: TYPE_NOTES },
  { tag: 'referral-hub', pattern: /referral hub|information hub|routing entry|resource directory|participating-org/i, fields: TYPE_ONLY },
  { tag: 'advocacy', pattern: /\badvocacy\b/i, fields: TYPE_ONLY },
  { tag: 'hotline', pattern: /\bhotline\b|helpline/i, fields: ALL },
  { tag: 'government', pattern: /\bmunicipal\b|health dept|NYC Health|Parks|state licensing|DOHMH|\b311\b|city of new york/i, fields: ALL },
  { tag: 'club-society', pattern: /\bsociety\b|\bclub\b|membership/i, fields: TYPE_ONLY },
  { tag: 'directory', pattern: /\bdirectory\b|search tool|licensing directory/i, fields: TYPE_ONLY },
  { tag: 'support-program', pattern: /\(support\b|support org|certificate program|voucher|working.?cat placement|placement partner/i, fields: TYPE_ONLY },
  { tag: 'rescue-foster', pattern: /rehoming|placement (service|network)|\bnetwork\b/i, fields: TYPE_ONLY },
];

// ---------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------

// Borough and neighbourhood patterns live in src/data/geo.ts, shared with the
// chat assistant so both read the same place out of the same words.
export { BOROUGH_PATTERNS, NEIGHBORHOOD_BOROUGH } from '../../src/data/geo.ts';

/** NYC ZIP ranges. Deterministic, so ZIPs are the strongest borough signal. */
import { zipToBorough } from '../../src/data/geo.ts';
export { zipToBorough };

export function isNycZip(zip: string): boolean {
  return zipToBorough(zip) !== null;
}

// ---------------------------------------------------------------------------
// Operating status
// ---------------------------------------------------------------------------

/**
 * Ordered most severe first: the first match wins, so an explicit "RETIRED"
 * is never softened by a later "verify" match in the same string.
 */
export const STATUS_RULES: Array<{ tag: Status; pattern: RegExp; note: string }> = [
  { tag: 'retired', pattern: /\bRETIRED\b|do not rely|\bdefunct\b|no longer operat/i, note: 'Source marks this organization as retired.' },
  { tag: 'relocated', pattern: /\bRELOCATED\b|\bMOVED to\b|no longer NYC/i, note: 'Source says this organization has moved out of New York City.' },
  { tag: 'hiatus', pattern: /\bhiatus\b|\bsuspended\b|\bpaused\b|currently on hold|not (currently )?accepting/i, note: 'Source says this organization is paused or on hiatus.' },
  {
    tag: 'verify',
    pattern: /\[VERIFY|may be inactive|may be dated|confirm current activity|SCALING DOWN|scaling down|\(inactive\)|verify it'?s active/i,
    note: 'Source flags this entry as needing confirmation before you rely on it.',
  },
];

// --- where an organization is, when nothing says so directly ---------------

/**
 * The city's own area codes.
 *
 * A phone number is the most reliable thing a discovered organization gives us
 * about where it is. The roster we read it from -- the city shelter's New Hope
 * partners -- lists rescues approved to pull animals *out of* NYC shelters,
 * which is a different thing from resources a New Yorker can call. Most of
 * them are in Pennsylvania, Connecticut, New Jersey or upstate. Left untagged
 * they would compete with local groups in search results for no good reason.
 */
export const NYC_AREA_CODES = new Set(['212', '646', '332', '917', '718', '347', '929']);

/**
 * Nearby regions worth naming, so a card can say where a group actually is.
 * Anything not listed is simply "outside the New York City area" -- better a
 * vague true statement than a confident guess at a place.
 */
const AREA_CODE_REGIONS: Record<string, string> = {
  '914': 'Westchester', '845': 'the Hudson Valley',
  '516': 'Long Island', '631': 'Long Island',
  '201': 'New Jersey', '551': 'New Jersey', '862': 'New Jersey', '973': 'New Jersey',
  '908': 'New Jersey', '732': 'New Jersey', '848': 'New Jersey', '856': 'New Jersey', '609': 'New Jersey',
  '203': 'Connecticut', '475': 'Connecticut', '860': 'Connecticut', '959': 'Connecticut',
  '215': 'Pennsylvania', '267': 'Pennsylvania', '484': 'Pennsylvania', '570': 'Pennsylvania',
  '610': 'Pennsylvania', '717': 'Pennsylvania', '724': 'Pennsylvania', '814': 'Pennsylvania', '878': 'Pennsylvania',
  '315': 'upstate New York', '518': 'upstate New York', '585': 'upstate New York',
  '607': 'upstate New York', '716': 'upstate New York', '838': 'upstate New York',
};

/** Places in a name that put an organization outside the city. */
const REGIONAL_NAME =
  /\b(connecticut|\bCT\b|new jersey|\bNJ\b|pennsylvania|\bPA\b|long island|westchester|hudson valley|upstate|delaware|maryland|virginia|new england|mid[- ]atlantic|maine|vermont|massachusetts|rhode island|philadelphia|boston)\b/i;

/**
 * Abbreviations and bare adjectives, written the way a person would say them,
 * preposition included -- one is *on* Long Island but *in* Connecticut.
 */
function readablePlace(match: string): string {
  // Punctuation becomes a space, not nothing: "Mid-Atlantic" must key as
  // "mid atlantic" rather than "midatlantic", which matches nothing.
  const key = match.toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  const said: Record<string, string> = {
    nj: 'in New Jersey', ct: 'in Connecticut', pa: 'in Pennsylvania',
    'mid atlantic': 'in the Mid-Atlantic', 'mid-atlantic': 'in the Mid-Atlantic',
    'new england': 'in New England', 'long island': 'on Long Island',
    'hudson valley': 'in the Hudson Valley', upstate: 'in upstate New York',
  };
  if (said[key]) return said[key]!;
  return `in ${key.replace(/\b[a-z]/g, (c) => c.toUpperCase())}`;
}

export interface RegionGuess {
  outsideNyc: boolean;
  /** Plain-language note for the record, or null when it looks local. */
  note: string | null;
}

/**
 * Work out whether a discovered organization is in the city.
 *
 * Deliberately asymmetric. A New York City area code is treated as proof it is
 * local; everything else is only ever evidence that it is not. Getting this
 * wrong in the cautious direction labels a local group "outside NYC", which is
 * a visible, correctable annoyance. Getting it wrong the other way puts a
 * Connecticut poodle rescue in front of someone in Brooklyn looking for a cat.
 */
export function inferRegion(input: { name: string; phones: string[] }): RegionGuess {
  const areaCodes = input.phones
    .map((p) => p.replace(/\D/g, ''))
    .filter((d) => d.length === 10)
    .map((d) => d.slice(0, 3));

  if (areaCodes.some((a) => NYC_AREA_CODES.has(a))) return { outsideNyc: false, note: null };

  const region = areaCodes.map((a) => AREA_CODE_REGIONS[a]).find(Boolean);
  if (region) {
    return { outsideNyc: true, note: `Based in ${region}, from its phone number. Works with New York City shelters.` };
  }
  if (areaCodes.length > 0) {
    return { outsideNyc: true, note: 'Based outside the New York City area, from its phone number. Works with New York City shelters.' };
  }

  const named = REGIONAL_NAME.exec(input.name);
  if (named) {
    return {
      outsideNyc: true,
      note: `Its name places it ${readablePlace(named[1]!)}, outside New York City.`,
    };
  }
  return { outsideNyc: false, note: null };
}
