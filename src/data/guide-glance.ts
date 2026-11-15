/**
 * The "at a glance" card at the top of every guide.
 *
 * Why it exists (owner, 2026-11-15): the guides were thorough and long, up to
 * 2,800 words, and most people in a hurry would not read them. Every guide now
 * opens with what to do and who to call, written so a 12-year-old could follow
 * it, and the full guide sits one tap below, unchanged.
 *
 * Four rules keep this from becoming a second, drifting copy of the guides.
 * Each one is tested in tests/guide-glance.test.ts.
 *
 * 1. **Contacts come from the records.** A contact names a record id; the page
 *    takes its phone, email and website from the record at build time, so the
 *    card can never show a number the directory does not (rule 1 in CLAUDE.md).
 *    The only number written here is 911, which has no record.
 * 2. **No phone number, and no price, in the prose.** Any web or email address
 *    the prose uses must already be in the guide.
 * 3. **`never` and `remember` are copied word for word** from the guide body
 *    (rule 4). They are the safety lines people act on under stress, so the
 *    test fails if one is reworded.
 * 4. **A situation's `section` must be a heading in the guide**, so "Read why"
 *    always lands somewhere.
 *
 * The rest is plain writing: short sentences, everyday words, one idea each.
 *
 * Which shape a guide takes was decided by the owner on 2026-11-15 from three
 * prototypes. Every guide gets the quick card (headline, contacts, a few steps,
 * the never box). The three guides whose answer depends on what happened
 * (an injured bird, wildlife, paying for care) also get `situations`: tiles
 * that show only the advice for the reader's case. Lost-and-found guides use
 * `sides`, because "I lost one" and "I found one" are different jobs.
 */

/** The urgency colour of a situation's label. Red ("now") means right now and nothing else. */
export type Tone = 'now' | 'today' | 'week' | 'ok';

export interface GlanceContact {
  /** A record id in data/orgs. Its phone, email and website are shown from the record. */
  org?: string;
  /** For 911 only, which has no record. */
  dial?: '911';
  /** Shorter than the record's name, when the record's name is a mouthful. */
  name?: string;
  /** When to use it, in a few words: "Every day, 9am to 7pm". */
  when: string;
  note?: string;
  /** Which of the record's phones to show first, when it is not the first. */
  phone?: number;
}

export interface GlanceLink {
  label: string;
  /** A page on this site, or an address that already appears in the guide. */
  href: string;
}

export interface GlanceStep {
  title: string;
  text: string;
  /** A side note for the exception: "Big bird? Don't try to catch it." */
  warn?: string;
  link?: GlanceLink;
}

export interface GlanceSide {
  label: string;
  headline: string;
  steps: GlanceStep[];
  never?: string[];
  tip?: string;
  contacts: GlanceContact[];
}

export interface GlanceSituation {
  label: string;
  /** The short answer, on a coloured label: "Probably fine. Watch first." */
  verdict: string;
  tone: Tone;
  do: string[];
  never?: string[];
  remember?: string[];
  contacts?: GlanceContact[];
  /** A heading in the guide, for "Read why". */
  section?: string;
  /** A tile that sends the reader to another guide instead of answering here. */
  href?: string;
}

export interface Glance {
  /** The one thing to know, in one or two short sentences. */
  headline: string;
  /** A big button for the one action that matters most, on this site. */
  action?: GlanceLink;
  facts?: string[];
  /** The first is the "call first" contact; the rest are shown smaller. */
  contacts: GlanceContact[];
  check?: { title: string; yesTitle: string; yes: string[]; noTitle: string; no: string[] };
  steps?: GlanceStep[];
  sides?: [GlanceSide, GlanceSide];
  /** Copied word for word from the guide. */
  never?: string[];
  /** Copied word for word from the guide. */
  remember?: string[];
  tip?: string;
  situations?: GlanceSituation[];
}

const ACC = 'animal-care-centers-of-nyc';
const AMC = 'animal-medical-center';
const WBF = 'the-wild-bird-fund';
const AHN = 'animal-help-now-wildlife-emergency-finder';
const POISON = 'aspca-animal-poison-control-center-24-7-hotline';
const CITY = 'nyc-311';

export const GLANCE: Record<string, Glance> = {

  'animal-trapped': {
    headline: 'If a trapped animal is in danger right now, call 911. If it is not, call 311.',
    contacts: [
      { dial: '911', when: 'Trapped and in danger right now' },
      { org: CITY, when: 'Not in danger right now · strays: 10am to 6pm' },
      { org: 'nys-dec-region-2', name: 'DEC (state wildlife office)', when: 'How to find a licensed wildlife control company' },
    ],
    steps: [
      { title: 'In danger right now? Call 911', text: 'Stuck in a drain, under a train, in a car engine or on a ledge. Say exactly where it is and what animal it is.' },
      { title: 'Don’t go in after it', text: 'Stay off subway tracks and out of drains, and don’t climb onto a ledge. Wait for help.' },
      { title: 'Not in danger right now? Call 311', text: 'For a stray dog or cat, ACC takes reports 10am to 6pm. In a park, 311 sends it to NYC Parks.' },
      { title: 'A wild animal living in your walls or chimney?', text: 'Hire a licensed wildlife control company. First take away any food that draws it in.' },
    ],
    never: ['Do not go onto subway tracks, into a drain or onto a ledge yourself: call 911.'],
    tip: 'No city page covers trapped animals. In rescues reported in the news, the NYPD’s Emergency Service Unit came after a call to the police.',
  },

  'found-kittens-outside': {
    headline: 'Kittens do best with their mother. Unless they are hurt, wait and watch for her first.',
    contacts: [
      { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Orphaned kittens · call before you go' },
      { org: CITY, when: 'Report orphaned kittens' },
    ],
    steps: [
      { title: 'Hurt or very sick?', text: 'It needs help now. Go to an emergency vet, or call 311 to reach ACC.', link: { label: 'Animal emergencies', href: '/guides/animal-emergency' } },
      { title: 'Healthy? Wait and watch', text: 'Watch from far away for a few hours, in case the mother comes back. Don’t take them home while you wait.' },
      { title: 'Mother not back?', text: 'Call 311 or ACC. You can also bring orphaned kittens to an ACC centre, but call first.' },
      { title: 'Stop more litters', text: 'The mother cat can be trapped, spayed and returned, often for free.', link: { label: 'Starting TNR', href: '/guides/starting-tnr' } },
    ],
    never: ['Do not separate stray or feral kittens from their mother.'],
    tip: 'Tiny kittens that still need a bottle need care around the clock. Kitten nurseries are in Cats needing specialist help.',
  },

  'when-a-pet-dies': {
    headline: 'Losing a pet is hard. Take the time you need. Here is what the city allows when you are ready.',
    contacts: [
      { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Cremation, for a fee · call for details' },
      { org: 'ambuvet-pet-ambulance', name: 'AmbuVet', when: 'Can carry a pet that has died' },
      { org: 'lap-of-love', name: 'Lap of Love', when: 'In-home hospice and end-of-life care' },
      { org: CITY, when: 'Questions, or a dead animal on the street' },
    ],
    steps: [
      { title: 'Did it bite or scratch someone?', text: 'Call 311 first. If it may have had rabies, call 911. Don’t put it in the trash.' },
      { title: 'Cremation', text: 'ACC cremates pets for a fee at its centres. Call ACC to ask how.' },
      { title: 'Burial', text: 'You can bury a pet only on private property you own.' },
      { title: 'Sanitation pickup', text: 'Use a heavy-duty black bag or two bags. Tape on a note saying what is inside, and put it in a bin with your regular trash.' },
    ],
    never: ['Do not put dead animals that may have been rabid in the trash.'],
    tip: 'Several dead birds, fish or other wild animals in one place? Call 311. Use gloves or a plastic bag, and wash your hands after.',
  },

  'animal-left-alone': {
    headline: 'If a pet has been left behind because its owner died, is in hospital or jail, or moved out, call 311.',
    contacts: [
      { dial: '911', when: 'An animal is in danger right now' },
      { org: CITY, when: 'Report an abandoned pet, or neglect' },
      { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Takes these reports by phone in business hours' },
    ],
    steps: [
      { title: 'In danger right now? Call 911', text: 'For example, no food or water, or it sounds hurt.' },
      { title: 'Otherwise, call 311', text: 'Say a pet has been left behind. Give the address, what the animal looks like, and how long it has been alone.' },
      { title: 'Evicted, and your animal is inside?', text: 'Look for a notice on the door saying which shelter it went to. If it is still inside, ask the landlord or building staff, then your police precinct.' },
      { title: 'Facing eviction?', text: 'Plan now: find someone who could look after your pet. Call 311 and ask for the Tenant Helpline.' },
    ],
    remember: ['If it is happening right now, or an animal or a person is in danger: call 911.'],
    tip: 'Going into hospital yourself? PAWS NY can help care for your pet while you are away.',
  },
  'animal-emergency': {
    headline: 'Dog, cat, rabbit, bird or any other pet: if it is hurt, very ill or poisoned, go to a 24-hour animal hospital now.',
    action: { label: 'Find the nearest hospital open now', href: '/directory?need=emergency-vet' },
    contacts: [
      { org: POISON, name: 'ASPCA Animal Poison Control', when: 'Swallowed or touched something toxic · 24/7' },
      { org: 'pet-poison-helpline-24-7-hotline', name: 'Pet Poison Helpline', when: 'Backup poison line · 24/7' },
      { org: AMC, name: 'Animal Medical Center', when: 'Open 24 hours · Manhattan' },
      { org: 'ambuvet-pet-ambulance', name: 'AmbuVet pet ambulance', when: 'Can’t get there yourself · 24 hours' },
    ],
    steps: [
      { title: 'Find the nearest hospital open now', text: 'Hit by a car, bleeding, can’t breathe, a seizure, collapsed, or anything that scares you: go now. Not sure? Call a 24-hour hospital and ask.', link: { label: 'Hospitals open now, nearest first', href: '/directory?need=emergency-vet' } },
      { title: 'Call on the way', text: 'Hours change, even at 24-hour hospitals. Say what kind of animal it is: not every hospital treats rabbits, birds or reptiles.', link: { label: 'Rabbit, bird or reptile? Vets who treat them', href: '/guides/exotic-pet-emergency' } },
      { title: 'Poisoned? Call poison control first', text: 'They work out the treatment and pass it to the hospital, which saves time.' },
      { title: 'Worried about paying? Go anyway', text: 'Ask about payment plans when you arrive.', link: { label: 'Help paying for vet care', href: '/guides/help-paying-for-care' } },
    ],
    never: ['Do not make the animal vomit unless a toxicologist tells you to.'],
    remember: ['Lilies are deadly to cats even in tiny amounts (a lick of pollen).'],
    tip: 'In the Bronx, no animal hospital is confirmed open 24 hours. The full guide lists the nearest ones that are.',
    situations: [
      {
        label: 'It ate or touched something poisonous', tone: 'now', verdict: 'Call poison control first',
        do: ['Call ASPCA Animal Poison Control or the Pet Poison Helpline. Both are open 24/7.', 'They work out the treatment and tell the hospital, which saves time.'],
        never: ['Do not make the animal vomit unless a toxicologist tells you to.'],
        contacts: [{ org: POISON, name: 'ASPCA Animal Poison Control', when: '24/7' }, { org: 'pet-poison-helpline-24-7-hotline', name: 'Pet Poison Helpline', when: '24/7' }],
        section: 'IF IT SWALLOWED OR TOUCHED SOMETHING TOXIC: RING POISON CONTROL FIRST',
      },
      {
        label: 'Another dog attacked my dog', tone: 'now', verdict: 'Go to a vet now',
        do: ['Take your dog to a 24-hour animal hospital now, even if you can’t see a wound.', 'Get the other owner’s name, address and phone number.', 'Was a person bitten too? Wash the bite, see a doctor, and report it to the Health Department through 311.', 'If the dog is still a danger to people, call 911.'],
        contacts: [{ dial: '911', when: 'The dog is still a danger to people' }, { org: CITY, when: 'Report a bite to a person' }],
      },
      {
        label: 'I can’t get it there myself', tone: 'now', verdict: 'Call a pet ambulance',
        do: ['AmbuVet runs a 24-hour pet ambulance.', 'Call the hospital you are going to before the pickup.'],
        contacts: [{ org: 'ambuvet-pet-ambulance', name: 'AmbuVet', when: '24 hours' }],
        section: 'FIND THE NEAREST HOSPITAL OPEN NOW',
      },
      {
        label: 'I’m in the Bronx', tone: 'today', verdict: 'No Bronx hospital is open all night',
        do: ['Urgent Vets in the Bronx is open every day, 10am to 10pm.', 'At other times, go to Urgent Vets in Queens, Animal Specialty Center in Yonkers, or a hospital in Manhattan.'],
        contacts: [{ org: 'urgent-vets-bronx', name: 'Urgent Vets (Bronx)', when: 'Every day, 10am to 10pm' }, { org: 'urgent-vets-11369', name: 'Urgent Vets (Queens)', when: 'Open 24 hours' }],
        section: 'IN THE BRONX',
      },
      {
        label: 'I’m worried about paying', tone: 'week', verdict: 'Go anyway',
        do: ['Ask about payment plans when you arrive.', 'At the Animal Medical Center, ask about its funds straight away. You must apply within 5 business days.'],
        section: 'IF YOU ARE WORRIED ABOUT PAYING',
      },
      { label: 'It’s a rabbit, bird, reptile or small pet', tone: 'today', verdict: 'Most vets can’t treat these', do: ['Find a vet who treats your kind of animal.'], href: '/guides/exotic-pet-emergency' },
      { label: 'It’s trapped and can’t get out', tone: 'now', verdict: 'Call 911 if it is in danger', do: ['See what to do for a trapped animal.'], href: '/guides/animal-trapped' },
    ],
  },

  // The Animal Medical Center's 24-hour ER takes critically ill birds: the
  // owner rang AMC and confirmed it on 2026-11-15. NYC Bird Alliance's list
  // names AMC for raptors and waterfowl, which is why the big-bird tile still
  // says to mention NYC Bird Alliance. From NYC Bird Alliance's own pages:
  // take the towel out of the bag, and a nestling goes back in its nest first.
  'found-an-injured-bird': {
    headline: 'Most hurt birds need a licensed wildlife rescuer (a rehabber) today. Box it, then get it there.',
    contacts: [
      { org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm', note: '565 Columbus Ave, Manhattan. Just walk in, no appointment.' },
      { org: AMC, name: 'Animal Medical Center', when: 'Open 24 hours · badly hurt birds', note: 'At night, its emergency room takes critically ill birds. Call first.' },
      { org: AHN, name: 'Animal Help Now', when: 'Any time', note: 'Type where the bird is. It lists rehabbers open right now.' },
    ],
    check: {
      title: 'Does it need help?',
      yesTitle: 'Yes, if',
      yes: ['It hit a window', 'An animal caught or bit it, even with no wound', 'It is bleeding', 'It can’t stand or fly', 'It lets you walk right up to it', 'Its eyes are closed'],
      noTitle: 'Probably fine',
      no: ['A young bird with feathers, hopping, parents nearby, is learning to fly. Leave it and watch from far away.'],
    },
    steps: [
      { title: 'Cover it and scoop it up', text: 'Walk up slowly and quietly from behind. Drop a towel over it and lift it gently.', warn: 'Big bird (hawk, owl, heron, goose or swan)? Don’t try to catch it. Keep people and dogs away, keep it in sight, and call.' },
      { title: 'Put it in a closed bag or box', text: 'A paper bag, or a cardboard box with a few small air holes. Take the towel out. Keep it somewhere dark and quiet.' },
      { title: 'Get it to the Wild Bird Fund today', text: 'Every day, 9am to 7pm, no appointment. Closed and the bird is badly hurt? Call the Animal Medical Center’s 24-hour emergency room.' },
    ],
    never: [
      'Never give it food or water.',
      'No heating pad for a bird that hit a window: a warm room is enough.',
    ],
    remember: ['If a bird or small animal has been caught or bitten by another animal, it is an emergency, even if you can see no wound.'],
    tip: 'Can’t get it there? Email helpline@urbanwildlifenyc.org with a photo and where you are, and post it in the NYC Emergency Animal Rescue group on Facebook. Someone nearby may drive it.',
    situations: [
      {
        label: 'It hit a window', tone: 'now', verdict: 'Needs help today, even if it seems fine',
        do: ['Cover it with a towel and scoop it up.', 'Put it in a closed box with small air holes. Keep it dark and quiet.', 'Take it to a rehabber today. Birds that fly off after hitting a window often die later from shock.'],
        never: ['No heating pad for a bird that hit a window: a warm room is enough.', 'Never give it food or water.'],
        contacts: [{ org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm' }, { org: AMC, name: 'Animal Medical Center', when: 'At night: 24-hour ER, call first' }],
        section: 'How to catch it, box it and keep it calm',
      },
      {
        label: 'A cat, dog or other animal caught it', tone: 'now', verdict: 'An emergency, even with no wound',
        do: ['Put it in a closed box right away.', 'Get it to a rehabber today. It may need medicine the same day.'],
        remember: ['If a bird or small animal has been caught or bitten by another animal, it is an emergency, even if you can see no wound.'],
        never: ['Never give it food or water.'],
        contacts: [{ org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm' }, { org: AMC, name: 'Animal Medical Center', when: 'At night: 24-hour ER, call first' }],
        section: 'If it was caught or bitten by an animal',
      },
      {
        label: 'A baby bird is on the ground', tone: 'ok', verdict: 'Probably fine. Watch first.',
        do: ['Has feathers and can hop? It’s learning to fly, and its parents are close by. Leave it and watch from far away.', 'Almost no feathers? Put it back in its nest if you can. Touching it won’t make the parents reject it.', 'Hurt, or no parents after a few hours? Box it and take it to a rehabber.'],
        remember: ['Only a cold, nearly naked baby bird needs gentle warmth.'],
        contacts: [{ org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm' }],
        section: 'Is it hurt, or a fledgling that is fine?',
      },
      {
        label: 'It’s big: a hawk, owl, goose or swan', tone: 'now', verdict: 'Don’t touch it. Call for help.',
        do: ['Keep people and dogs away.', 'Keep it in sight.', 'Call the Animal Medical Center, which takes hawks, owls and water birds at any hour. In a park, you can also call 311 and ask for the Urban Park Rangers.'],
        contacts: [{ org: AMC, name: 'Animal Medical Center', when: 'Open 24 hours · say NYC Bird Alliance sent you' }, { org: CITY, when: 'In a park: ask for the Urban Park Rangers' }],
        section: 'Where to take it',
      },
      {
        label: 'It looks like a pet bird or a tame pigeon', tone: 'today', verdict: 'Call a different place',
        do: ['Parrots, budgies, chickens and pet ducks: call ACC. The Wild Bird Fund can’t take them.', 'A tame white or oddly coloured pigeon can’t survive outside: NYC Pigeon Rescue Central, or the Wild Bird Fund.'],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Pet and farm birds' }, { org: 'new-york-city-pigeon-rescue-central', name: 'NYC Pigeon Rescue Central', when: 'Tame pigeons' }],
        section: 'What to do now, step by step',
      },
      {
        label: 'It’s stuck in a glue trap', tone: 'now', verdict: 'Don’t pull it off',
        do: ['Leave it on the trap.', 'Take it to a rehabber just as it is.'],
        contacts: [{ org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm' }, { org: AMC, name: 'Animal Medical Center', when: 'At night: 24-hour ER, call first' }],
        section: 'What to do now, step by step',
      },
    ],
  },

  'found-wildlife': {
    headline: 'Don’t touch it. Find a licensed wildlife rescuer (a rehabber) and ask what to do.',
    contacts: [
      { org: AHN, name: 'Animal Help Now', when: 'Any time', note: 'Type where the animal is. It lists rehabbers and hotlines open right now.' },
      { org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm', note: 'Takes squirrels, opossums and other small mammals too.' },
      { org: 'cottontail-cottage-wildlife-rehab', name: 'Cottontail Cottage', when: 'Any hour · baby rabbits and foxes', note: 'Leave a message and they call back.' },
      { org: CITY, when: 'Raccoon, skunk, bat or a big animal', note: 'In a park, ask for the Urban Park Rangers.' },
    ],
    steps: [
      { title: 'Keep away', text: 'Keep pets and children back too.' },
      { title: 'Is it really alone?', text: 'Watch from far away. It needs help now if it is hurt, cold, covered in flies, was caught by an animal, or its mother is dead.' },
      { title: 'Find a rehabber open now', text: 'Use Animal Help Now, or call the place for the animal you found (tap your situation below).' },
      { title: 'Nobody answering?', text: 'Post the animal, where it is and a photo in the NYC Emergency Animal Rescue group on Facebook. Keep calling too.' },
    ],
    never: ['Do not touch a wild mammal with bare hands, and keep pets and children away.', 'Never give it food or water.'],
    remember: ['A baby animal on its own is usually not abandoned: its mother may be away for hours.'],
    situations: [
      { label: 'It’s a bird', tone: 'today', verdict: 'Birds have their own guide', do: ['Birds are different: you catch and box them yourself.'], href: '/guides/found-an-injured-bird' },
      { label: 'It’s stuck or trapped', tone: 'now', verdict: 'Call 911 if it is in danger', do: ['See what to do for a trapped animal.'], href: '/guides/animal-trapped' },
      {
        label: 'A baby squirrel or rabbit', tone: 'ok', verdict: 'Often fine. Watch first.',
        do: ['If it seems healthy and its nest fell, its mother may come back for it. Give her the chance.', 'Hurt, cold, covered in flies, or caught by an animal? It needs a rehabber today.', 'Squirrels: the Wild Bird Fund. Wild baby rabbits: Cottontail Cottage.'],
        contacts: [{ org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm' }, { org: 'cottontail-cottage-wildlife-rehab', name: 'Cottontail Cottage', when: 'Any hour' }],
        section: 'Found a baby squirrel or rabbit?',
      },
      {
        label: 'A raccoon, skunk or bat', tone: 'now', verdict: 'Don’t touch it',
        do: ['Stay away.', 'Call 311. In a park, ask for the Urban Park Rangers. No rehabber in the city may take these animals.', 'If a person or pet touched it, call a doctor or vet now.'],
        never: ['Never give it food or water.'],
        contacts: [{ org: CITY, when: 'Ask for the Urban Park Rangers' }],
        section: 'Raccoons, skunks and bats: no rehabber in the city may take them',
      },
      {
        label: 'A hurt deer, coyote or other big animal', tone: 'now', verdict: 'Stay back',
        do: ['Don’t go near it. Keep people and dogs back.', 'Call 311 for the Urban Park Rangers, or DEC at any hour.', 'On a road, or anyone in danger? Call 911.'],
        contacts: [{ org: 'nys-dec-region-2', name: 'DEC (state wildlife office)', when: 'Dispatch, any hour', phone: 1 }, { org: CITY, when: 'Ask for the Urban Park Rangers' }],
        section: 'More situations - Animal Help Now’s guidance, in its own words',
      },
      {
        label: 'A seal, whale, dolphin or sea turtle on a beach', tone: 'now', verdict: 'Keep your distance and call',
        do: ['Stay back and keep dogs away.', 'Don’t try to move it. A seal resting on a beach is often healthy.', 'Call the stranding hotline, any hour.'],
        contacts: [{ org: 'ny-marine-mammal-and-sea-turtle-stranding-hotline', name: 'Stranding hotline', when: 'Any hour' }, { org: 'noaa-greater-atlantic-marine-mammal-and-sea-turtle-stranding-hotline', name: 'NOAA', when: 'If the hotline doesn’t answer' }],
        section: 'Seals, whales, dolphins and sea turtles',
      },
      {
        label: 'A wild turtle', tone: 'week', verdict: 'Help only if it’s hurt',
        do: ['Crossing a road and not hurt? Help it across in the direction it was going.', 'Hurt? Email the New York Turtle and Tortoise Society.'],
        contacts: [{ org: 'new-york-turtle-and-tortoise-society', name: 'NY Turtle and Tortoise Society', when: 'Hurt wild turtles' }],
        section: 'Wild turtles',
      },
    ],
  },

  'exotic-pet-emergency': {
    headline: 'Most vets don’t treat rabbits, birds or reptiles. Call an exotics vet before you go.',
    contacts: [
      { org: AMC, name: 'Animal Medical Center', when: 'Open 24/7 · has exotic pet specialists', note: '510 East 62nd St, Manhattan. No appointment for emergencies.' },
      { org: 'the-center-for-avian-and-exotic-medicine', name: 'Center for Avian & Exotic Medicine', when: 'Every day, 9am to 7pm', note: 'Exotics only. Not open overnight.' },
      { org: 'vinegar-hill-veterinary-group', name: 'Vinegar Hill Veterinary Group', when: 'Brooklyn · daytime and evenings' },
      { org: POISON, name: 'ASPCA Animal Poison Control', when: 'Poisoned · 24/7 · covers exotic pets' },
    ],
    steps: [
      { title: 'Call first', text: 'Check they will treat your kind of animal tonight. Rabbits, birds and reptiles hide illness and get worse fast.' },
      { title: 'Night or weekend? Try the Animal Medical Center', text: 'It is open 24 hours and has its own team for birds, reptiles, rabbits and small mammals.' },
      { title: 'Poisoned? Call poison control', text: 'Have ready: the kind of animal, its weight, and what it ate or touched.' },
      { title: 'Afterwards, find your exotics vet', text: 'Rabbit and bird rescues keep lists of vets who know your animal. Save one before the next emergency.' },
    ],
    remember: ['most general small-animal vets do NOT treat rabbits, birds, reptiles or other exotics'],
    tip: 'Found a wild animal, not a pet? See the guide for injured wildlife instead.',
  },

  'report-animal-abuse': {
    headline: 'If something worries you, report it. You don’t need proof, and you can stay anonymous.',
    contacts: [
      { dial: '911', when: 'Happening now, or anyone in danger' },
      { org: CITY, when: 'Anything else · by phone or online, with photos' },
      { org: 'nyc-mayors-office-of-animal-welfare', name: 'Mayor’s Office of Animal Welfare', when: 'After you report · email them' },
      { org: 'nypd-crime-stoppers', name: 'NYPD Crime Stoppers', when: 'Anonymous tip line' },
    ],
    steps: [
      { title: 'Happening now? Call 911', text: 'Also call 911 if an animal or a person is in danger.' },
      { title: 'Anything else: call 311 or report online', text: 'Add photos if you have them. Report again every time you see it.' },
      { title: 'Then email the city', text: 'Write to the Mayor’s Office of Animal Welfare and your City Council member. Give your 311 report numbers.' },
      { title: 'Write it down', text: 'When and where, what you saw, how many times. Photos or video only if you can take them safely.' },
    ],
    remember: ['You do not need proof, and you can stay anonymous.'],
    tip: '311 often closes reports without anyone coming out. Keep reporting, with dates and photos: repeated reports are what get action.',
  },

  'leaving-abuse-with-your-pet': {
    headline: 'You don’t have to choose between your safety and your pet. Call the hotline and say you have a pet.',
    contacts: [
      { dial: '911', when: 'In danger now' },
      { org: 'nyc-domestic-violence-hotline', name: 'NYC Domestic Violence Hotline', when: '24 hours · say you have a pet' },
      { org: 'uri-pals', name: 'URI PALS', when: 'Shelters where you and your pet live together' },
      { org: 'safe-horizon', name: 'Safe Horizon', when: 'Keeps your pet safe while you leave' },
      { org: 'national-domestic-violence-hotline', name: 'National Domestic Violence Hotline', when: '24 hours · or text START to 88788' },
    ],
    steps: [
      { title: 'In danger now? Call 911', text: 'Then call the NYC hotline. Tell them you have a pet and need to leave safely with it.' },
      { title: 'Ask for a shelter that takes pets', text: 'URI PALS runs shelters where you and your pet live together. More shelters take pets than used to, so always ask.' },
      { title: 'Pet can’t come yet?', text: 'Safe Horizon, PAWS NY and foster programmes can keep it safe for a while. Get in writing how long, and how you get it back.' },
      { title: 'Ask the court to protect your pet', text: 'In New York, an order of protection can include your pet. Ask for it when you apply.' },
    ],
    never: ['Do not go back alone to fetch it.'],
    remember: ['If you think someone checks your phone or computer, call rather than browse, and clear your history afterwards.'],
  },

  // The muzzle-and-leash and legal-pets conditions are from 311's evacuation
  // article and NYCHA's evacuation page (checked 2026-11-15); the guide's
  // quotation leaves them out, and someone turned away at the turnstile is
  // worse off than someone told in advance.
  'pets-in-a-disaster': {
    headline: 'City evacuation shelters take pets. If you have to leave, take your pet with you.',
    contacts: [
      { org: CITY, when: 'Find your evacuation zone, shelter or cooling centre' },
      { org: POISON, name: 'ASPCA Animal Poison Control', when: 'Poisoned or exposed to something toxic · 24/7' },
    ],
    steps: [
      { title: 'Take your pet with you', text: 'During an evacuation order, pets can ride the subway and buses without a carrier. A pet too big for a carrier must be muzzled and on a strong leash. Only pets that are legal in NYC are allowed.' },
      { title: 'Know your zone', text: 'Find out if you live in an evacuation zone and where your nearest centre is.', link: { label: 'Know your zone', href: 'https://www.nyc.gov/knowyourzone' } },
      { title: 'Pack a Go Bag for your pet', text: 'At least three days of food, water and medicine. A collar or harness with an ID tag, and a recent colour photo.' },
      { title: 'Get emergency alerts', text: 'Notify NYC is the city’s free alert service, by app, text or email.', link: { label: 'Notify NYC', href: 'https://www.nyc.gov/notifynyc' } },
    ],
    never: ['Never leave a pet in a car.'],
    remember: ['Take your pet with you.'],
    tip: 'Hurt in the emergency? Go to an emergency hospital and call on the way. Rabbits, birds and reptiles need extra planning: see the exotic pets planning guide.',
  },

  'lost-and-found-dog': {
    headline: 'Move fast. Most dogs get home when people act in the first few hours.',
    contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Lost and found for the whole city' }],
    sides: [
      {
        label: 'I lost my dog',
        headline: 'Do all of these now.',
        steps: [
          { title: 'Check ACC and file a lost report', text: 'Found dogs from all over the city go to ACC. Yours may already be there.', link: { label: 'ACC lost and found', href: 'https://www.nycacc.org/services/lost-and-found' } },
          { title: 'Post a face photo on Petco Love Lost', text: 'It’s free. It matches your photo against found dogs and makes flyers for you.' },
          { title: 'Call your microchip company', text: 'Mark your dog as lost. Check they have your current phone number.' },
          { title: 'Spread the word', text: 'Flyers nearby, at vets and pet shops. Post on Facebook lost-pet groups, Nextdoor and PawBoost.' },
        ],
        never: ['Do NOT chase a scared dog - it makes them bolt.'],
        tip: 'Instead: sit low, look away and toss tasty food. Leave out clothes you have worn, and keep a light on and someone home.',
        contacts: [
          { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Call before you visit' },
          { org: 'petco-love-lost', name: 'Petco Love Lost', when: 'Free · matches face photos' },
        ],
      },
      {
        label: 'I found a dog',
        headline: 'Help it get home. A free microchip scan is the fastest way.',
        steps: [
          { title: 'Check for tags', text: 'Look for an ID tag or a dog licence tag on the collar.' },
          { title: 'Get it scanned for a chip', text: 'Any vet office or ACC shelter will scan it for free.' },
          { title: 'Report it found', text: 'On Petco Love Lost and with ACC. Call ACC before you bring a dog in.' },
          { title: 'Sick, hurt, dangerous, or after hours?', text: 'Call 911. A dispatcher will help.' },
        ],
        tip: 'A microchip only helps if it is registered with a current phone number.',
        contacts: [
          { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Call before you bring a dog in' },
          { dial: '911', when: 'Sick, hurt, dangerous, or after hours' },
        ],
      },
    ],
  },

  'lost-and-found-cat': {
    headline: 'Most lost cats are hiding close to home. Search quietly and nearby, at dusk or at night.',
    contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Lost and found for the whole city' }],
    sides: [
      {
        label: 'I lost my cat',
        headline: 'Do all of these fast.',
        steps: [
          { title: 'Post a face photo on Petco Love Lost', text: 'It’s free and matches your photo against found cats. Check it every few hours.' },
          { title: 'Report it to ACC, and visit', text: 'File a lost report, then visit the care centres with a photo. Shelters don’t always post every day.', link: { label: 'ACC lost and found', href: 'https://www.nycacc.org/services/lost-and-found' } },
          { title: 'Search quietly at dusk', text: 'Take a flashlight, a carrier and smelly food. Look under cars, porches, bushes and in basements. Indoor cat? Search your own home first.' },
          { title: 'Spread the word', text: 'Call your microchip company. Post on Nextdoor, PawBoost and local Facebook groups. Ask supers, mail carriers and delivery drivers.' },
        ],
        never: ['Do NOT chase a sighted cat - it makes them bolt.'],
        tip: 'Sit, talk softly and offer food. You can borrow a humane trap from a trap bank.',
        contacts: [
          { org: 'petco-love-lost', name: 'Petco Love Lost', when: 'Free · matches face photos' },
          { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Lost reports' },
        ],
      },
      {
        label: 'I found a cat',
        headline: 'A free microchip scan is the fastest way home.',
        steps: [
          { title: 'Get it scanned for a chip', text: 'Free at any vet or shelter. Check for a collar or tag too.' },
          { title: 'Is the tip of one ear cut off?', text: 'That cat has been fixed and has someone who looks after it. Leave it be.' },
          { title: 'Report it found', text: 'On Petco Love Lost and with ACC. Look for a matching “lost” post on Nextdoor and Facebook.' },
          { title: 'Sick or hurt?', text: 'Call 311 or ACC. ACC doesn’t take healthy stray cats, so post flyers and check for a chip first.' },
        ],
        contacts: [
          { org: CITY, when: 'Sick or hurt stray cat' },
          { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Found reports, business hours' },
        ],
      },
    ],
  },

  'lost-and-found-exotic': {
    headline: 'Pet rabbits, birds and reptiles can’t survive outside for long. Act fast.',
    contacts: [
      { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Citywide safety net for found pets of any kind' },
      { org: '911-parrot-alert', name: '911 Parrot Alert', when: 'Lost and found birds' },
      { org: 'new-york-city-pigeon-rescue-central', name: 'NYC Pigeon Rescue Central', when: 'Tame or white pigeons' },
      { org: 'rabbit-rescue-and-rehab-nyc-chapter-house-rabbit-society', name: 'Rabbit Rescue & Rehab', when: 'Found rabbits' },
    ],
    steps: [
      { title: 'A bird', text: 'Post to 911 Parrot Alert and the Long Island Parrot Society. A pet bird found outside needs shelter fast: contain it and call an avian vet or rescue.' },
      { title: 'A tame or white pigeon', text: 'It’s a pet pigeon and can’t survive outside. Contact NYC Pigeon Rescue Central or take it to the Wild Bird Fund.' },
      { title: 'A rabbit or other small animal', text: 'Pet rabbits can’t live as strays. Contain it out of the heat or cold, and call a rabbit rescue or ACC.' },
      { title: 'A turtle', text: 'Work out first if it is a pet or a wild turtle. A pet needs rehoming. A healthy wild one should stay where it is.' },
    ],
    never: ['Never relocate a healthy native turtle far from where it was found.'],
    tip: 'Whatever the animal: take a photo, note exactly where it was found, and post it to groups for that kind of animal.',
  },

  'save-an-at-risk-animal': {
    headline: 'Each listing closes about 42 hours after it is posted. Act fast, and do everything at once.',
    facts: ['New animals go up Sunday, Tuesday and Thursday at 6pm.', 'Each listing closes at noon two days later.'],
    contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Website trouble? Email adopt@nycacc.org' }],
    steps: [
      { title: 'Find the animal on the at-risk list', text: 'Tick “Show only available” and press “View more..” under the animal. Write down its name and ID number.', link: { label: 'Open ACC’s at-risk list', href: 'https://newhope.shelterbuddy.com/Animal/List' } },
      { title: 'See a “Reserve” button? You can adopt it', text: 'Press Reserve, then check out within 15 minutes.' },
      { title: 'Fill in both forms', text: 'The “Pre-Screener Form” on the animal’s page, and ACC’s form for fostering or adopting through a rescue group.', link: { label: 'ACC’s foster or adopt form', href: 'https://forms.gle/ozHex3uqvNkQt2dq9' } },
      { title: 'Contact every rescue group at once', text: 'Only an approved rescue can take out a “partners only” animal. The full guide lists them, with ready-made messages to send.' },
    ],
    never: ['Do not wait to hear back from either form.'],
    remember: ['The animal is safe only when a rescue group tells you it has confirmed the pull with ACC.'],
  },

  'keeping-your-dog': {
    headline: 'Before you give up your dog, ask for help. There is free help with food, vet bills, training and housing.',
    contacts: [
      { org: ACC, name: 'ACC owner support', when: 'A counsellor calls you back within about 3 days' },
      { org: 'paws-ny', name: 'PAWS NY', when: 'Free help at home for older, ill or disabled owners' },
      { org: 'animal-haven-community-engagement', name: 'Animal Haven', when: 'Short-term boarding in a crisis' },
    ],
    steps: [
      { title: 'Call ACC owner support', text: 'It helps with vet care, training, boarding, landlord problems and moving into temporary housing.' },
      { title: 'Need food?', text: 'The city gives free dog and cat food at 22 food pantries. The food is new, so ring before you go.' },
      { title: 'Behaviour problem?', text: 'Free dog training through ACC’s Community Pets programme, in person or by video.' },
      { title: 'Vet bills?', text: 'There are funds, payment plans and low-cost clinics.', link: { label: 'Help paying for vet care', href: '/guides/help-paying-for-care' } },
    ],
    tip: 'Going into hospital or between homes? PAWS NY and Animal Haven can look after your dog for a while.',
    situations: [
      {
        label: 'I need food for my dog', tone: 'week', verdict: 'Free pet food is available',
        do: ['The city gives free dog and cat food at 22 food pantries. The food is new, so ring before you go.', 'ACC may also give food and supplies. Ask when you call.'],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Food and supplies · ask' }],
        section: 'PET FOOD PANTRIES (specific programs)',
      },
      { label: 'I can’t afford the vet', tone: 'week', verdict: 'Funds and payment plans', do: ['See every way to get help with a vet bill.'], href: '/guides/help-paying-for-care' },
      {
        label: 'My dog has a behaviour problem', tone: 'week', verdict: 'Most problems can be fixed',
        do: ['ACC’s Community Pets programme gives free dog training, in person or by video.', 'Bideawee offers training help and advice.'],
        section: 'BEHAVIOR SUPPORT (a common, workable reason owners seek help)',
      },
      {
        label: 'I’m going into hospital, or losing my home', tone: 'today', verdict: 'Short-term care exists',
        do: ['PAWS NY helps people in hospital or rehab care for their pets.', 'Animal Haven offers short-term boarding in a crisis. Space is limited.', 'Losing your home? See the guide on keeping your pet if you lose your home.'],
        contacts: [{ org: 'paws-ny', name: 'PAWS NY', when: 'Hospital respite' }, { org: 'animal-haven-community-engagement', name: 'Animal Haven', when: 'Short-term boarding' }],
        section: 'TEMPORARY / CRISIS CARE - hospitalization, rehab, housing transition, deployment',
      },
      {
        label: 'My landlord says no pets', tone: 'week', verdict: 'Get help before you give up your dog',
        do: ['ACC helps with landlord problems, including NYCHA.', 'For free legal help, call 311 and ask for tenant legal services.'],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Landlord and NYCHA help' }],
        section: 'HOUSING SUPPORT',
      },
      {
        label: 'I have to give up my dog', tone: 'today', verdict: 'Talk to ACC first',
        do: ['Email admissions@nycacc.org or call ACC. Fill in its questionnaire, and a counsellor contacts you within about 3 days.', 'ACC may be able to help you keep your dog after all.', 'To find a new home yourself, ACC’s Rehoming Your Pet page has tools.'],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Owner support and surrender' }],
        section: 'ACC OWNER SUPPORT',
      },
    ],
  },

  'keeping-your-cat': {
    headline: 'Before you give up your cat, ask for help. There is free help with food, vet bills and a crisis.',
    contacts: [
      { org: ACC, name: 'ACC Community Pets', when: 'Help so your cat can stay home' },
      { org: 'paws-ny', name: 'PAWS NY', when: 'Free help at home for older, ill or disabled owners' },
      { org: 'animal-haven-community-engagement', name: 'Animal Haven', when: 'Short-term boarding in a crisis' },
    ],
    steps: [
      { title: 'Contact ACC Community Pets', text: 'Free or low-cost vet referrals, spay/neuter, supplies like food and litter, and help in a crisis.' },
      { title: 'Need food?', text: 'The city gives free dog and cat food at 22 food pantries. The food is new, so ring before you go.' },
      { title: 'In a crisis?', text: 'Going into hospital, rehab or between homes: PAWS NY and Animal Haven can look after your cat for a while.' },
      { title: 'Vet bills?', text: 'There are funds, payment plans and low-cost clinics.', link: { label: 'Help paying for vet care', href: '/guides/help-paying-for-care' } },
    ],
    tip: 'Need to rehome your cat yourself? ACC’s rehoming tools are often less stressful for a cat than a shelter.',
    situations: [
      {
        label: 'I need food for my cat', tone: 'week', verdict: 'Free pet food is available',
        do: ['The city gives free dog and cat food at 22 food pantries. The food is new, so ring before you go.', 'ACC may also give food and supplies. Ask when you call.'],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Food and supplies · ask' }],
        section: 'PET FOOD PANTRIES (specific programs)',
      },
      { label: 'I can’t afford the vet', tone: 'week', verdict: 'Funds and payment plans', do: ['See every way to get help with a vet bill.'], href: '/guides/help-paying-for-care' },
      {
        label: 'My cat has a behaviour problem', tone: 'week', verdict: 'Most problems can be fixed',
        do: ['See a vet first: a sudden change, like not using the litter box, is often a health problem.', 'Then email the free National Cat Behavior Helpline at felinehelpline@gmail.com.'],
        section: 'BEHAVIOR / SOCIALIZATION - part B: OWNED-cat problems (these are the #1 surrender triggers - solvable!)',
      },
      {
        label: 'I’m going into hospital, or losing my home', tone: 'today', verdict: 'Short-term care exists',
        do: ['PAWS NY helps people in hospital or rehab care for their pets.', 'Animal Haven offers short-term boarding in a crisis. Space is limited.', 'Losing your home? See the guide on keeping your pet if you lose your home.'],
        contacts: [{ org: 'paws-ny', name: 'PAWS NY', when: 'Hospital respite' }, { org: 'animal-haven-community-engagement', name: 'Animal Haven', when: 'Short-term boarding' }],
        section: 'TEMPORARY / CRISIS CARE - hospitalization, rehab, housing transition',
      },
      {
        label: 'I have to give up my cat', tone: 'today', verdict: 'Talk to ACC first',
        do: ['Email CommunityPets@nycacc.org or call ACC. Ask about its help to keep your cat at home first.', 'Rehoming your cat yourself is often less stressful for it than a shelter. Ask ACC about its Rehoming Your Pet tools.'],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Owner support and surrender' }],
        section: 'ACC OWNER SUPPORT / SURRENDER PREVENTION',
      },
    ],
  },

  'keep-your-pet-if-you-lose-your-home': {
    headline: 'City shelters don’t take pets, but there are ways to keep you together. The earlier you start, the more options you have.',
    contacts: [
      { org: CITY, when: 'Ask for Homebase, to help you stay housed' },
      { org: 'animal-haven', name: 'Animal Haven', when: 'Help in a housing emergency' },
      { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Your pet stays home while they look for a place' },
      { org: 'helping-pets-and-people-in-crisis', name: 'Helping Pets and People in Crisis', when: 'Boarding in a crisis' },
    ],
    steps: [
      { title: 'Not lost your home yet? Call 311', text: 'Ask for your local Homebase office. A counsellor can help you stay where you are, which keeps your pet with you.' },
      { title: 'Arrange somewhere safe for your pet first', text: 'A friend, the rescue you got it from, Animal Haven or ACC. Your pet can’t wait inside the shelter.' },
      { title: 'Need your pet with you? Ask about an emotional support animal', text: 'Make a “Reasonable Accommodation Request” with a letter from a doctor, social worker or counsellor. Intake staff can help.' },
      { title: 'Tell intake about your pet', text: 'Then tell your case manager again once you are placed. Some shelters now have pet-friendly places.' },
    ],
    remember: [
      'City shelter intake centres do not accept pets.',
      'Before you hand your pet to anyone, ask how long they will keep it, what happens if you cannot take it back in time, and whether you could lose ownership.',
    ],
    tip: 'Code Blue (32 degrees or colder): anyone can come into any city shelter or drop-in centre without going through intake.',
  },

  'help-paying-for-care': {
    headline: 'Apply to several funds at once. The money runs out fast.',
    facts: ['At the Animal Medical Center? Apply within 5 business days of treatment starting.', 'Grants are paid to the vet, not to you.'],
    contacts: [
      { org: AMC, name: 'Animal Medical Center funds', when: 'Ask the day you arrive', note: 'For any animal treated there.' },
      { org: 'redrover-relief', name: 'RedRover Relief', when: 'Urgent, life-threatening care' },
      { org: 'the-pet-fund', name: 'The Pet Fund', when: 'Long-term illness · email before treatment' },
      { org: 'carecredit', name: 'CareCredit', when: 'Pay over time' },
    ],
    steps: [
      { title: 'At the Animal Medical Center? Ask today', text: 'It has its own funds for any animal. Apply within 5 business days of treatment starting, or you can’t get help.' },
      { title: 'Apply to several funds at once', text: 'Emergency: RedRover Relief and Frankie’s Friends. Long-term illness: The Pet Fund.' },
      { title: 'Ask about paying over time', text: 'CareCredit and Scratchpay. Many funds want you to try these first.' },
      { title: 'Plan ahead for next time', text: 'Insurance won’t pay for a problem your pet already has. Start while your pet is young and healthy.' },
    ],
    situations: [
      {
        label: 'It’s an emergency right now', tone: 'now', verdict: 'Apply to two or three today',
        do: ['Apply to RedRover Relief for urgent, life-threatening care.', 'Apply to Frankie’s Friends too.', 'Ask the vet about CareCredit or Scratchpay while you wait.'],
        contacts: [{ org: 'redrover-relief', name: 'RedRover Relief', when: 'Urgent care' }, { org: 'frankies-friends', name: 'Frankie’s Friends', when: 'Emergency or specialist care' }],
        section: 'GENERAL vet-bill funds that cover exotics (birds, rabbits, guinea pigs, etc.):',
      },
      {
        label: 'We’re at the Animal Medical Center', tone: 'today', verdict: '5 business days to apply',
        do: ['Ask a Client Services Manager about its funds the day you arrive.', 'An AMC vet must see your pet first.', 'You must live in New York, New Jersey or Connecticut.'],
        contacts: [{ org: AMC, name: 'Animal Medical Center funds', when: 'Ask the day you arrive' }],
        section: 'IF THE ANIMAL IS BEING TREATED AT THE ANIMAL MEDICAL CENTER (AMC)',
      },
      {
        label: 'A long-term illness', tone: 'week', verdict: 'Apply before treatment',
        do: ['Email The Pet Fund before treatment starts.', 'Look at the other funds in the full guide too.'],
        contacts: [{ org: 'the-pet-fund', name: 'The Pet Fund', when: 'Email first' }],
        section: 'GENERAL vet-bill funds that cover exotics (birds, rabbits, guinea pigs, etc.):',
      },
      {
        label: 'I need to pay over time', tone: 'week', verdict: 'Payment plans',
        do: ['CareCredit is a card for health costs.', 'Scratchpay offers simple plans.', 'Many funds ask you to try these first.'],
        contacts: [{ org: 'carecredit', name: 'CareCredit', when: 'Pay over time' }, { org: 'scratchpay', name: 'Scratchpay', when: 'Pay over time' }],
        section: 'PAYING A BILL OVER TIME, AND DISCOUNT PLANS (these are not insurance)',
      },
      {
        label: 'A rabbit, bird or reptile', tone: 'week', verdict: 'A few funds name them',
        do: ['The Animal Medical Center has a fund just for rabbits, and one for all birds.', 'RedRover Relief also helps birds, rabbits and guinea pigs.', 'For insurance, ask Nationwide about its Avian & Exotic plan.'],
        contacts: [{ org: AMC, name: 'Animal Medical Center funds', when: 'Rabbits and birds' }, { org: 'redrover-relief', name: 'RedRover Relief', when: 'Urgent care' }],
        section: 'EXOTIC-SPECIFIC vet-bill funds (rare - these actually name exotics):',
      },
      {
        label: 'I run a rescue', tone: 'ok', verdict: 'Help for rescue groups',
        do: ['AMC to the Rescue helps animals in a rescue’s care whose health stops them being adopted.'],
        section: 'For RESCUES (not individuals):',
      },
    ],
  },

  'low-cost-dog-care': {
    headline: 'Free and low-cost vet care is in every borough. Most of it needs a booking or a waitlist, so start early.',
    contacts: [
      { org: 'aspca-spay-neuter-nyc', name: 'ASPCA spay/neuter', when: 'Same-day waitlist opens at 6am' },
      { org: 'the-toby-project', name: 'The Toby Project', when: 'Free spay/neuter with public assistance' },
      { org: 'humane-society-of-new-york', name: 'Humane Society of New York', when: 'Low-cost vet hospital · Manhattan' },
      { org: ACC, name: 'ACC Community Pets', when: 'Free vaccine and microchip pop-ups' },
    ],
    steps: [
      { title: 'License your dog', text: 'Every dog over 4 months needs a licence and a rabies shot. Apply online or by mail.', link: { label: 'NYC dog licence', href: 'https://www.nyc.gov/doglicense' } },
      { title: 'Spay or neuter, free or low-cost', text: 'The ASPCA’s same-day waitlist, the Toby Project, and the Humane Society of New York.' },
      { title: 'Vaccines and microchips', text: 'ACC runs free pop-up clinics in the Bronx and Queens. Check its events page for dates.' },
      { title: 'Teeth', text: 'The Humane Society of New York has a low-cost dog dentist. It books up fast, so call early.' },
    ],
    remember: ['Every dog 4+ months must be licensed'],
  },

  'low-cost-clinics-and-trap-banks': {
    headline: 'Free spay/neuter for street cats is mostly for Certified TNR Caretakers. Getting certified is free.',
    contacts: [
      { org: 'the-toby-project-feral-spay-neuter-clinic', name: 'The Toby Project', when: 'Free for community cats · all 5 boroughs' },
      { org: 'humane-society-of-new-york', name: 'Humane Society of New York', when: 'Low-cost for any cat or dog · by appointment' },
      { org: 'neighborhood-cats', name: 'Neighborhood Cats', when: 'Borrow a humane trap' },
    ],
    steps: [
      { title: 'Get certified first', text: 'It’s free, and it opens up free surgery, trap loans and transport.', link: { label: 'Starting TNR', href: '/guides/starting-tnr' } },
      { title: 'Borrow a trap', text: 'Reserve one from the Neighborhood Cats trap bank, or ask the Feral Cat Initiative helpdesk.' },
      { title: 'Book a clinic before you trap', text: 'Pick one that works with feral cats. Ask them first.' },
      { title: 'A pet cat?', text: 'The ASPCA’s free clinics are for owners on public assistance in some zip codes. The Humane Society of New York is low-cost for any cat.' },
    ],
    remember: ['A cat that cannot be handled must go to a clinic experienced with feral cats, in a covered trap, one cat to a trap.'],
  },

  'starting-tnr': {
    headline: 'TNR means trap, neuter, return. Get certified first: it’s free, and it unlocks free surgery, traps and transport.',
    contacts: [
      { org: 'neighborhood-cats', name: 'Neighborhood Cats', when: 'Monthly online certification · help with any colony question' },
      { org: 'nyc-feral-cat-initiative-bideawee', name: 'NYC Feral Cat Initiative', when: 'Helpdesk 7 days a week for certified caretakers' },
      { org: 'the-toby-project-feral-spay-neuter-clinic', name: 'The Toby Project', when: 'Free spay/neuter · all 5 boroughs' },
    ],
    steps: [
      { title: 'Get TNR-certified', text: 'A free online workshop, run every month. More than 15,000 New Yorkers have done it.' },
      { title: 'Register your colony', text: 'Log your cats on Cat Stats. It tracks progress and can help protect a feeding spot.' },
      { title: 'Trap and fix', text: 'Borrow traps and book free spay/neuter. The ASPCA offers free transport to its clinics.' },
      { title: 'Keep caring', text: 'Food and water at tidy feeding spots, and insulated winter shelters with straw, not blankets.' },
    ],
    never: ['Don\'t re-trap ear-tipped cats.'],
    remember: ['Scratched or bitten by a feral? Contact a doctor immediately'],
    tip: 'Friendly cats and kittens in a colony can often be adopted. Tiny kittens need a kitten nursery: see Cats needing specialist help.',
  },

  'cats-with-special-needs': {
    headline: 'Specialist cat rescues fill up fast. Contact several at once.',
    contacts: [
      { org: 'itty-bitty-city-kitties', name: 'Itty Bitty City Kitties', when: 'Newborn kittens that need bottle feeding' },
      { org: 'ny-cat-warriors', name: 'NY Cat Warriors', when: 'Urgent and complex medical cases' },
      { org: 'tavi-and-friends', name: 'Tavi & Friends', when: 'Senior, FIV+ and special-care cats' },
    ],
    steps: [
      { title: 'Newborn kittens', text: 'Kittens that still need a bottle need care around the clock. Contact a kitten nursery such as Itty Bitty City Kitties or Cat Castle.' },
      { title: 'Very sick or hurt', text: 'NY Cat Warriors, Little Wanderers and Sean Casey Animal Rescue. Ring first to check they have room.' },
      { title: 'Senior, FIV+ or FeLV+', text: 'Tavi & Friends, KittyKind, Bronx Tails and Empty Cages Collective.' },
      { title: 'Disabled: three legs, blind, wobbly', text: 'K9Kastle, Saint Spiro and For Blake’s Sake.' },
    ],
    remember: ['Always confirm current capacity - specialists fill up fast, especially in kitten season.'],
    tip: 'Hurt right now? Go to an emergency hospital first: see the animal emergencies guide.',
  },

  'breed-specific-dog-rescue': {
    headline: 'Breed rescues are mostly volunteer networks outside the city. Always check they have room for a dog from NYC.',
    contacts: [{ org: 'new-york-bully-crew', name: 'New York Bully Crew', when: 'All bully breeds · takes surrenders' }],
    steps: [
      { title: 'Find your breed in the full guide', text: 'Bully breeds first, then rottweilers, boxers, cane corsos, mastiffs, bulldogs, dobermans and more.' },
      { title: 'Contact two or three at once', text: 'Don’t wait for one to answer before trying the next.' },
      { title: 'Ask if they have room now', text: 'Ask if they take dogs from New York City and have a foster home free.' },
    ],
    remember: ['ALWAYS confirm current NYC-area capacity'],
    tip: '“Bully breed” describes a body type, not how a dog behaves.',
  },

  'dog-behavior-and-legal': {
    headline: 'Most behaviour problems can be fixed. Start with free help from ACC.',
    contacts: [
      { org: ACC, name: 'ACC Community Pets', when: 'Free dog training, in person or by video' },
      { org: 'bideawee-manhattan-adoption-center', name: 'Bideawee', when: 'Training help and advice' },
      { org: CITY, when: 'Report a dog bite within 24 hours' },
    ],
    steps: [
      { title: 'Get free training', text: 'ACC’s Community Pets programme has free trainers, plus free guides online.' },
      { title: 'Choose a reward-based trainer', text: 'Look for letters like CPDT-KA or KPA-CTP. Ask how they work with fear and reactivity before you book.' },
      { title: 'Serious or sudden problem?', text: 'Ask your vet about a veterinary behaviourist, who can also prescribe medicine.' },
      { title: 'After a bite', text: 'Report it to 311 within 24 hours. Anyone bitten should get medical advice.' },
    ],
    remember: ['This is not legal advice.'],
    tip: 'New York City has no breed ban. Landlords and NYCHA can set their own rules, and ACC can help with a housing problem.',
  },

  'rehoming-an-exotic-pet': {
    headline: 'Never let a pet rabbit, bird, turtle or other animal go outside. It will almost always die. There are safe ways to rehome it.',
    contacts: [
      { org: 'rabbit-rescue-and-rehab-nyc-chapter-house-rabbit-society', name: 'Rabbit Rescue & Rehab', when: 'Rabbits and guinea pigs · help keeping or rehoming' },
      { org: 'new-york-turtle-and-tortoise-society', name: 'NY Turtle and Tortoise Society', when: 'Turtles and tortoises' },
      { org: 'northeast-avian-rescue', name: 'Northeast Avian Rescue', when: 'Birds' },
      { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Any animal you can’t place' },
    ],
    steps: [
      { title: 'Want to keep it?', text: 'Rescues can make care much easier. Rabbit Rescue & Rehab coaches owners who feel they must give up a rabbit.' },
      { title: 'Rehome it through a rescue that knows the animal', text: 'Rabbits: rabbit rescues. Turtles: NYTTS or Earthlings NYC. Birds: Northeast Avian Rescue. Farm animals: a farm sanctuary.' },
      { title: 'Can’t place it?', text: 'ACC takes any kind of animal, through nycacc.org or 311.' },
    ],
    never: ['NEVER release a domestic animal to the wild.'],
    tip: 'Rehoming it yourself? Screen people carefully.',
  },

  'exotic-boarding-and-planning': {
    headline: 'Most kennels won’t take rabbits, birds or reptiles. Plan ahead for when you’re away, and for if you can’t care for them.',
    contacts: [
      { org: 'the-center-for-avian-and-exotic-medicine', name: 'Center for Avian & Exotic Medicine', when: 'Ask about medical boarding and grooming' },
      { org: 'long-island-parrot-society', name: 'Long Island Parrot Society', when: 'List of bird sitters and groomers' },
    ],
    steps: [
      { title: 'Going away?', text: 'Boarding at an exotics vet is safest for an animal with health needs. Ask any sitter if they know your kind of animal, and who their emergency vet is.' },
      { title: 'Grooming', text: 'Use an exotics vet for beaks, wings, nails and teeth.' },
      { title: 'Plan for the long term', text: 'Parrots can live 30 to 80 years and often outlive their owners. Name someone to care for your pet, and think about a pet trust.' },
      { title: 'Pack a disaster kit', text: 'A carrier, a heat source with a battery pack, several days of food, medicine and vet records.' },
    ],
    never: ['do not DIY a beak or a rabbit\'s teeth'],
    remember: ['overgrown rabbit teeth are a medical emergency, not a grooming task'],
  },

  'exotic-pet-legality': {
    headline: 'Rabbits, guinea pigs, pet birds and many reptiles are legal in NYC. Ferrets, most wild animals and farm animals are not.',
    contacts: [
      { org: 'nys-dec-region-2', name: 'DEC (state wildlife office)', when: 'Native wildlife, reptiles and permits' },
      { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Surrender any animal' },
    ],
    check: {
      title: 'Can I keep it in NYC?',
      yesTitle: 'Usually legal',
      yes: ['Rabbits and guinea pigs', 'Rats, mice, hamsters, gerbils, chinchillas', 'Parrots, budgies and other pet birds', 'Bearded dragons, corn snakes, ball pythons, leopard geckos'],
      noTitle: 'Not legal',
      no: ['Ferrets', 'Monkeys and most wild animals', 'Venomous snakes, big constrictors, alligators', 'Roosters, pigs (even “mini” ones), goats and other farm animals'],
    },
    steps: [
      { title: 'Found a wild animal?', text: 'It must go to a licensed wildlife rescuer, not into your home.', link: { label: 'Found injured or orphaned wildlife', href: '/guides/found-wildlife' } },
      { title: 'A native New York turtle or reptile?', text: 'You need a permit from the state (DEC) to keep one.' },
      { title: 'Have an animal you can’t keep?', text: 'Rehome it safely.', link: { label: 'Rehoming a rabbit, bird, reptile or small animal', href: '/guides/rehoming-an-exotic-pet' } },
    ],
    remember: ['This page is orientation, not legal advice.', 'Most native wildlife cannot legally be kept.'],
  },
};

/**
 * The anchor for a heading in the full guide, so "Read why" can link to it.
 * Lower case, letters and digits only, joined by hyphens.
 */
export function headingId(text: string): string {
  return (
    'g-' +
    text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/<[^>]+>/g, '')
      .replace(/&[a-z#0-9]+;/g, ' ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

/** Gives every <h2> in rendered guide HTML the id `headingId` would make for it. */
export function withHeadingIds(html: string): string {
  return html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_m, inner: string) => `<h2 id="${headingId(inner)}">${inner}</h2>`);
}

/** Words in a guide, for "about N minutes" on the full-guide button. */
export function wordCount(markdown: string): number {
  return markdown.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').split(/\s+/).filter((w) => /\w/.test(w)).length;
}
