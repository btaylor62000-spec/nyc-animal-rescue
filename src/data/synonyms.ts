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
  dog: 'dog dogs puppy puppies canine pup pooch stray pitbull pitbulls pit bull bully mutt',
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
  wildlife: 'wildlife wild animal squirrel raccoon opossum possum skunk bat chipmunk groundhog deer fox coyote rat wild baby orphaned nest cottontail cottontails',
  marine: 'seal whale dolphin sea turtle porpoise stranded marine mammal beach',
  invertebrate: 'tarantula spider hermit crab insect snail scorpion invertebrate bug',
};

export const NEED_SYNONYMS: Record<Need, string> = {
  // "hospital" is deliberately absent: it appears far more often in "I am
  // going into hospital, who will feed my cat" than in an animal emergency,
  // and the emergency rooms are found by name anyway.
  'emergency-vet': 'emergency urgent overnight 24hour dying bleeding injured hurt hit by car run over collapsed seizing not breathing critical afterhours tonight',
  'poison-control': 'poison poisoned toxic ate something swallowed chocolate lily antifreeze rodenticide xylitol overdose toxin',
  'wildlife-rehab': 'rehabber rehabilitator wildlife rehab licensed injured wild orphaned baby wild animal',
  adoption: 'adopt adoption rehome available cats dogs looking for a home forever home',
  surrender: 'surrender give up rehome cannot keep can not keep giving away drop off relinquish intake',
  foster: 'foster fostering temporary home foster carer',
  tnr: 'tnr trap neuter return feral colony eartip eartipped eartipping streetcat',
  'colony-care': 'colony colonies feeding station caretaker feral winter shelters strawshelter',
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
  'food-assistance': 'pet food pantry food bank free food kibble supplies litter feed feeding hungry starving afford to feed',
  'owner-support': 'keep my pet surrender prevention crisis housing eviction homeless hospital hospitalised hospitalized domestic violence abuse abusive partner fleeing escape safe temporary care deployment rehab treatment',
  boarding: 'boarding kennel pet sitter sitting daycare while away vacation',
  sanctuary: 'sanctuary lifelong permanent home unadoptable non releasable',
  'working-cat': 'working cat barn cat mouser warehouse placement unadoptable feral',
  transport: 'transport ride drive volunteer driver get there',
  legal: 'legal law cruelty abuse neglect report hoarding bite report landlord',
  'breed-specific': 'breed specific pit bull bully breed husky chihuahua german shepherd sato',
  education: 'education workshop class certification learn training course',
  advocacy: 'advocacy at risk death row pull rescue partner new hope urgent list kill list put down put to sleep euthanasia list save before',
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

/**
 * A Spanish layer over the same tags.
 *
 * New York City has more than two million Spanish speakers, and the model can
 * answer in Spanish -- but only if retrieval finds the right records first,
 * and retrieval works on words. Without this, "encontré un pájaro herido"
 * matches nothing and the assistant answers a bird question with cat rescues.
 *
 * Deliberately small: the words someone would actually type in an emergency,
 * not a dictionary.
 */
export const SPANISH_ANIMALS: Partial<Record<Animal, string>> = {
  cat: 'gato gata gatos gatas gatito gatitos michi felino callejero',
  dog: 'perro perra perros perras perrito perritos cachorro cachorros canino',
  rabbit: 'conejo conejos coneja conejito',
  'small-mammal': 'cobayo cuy hamster raton ratones huron chinchilla erizo',
  'bird-companion': 'pajaro pajaros ave aves loro loros perico periquito cotorra canario gallina pollo',
  'bird-wild': 'pajaro silvestre gorrion halcon lechuza buho gaviota pato ganso aguila',
  pigeon: 'paloma palomas',
  reptile: 'tortuga tortugas lagarto lagartija serpiente culebra iguana reptil',
  fish: 'pez peces pecera acuario',
  farm: 'gallina gallo pato cerdo cabra oveja vaca granja',
  equine: 'caballo caballos yegua burro',
  wildlife: 'fauna silvestre salvaje ardilla mapache zarigueya zorrillo murcielago venado animal salvaje',
  marine: 'foca ballena delfin tortuga marina',
  invertebrate: 'tarantula arana cangrejo insecto',
};

export const SPANISH_NEEDS: Partial<Record<Need, string>> = {
  'emergency-vet': 'emergencia urgente urgencia herido herida lastimado sangrando sangre atropellado moribundo muriendo grave convulsiones no respira ahora mismo esta noche',
  'poison-control': 'veneno envenenado intoxicado toxico comio chocolate',
  'wildlife-rehab': 'rehabilitador rehabilitadora silvestre licencia licenciado',
  adoption: 'adoptar adopcion adopciones',
  surrender: 'entregar regalar no puedo quedarme deshacerme rehogar reubicar',
  foster: 'acoger acogida hogar temporal',
  tnr: 'esterilizar captura castracion retorno callejeros colonia',
  'spay-neuter': 'esterilizar esterilizacion castrar castracion',
  'low-cost-vet': 'barato economico bajo costo gratis veterinario asequible',
  'exotic-vet': 'veterinario exotico veterinaria aves exoticos',
  'lost-found': 'perdido perdida encontre encontrado extraviado se escapo busco',
  microchip: 'microchip chip',
  'financial-aid': 'ayuda economica dinero no tengo dinero no puedo pagar fondos',
  'food-assistance': 'comida alimento despensa banco de comida',
  'owner-support': 'ayuda no puedo cuidar hospital desalojo violencia domestica refugio',
  neonatal: 'recien nacido bebe biberon ojos cerrados dias de nacido',
  sanctuary: 'santuario',
  boarding: 'guarderia cuidador pension',
};

/** Everything a record should be findable by, beyond its own text. */
export function keywordsFor(animals: Animal[], needs: Need[], orgTypes: OrgType[]): string {
  const parts = [
    ...animals.map((a) => ANIMAL_SYNONYMS[a]),
    ...animals.map((a) => SPANISH_ANIMALS[a] ?? ''),
    ...needs.map((n) => NEED_SYNONYMS[n]),
    ...needs.map((n) => SPANISH_NEEDS[n] ?? ''),
    ...orgTypes.map((t) => ORG_TYPE_SYNONYMS[t] ?? ''),
  ].filter(Boolean);
  // De-duplicate: the same word arriving from three tags should be indexed once.
  return [...new Set(parts.join(' ').split(/\s+/))].join(' ');
}
