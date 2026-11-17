/**
 * What people say, for every kind of help, animal and place: the questions
 * scripts/dev/consistency-audit.ts and tests/one-answer.test.ts ask through
 * every door of the site.
 */
export type Area = { boroughs?: string[]; zip?: string };

// --- what people say -------------------------------------------------------
export const NEED_WORDS: Record<string, { phrase: string; animal?: string }> = {
  'emergency-vet': { phrase: 'emergency vet' },
  'poison-control': { phrase: 'poison control' },
  'wildlife-rehab': { phrase: 'wildlife rehabber' },
  adoption: { phrase: 'adopt a pet' },
  surrender: { phrase: 'I have to give up my pet' },
  foster: { phrase: 'foster a pet' },
  tnr: { phrase: 'TNR help' },
  'colony-care': { phrase: 'help with a cat colony', animal: 'cat' },
  'trap-bank': { phrase: 'borrow a trap' },
  'spay-neuter': { phrase: 'spay or neuter' },
  'low-cost-vet': { phrase: 'low cost vet' },
  'exotic-vet': { phrase: 'exotic vet' },
  neonatal: { phrase: 'newborn kittens', animal: 'cat' },
  'medical-special-needs': { phrase: 'rescue for a pet with special medical needs' },
  senior: { phrase: 'senior pet rescue' },
  retrovirus: { phrase: 'FIV positive cat rescue', animal: 'cat' },
  'lost-found': { phrase: 'lost pet' },
  microchip: { phrase: 'microchip scan' },
  'behavior-training': { phrase: 'dog training help', animal: 'dog' },
  'financial-aid': { phrase: 'help paying vet bills' },
  'food-assistance': { phrase: 'free pet food' },
  'owner-support': { phrase: 'help keeping my pet' },
  boarding: { phrase: 'pet boarding' },
  sanctuary: { phrase: 'animal sanctuary' },
  'working-cat': { phrase: 'working cat program', animal: 'cat' },
  transport: { phrase: 'pet transport' },
  legal: { phrase: 'legal help for my pet' },
  'breed-specific': { phrase: 'breed rescue' },
  education: { phrase: 'humane education' },
  advocacy: { phrase: 'animal advocacy' },
  licensing: { phrase: 'dog license', animal: 'dog' },
  'pet-loss': { phrase: 'pet loss support' },
  referral: { phrase: 'referral hotline' },
};
export const ANIMAL_WORDS: Record<string, string> = {
  cat: 'cat', dog: 'dog', rabbit: 'rabbit', 'small-mammal': 'guinea pig', 'bird-companion': 'parrot',
  'bird-wild': 'wild bird', pigeon: 'pigeon', reptile: 'turtle', amphibian: 'frog', fish: 'fish',
  farm: 'chicken', equine: 'horse', wildlife: 'squirrel', marine: 'seal', invertebrate: 'tarantula',
};
export const PLACES: Array<{ words: string; area: Area }> = [
  { words: '', area: {} },
  { words: 'in Manhattan', area: { boroughs: ['manhattan'] } },
  { words: 'in Brooklyn', area: { boroughs: ['brooklyn'] } },
  { words: 'in Queens', area: { boroughs: ['queens'] } },
  { words: 'in the Bronx', area: { boroughs: ['bronx'] } },
  { words: 'in Staten Island', area: { boroughs: ['staten-island'] } },
  { words: 'in 10026', area: { zip: '10026' } },
  { words: 'in 11215', area: { zip: '11215' } },
  { words: 'in 11375', area: { zip: '11375' } },
  { words: 'in 10458', area: { zip: '10458' } },
  { words: 'in 10314', area: { zip: '10314' } },
  { words: 'in Harlem', area: { boroughs: ['manhattan'] } },
  { words: 'in Bushwick', area: { boroughs: ['brooklyn'] } },
  { words: 'in Astoria', area: { boroughs: ['queens'] } },
  { words: 'in Fordham', area: { boroughs: ['bronx'] } },
  { words: 'in New Dorp', area: { boroughs: ['staten-island'] } },
];

