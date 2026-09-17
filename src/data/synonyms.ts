/**
 * Search synonyms.
 *
 * The records are tagged with a controlled vocabulary -- `wildlife`,
 * `neonatal`, `emergency-vet` -- but nobody types that. They type "squirrel",
 * "newborn kittens", "hit by a car". These lists are folded into each record's
 * searchable text at build time so the words people actually use reach the
 * right records.
 *
 * This is retrieval, not display: nothing here is ever shown on a page. The
 * Phase 3 chat assistant retrieves against the same index, so a word added
 * here helps both the search box and the assistant.
 */
import type { Animal, Need, OrgType } from '../types.ts';

export const ANIMAL_SYNONYMS: Record<Animal, string> = {
  cat: 'cat cats kitten kittens kitty feline stray tomcat feral',
  dog: 'dog dogs puppy puppies canine pup pooch stray',
  rabbit: 'rabbit rabbits bunny bunnies hare lagomorph',
  'small-mammal': 'guinea pig hamster gerbil rat mouse mice chinchilla ferret hedgehog sugar glider pocket pet rodent',
  'bird-companion': 'parrot budgie budgerigar cockatiel cockatoo macaw conure finch canary lovebird parakeet pet bird chicken hen',
  'bird-wild': 'wild bird songbird sparrow starling robin hawk owl falcon raptor eagle gull goose duck swan heron woodpecker fledgling nestling window strike',
  pigeon: 'pigeon pigeons dove doves king pigeon rock dove squab',
  reptile: 'reptile turtle tortoise terrapin slider lizard snake iguana gecko bearded dragon python boa corn snake',
  amphibian: 'frog toad salamander newt axolotl amphibian tadpole',
  fish: 'fish goldfish betta koi aquarium tank tropical fish guppy',
  farm: 'chicken rooster hen duck goose turkey pig piglet goat sheep lamb cow calf farm animal livestock poultry',
  equine: 'horse pony donkey mule foal equine carriage horse',
  wildlife: 'wildlife wild animal squirrel raccoon opossum possum skunk bat chipmunk groundhog deer fox coyote rat wild baby orphaned nest',
  marine: 'seal whale dolphin sea turtle porpoise stranded marine mammal beach',
  invertebrate: 'tarantula spider hermit crab insect snail scorpion invertebrate bug',
};

export const NEED_SYNONYMS: Record<Need, string> = {
  'emergency-vet': 'emergency urgent 24 hour overnight er hospital dying bleeding injured hurt hit by car collapsed seizing not breathing critical after hours tonight',
  'poison-control': 'poison poisoned toxic ate something swallowed chocolate lily antifreeze rodenticide xylitol overdose toxin',
  'wildlife-rehab': 'rehabber rehabilitator wildlife rehab licensed injured wild orphaned baby wild animal',
  adoption: 'adopt adoption rehome available cats dogs looking for a home forever home',
  surrender: 'surrender give up rehome cannot keep can not keep giving away drop off relinquish intake',
  foster: 'foster fostering temporary home foster carer',
  tnr: 'tnr trap neuter return feral community cat colony ear tip street cat',
  'colony-care': 'colony feeding station caretaker community cats feral colony winter shelter',
  'trap-bank': 'borrow trap rent trap trap loan humane trap drop trap trap bank',
  'spay-neuter': 'spay neuter fix sterilise sterilize s/n desex snip',
  'low-cost-vet': 'cheap affordable low cost free vet clinic sliding scale cannot afford vet care',
  'exotic-vet': 'exotic vet avian vet rabbit savvy reptile vet bird vet small animal vet',
  neonatal: 'newborn bottle baby unweaned eyes closed days old neonate orphaned kitten nursery tube feeding',
  'medical-special-needs': 'special needs disabled blind deaf three legged wheelchair chronic illness medical critical injured neurological',
  senior: 'senior old elderly geriatric older cat older dog',
  retrovirus: 'felv fiv leukemia immunodeficiency retrovirus positive',
  'lost-found': 'lost missing found stray escaped runaway ran away searching',
  microchip: 'microchip chip scanner registry register chip id tag',
  'behavior-training': 'behaviour behavior training trainer aggression biting litter box spraying barking socialisation socialization',
  'financial-aid': 'financial aid grant fund help paying vet bill cannot afford money assistance copay',
  'food-assistance': 'pet food pantry food bank free food kibble supplies litter',
  'owner-support': 'keep my pet surrender prevention crisis housing eviction homeless hospital domestic violence temporary care deployment',
  boarding: 'boarding kennel pet sitter sitting daycare while away vacation',
  sanctuary: 'sanctuary lifelong permanent home unadoptable non releasable',
  'working-cat': 'working cat barn cat mouser warehouse placement unadoptable feral',
  transport: 'transport ride drive volunteer driver get there',
  legal: 'legal law cruelty abuse neglect report hoarding bite report landlord',
  'breed-specific': 'breed specific pit bull bully breed husky chihuahua german shepherd sato',
  education: 'education workshop class certification learn training course',
  advocacy: 'advocacy at risk death row pull rescue partner new hope',
  licensing: 'licence license permit registration legal to own',
  'pet-loss': 'pet loss grief bereavement euthanasia died death saying goodbye',
  referral: 'directory referral where do i start who can help list of rescues',
};

export const ORG_TYPE_SYNONYMS: Partial<Record<OrgType, string>> = {
  'shelter-open-admission': 'shelter city shelter municipal acc always takes',
  'shelter-no-kill': 'no kill shelter',
  'solo-rescuer': 'one person small volunteer independent rescuer',
  hotline: 'hotline helpline phone line call',
  government: 'city government 311 official municipal state',
};

/** Everything a record should be findable by, beyond its own text. */
export function keywordsFor(animals: Animal[], needs: Need[], orgTypes: OrgType[]): string {
  const parts = [
    ...animals.map((a) => ANIMAL_SYNONYMS[a]),
    ...needs.map((n) => NEED_SYNONYMS[n]),
    ...orgTypes.map((t) => ORG_TYPE_SYNONYMS[t] ?? ''),
  ].filter(Boolean);
  // De-duplicate: the same word arriving from three tags should be indexed once.
  return [...new Set(parts.join(' ').split(/\s+/))].join(' ');
}
