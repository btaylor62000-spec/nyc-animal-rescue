/**
 * Reads a question as Find help's three tick-boxes: a kind of help, the
 * animals it names, and a place.
 *
 * Owner, 2026-11-17: "each search for the same topic must yield the exact
 * same results regardless of how it was searched". Find help's search box
 * used to match words ("borrow a trap" found 92 places; the "Borrow a trap"
 * box has 4) and the assistant had its own reading. Both now ask this file,
 * then show exactly what Find help shows with those boxes ticked.
 * scripts/dev/consistency-audit.ts asks every kind of help, with every
 * animal and place, through every door and compares.
 *
 * No data imports: Find help runs this in the browser.
 */
import { placeIn } from './area.ts';

export interface Understood {
  /** The kind of help (a Find help need), or null when the words name none. */
  need: string | null;
  /** Animals the question names. "Pet" alone names none, which means every animal. */
  animals: string[];
  zip: string | null;
  boroughs: string[];
}

/*
 * Kinds of help, most specific first: the first that matches wins. Names of a
 * service ("poison control", "emergency vet", "borrow a trap") come before
 * situations ("my cat ate something", "a hurt bird"), so someone who asks for
 * a thing by name gets that thing.
 */
const NEED_RULES: Array<[string, RegExp]> = [
  // Asked for by name.
  ['poison-control', /\bpoison (control|hotline|helpline|line)\b|\bapcc\b/i],
  ['emergency-vet', /\b(emergency|e\.?r\.?|24[- ]?hour|urgent care) (vet|vets|animal hospital|hospital|clinic|room)\b|\bemergency vets?\b|\banimal hospital\b/i],
  ['exotic-vet', /\b(exotic|avian|bird|rabbit|reptile) vets?\b|\bexotics vet\b/i],
  ['wildlife-rehab', /\bwildlife (rehab\w*|rescue\w*|cent(er|re))\b|\brehabber\w*\b|\bwildlife rehabilitat\w*\b/i],
  ['trap-bank', /\b(borrow|rent|loan|lend|get|need)( \w+)? (a |some )?(humane )?traps?\b|\btrap ?banks?\b|\bhumane traps?\b/i],
  ['domestic-violence', /\b(domestic violence|abusive (home|partner|relationship|husband|wife|boyfriend|girlfriend)|leav\w* (an )?abus\w*|fleeing|my abuser|(husband|wife|partner|boyfriend|girlfriend) is abusive)\b/i],
  // Someone harming an animal is a report, whatever the animal ("a man
  // kicking pigeons" is not a wildlife rescue), and so is a business keeping
  // animals badly.
  ['report-cruelty', /\b(report\w*|tip line|complain\w*)\b.*\b(cruel\w*|abus\w*|neglect\w*|fighting|mistreat\w*|filthy|dirty|cages?)\b|\b(cruelty|animal abuse|animal neglect|dog ?fighting|cock ?fighting|kick(ing|ed|s)|beat(ing|s)? (his|her|their|a|the|my)|tortur\w*|starving (his|her|their|a|the)|abus(e|es|ed|ing) (his|her|their|a|an|the)|chained up|scam\w*|puppy mill)\b|\b(pet (store|shop)|breeder)\b.*\b(complain\w*|report\w*|filthy|dirty|sick|cages?)\b/i],
  ['retrovirus', /\b(fiv|felv)\b/i],
  ['neonatal', /\b(newborn|neonat\w*|bottle[- ]?(baby|babies|feed\w*)|nursing (kittens|mother)|pregnant (cat|stray)|kittens? (outside|in my yard|found|alone)|found (some |a litter of )?kittens?)\b/i],
  ['working-cat', /\b(working|barn) cats?\b/i],
  ['licensing', /\b(dog )?licen[cs]\w*\b/i],
  ['microchip', /\bmicro ?chip\w*\b|\bchip (scan|check)\w*\b|\bscan\w* (for )?(a )?chip\b/i],
  ['colony-care', /\b(cat )?colon(y|ies)\b|\bferal colon\w*\b|\bcolony care\b/i],
  ['tnr', /\btnr\b|\btrap[- ]neuter[- ]return\b|\bcommunity cats?\b|\bferal cats?\b|(?<!found an? )\bstray cats? (living|lives|under|in (my|our|the) (yard|garden|backyard|building)|outside|keeps|that keeps)\b/i],
  ['spay-neuter', /\bspay\w*\b|\bneuter\w*\b|\bfix(ed)? my (cat|dog)\b/i],
  ['financial-aid', /\b(help )?(pay|paying|afford\w*|can.?t afford|cover)\b.*\b(vet|bill|bills|surgery|treatment|care)\b|\bvet bills?\b|\b(grant|fund)s? for\b/i],
  ['food-assistance', /\b(pet |cat |dog )?food\b|\bkibble\b|\bpantr(y|ies)\b|\bfeed my\b/i],
  ['low-cost-vet', /\b(low[- ]?cost|cheap|affordable|free|discount\w*|sliding scale) (vet|vets|clinic|clinics|vet care|vaccin\w*|shots)\b|\blow[- ]?cost\b/i],
  ['medical-special-needs', /\bspecial (medical )?needs\b|\bmedical needs\b|\bdisabled\b|\b(three|3)[- ]legged\b|\bblind (cat|dog)\b/i],
  ['senior', /\b(senior|elderly|old|older|geriatric) (pet|cat|dog|animal)s?\b|\bsenior\b/i],
  ['breed-specific', /\bbreed[- ]?(specific )?rescues?\b|\b(pit ?bull|bully|husky|shepherd|chihuahua|rottweiler|doberman|poodle|beagle|pug|corso|mastiff|greyhound|boxer|golden retriever|lab) rescues?\b/i],
  ['behavior-training', /\b(train\w*|behavio\w*|bit(ing|es) people|aggress\w*|reactiv\w*|barking|litter box|scratch\w* (furniture|everything))\b/i],
  ['lost-found', /\b(lost|missing|ran away|run away|found a (stray )?(dog|cat|pet|rabbit|parrot|bird)|stray (dog|cat))\b/i],
  ['surrender', /\b(give up|giving up|surrender\w*|rehom\w*|can.?t keep|new home for|find (a|my) \w+ a (new )?home)\b/i],
  ['owner-support', /\b(help keep\w*|keep my (pet|cat|dog)|keeping (my|your) (pet|cat|dog)|help with my (pet|cat|dog))\b/i],
  ['foster', /\bfoster\w*\b/i],
  ['adoption', /\badopt\w*\b/i],
  ['boarding', /\b(board\w*|pet ?sit\w*|sitters?|kennel\w*|temporary care|somewhere (for|to keep) my)\b/i],
  ['sanctuary', /\bsanctuar(y|ies)\b/i],
  ['transport', /\b(transport\w*|pet taxi|ride to the vet|ambulance|get (my|the) (pet|cat|dog) to)\b/i],
  ['legal', /\b(legal|lawyer|attorney|court|landlord|lease|evict\w*|no pets? (rule|clause|policy))\b/i],
  ['education', /\b(humane )?educat\w*\b|\b(class|classes|workshop\w*)\b/i],
  ['advocacy', /\badvoca\w*\b|\bat[- ]risk list\b|\bnew hope\b|\bkill list\b|\bdeath row\b/i],
  ['pet-loss', /\b(pet loss|grief|griev\w*|bereave\w*|passed away|my (pet|cat|dog) died)\b/i],
  ['referral', /\breferral\w*\b|\bwho (do|should) i call\b|\bwhere do i start\b/i],
  // Situations, when no service is named.
  ['wildlife-rehab', /\b(wild (animal|bird)s?|wildlife|squirrel\w*|raccoon\w*|opossum\w*|possum\w*|skunk\w*|deer|fox(es)?|coyote\w*|bats?|seal\w*|sea turtle\w*|whale\w*|dolphin\w*|pigeon\w*|sparrow\w*|hawk\w*|owl\w*|robin\w*|fledgl\w*|baby birds?|nestling\w*|injured birds?|hurt birds?|birds? (hit|that hit|hit our|on the (ground|sidewalk|pavement)))\b/i],
  ['poison-control', /\b(poison\w*|toxic|swallow\w*|ingest\w*|ate (a |an |some |my |the )?\w+|eaten|lil(y|ies)|antifreeze|chocolate|xylitol|rat bait|rodenticide)\b/i],
  ['emergency-vet', /\b(emergency|hit by (a )?(car|bike|truck|bus)|bleed\w*|seizure\w*|collaps\w*|can.?t (breathe|walk|stand)|not breathing|broken (leg|bone)|hurt|injur\w*|very (sick|ill)|dying|attack\w*|bitten|vomit\w*)\b/i],
  ['exotic-vet', /\b(rabbit|bunny|parrot|cockatiel|budgie|guinea pig|hamster|ferret|turtle|tortoise|lizard|snake|bearded dragon)\b.*\b(sick|ill|not eating|hurt|vet)\b/i],
];

/*
 * Animals by the words that name them. "Pet" names none. A bird is a pet
 * bird when the question says so (a parrot, "my bird"), otherwise wild.
 */
const ANIMAL_RULES: Array<[string, RegExp]> = [
  ['cat', /\b(cats?|kitt(en|ens|y|ies)|feline\w*)\b/i],
  ['dog', /\b(dogs?|pupp(y|ies)|pups?|canine\w*)\b/i],
  ['rabbit', /\b(rabbits?|bunn(y|ies))\b/i],
  ['small-mammal', /\b(guinea pigs?|hamsters?|gerbils?|ferrets?|chinchillas?|pet rats?|mice|hedgehogs?)\b/i],
  ['bird-companion', /\b(parrots?|budgies?|cockatiels?|parakeets?|lovebirds?|canar(y|ies)|finch(es)?|pet birds?|my birds?)\b/i],
  ['bird-wild', /\b(wild birds?|sparrows?|hawks?|owls?|robins?|gulls?|herons?|songbirds?|fledgl\w*|nestlings?|baby birds?)\b/i],
  ['pigeon', /\b(pigeons?|doves?)\b/i],
  ['reptile', /\b(reptiles?|turtles?|tortoises?|sliders?|snakes?|lizards?|geckos?|iguanas?|bearded dragons?)\b/i],
  ['amphibian', /\b(frogs?|toads?|salamanders?|axolotls?|amphibians?)\b/i],
  ['fish', /\b(fish|goldfish|bettas?)\b/i],
  ['farm', /\b(chickens?|roosters?|hens?|goats?|(?<!guinea )pigs?|sheep|cows?|farm animals?)\b/i],
  ['equine', /\b(horses?|pon(y|ies)|donkeys?)\b/i],
  ['wildlife', /\b(squirrels?|raccoons?|opossums?|possums?|skunks?|deer|fox(es)?|coyotes?|bats?|wild animals?|wildlife)\b/i],
  ['marine', /\b(seals?|whales?|dolphins?|sea turtles?)\b/i],
  ['invertebrate', /\b(tarantulas?|spiders?|insects?|snails?|crabs?|invertebrates?)\b/i],
];

/** A bare "bird" with no other word: wild, unless the question says it is a pet. */
const BARE_BIRD = /\bbirds?\b/i;

export function understand(question: string): Understood {
  const q = question.replace(/[’']/g, "'");
  const need = NEED_RULES.find(([, re]) => re.test(q))?.[0] ?? null;
  // "Wildlife rehabber" names a service, not an animal: the reader's own
  // animal words decide (a rehabber for a pigeon is the pigeon list).
  const forAnimals = q.replace(/\bwildlife (rehab\w*|rehabilitat\w*|rescue\w*|cent(er|re)s?)\b/gi, '');
  const animals = ANIMAL_RULES.filter(([, re]) => re.test(forAnimals)).map(([a]) => a);
  if (BARE_BIRD.test(forAnimals) && !animals.some((a) => a === 'bird-companion' || a === 'bird-wild' || a === 'pigeon')) animals.push('bird-wild');
  // "Sea turtle" is marine, not a pet reptile.
  if (animals.includes('marine') && /sea turtles?/i.test(q)) animals.splice(animals.indexOf('reptile') >>> 0, animals.includes('reptile') ? 1 : 0);
  // Some kinds of help name their animal: kittens, a cat colony, dog training.
  const inherent: Record<string, string> = { neonatal: 'cat', 'colony-care': 'cat', retrovirus: 'cat', 'working-cat': 'cat', licensing: 'dog' };
  if (need && inherent[need] && !animals.includes(inherent[need]!)) animals.push(inherent[need]!);
  const place = placeIn(q);
  return { need, animals: [...new Set(animals)], zip: place.zip, boroughs: place.boroughs };
}
