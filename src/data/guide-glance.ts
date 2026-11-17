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
  /**
   * A page on this site, an address that already appears in the guide, or
   * "#heading-id" for a heading in the full guide (it unfolds and scrolls
   * there). Each is checked by tests/guide-glance.test.ts.
   */
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
  /**
   * A short list of links under a heading, for help that is neither a step
   * nor a situation: "Help for your colony" on the TNR card (owner,
   * 2026-11-15: link the care that is available, not "keep caring").
   */
  more?: { title: string; links: GlanceLink[] };
}

const ACC = 'animal-care-centers-of-nyc';
const AMC = 'animal-medical-center';
const WBF = 'the-wild-bird-fund';
const AHN = 'animal-help-now-wildlife-emergency-finder';
const POISON = 'aspca-animal-poison-control-center-24-7-hotline';
const CITY = 'nyc-311';

export const GLANCE: Record<string, Glance> = {

  'animal-trapped': {
    headline: 'If a trapped animal is in danger right now, call 911. If it is not, call 311. Tap what is happening.',
    contacts: [
      { dial: '911', when: 'Trapped and in danger right now' },
      { org: CITY, when: 'Not in danger right now · strays: 10am to 6pm' },
      { org: 'nys-dec-region-2', name: 'DEC (state wildlife office)', when: 'How to find a licensed wildlife control company' },
    ],
    situations: [
      {
        label: 'It’s in danger right now', tone: 'now', verdict: 'Call 911',
        do: ['Stuck in a drain, under a train, in a car engine or on a ledge: call 911.', 'Say exactly where it is and what animal it is.', 'In rescues reported in the news, officers from the NYPD’s Emergency Service Unit came to free the animal.'],
        contacts: [{ dial: '911', when: 'In danger right now' }],
        section: 'If the animal is in danger right now, call 911',
      },
      {
        label: 'It’s not in danger right now', tone: 'today', verdict: 'Call 311',
        do: ['For a stray dog or cat, ACC takes reports through 311, 10am to 6pm.', 'In a park, 311 sends it to NYC Parks.'],
        contacts: [{ org: CITY, when: 'Strays: 10am to 6pm' }],
        section: 'If it is not in danger right now, call 311',
      },
      {
        label: 'A wild animal is living in my walls or chimney', tone: 'week', verdict: 'Hire a licensed company',
        do: ['Hire a licensed wildlife control company. DEC’s website explains how to find one.', 'First take away any food that draws it in.'],
        contacts: [{ org: 'nys-dec-region-2', name: 'DEC (state wildlife office)', when: 'Licensed wildlife control' }],
        section: 'A wild animal living in your walls, chimney or attic',
      },
    ],
  },

  'found-kittens-outside': {
    headline: 'Don’t do this alone. Before you move, feed or keep kittens, call a kitten rescue or ACC and ask what to do.',
    action: { label: 'Kitten nurseries and rescues', href: '/directory?need=neonatal' },
    contacts: [
      { org: 'itty-bitty-city-kitties', name: 'Itty Bitty City Kitties', when: 'Kitten nursery · bottle babies' },
      { org: 'cat-castle-nyc', name: 'Cat Castle', when: 'Kitten nursery' },
      { org: 'kittens-and-barbells-rescue-inc', name: 'Kittens and Barbells', when: 'Kitten rescue' },
      { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Orphaned kittens · call before you go' },
      { org: CITY, when: 'Report orphaned kittens' },
    ],
    steps: [
      { title: 'Hurt, or in danger right now?', text: 'Take them to an emergency vet now, or call 311 to reach ACC.', link: { label: 'Emergency vets, open now', href: '/directory?need=emergency-vet&near=1' } },
      { title: 'Otherwise, call a kitten rescue or ACC first', text: 'Tell them how many there are, how big they look and where they are. They will tell you whether to wait for the mother or bring them in.', link: { label: 'Kitten nurseries and rescues', href: '/directory?need=neonatal' } },
      { title: 'Do what they tell you', text: 'Watch from a distance while you wait. Don’t take the kittens home unless they say so.' },
      { title: 'Stop more litters', text: 'The mother cat can be trapped, spayed and returned, often for free.', link: { label: 'Community cats and TNR', href: '/guides/starting-tnr' } },
    ],
    never: ['Do not separate stray or feral kittens from their mother.'],
    tip: 'Kitten Lady’s guides show what caring for kittens involves, so you know what to ask. Use them with a rescue’s help, not instead of it.',
  },


  'animal-left-alone': {
    headline: 'If a pet is in danger right now, call 911. If it has been left behind and is not in danger, call 311. Tap what happened.',
    contacts: [
      { dial: '911', when: 'An animal is in danger right now' },
      { org: CITY, when: 'Report an abandoned pet, or neglect' },
      { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Takes these reports by phone in business hours' },
    ],
    situations: [
      {
        label: 'A neighbour’s pet has been left behind', tone: 'now', verdict: '911 if in danger, otherwise 311',
        do: ['In danger right now, for example no food or water, or it sounds hurt? Call 911.', 'Otherwise call 311. Say a pet has been left behind. Give the address, what the animal looks like, and how long it has been alone.'],
        contacts: [{ dial: '911', when: 'In danger right now' }, { org: CITY, when: 'Not in danger' }],
        section: 'If a neighbour\'s pet has been left behind',
      },
      {
        label: 'I was evicted and my animal is inside', tone: 'now', verdict: 'Find out where it went',
        do: ['Look for a notice on the door saying which shelter it went to.', 'If it is still inside, ask the landlord or building staff, then your police precinct.'],
        section: 'If you were evicted and your animal is inside',
      },
      {
        label: 'I’m facing eviction', tone: 'today', verdict: 'Plan for your pet now',
        do: ['Find someone who could look after your pet.', 'Call 311 and ask for the Tenant Helpline.'],
        contacts: [{ org: CITY, when: 'Ask for the Tenant Helpline' }],
        section: 'If you are facing eviction',
      },
      {
        label: 'I’m going into hospital myself', tone: 'today', verdict: 'Short-term help exists',
        do: ['PAWS NY can help care for your pet while you are away.'],
        contacts: [{ org: 'paws-ny', name: 'PAWS NY', when: 'Help while you are in hospital' }],
      },
    ],
  },
  // The Bronx tile follows driving times measured 2026-11-15 with the public
  // OSRM route planner from ten Bronx neighbourhoods to every 24-hour hospital
  // (no traffic): straight-line distance put Astoria first from Fordham, but by
  // road Yonkers is fastest for the north and west Bronx, Queens for the east,
  // Astoria and the Upper East Side for the south. The guide's Bronx section
  // says the same (Emergency tab of the cat workbook).
  'animal-emergency': {
    headline: 'Dog, cat, rabbit, bird or any other pet: if it is hurt, very ill or poisoned, go to an emergency vet now.',
    action: { label: 'Find the nearest hospital open now', href: '/directory?need=emergency-vet&near=1' },
    contacts: [
      { org: AMC, name: 'Animal Medical Center', when: 'Open 24 hours · Manhattan · or the nearest hospital above' },
      { org: 'ambuvet-pet-ambulance', name: 'AmbuVet pet ambulance', when: 'Can’t get there yourself · 24 hours' },
      { org: POISON, name: 'ASPCA Animal Poison Control', when: 'Only if it swallowed or touched something toxic · 24/7' },
      { org: 'pet-poison-helpline-24-7-hotline', name: 'Pet Poison Helpline', when: 'Backup poison line · 24/7' },
    ],
    steps: [
      { title: 'Find the nearest hospital open now', text: 'Hit by a car, bleeding, can’t breathe, a seizure, collapsed, or anything that scares you: go now. Not sure? Call an emergency vet and ask.', link: { label: 'Hospitals open now, nearest first', href: '/directory?need=emergency-vet&near=1' } },
      { title: 'If you can, call while you travel', text: 'Don’t wait to get through before you leave. A call lets them get ready and confirms they are open. Say what kind of animal it is.', link: { label: 'Rabbit, bird or reptile? Vets who treat them', href: '/guides/exotic-pet-emergency' } },
    ],
    situations: [
      {
        label: 'It ate or touched something poisonous', tone: 'now', verdict: 'Call poison control first',
        do: ['Call ASPCA Animal Poison Control or the Pet Poison Helpline. Both are open 24/7.', 'They work out the treatment and tell the hospital, which saves time.'],
        never: ['Do not make the animal vomit unless a toxicologist tells you to.'],
        remember: ['Lilies are deadly to cats even in tiny amounts (a lick of pollen).'],
        contacts: [{ org: POISON, name: 'ASPCA Animal Poison Control', when: '24/7' }, { org: 'pet-poison-helpline-24-7-hotline', name: 'Pet Poison Helpline', when: '24/7' }],
        section: 'IF IT SWALLOWED OR TOUCHED SOMETHING TOXIC: RING POISON CONTROL FIRST',
      },
      {
        label: 'Another dog attacked my dog', tone: 'now', verdict: 'Go to a vet now',
        do: ['Take your dog to an emergency vet now, even if you can’t see a wound.', 'Get the other owner’s name, address and phone number.', 'Was a person bitten too? Wash the bite, see a doctor, and report it to the Health Department through 311.', 'If the dog is still a danger to people, call 911.'],
        contacts: [{ dial: '911', when: 'The dog is still a danger to people' }, { org: CITY, when: 'Report a bite to a person' }],
      },
      {
        label: 'I can’t get it there myself', tone: 'now', verdict: 'A cab, a pet ride or a pet ambulance',
        do: [
          'A cat or small dog in a carrier can go in a yellow cab or car service. A driver may refuse an animal that is not in a carrier.',
          'Uber and Lyft both have a pet option in their apps. Drivers can say no, so if no car comes quickly, take a cab.',
          'Badly hurt, or too big to carry? AmbuVet runs a 24-hour pet ambulance. Call the hospital you are going to before the pickup.',
        ],
        contacts: [{ org: 'ambuvet-pet-ambulance', name: 'AmbuVet', when: '24-hour pet ambulance' }],
        section: 'FIND THE NEAREST HOSPITAL OPEN NOW',
      },
      {
        label: 'I’m not sure it’s an emergency', tone: 'now', verdict: 'Ask a vet now, by phone or video',
        do: [
          'Call an emergency vet and ask. At any VEG hospital, a vet answers the phone 24 hours a day.',
          'The Animal Medical Center has a 24-hour urgent care line, answered by its emergency room staff.',
          'AmbuVet offers a video call, 24 hours a day, with a vet technician who can tell you if it is an emergency. They cannot diagnose or prescribe.',
        ],
        remember: ['If it is clearly an emergency, don’t wait for advice: go now.'],
        contacts: [
          { org: 'animal-medical-center', phone: 1, name: 'Animal Medical Center urgent care line', when: '24 hours · emergency room staff' },
          { org: 'veg', name: 'VEG Upper East Side', when: '24 hours · or call any VEG' },
          { org: 'ambuvet-pet-ambulance', name: 'AmbuVet video call', when: '24 hours · book by phone' },
        ],
        section: 'NOT SURE IF IT IS AN EMERGENCY?',
      },
      {
        label: 'I’m in the Bronx: there’s no 24-hour vet', tone: 'today', verdict: 'After hours, go to Yonkers, Queens or Manhattan',
        do: [
          'There is no 24-hour vet in the Bronx. In the daytime, Urgent Vets in the Bronx is an emergency vet, open every day, 10am to 10pm. After hours, the nearest 24-hour vet by road depends on where you are:',
          'Riverdale, Kingsbridge, Fordham, Norwood, Wakefield or Co-op City: Animal Specialty Center in Yonkers, usually about 15 to 20 minutes.',
          'Pelham Bay or Parkchester: Urgent Vets in Queens, by LaGuardia.',
          'Mott Haven or Hunts Point: URvet Care in Astoria, or the Animal Medical Center or VEG in Manhattan.',
        ],
        contacts: [{ org: 'animal-specialty-center', name: 'Animal Specialty Center (Yonkers)', when: 'Open 24 hours · north and west Bronx' }, { org: 'urgent-vets-11369', name: 'Urgent Vets (Queens)', when: 'Open 24 hours · east Bronx' }, { org: 'urvet-care-astoria', name: 'URvet Care Astoria', when: 'Open 24 hours · south Bronx' }, { org: 'urgent-vets-bronx', name: 'Urgent Vets (Bronx)', when: 'Emergency vet · every day, 10am to 10pm' }],
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
      { org: AMC, name: 'Animal Medical Center', when: 'Open 24 hours · badly hurt birds', note: 'After hours, its 24-hour emergency room takes critically ill birds.' },
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
      { title: 'Cover it and scoop it up', text: 'Walk up slowly and quietly from behind. Drop a towel over it and lift it gently.', warn: 'Big bird (hawk, owl, heron, goose or swan)? Don’t try to catch it. Keep people and dogs away, keep it in sight, and call the Animal Medical Center. No one can come? See step 4.' },
      { title: 'Put it in a closed bag or box', text: 'A paper bag, or a cardboard box with a few small air holes. Take the towel out. Keep it somewhere dark and quiet.' },
      { title: 'Get it to the Wild Bird Fund today', text: 'Every day, 9am to 7pm, no appointment. Closed and the bird is badly hurt? Take it to the Animal Medical Center’s 24-hour emergency room. Or find a licensed rehabber open now on Animal Help Now.', link: { label: 'Animal Help Now: rehabbers open now', href: 'https://ahnow.org' } },
      { title: 'Can’t get it there?', text: 'Email Urban Wildlife Alliance at helpline@urbanwildlifenyc.org with a photo, your phone number and where you are. A volunteer can’t always come. Also post it in the NYC Emergency Animal Rescue group on Facebook.' },
    ],
    never: [
      'Never give it food or water.',
      'No heating pad for a bird that hit a window: a warm room is enough.',
    ],
    remember: ['If a bird or small animal has been caught or bitten by another animal, it is an emergency, even if you can see no wound.'],
    situations: [
      {
        label: 'It hit a window', tone: 'now', verdict: 'Needs help today, even if it seems fine',
        do: ['Cover it with a towel and scoop it up.', 'Put it in a closed box with small air holes. Keep it dark and quiet.', 'Take it to a rehabber today. Birds that fly off after hitting a window often die later from shock.'],
        contacts: [{ org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm' }, { org: AMC, name: 'Animal Medical Center', when: 'After hours: 24-hour emergency room' }],
        section: 'How to catch it, box it and keep it calm',
      },
      {
        label: 'A cat, dog or other animal caught it', tone: 'now', verdict: 'An emergency, even with no wound',
        do: ['Put it in a closed box right away.', 'Get it to a rehabber today. It may need medicine the same day.'],
        contacts: [{ org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm' }, { org: AMC, name: 'Animal Medical Center', when: 'After hours: 24-hour emergency room' }],
        section: 'If it was caught or bitten by an animal',
      },
      {
        label: 'A baby bird is on the ground', tone: 'ok', verdict: 'Probably fine. Watch first.',
        do: ['Has feathers and can hop? It’s learning to fly, and its parents are close by. Leave it and watch from far away.', 'Almost no feathers? Put it back in its nest if you can. Touching it won’t make the parents reject it.', 'Hurt, or no parents after a few hours? Box it and take it to a rehabber.'],
        remember: ['Only a cold, nearly naked baby bird needs gentle warmth.'],
        contacts: [{ org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm' }],
        section: 'Is it hurt, or a young bird learning to fly?',
      },
      {
        label: 'It’s big: a hawk, owl, goose or swan', tone: 'now', verdict: 'Don’t touch it. Call for help.',
        do: ['Keep people and dogs away, and keep it in sight.', 'Call the Animal Medical Center, which takes hawks, owls and water birds at any hour. In a park, you can also call 311 and ask for the Urban Park Rangers.', 'No one can come? Email Urban Wildlife Alliance at helpline@urbanwildlifenyc.org with a photo and where it is, and post it in the NYC Emergency Animal Rescue group on Facebook.'],
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
        contacts: [{ org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm' }, { org: AMC, name: 'Animal Medical Center', when: 'After hours: 24-hour emergency room' }],
        section: 'What to do now, step by step',
      },
    ],
  },

  // Who handles a sick raccoon, skunk, bat or deer: 311, which passes it to
  // ACC in business hours or to NYC Parks in a park (311 KA-01789, read
  // 2026-11-15). The Urban Park Rangers are Parks staff, so only in parks.
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
      { title: 'Call a rehabber before you touch or move it', text: 'They will tell you if it needs rescuing, and what to do. Animal Help Now lists the ones open right now, or tap your animal below for who to call.', link: { label: 'Wildlife rehabbers, nearest first', href: '/directory?need=wildlife-rehab&near=1' } },
      { title: 'Can’t get it there, or nobody answering?', text: 'Email Urban Wildlife Alliance at helpline@urbanwildlifenyc.org with a photo, your phone number and where you are. Or post the animal, where it is and a photo in the NYC Emergency Animal Rescue group on Facebook.' },
    ],
    never: ['Do not touch a wild mammal with bare hands, and keep pets and children away.', 'Never give it food or water.'],
    situations: [
      { label: 'It’s a bird', tone: 'today', verdict: 'Birds have their own guide', do: ['Birds are different: you catch and box them yourself.'], href: '/guides/found-an-injured-bird' },
      { label: 'It’s stuck or trapped', tone: 'now', verdict: 'Call 911 if it is in danger', do: ['See what to do for a trapped animal.'], href: '/guides/animal-trapped' },
      {
        label: 'A baby squirrel or rabbit', tone: 'today', verdict: 'Call before you move it',
        do: ['Call a rehabber before you touch it. They will tell you whether to leave it for its mother or bring it in.', 'Squirrels: the Wild Bird Fund. Wild baby rabbits: Cottontail Cottage.'],
        contacts: [{ org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm' }, { org: 'cottontail-cottage-wildlife-rehab', name: 'Cottontail Cottage', when: 'Any hour' }],
        section: 'Found a baby squirrel or rabbit?',
      },
      {
        label: 'A raccoon, skunk or bat', tone: 'now', verdict: 'Don’t touch it',
        do: ['Stay away.', 'Call 311. In a park, ask for the Urban Park Rangers. No rehabber in the city may take these animals.', 'If a person or pet touched it, call a doctor or vet now.'],
        contacts: [{ org: CITY, when: 'Report it · in a park, it goes to NYC Parks' }],
        section: 'Raccoons, skunks and bats: no rehabber in the city may take them',
      },
      {
        label: 'A hurt deer, coyote or other big animal', tone: 'now', verdict: 'Stay back',
        do: ['Don’t go near it. Keep people and dogs back.', 'Call 311 in business hours, or DEC at any hour.', 'On a road, or anyone in danger? Call 911.'],
        contacts: [{ org: 'nys-dec-region-2', name: 'DEC (state wildlife office)', when: 'Dispatch, any hour', phone: 1 }, { org: CITY, when: 'Report it · in a park, it goes to NYC Parks' }],
        section: 'More situations - Animal Help Now’s guidance, in its own words',
      },
      {
        label: 'A seal, whale, dolphin or sea turtle on a beach', tone: 'now', verdict: 'Keep your distance and call',
        do: ['Stay back and keep dogs away.', 'Don’t try to move it. The hotline decides if it needs help.', 'Call the stranding hotline, any hour.'],
        contacts: [{ org: 'ny-marine-mammal-and-sea-turtle-stranding-hotline', name: 'Stranding hotline', when: 'Any hour' }, { org: 'noaa-greater-atlantic-marine-mammal-and-sea-turtle-stranding-hotline', name: 'NOAA', when: 'If the hotline doesn’t answer' }],
        section: 'Seals, whales, dolphins and sea turtles',
      },
      {
        label: 'A wild turtle', tone: 'week', verdict: 'Ask the turtle experts',
        do: ['Email the New York Turtle and Tortoise Society and ask what to do.', 'Crossing a road? If it is safe for you, move it across in the direction it was going.'],
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
      { title: 'Call first', text: 'Check they will treat your kind of animal tonight. Rabbits, birds and reptiles hide illness and get worse fast.', link: { label: 'Exotic vets, nearest first', href: '/directory?need=exotic-vet&near=1' } },
      { title: 'Night or weekend? Try the Animal Medical Center', text: 'It is open 24 hours and has its own team for birds, reptiles, rabbits and small mammals.' },
      { title: 'Poisoned? Call poison control', text: 'Have ready: the kind of animal, its weight, and what it ate or touched.' },
      { title: 'Afterwards, find your exotics vet', text: 'Rabbit and bird rescues keep lists of vets who know your animal. Save one before the next emergency.', link: { label: 'Exotic vets, nearest first', href: '/directory?need=exotic-vet&near=1' } },
    ],
    remember: ['most general small-animal vets do NOT treat rabbits, birds, reptiles or other exotics'],
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
    never: ['Never leave a pet in a car.'],
    situations: [
      {
        label: 'We have to leave now', tone: 'now', verdict: 'Take your pet with you',
        do: [
          'During an evacuation order, pets can ride the subway and buses without a carrier.',
          'A pet too big for a carrier must be muzzled and on a strong leash.',
          'Only pets that are legal in NYC are allowed at evacuation centres.',
          'Bring your pet’s Go Bag if you have one.',
        ],
      },
      {
        label: 'Getting ready before a disaster', tone: 'week', verdict: 'Three things to do now',
        do: [
          'Know your zone: find out if you live in an evacuation zone and where your nearest centre is.',
          'Pack a Go Bag for your pet: at least three days of food, water and medicine, a collar or harness with an ID tag, and a recent colour photo.',
          'Sign up for Notify NYC, the city’s free alert service, by app, text or email.',
        ],
      },
      { label: 'My pet is hurt', tone: 'now', verdict: 'Go to an emergency vet', do: ['See the animal emergencies guide.'], href: '/guides/animal-emergency' },
    ],
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
          { title: 'Get it scanned for a chip', text: 'Any vet office or ACC shelter will scan it for free.', link: { label: 'Nearest vets and shelters', href: '/directory?anyneed=microchip&anyneed=emergency-vet&anyneed=low-cost-vet&near=1' } },
          { title: 'Report it found', text: 'On Petco Love Lost and with ACC. Call ACC before you bring a dog in.', link: { label: 'ACC lost and found', href: 'https://www.nycacc.org/services/lost-and-found' } },
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
          { title: 'Get it scanned for a chip', text: 'Free at any vet or shelter. Check for a collar or tag too.', link: { label: 'Nearest vets and shelters', href: '/directory?anyneed=microchip&anyneed=emergency-vet&anyneed=low-cost-vet&near=1' } },
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
    headline: 'A pet rabbit, bird or turtle can’t survive outside for long. Tap what happened.',
    contacts: [
      { org: ACC, name: 'Animal Care Centers (ACC)', when: 'Lost and found pets of every kind, all five boroughs' },
      { org: '911-parrot-alert', name: '911 Parrot Alert', when: 'Lost and found pet birds' },
      { org: 'new-york-city-pigeon-rescue-central', name: 'NYC Pigeon Rescue Central', when: 'Tame or white pigeons' },
      { org: 'rabbit-rescue-and-rehab-nyc-chapter-house-rabbit-society', name: 'Rabbit Rescue & Rehab', when: 'Found rabbits' },
    ],
    situations: [
      {
        label: 'I lost my pet', tone: 'now', verdict: 'Report it and post it today',
        do: [
          'Tell ACC. It takes in found pets of every kind, in all five boroughs.',
          'A bird: post to 911 Parrot Alert and the Long Island Parrot Society. Give its leg band number if it has one.',
          'A rabbit or other small pet: post to rabbit rescues and local lost-pet groups.',
          'Microchipped? Call the microchip company and mark it lost.',
        ],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Lost and found' }, { org: '911-parrot-alert', name: '911 Parrot Alert', when: 'Lost birds' }, { org: 'long-island-parrot-society', name: 'Long Island Parrot Society', when: 'Lost and found parrots' }],
        section: 'General:',
      },
      {
        label: 'I found a pet bird: a parrot, budgie or cockatiel', tone: 'now', verdict: 'Get it inside, then report it',
        do: [
          'A pet bird can’t survive outside. Put it in a box or carrier somewhere warm and quiet.',
          'Post it to 911 Parrot Alert and the Long Island Parrot Society, so its owner can find it.',
          'Hurt? Call an avian vet: see the exotic pet emergency guide.',
          'A hurt wild bird, like a sparrow, robin or hawk, is different: see the guide for an injured bird.',
        ],
        contacts: [{ org: '911-parrot-alert', name: '911 Parrot Alert', when: 'Lost and found birds' }, { org: 'long-island-parrot-society', name: 'Long Island Parrot Society', when: 'Lost and found parrots' }],
        section: 'Birds (parrots, companion birds):',
      },
      {
        label: 'I found a tame or white pigeon', tone: 'now', verdict: 'It is a pet pigeon: it needs rescue',
        do: [
          'A tame, all-white or oddly coloured pigeon that lets you walk up to it is almost certainly a pet pigeon. It can’t survive outside.',
          'Contact NYC Pigeon Rescue Central, or bring it to the Wild Bird Fund.',
          'A band on its leg can lead back to its owner.',
        ],
        contacts: [{ org: 'new-york-city-pigeon-rescue-central', name: 'NYC Pigeon Rescue Central', when: 'Help request form' }, { org: WBF, name: 'Wild Bird Fund', when: 'Every day, 9am to 7pm' }],
        section: 'Pigeons & doves (feral vs domestic):',
      },
      {
        label: 'I found a rabbit or other small pet', tone: 'now', verdict: 'Keep it safe, then call a rabbit rescue',
        do: [
          'A pet rabbit can’t survive as a stray. Keep it somewhere safe, out of the heat and cold.',
          'Contact Rabbit Rescue & Rehab, All About Rabbits Rescue, Bunnies & Beyond, or ACC.',
        ],
        contacts: [{ org: 'rabbit-rescue-and-rehab-nyc-chapter-house-rabbit-society', name: 'Rabbit Rescue & Rehab', when: 'Found rabbits' }, { org: 'all-about-rabbits-rescue', name: 'All About Rabbits Rescue', when: 'Found rabbits' }, { org: 'bunnies-and-beyond', name: 'Bunnies & Beyond', when: 'Found rabbits' }],
        section: 'Rabbits & small mammals:',
      },
      {
        label: 'I found a turtle', tone: 'today', verdict: 'Pet or wild? Work that out first',
        do: [
          'Not sure if it is a pet or wild? Send NYTTS a photo and ask, before you move it.',
          'A pet turtle, such as a red-eared slider, needs a new home: NYTTS or Earthlings NYC can help.',
          'A healthy wild turtle should be left where it was found. A hurt one needs a wild-turtle rehabber: contact NYTTS.',
        ],
        never: ['Never relocate a healthy native turtle far from where it was found.'],
        contacts: [{ org: 'new-york-turtle-and-tortoise-society', name: 'NYTTS', when: 'Pet and wild turtles' }, { org: 'earthlings-nyc-turtle-team', name: 'Earthlings NYC', when: 'Pet turtles' }],
        section: 'Reptiles (turtles especially):',
      },
    ],
  },

  'save-an-at-risk-animal': {
    headline: 'Each listing closes about 42 hours after it is posted. Act fast, and do everything at once.',
    facts: ['New animals go up Sunday, Tuesday and Thursday at 6pm.', 'Each listing closes at noon two days later.'],
    contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Website trouble? Email adopt@nycacc.org' }],
    steps: [
      { title: 'Find the animal on the at-risk list', text: 'Tick “Show only available” and press “View more..” under the animal. Write down its name and ID number.', link: { label: 'Open ACC’s at-risk list', href: 'https://newhope.shelterbuddy.com/Animal/List' } },
      { title: 'See a “Reserve” button? You can adopt it', text: 'Press Reserve, then check out within 15 minutes.' },
      { title: 'Fill in both forms', text: 'The “Pre-Screener Form” on the animal’s page, and ACC’s form for fostering or adopting through a rescue group.', link: { label: 'ACC’s foster or adopt form', href: 'https://forms.gle/ozHex3uqvNkQt2dq9' } },
      { title: 'Contact every rescue group at once', text: 'Only an approved rescue group can take out a “partners only” animal. They are under Who to contact in the full guide, with ready-made messages to send.', link: { label: 'ACC’s full list of approved rescue partners', href: 'https://www.nycacc.org/programs/new-hope-partners/' } },
    ],
    never: ['Do not wait to hear back from either form.'],
    remember: ['The animal is safe only when a rescue group tells you it has confirmed the pull with ACC.'],
  },

  'keeping-your-dog': {
    headline: 'Before you give up your dog, ask for help. There is free help with food, vet bills, training and housing. Tap what you need.',
    action: { label: 'Free pet food, nearest first', href: '/directory?need=food-assistance&near=1' },
    contacts: [
      { org: ACC, name: 'ACC owner support', when: 'A counsellor calls you back within about 3 days' },
      { org: 'paws-ny', name: 'PAWS NY', when: 'Free help at home for older, ill or disabled owners' },
      { org: 'animal-haven-community-engagement', name: 'Animal Haven', when: 'Short-term boarding in a crisis' },
    ],
    situations: [
      {
        label: 'I need food for my dog', tone: 'week', verdict: 'Free pet food is available',
        do: ['The city gives free dog and cat food at 22 food pantries. The food is new, so ring before you go.', 'ACC may also give food and supplies. Ask when you call.'],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Food and supplies · ask' }],
        section: 'PET FOOD PANTRIES (specific programs)',
      },
      { label: 'I can’t afford the vet', tone: 'week', verdict: 'Funds and payment plans', do: ['See every way to get help with a vet bill.'], href: '/guides/help-paying-for-care' },
      {
        label: 'I need help training my dog', tone: 'week', verdict: 'Free training help',
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
        label: 'I have to give up my dog', tone: 'today', verdict: 'Find it a new home without a shelter',
        do: [
          'Ask the rescue or shelter you got it from first. Many will take it back.',
          'Rehome it yourself, so it never goes into a shelter. ACC’s Rehoming Your Pet page has tools for this.',
          'Or contact rescues that take owner surrenders.',
          'ACC takes any animal, but ask it for help keeping your dog first.',
        ],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Rehoming tools · help to keep your dog' }],
        section: 'ACC OWNER SUPPORT',
      },
    ],
  },

  'keeping-your-cat': {
    headline: 'Before you give up your cat, ask for help. There is free help with food, vet bills, litter box and other habits, and a crisis. Tap what you need.',
    action: { label: 'Free pet food, nearest first', href: '/directory?need=food-assistance&near=1' },
    contacts: [
      { org: ACC, name: 'ACC Community Pets', when: 'Help so your cat can stay home' },
      { org: 'paws-ny', name: 'PAWS NY', when: 'Free help at home for older, ill or disabled owners' },
      { org: 'animal-haven-community-engagement', name: 'Animal Haven', when: 'Short-term boarding in a crisis' },
    ],
    situations: [
      {
        label: 'I need food for my cat', tone: 'week', verdict: 'Free pet food is available',
        do: ['The city gives free dog and cat food at 22 food pantries. The food is new, so ring before you go.', 'ACC may also give food and supplies. Ask when you call.'],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Food and supplies · ask' }],
        section: 'PET FOOD PANTRIES (specific programs)',
      },
      { label: 'I can’t afford the vet', tone: 'week', verdict: 'Funds and payment plans', do: ['See every way to get help with a vet bill.'], href: '/guides/help-paying-for-care' },
      {
        label: 'Litter box, scratching or other habits', tone: 'week', verdict: 'See a vet first, then ask for help',
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
        label: 'I have to give up my cat', tone: 'today', verdict: 'Find it a new home without a shelter',
        do: [
          'Ask the rescue or shelter you got it from first. Many will take it back.',
          'Rehome it yourself, so it never goes into a shelter. It is often less stressful for a cat. ACC’s Rehoming Your Pet page has tools for this.',
          'Or contact rescues that take owner surrenders.',
          'ACC takes any animal, but ask it for help keeping your cat first.',
        ],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Rehoming tools · help to keep your cat' }],
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
  },

  'help-paying-for-care': {
    headline: 'Can’t afford the vet? Go anyway. Then apply to several funds at once: the money runs out fast.',
    facts: ['Grants are paid to the vet, not to you.', 'Many funds ask you to try a payment plan first.'],
    action: { label: 'Every fund we list', href: '/directory?need=financial-aid' },
    contacts: [
      { org: 'redrover-relief', name: 'RedRover Relief', when: 'Urgent, life-threatening care' },
      { org: 'frankies-friends', name: 'Frankie’s Friends', when: 'Emergency or specialist care' },
      { org: 'the-pet-fund', name: 'The Pet Fund', when: 'Long-term illness · email before treatment' },
      { org: 'carecredit', name: 'CareCredit', when: 'Pay over time' },
    ],
    situations: [
      {
        label: 'It’s an emergency right now', tone: 'now', verdict: 'Apply to two or three today',
        do: ['Apply to RedRover Relief for urgent, life-threatening care.', 'Apply to Frankie’s Friends too.', 'Ask the vet about CareCredit or Scratchpay while you wait.'],
        contacts: [{ org: 'redrover-relief', name: 'RedRover Relief', when: 'Urgent care' }, { org: 'frankies-friends', name: 'Frankie’s Friends', when: 'Emergency or specialist care' }],
        section: 'GENERAL vet-bill funds that cover exotics (birds, rabbits, guinea pigs, etc.):',
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
        do: ['RedRover Relief helps birds, rabbits and guinea pigs.', 'The Animal Medical Center has a fund for rabbits and one for birds, for animals treated there.', 'For insurance, ask Nationwide about its Avian & Exotic plan.'],
        contacts: [{ org: 'redrover-relief', name: 'RedRover Relief', when: 'Urgent care' }],
        section: 'EXOTIC-SPECIFIC vet-bill funds (rare - these actually name exotics):',
      },
      {
        label: 'Being treated at the Animal Medical Center', tone: 'today', verdict: 'Its own funds: 5 business days to apply',
        do: ['Ask a Client Services Manager about its funds the day you arrive.', 'An AMC vet must see your pet first.', 'You must live in New York, New Jersey or Connecticut.'],
        contacts: [{ org: AMC, name: 'Animal Medical Center funds', when: 'Ask the day you arrive' }],
        section: 'IF THE ANIMAL IS BEING TREATED AT THE ANIMAL MEDICAL CENTER (AMC)',
      },
      {
        label: 'Planning ahead', tone: 'ok', verdict: 'Insurance, started early',
        do: ['Insurance won’t pay for a problem your pet already has. Start while your pet is young and healthy.'],
        section: 'PET INSURANCE - dogs and cats (checked on each company’s own site, 2026-11-04)',
      },
      {
        label: 'I run a rescue', tone: 'ok', verdict: 'Help for rescue groups',
        do: ['AMC to the Rescue helps animals in a rescue’s care whose health stops them being adopted.'],
        section: 'For RESCUES (not individuals):',
      },
    ],
  },

  'low-cost-dog-care': {
    headline: 'Free and low-cost vet care is in every borough. Most of it needs a booking or a waitlist, so start early. Tap what you need.',
    action: { label: 'Low-cost vets, nearest first', href: '/directory?need=low-cost-vet&near=1' },
    contacts: [
      { org: 'aspca-spay-neuter-nyc', name: 'ASPCA spay/neuter', when: 'Same-day waitlist opens at 6am' },
      { org: 'the-toby-project', name: 'The Toby Project', when: 'Free spay/neuter with public assistance' },
      { org: 'humane-society-of-new-york', name: 'Humane Society of New York', when: 'Low-cost vet hospital · Manhattan' },
    ],
    situations: [
      {
        label: 'A check-up or a sick dog', tone: 'week', verdict: 'Low-cost clinics',
        do: [
          'ASPCA community clinics in the Bronx, Brooklyn and Queens, by appointment, for owners who qualify on income.',
          'The Humane Society of New York runs a low-cost vet hospital in Manhattan.',
          'See more lower-cost clinics, nearest first.',
        ],
        contacts: [{ org: 'aspca-community-veterinary-clinic', name: 'ASPCA community clinics', when: 'By appointment · income-qualified' }, { org: 'humane-society-of-new-york', name: 'Humane Society of New York', when: 'Low-cost vet hospital' }],
        section: 'ASPCA community veterinary clinics - by borough (appointment only, income-qualified)',
      },
      {
        label: 'Spay or neuter', tone: 'week', verdict: 'Free or low-cost',
        do: ['The ASPCA’s same-day waitlist opens at 6am.', 'The Toby Project is free with proof of public assistance.', 'The Humane Society of New York has free programmes.', 'Friends of Animals sells low-cost certificates to use at vets.'],
        contacts: [{ org: 'aspca-spay-neuter-nyc', name: 'ASPCA spay/neuter', when: 'Same-day waitlist' }, { org: 'the-toby-project', name: 'The Toby Project', when: 'Free with public assistance' }],
        section: 'Citywide - free / low-cost spay-neuter',
      },
      {
        label: 'Vaccines and a microchip', tone: 'week', verdict: 'Walk-in clinics and events',
        do: ['Petco Vetco and VIP Petcare run walk-in vaccine and microchip clinics in many pet stores, with no exam fee.', 'Sean Casey Animal Rescue runs low-cost vaccine and microchip clinics in Brooklyn.', 'ACC holds low-cost vaccine and microchip events across the boroughs.'],
        contacts: [{ org: 'petco-vetco-vetco-vaccine-clinics', name: 'Petco Vetco', when: 'Walk-in clinics' }, { org: 'vip-petcare-clinics', name: 'VIP Petcare', when: 'Walk-in clinics' }, { org: 'sean-casey-animal-rescue', name: 'Sean Casey Animal Rescue', when: 'Low-cost clinics · Brooklyn' }],
        section: 'Vaccine + microchip events',
      },
      {
        label: 'Teeth', tone: 'week', verdict: 'A low-cost dog dentist',
        do: ['The Humane Society of New York has a low-cost dog dentist. It books up fast, so call early.'],
        contacts: [{ org: 'humane-society-of-new-york', name: 'Humane Society of New York', when: 'Low-cost dentistry' }],
        section: 'Low-cost dog dental (periodontal disease affects about 80% of dogs over age 3)',
      },
      {
        label: 'A dog licence', tone: 'ok', verdict: 'Required for every dog over 4 months',
        do: ['Every dog over 4 months needs a licence and a rabies shot. Apply online at the city’s dog licence page, or by mail.'],
        section: 'NYC dog license - legally required (NYC Health Code 161.04)',
      },
    ],
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
      { title: 'Borrow a trap', text: 'Reserve one from the Neighborhood Cats trap bank, or ask the Feral Cat Initiative helpdesk.', link: { label: 'Trap banks', href: '/directory?need=trap-bank' } },
      { title: 'Book a clinic before you trap', text: 'Pick one that works with feral cats. Ask them first.', link: { label: 'Spay and neuter clinics, nearest first', href: '/directory?need=spay-neuter&animal=cat&near=1' } },
    ],
    tip: 'Your own pet cat? The ASPCA’s free clinics are for owners on public assistance in some zip codes. The Humane Society of New York is low-cost for any cat.',
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
      { title: 'Get TNR-certified', text: 'Neighborhood Cats runs a free online workshop every month; more than 15,000 New Yorkers have done it. The NYC Feral Cat Initiative runs free ones too.', link: { label: 'Neighborhood Cats workshop', href: 'https://www.neighborhoodcats.org/how-to-tnr' } },
      { title: 'Register your colony', text: 'Log your cats on Cat Stats. It tracks progress and can help protect a feeding spot.' },
      { title: 'Trap and fix', text: 'Borrow traps and book free spay/neuter. ASPCA Spay/Neuter offers free transport to its clinics.', link: { label: 'Spay and neuter clinics, nearest first', href: '/directory?need=spay-neuter&animal=cat&near=1' } },
    ],
    more: {
      title: 'Help for your colony',
      links: [
        { label: 'Free food, straw and winter shelter giveaways', href: '#g-free-cat-food-straw-winter-shelters-for-colonies' },
        { label: 'How to build a winter shelter (Bideawee)', href: 'https://www.bideawee.org/wp-content/uploads/2020/09/CatShelter.pdf' },
        { label: 'How to build a winter shelter (Alley Cat Allies)', href: 'https://www.alleycat.org/resources/how-to-build-an-outdoor-shelter/' },
        { label: 'Ready-made shelters to buy', href: 'https://www.alleycat.org/resources/feral-cat-shelter-options-gallery/' },
        { label: 'Vet care for colony cats', href: '#g-medical-for-colony-cats-sick-injured-dental' },
        { label: 'Someone to trap with you, holding space and fosters', href: '#g-hands-on-help-someone-to-trap-with-you-holding-space-fosters' },
        { label: 'Grants for TNR and colony vet costs', href: '#g-grants-financial-help-for-tnr-colony-vet-costs' },
        { label: 'Help with neighbours and feeding disputes', href: '#g-community-relations-help-neighbor-complaints-feeding-disputes-moving-a-feeding-station' },
      ],
    },
  },

  'cats-with-special-needs': {
    headline: 'Specialist cat rescues fill up fast. Contact several at once, and ring first to check they have room. Tap the kind of cat.',
    contacts: [
      { org: 'itty-bitty-city-kitties', name: 'Itty Bitty City Kitties', when: 'Newborn kittens that need bottle feeding' },
      { org: 'ny-cat-warriors', name: 'NY Cat Warriors', when: 'Urgent and complex medical cases' },
      { org: 'tavi-and-friends', name: 'Tavi & Friends', when: 'Senior, FIV+ and special-care cats' },
    ],
    situations: [
      {
        label: 'Newborn kittens, or a pregnant cat', tone: 'now', verdict: 'Contact a kitten nursery',
        do: ['Kittens that still need a bottle need care around the clock.', 'Contact a kitten nursery such as Itty Bitty City Kitties or Cat Castle, or see every kitten nursery.'],
        contacts: [{ org: 'itty-bitty-city-kitties', name: 'Itty Bitty City Kitties', when: 'Bottle babies' }, { org: 'cat-castle-nyc', name: 'Cat Castle', when: 'Kittens' }],
        section: 'Neonatal / bottle-baby (unweaned kittens needing round-the-clock care)',
      },
      {
        label: 'Very sick or hurt', tone: 'today', verdict: 'Medical rescues',
        do: ['Hurt right now? Go to an emergency vet first.', 'Then contact NY Cat Warriors, Little Wanderers or Sean Casey Animal Rescue. Ring first to check they have room.'],
        contacts: [{ org: 'ny-cat-warriors', name: 'NY Cat Warriors', when: 'Medical cases' }, { org: 'little-wanderers-nyc', name: 'Little Wanderers', when: 'Medical cases' }],
        section: 'Sick / injured / critical-medical (cats needing emergency or intensive vet care)',
      },
      {
        label: 'A senior cat', tone: 'week', verdict: 'Rescues for older cats',
        do: ['Tavi & Friends and KittyKind take senior and special-care cats.'],
        contacts: [{ org: 'tavi-and-friends', name: 'Tavi & Friends', when: 'Senior cats' }, { org: 'kittykind', name: 'KittyKind', when: 'Senior cats' }],
        section: 'Senior cats',
      },
      {
        label: 'FIV+ or FeLV+', tone: 'week', verdict: 'Rescues that take them',
        do: ['Bronx Tails, Empty Cages Collective and Tavi & Friends take FIV+ or FeLV+ cats. See every FIV+ and FeLV+ rescue.'],
        contacts: [{ org: 'bronx-tails-cat-rescue', name: 'Bronx Tails', when: 'FIV+ and FeLV+' }, { org: 'empty-cages-collective', name: 'Empty Cages Collective', when: 'FIV+ and FeLV+' }],
        section: 'FeLV+ / FIV+ (retrovirus-positive cats)',
      },
      {
        label: 'Disabled: three legs, blind or wobbly', tone: 'week', verdict: 'Special-needs rescues',
        do: ['K9Kastle, Saint Spiro and For Blake’s Sake take disabled cats.'],
        contacts: [{ org: 'k9kastle', name: 'K9Kastle', when: 'Special needs' }, { org: 'saint-spiro-cat-rescue-inc', name: 'Saint Spiro', when: 'Special needs' }],
        section: 'Special-needs / disabled (3-legged, neurological, blind, chronic conditions)',
      },
    ],
  },

  'breed-specific-dog-rescue': {
    action: { label: 'Every breed rescue in the directory', href: '/directory?need=breed-specific' },
    headline: 'Breed rescues know their breed. Adopt from one, or ask one for help if you can no longer keep your dog. Tap what you need, or your dog’s breed.',
    contacts: [{ org: 'new-york-bully-crew', name: 'New York Bully Crew', when: 'All bully breeds · takes surrenders' }],
    tip: '“Bully breed” describes a body type, not how a dog behaves.',
    situations: [
      {
        label: 'I want to adopt a particular breed', tone: 'week', verdict: 'Find its breed rescue below',
        do: ['Tap the breed below for its rescues.', 'Most are volunteer networks outside the city: ask if they place dogs in New York City.', 'Shelters and general rescues have many of these breeds too.'],
      },
      {
        label: 'I can no longer keep my dog', tone: 'today', verdict: 'Contact two or three at once',
        do: ['Tap your dog’s breed below for its rescues.', 'Contact two or three at once: they are run by volunteers and fill up.', 'Ask if they take dogs from New York City and have a foster home free now.', 'Other help, before you give up your dog: see the guide on keeping your dog.'],
      },
      { label: 'My building restricts my dog’s breed', tone: 'week', verdict: 'Get help before you give up your dog', do: ['See breed and housing help in the dog behaviour guide.'], href: '/guides/dog-behavior-and-legal' },
      { label: "All bully breeds", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("All-\"bully\" / multi-breed rescues (take the full group)")}` },
      { label: "Pit bulls and Staffies", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Pit-type (Am. Pit Bull Terrier / Am. Staffordshire / Staffie)")}` },
      { label: "Bulldogs", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Bulldog - English / French / American (part of the \"bully\"/molosser group)")}` },
      { label: "Rottweilers", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Rottweiler (part of the \"bully\"/molosser group)")}` },
      { label: "Boxers", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Boxer (part of the \"bully\"/molosser group)")}` },
      { label: "Dobermans and pinschers", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Doberman / pinscher (part of the guardian/molosser group)")}` },
      { label: "Cane corsos, mastiffs and Great Danes", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Cane corso / dogo / presa / mastiff / Great Dane (large \"bully\"/molosser)")}` },
      { label: "Huskies and northern breeds", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Husky / northern breeds")}` },
      { label: "German shepherds and malinois", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("German shepherd / malinois / Dutch shepherd")}` },
      { label: "Labs, goldens and pointers", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Retrievers (lab / golden) & pointers")}` },
      { label: "Chihuahuas, dachshunds and small breeds", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Small breed / chihuahua / dachshund / yorkie / maltese")}` },
      { label: "Poodles, doodles and bichons", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Poodle / doodle / bichon")}` },
      { label: "Shibas, akitas and Asian breeds", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Shiba / akita / Asian breeds")}` },
      { label: "Beagles, hounds and bassets", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Beagle / hound / basset")}` },
      { label: "Pugs", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Pug")}` },
      { label: "Herding breeds", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Herding (Australian shepherd / cattle dog / collie / sheepdog)")}` },
      { label: "Setters, spaniels and sporting breeds", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Setter / spaniel / sporting")}` },
      { label: "Cavaliers and toy breeds", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Cavalier / toy / companion breeds")}` },
      { label: "Greyhounds and sighthounds", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Greyhound / sighthound")}` },
      { label: "Basenjis, shar-peis and bull terriers", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Basenji / sharpei / bull terrier / other purebred networks")}` },
      { label: "Terriers and schnauzers", tone: 'week', verdict: 'Rescues for this breed', do: ['Every rescue we know for this breed, with its link, in the full guide.'], href: `#${headingId("Terrier / schnauzer / small purebred networks")}` },
    ],
  },

  'dog-behavior-and-legal': {
    headline: 'Help with training is often free. Start with ACC. Tap what is happening.',
    contacts: [
      { org: ACC, name: 'ACC Community Pets', when: 'Free dog training, in person or by video' },
      { org: 'bideawee-manhattan-adoption-center', name: 'Bideawee', when: 'Training help and advice' },
      { org: CITY, when: 'Report a dog bite within 24 hours' },
    ],
    remember: ['This is not legal advice.'],
    situations: [
      {
        label: 'I need help training my dog', tone: 'week', verdict: 'Free training first',
        do: [
          'ACC’s Community Pets programme has free trainers, plus free guides online.',
          'Paying for a trainer? Choose one who rewards good behaviour rather than punishing. Find certified trainers at ccpdt.org or iaabc.org.',
        ],
        contacts: [{ org: ACC, name: 'ACC Community Pets', when: 'Free training' }],
        section: 'How to choose a positive-reinforcement trainer',
      },
      {
        label: 'A sudden change, or biting or growling', tone: 'today', verdict: 'Ask your vet first',
        do: ['A sudden change can be a health problem. See your vet.', 'A veterinary behaviourist can help and can prescribe medicine. Find one at dacvb.org.'],
        section: 'NYC behavior + reactivity specialists',
      },
      {
        label: 'My dog bit someone', tone: 'today', verdict: 'Report it within 24 hours',
        do: ['Report the bite to 311 within 24 hours.', 'Anyone bitten should get medical advice.'],
        contacts: [{ org: CITY, when: 'Report a dog bite' }],
        section: 'NYC bite reporting (Health Code 11.03)',
      },
      {
        label: 'My landlord has a breed rule', tone: 'week', verdict: 'Get help before you give up your dog',
        do: ['New York City has no breed ban. Landlords and NYCHA can set their own rules.', 'ACC can help with a housing problem.'],
        contacts: [{ org: ACC, name: 'Animal Care Centers (ACC)', when: 'Housing help' }],
        section: 'Breed / housing-restriction support',
      },
    ],
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
    headline: 'Most kennels won’t take rabbits, birds or reptiles. Plan ahead. Tap what you need.',
    contacts: [
      { org: 'the-center-for-avian-and-exotic-medicine', name: 'Center for Avian & Exotic Medicine', when: 'Ask about medical boarding and grooming' },
      { org: 'long-island-parrot-society', name: 'Long Island Parrot Society', when: 'List of bird sitters and groomers' },
    ],
    never: ['do not DIY a beak or a rabbit\'s teeth'],
    situations: [
      {
        label: 'I need boarding or a pet sitter', tone: 'week', verdict: 'Someone who knows your kind of animal',
        do: ['Boarding at an exotics vet is safest for an animal with health needs.', 'Ask any sitter if they know your kind of animal, and who their emergency vet is.'],
        contacts: [{ org: 'the-center-for-avian-and-exotic-medicine', name: 'Center for Avian & Exotic Medicine', when: 'Medical boarding' }],
        section: 'Exotic boarding & pet-sitting (most dog/cat kennels will not take exotics; these specialize):',
      },
      {
        label: 'Beaks, wings, nails or teeth', tone: 'week', verdict: 'Use an exotics vet',
        do: ['Use an exotics vet for beaks, wings, nails and teeth.'],
        remember: ['overgrown rabbit teeth are a medical emergency, not a grooming task'],
        section: 'Exotic grooming (nail/beak/wing trims, shell/tooth checks - do not DIY a beak or a rabbit\'s teeth):',
      },
      {
        label: 'If I can no longer care for it', tone: 'ok', verdict: 'Name someone now',
        do: ['Parrots can live 30 to 80 years and often outlive their owners.', 'Name someone to care for your pet, and think about a pet trust.'],
        section: 'Life-planning: who cares for your exotic if you can\'t? (critical for long-lived species)',
      },
      {
        label: 'A disaster or evacuation', tone: 'ok', verdict: 'Pack a kit now',
        do: ['A carrier, a heat source with a battery pack, several days of food, medicine and vet records.'],
        section: 'Disaster / evacuation planning (exotics need species-specific prep that generic plans miss):',
      },
    ],
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
