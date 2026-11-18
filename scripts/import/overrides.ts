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
  /**
   * A tag a word in the notes set wrongly, where changing the rule would
   * break other records: "behavior" in the at-risk list's notes put it among
   * trainers, beside animals about to be euthanised (owner, 2026-11-15).
   */
  removeNeeds?: Need[];
  set?: Partial<Pick<Org, 'parent_org' | 'citywide' | 'outside_nyc' | 'status' | 'status_note' | 'name' | 'aka' | 'boroughs' | 'animals'>>;
}

export const OVERRIDES: Override[] = [
  { id: 'nyc-311', reason: 'On the report-abuse guide\'s list of who to call: tagged so Find help\'s "Report cruelty or neglect" shows the same places (owner, 2026-11-17).', addNeeds: ['report-cruelty'] },
  { id: 'nyc-mayors-office-of-animal-welfare', reason: 'On the report-abuse guide\'s list of who to call: tagged so Find help\'s "Report cruelty or neglect" shows the same places (owner, 2026-11-17).', addNeeds: ['report-cruelty'] },
  { id: 'your-city-council-member', reason: 'On the report-abuse guide\'s list of who to call: tagged so Find help\'s "Report cruelty or neglect" shows the same places (owner, 2026-11-17).', addNeeds: ['report-cruelty'] },
  { id: 'nyc-council-animal-welfare-caucus', reason: 'On the report-abuse guide\'s list of who to call: tagged so Find help\'s "Report cruelty or neglect" shows the same places (owner, 2026-11-17).', addNeeds: ['report-cruelty'] },
  { id: 'nypd-crime-stoppers', reason: 'On the report-abuse guide\'s list of who to call: tagged so Find help\'s "Report cruelty or neglect" shows the same places (owner, 2026-11-17).', addNeeds: ['report-cruelty'] },
  { id: 'your-local-nypd-precinct', reason: 'On the report-abuse guide\'s list of who to call: tagged so Find help\'s "Report cruelty or neglect" shows the same places (owner, 2026-11-17).', addNeeds: ['report-cruelty'] },
  { id: 'hsus-dogfighting-tip-line', reason: 'On the report-abuse guide\'s list of who to call: tagged so Find help\'s "Report cruelty or neglect" shows the same places (owner, 2026-11-17).', addNeeds: ['report-cruelty'] },
  { id: 'new-york-state-department-of-agriculture-and-markets', reason: 'On the report-abuse guide\'s list of who to call: tagged so Find help\'s "Report cruelty or neglect" shows the same places (owner, 2026-11-17).', addNeeds: ['report-cruelty'] },
  { id: 'better-business-bureau', reason: 'On the report-abuse guide\'s list of who to call: tagged so Find help\'s "Report cruelty or neglect" shows the same places (owner, 2026-11-17).', addNeeds: ['report-cruelty'] },
  { id: 'fbi-tips', reason: 'On the report-abuse guide\'s list of who to call: tagged so Find help\'s "Report cruelty or neglect" shows the same places (owner, 2026-11-17).', addNeeds: ['report-cruelty'] },
  { id: 'fbi-internet-crime-complaint-center', reason: 'On the report-abuse guide\'s list of who to call: tagged so Find help\'s "Report cruelty or neglect" shows the same places (owner, 2026-11-17).', addNeeds: ['report-cruelty'] },
  { id: 'nyc-domestic-violence-hotline', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'national-domestic-violence-hotline', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'uri-pals', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'safe-horizon', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'volunteers-of-america-greater-new-york', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'safe-haven-program-map-foster', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'paws-ny', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'helping-pets-and-people-in-crisis', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'animal-haven', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'redrover-relief', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'safe-havens-for-pets', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'domesticsheltersorg', reason: 'On the leaving-abuse guide\'s list: tagged so Find help\'s "Leaving abuse with your pet" shows the same places (owner, 2026-11-17).', addNeeds: ['domestic-violence'] },
  { id: 'animal-medical-center', reason: 'Its ER takes critically ill birds (owner rang AMC, 2026-11-15), so it is in Find help\'s "Hurt or orphaned wildlife" for birds, as on the bird guide (owner, 2026-11-17).', addNeeds: ['wildlife-rehab'], addAnimals: ['bird-wild'] },
  // Who each one helps, read on its own site on 2026-11-18 (owner, 2026-11-17: a
  // group in both the cat and dog workbooks came out as one or the other).
  { id: 'feeding-pets-of-the-homeless', reason: 'Its own site, 2026-11-18: “pet food and emergency veterinary care to pets that belong to people experiencing homelessness”; it names no kind of pet, so every animal.', set: { animals: [] } },
  { id: 'strong-paws-rescue-community-pet-pantry', reason: 'Its pantry page, 2026-11-18: “We typically carry items such as dog & cat food”.', set: { animals: ['cat', 'dog'] } },
  { id: 'nyc-health-dept-low-cost-spay-neuter', reason: "The city's page, 2026-11-18: “low-cost spay or neuter surgery for dogs and cats”.", set: { animals: ['cat', 'dog'] } },
  { id: 'friends-of-animals-spay-neuter-certificates', reason: 'Its spay/neuter page, 2026-11-18: certificates for “cats and dogs”.', set: { animals: ['cat', 'dog'] } },
  { id: 'rescuenyc', reason: 'Its own site, 2026-11-18, shows only its Community Cat Program and cat adoption; no dogs. One group, once listed twice.', set: { animals: ['cat'], name: 'RescueNYC', aka: ['Rescue NYC', 'RescueNYC Community Cat Program'] } },
  { id: 'akc-reunite', reason: 'Its own site, 2026-11-18: enrols “your pet’s microchip” and names no kind of pet.', set: { animals: [] } },
  { id: 'animal-general', reason: 'Its own page, 2026-11-18: “Animals We See: Dogs, Cats”.', set: { animals: ['cat', 'dog'] } },
  { id: 'banfield-pet-hospital', reason: 'Its own site, 2026-11-18: cat vaccines and puppy care.', set: { animals: ['cat', 'dog'] } },
  { id: 'brown-dog-foundation', reason: 'Its own site, 2026-11-18: “saving the family pet”; it names no kind of pet.', set: { animals: [] } },
  { id: 'island-bird-cat-and-dog-vet-group', reason: 'Its name and own site, 2026-11-18: Island Bird Cat & Dog Veterinary Group.', set: { animals: ['bird-companion', 'cat', 'dog'] } },
  { id: 'paws-of-war', reason: 'Its own site, 2026-11-18: “Saving dogs and cats rescued by U.S. troops”, with dogs and cats for adoption.', set: { animals: ['cat', 'dog'] } },
  { id: 'queens-low-cost-vet', reason: 'Its own site, 2026-11-18: “Dog & Cat spay”.', set: { animals: ['cat', 'dog'] } },
  { id: 'scratchpay', reason: 'Its own site, 2026-11-18: payment plans for “pet care”; it names no kind of pet.', set: { animals: [] } },
  { id: 'st-mina-animal-clinic', reason: 'Its own site, 2026-11-18: “comprehensive care for dogs and cats”.', set: { animals: ['cat', 'dog'] } },
  { id: 'vip-petcare-clinics', reason: 'Its own site, 2026-11-18: preventive care for “dogs and cats”.', set: { animals: ['cat', 'dog'] } },
  { id: 'animal-lighthouse-rescue', reason: 'Its own site, 2026-11-18: “Our Dogs” and “Our Cats” for adoption.', set: { animals: ['cat', 'dog'] } },
  { id: 'aspca-behavior-guides', reason: "The ASPCA's pet care pages, 2026-11-18, are for every pet.", set: { animals: [] } },
  { id: 'free-housing-legal-help', reason: 'Housing Court Answers (2026-11-18) helps tenants; it is not about one kind of pet.', set: { animals: [] } },
  { id: 'nyc-animal-welfare', reason: "The Office of Animal Welfare's evictions page (2026-11-18) is about every pet.", set: { animals: [] } },
  // Read by the owner on 2026-11-18, where the sites refuse robots.
  { id: 'aaha-universal-lookup', reason: 'Read by the owner on its own page, 2026-11-18: the lookup is for cats and dogs.', set: { animals: ['cat', 'dog'] } },
  { id: 'animal-clinic-of-bay-ridge', reason: 'Read by the owner on its services page, 2026-11-18: "Types of Pets Seen: Dogs and Cats".', set: { animals: ['cat', 'dog'] } },
  { id: 'petco-vetco-vetco-vaccine-clinics', reason: 'Read by the owner on its clinics page, 2026-11-18: "low-cost mobile puppy, dog, kitten and cat vaccination clinic".', set: { animals: ['cat', 'dog'] } },
  { id: 'acc-admissions-owner-support', reason: "ACC's surrender page, 2026-11-18, takes every animal ACC takes, not only dogs.", set: { animals: ['dog', 'cat', 'rabbit', 'small-mammal', 'bird-companion', 'reptile'] } },
  { id: 'animal-care-centers-of-nyc-brooklyn', reason: "The city shelter's Brooklyn centre takes every animal ACC takes, not only cats.", set: { animals: ['dog', 'cat', 'rabbit', 'small-mammal', 'bird-companion', 'reptile'] } },
  {
    // Two research rows for the one Best Friends centre are merged (see
    // NAME_ALIASES); this is the name on its own page.
    id: 'best-friends-animal-society-nyc',
    reason: 'Best Friends\u2019 own New York page (read 2026-11-04) names one centre, its Pet Adoption Center at 307 West Broadway.',
    set: { name: 'Best Friends Pet Adoption Center - NYC', aka: ['Best Friends Animal Society - NYC', 'Best Friends SoHo', 'SoHo Lifesaving Center'] },
  },
  {
    // A reviewer: nobody outside rescue knows what "New Hope" is. Named for
    // what someone is trying to do; the old name stays searchable.
    id: 'acc-new-hope-program',
    reason: 'Renamed in the reader\u2019s words, to match the guide "Save an animal from the NYC shelter\u2019s urgent list" (2026-11-04).',
    set: { name: 'ACC at-risk list: save a shelter animal from euthanasia (New Hope program)', aka: ['ACC New Hope Program', 'New Hope', 'ACC at-risk list', 'ACC urgent list'] },
  },
  {
    // A reviewer found the ASPCA clinics muddled: the generic entry carried
    // the South Bronx address, the "Brooklyn" one described the South Bronx
    // and was marked paused, and Long Island City was barely there. One entry
    // per clinic now, each named for where it is.
    id: 'aspca-community-veterinary-clinic',
    reason: 'This entry carries the South Bronx clinic\u2019s address, 501 E 161st St. Its own ASPCA page (read 2026-11-04) says it serves cats and dogs and does spay/neuter, free for eligible owners; the research row covered only part of that.',
    set: { name: 'ASPCA Community Veterinary Clinic - South Bronx', aka: ['ASPCA Community Veterinary Clinics', 'ASPCA clinic Bronx'] },
    addAnimals: ['cat'],
    addNeeds: ['spay-neuter'],
  },
  {
    id: 'aspca-community-veterinary-clinic-brooklyn',
    reason: 'The East New York, Brooklyn clinic (Lewyt). Its own ASPCA page (read 2026-11-04) says it serves cats and dogs and does spay/neuter, free for eligible owners; the research row covered only part of that.',
    set: { name: 'ASPCA Community Veterinary Clinic - East New York (Brooklyn)', aka: ['ASPCA Community Veterinary Clinic (Lewyt)', 'ASPCA clinic Brooklyn'] },
  },
  {
    id: 'aspca-community-veterinary-clinic-queens',
    reason: 'The Long Island City, Queens clinic (Rachael Ray Foundation). Its own ASPCA page (read 2026-11-04) says it serves cats and dogs and does spay/neuter, free for eligible owners; the research row covered only part of that.',
    set: { name: 'ASPCA Community Veterinary Clinic - Long Island City (Queens)', aka: ['ASPCA Community Veterinary Clinic (Rachael Ray Foundation)', 'ASPCA clinic Queens'] },
    addAnimals: ['cat'],
    addNeeds: ['spay-neuter'],
  },
  {
    id: 'aspca-animal-hospital',
    reason: 'Low-cost urgent care in Manhattan by its own page; it sends emergencies to an emergency hospital, so it is not tagged as one.',
    set: { name: 'ASPCA Animal Hospital (Manhattan) - low-cost urgent care', aka: ['ASPCA Animal Hospital (AAH)', 'AAH'] },
    addNeeds: ['low-cost-vet'],
  },
  {
    // Split by branch so each has its own place, hours and number; the first
    // branch keeps the original id so existing links still land.
    id: 'one-love-animal-hospital',
    reason: 'One Love has three branches; this entry is the Boerum Hill one.',
    set: { name: 'One Love Animal Hospital - Boerum Hill', aka: ['One Love Animal Hospital'] },
  },
  {
    id: 'bronx-veterinary-center',
    reason: 'Bronx Veterinary Center has two branches; this entry is the Webster Ave one.',
    set: { name: 'Bronx Veterinary Center - Webster Avenue', aka: ['Bronx Veterinary Center'] },
  },
  {
    id: 'anjellicle-cats-rescue',
    reason: 'Its own site lists "sweet seniors" among the cats it is placing; the research row does not say so.',
    addNeeds: ['senior'],
  },
  {
    id: 'brooklyn-bridge-animal-welfare-coalition-brooklyn-cat-cafe',
    reason: 'Its own rescue page offers to help rehome an owned cat, through its foster network, when surrender is truly necessary.',
    addNeeds: ['surrender'],
  },
  {
    id: '24petwatch',
    reason: 'The registry now runs under PetPlace; one name for what the two workbooks wrote two ways.',
    set: { name: '24Petwatch microchip registry (PetPlace)', aka: ['24PetWatch', '24Petwatch', 'PetPlace microchip registry'] },
  },
  {
    id: 'homeagain',
    reason: 'A microchip registry for cats as well as dogs; it appears only in the dog workbook.',
    addAnimals: ['cat'],
  },
  {
    // A reviewer searched for the full name and found nothing: the research
    // only ever wrote the initials.
    id: 'narn-central-brooklyn',
    reason: 'NARN stands for Neighborhood Animal Rescue Network; the source never spells it out.',
    set: { aka: ['Neighborhood Animal Rescue Network', 'Neighborhood Animal Rescue Network - Central Brooklyn', 'NARN'] },
  },
  {
    // Found by discovery with a name and a link and nothing it does, so no
    // filter could ever show it.
    id: 'cypress-feline-rescue',
    reason: 'Its own site describes a cat adoption rescue (visits by appointment for approved applicants); the discovery record carried no animals or needs.',
    addAnimals: ['cat'],
    addNeeds: ['adoption'],
  },
  {
    // Two clinics of one name: without the borough in it, two identical
    // names sat side by side in the emergency vet list.
    id: 'urgent-vets-bronx',
    reason: 'Urgent Vets has a Bronx and a Queens clinic; the name says which is which.',
    set: { name: 'Urgent Vets (Bronx)', aka: ['Urgent Vets', 'Urgent Vets - Bronx'] },
  },
  {
    id: 'urgent-vets-11369',
    reason: 'Urgent Vets has a Bronx and a Queens clinic; the name says which is which.',
    set: { name: 'Urgent Vets (Queens)', aka: ['Urgent Vets'] },
  },
  {
    // The id keeps the old spelling so the page's address does not change;
    // the old name stays as an alias so a search for it still lands here.
    id: 'greater-state-veterinary-specialists',
    reason:
      "Both reference workbooks call Staten Island's 24-hour hospital \"Greater State Veterinary Specialists\". Its own site (gsvs.org/staten-island-ny, read 2026-11-03) and the Mayor's Alliance list call it Greater Staten Island Veterinary Services. It belongs to the GSVS group, whose other hospitals are Garden State Veterinary Specialists, which is probably where the mix-up came from.",
    set: {
      name: 'Greater Staten Island Veterinary Services',
      aka: ['GSiVS', 'Greater State Veterinary Specialists (GSiVS)'],
    },
  },
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
    reason: 'A programme of ACC rather than an independent organization. Not training: "behavior" in its notes describes the animals on the list (owner, 2026-11-15).',
    set: { parent_org: 'animal-care-centers-of-nyc' },
    removeNeeds: ['behavior-training'],
  },
  {
    id: 'aspca-animal-poison-control-center-24-7-hotline',
    reason: 'A poison hotline, not a clinic or a vet: "spay" in its source section heading listed it under low-cost spay and neuter, and it was in the "Avian and exotic vets" list (owner, 2026-11-17: the same topic must list the same, right places). It still answers for exotic pets as poison control.',
    removeNeeds: ['spay-neuter', 'exotic-vet'],
  },
  {
    id: 'pet-poison-helpline-24-7-hotline',
    reason: 'As the ASPCA poison line: a hotline, not a spay/neuter clinic or an exotic vet.',
    removeNeeds: ['spay-neuter', 'exotic-vet'],
  },
  {
    id: 'hsus-dogfighting-tip-line',
    reason: 'Every line in the abuse-reporting source is tagged with every animal, which is right for 311 or the police. This line takes reports of dogfighting and cockfighting only, so it listed under cats and rabbits for no reason (owner, 2026-11-17). Roosters are farm animals.',
    set: { animals: ['dog', 'farm'] },
  },
  {
    id: 'volunteers-for-wildlife-wildlife-center-of-long-island',
    reason: 'In Locust Valley, Nassau County. Its notes mention "eastern-Queens" situations, which tagged it as being in Queens and put it among in-city wildlife rehabbers (2026-11-15).',
    set: { boroughs: [], outside_nyc: true },
  },
  {
    id: 'house-of-pancakes-reptile-rescue',
    reason: 'A pet reptile rescue that refuses native species and "refers those to the DEC rehabber list": that phrase is why it was tagged a wildlife rehabber, and it is not one.',
    removeNeeds: ['wildlife-rehab'],
  },
  {
    id: 'humane-society-of-new-york',
    reason: 'A vet clinic and shelter for cats and dogs; nothing on its listing says it treats wildlife, and it showed among wildlife rehabbers (owner, 2026-11-15).',
    removeNeeds: ['wildlife-rehab'],
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
 * Bare fragments pulled out of guide prose that are really the parent
 * organization under a shorthand name.
 *
 * "ACC" on its own is not a programme of Animal Care Centers of NYC, it *is*
 * Animal Care Centers of NYC -- so its contacts are folded into that record
 * rather than published as a separate, unnameable entry.
 */
export const NAME_ALIASES: Array<{ pattern: RegExp; canonicalName: string }> = [
  { pattern: /^ACC$/i, canonicalName: 'Animal Care Centers of NYC (ACC)' },
  // One group each, listed twice because it was in both the cat and the dog
  // workbooks (owner found Pets of the Homeless twice, 2026-11-17; the rest
  // were found by looking for listings that share a website).
  { pattern: /^Feeding Pets of the Homeless$/i, canonicalName: 'Pets of the Homeless' },
  { pattern: /^NYC DOHMH low-cost s\/n index$/i, canonicalName: 'NYC Health Dept - Low-Cost Spay/Neuter (APCP)' },
  // "Rescue NYC" reduces to an empty merge key, so it is pointed at the
  // longer name rather than the other way round.
  { pattern: /^Rescue NYC$/i, canonicalName: 'RescueNYC (Community Cat Program)' },
  { pattern: /^Friends of Animals$/i, canonicalName: 'Friends of Animals - Spay/Neuter Certificates' },
  // A heading in the breed tab ("Herding breeds ... are covered by ECHO").
  { pattern: /^Herding breeds$/i, canonicalName: 'ECHO East Coast Herding Dog Organization' },
  // Rescuzilla and Bully Project NYC merged into The Good Life Dog Rescue
  // (its own site, read 2026-11-04). A reviewer found the old Bully Project
  // entry still pointing at an Adoptapet page with no way to reach anyone.
  { pattern: /^(the )?bully project( nyc)?$|^rescuzilla$/i, canonicalName: 'The Good Life Dog Rescue' },
  // One Best Friends centre in New York (307 W Broadway, SoHo), listed twice:
  // the cat research called it the "SoHo Lifesaving Center" and carried an
  // old number and email; its own page (read 2026-11-04) names one Pet
  // Adoption Center. A reviewer caught it.
  { pattern: /^Best Friends Animal Society - NYC( \(SoHo Lifesaving Center\))?$/i, canonicalName: 'Best Friends Pet Adoption Center - NYC' },
  { pattern: /^ASPCA$/i, canonicalName: 'ASPCA Spay/Neuter - NYC (Same-Day Waitlist + mobile + clinics)' },
  // The hospital and its assistance funds are one organization; the guide tabs
  // name it three different ways and the merge key strips "Center".
  { pattern: /^AMC\b/i, canonicalName: 'Animal Medical Center (AMC / Schwarzman)' },
  // One Bronx clinic, written two ways by the two workbooks. The Queens branch
  // shares the plain name, which stopped the usual prefix match, so the Bronx
  // clinic was listed twice among the emergency vets. The location check
  // still keeps the Queens branch apart.
  { pattern: /^Urgent Vets - Bronx$/i, canonicalName: 'Urgent Vets' },
  // One registry, written two ways by the two workbooks, so it was listed twice.
  { pattern: /^24Pet ?watch\b/i, canonicalName: '24Petwatch microchip registry (PetPlace)' },
  // The East New York clinic, named by its funder in one workbook and by its
  // neighbourhood in the other, was two listings.
  // Both workbooks describe the South Bronx clinic under the bare name, and
  // the merge had folded one of those rows into the Brooklyn entry -- which
  // is why "Brooklyn" described the South Bronx.
  { pattern: /^ASPCA Community Veterinary Clinic$/i, canonicalName: 'ASPCA Community Veterinary Clinics' },
  // One programme, listed twice (one entry carried only the helpdesk link, the
  // other Bideawee's page and phone), which also stopped the guides linking
  // it. Found 2026-11-06 when the reviewer asked for FCI to be linked.
  { pattern: /^NYC Feral Cat Initiative \(Bideawee\)$/i, canonicalName: 'NYC Feral Cat Initiative (FCI) - Bideawee' },
  { pattern: /^ASPCA Community Veterinary Clinic \(Lewyt\)$/i, canonicalName: 'ASPCA Community Veterinary Clinic - Brooklyn (East New York)' },
];

/**
 * Names that are a fragment of a sentence rather than an organization, and
 * that no general rule catches. Records matching these are dropped.
 */
export const DROP_NAMES: RegExp[] = [
  /^Food$/i, // from "Food Help NYC" split mid-phrase
  // Workbook headings, not organizations (2026-11-18). The groups they name
  // have their own listings: Live Like Roo, The Pet Fund, 24Petwatch, HomeAgain.
  /^Condition-specific \(cats\)$/i,
  /^Microchip registration$/i,
  // A routing note ("Invertebrates - routing: LHCOS / HCA / Sean Casey ...")
  // carrying Sean Casey's number under other groups' names.
  /^Invertebrates - routing\b/i,
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

/*
 * Removed from the site entirely: no listing, no page, no mention in any guide
 * or in the assistant's corpus. Different from DO_NOT_LIST in
 * src/data/listing.ts, which keeps a page so that someone arriving from an old
 * link reads why the group is not listed. A stale entry throws.
 */
export const REMOVED: Array<{ id: string; reason: string }> = [
  { id: 'meowsquad-nyc', reason: 'Removed at the reviewer\'s request, 2026-11-05 and again 2026-11-06.' },
];
