/**
 * Turning the guide tabs and the wildlife document into Markdown pages.
 *
 * Safety guidance is copied, not summarised. Several warnings here are
 * counter-intuitive and people act on them under stress -- a window-strike bird
 * must NOT be given supplemental heat even though a cold nestling should be
 * warmed; injured wildlife must never be offered food or water. Paraphrasing
 * risks softening exactly the instruction that matters, so bullets and
 * paragraphs are carried across verbatim.
 */
import { writeFileSync } from 'node:fs';
import { parseGuideTab, guideTabsOf } from './guide-parse.ts';
import { readDocxParagraphs } from '../lib/docx-lite.ts';
import { scrubText } from './privacy.ts';
import type { Org } from '../../src/types.ts';

export interface GuidePage {
  slug: string;
  title: string;
  /** Short description for the page header and search results. */
  summary: string;
  /** Situations this page answers, used by the home-page tiles and by chat. */
  topics: string[];
  markdown: string;
  source: string;
  /** Privacy holds that fired while building this page. */
  redactions: string[];
  /**
   * Who wrote the words. Only for a guide written in the first person by a
   * named person, which the wildlife document is; the workbook tabs are
   * compiled research and carry none.
   */
  byline?: string;
}

interface TabSpec {
  file: string;
  tab: string;
  slug: string;
  title: string;
  summary: string;
  topics: string[];
  /**
   * Sections still read for the directory (GUIDE_ORG_SOURCES) but not shown
   * in the guide. A reviewer asked on 2026-11-04 for guides to be the
   * know-how the directory cannot give, not a second copy of it: a list of
   * hospitals in a guide falls out of date beside the listings shown, kept
   * current, at the foot of the same page.
   */
  omitSections?: RegExp;
  /**
   * The order sections should appear in, by the start of each heading. A
   * reviewer found the wildlife guide hard to follow (2026-11-05): the
   * workbook's order is the order the research was done in, not the order
   * someone on a pavement needs. Sections not named keep their place after
   * these; a name that matches nothing throws, so a renamed heading is noticed.
   */
  sectionOrder?: string[];
  /** Lines put before the guide's own text, built from the records. */
  prepend?: (orgs: Org[]) => string[];
}

const WB_CAT = 'research/NYC_Cat_Rescue_TNR_Reference.xlsx';
const WB_DOG = 'research/NYC_Dog_Rescue_Reference.xlsx';
const WB_EXOTIC = 'research/NYC_Exotic_SmallAnimal_Wildlife_Reference.xlsx';
// Its own source: abuse reporting is not a tab on any species workbook, and
// is not about a species.
const WB_ABUSE = 'research/NYC_Animal_Abuse_Reporting.xlsx';
// Also its own source: the at-risk list is an ACC process, not a species topic.
const WB_NEWHOPE = 'research/NYC_ACC_At_Risk_New_Hope.xlsx';
// Its own source: a reviewer's question about a woman facing shelter with her
// cat, checked line by line against the city's pages on 2026-11-04.
const WB_HOUSING = 'research/NYC_Housing_Crisis_Pets.xlsx';
// Written 2026-11-04 at the reviewer's request, from NYC Emergency
// Management's own published guidance; quotations are its words.
const WB_DISASTER = 'research/NYC_Pets_In_A_Disaster.xlsx';
// Its own guide since 2026-11-05: a reviewer pointed out that leaving abuse
// with a pet sat at the foot of the housing guide, where someone in danger
// would have to read past shelter applications to find it. Quotations are
// the National Domestic Violence Hotline's own; places are the listings'.
const WB_DV = 'research/NYC_Leaving_Abuse_With_Pets.xlsx';

/**
 * Which tabs become pages, and what each page is called in plain language.
 * Tabs not listed here are still parsed for organization extraction; they just
 * do not get a page of their own.
 */
export const GUIDE_PAGES: TabSpec[] = [
  {
    file: WB_DV, tab: 'Leaving abuse with your pet', slug: 'leaving-abuse-with-your-pet',
    title: 'Leaving an abusive home with your pet',
    summary: 'Shelters in New York City where survivors and pets stay together, keeping your pet safe while you get to safety, planning for your pet, and how a court can protect it.',
    topics: ['domestic violence', 'abuse', 'abusive partner', 'leaving abuse', 'dv shelter', 'safe haven', 'order of protection', 'pets and domestic violence', 'survivor', 'URI PALS', 'safe horizon', 'threatening my pet'],
  },
  {
    file: WB_DISASTER, tab: 'Pets in a disaster', slug: 'pets-in-a-disaster',
    title: 'Pets in a disaster or evacuation',
    summary: 'Evacuation shelters in New York City take pets. What to pack, how to get there, extreme heat, and first aid.',
    topics: ['disaster', 'evacuation', 'evacuate', 'hurricane', 'flood', 'storm', 'fire', 'emergency plan', 'go bag', 'preparedness', 'heat wave', 'hot car', 'cooling center', 'evacuation shelter', 'pet first aid'],
  },
  {
    file: WB_HOUSING, tab: 'Keep your pet if you lose your home', slug: 'keep-your-pet-if-you-lose-your-home',
    title: 'Keeping your pet if you are losing your home',
    summary: 'Homebase, bringing an emotional support animal into a city shelter, where to apply, and somewhere safe for your pet meanwhile.',
    topics: ['homeless', 'homelessness', 'eviction', 'evicted', 'losing my home', 'lost my home', 'shelter with my pet', 'homeless shelter', 'emotional support animal', 'ESA', 'reasonable accommodation', 'Homebase', 'PATH', 'housing crisis', 'temporary boarding', 'keep my pet', 'nowhere to live'],
  },
  {
    file: WB_NEWHOPE, tab: 'Save an animal from the at-risk list', slug: 'save-an-at-risk-animal',
    // Named in the reader's words. "New Hope" and "at-risk list" are ACC's
    // terms; a reviewer pointed out nobody searching in a hurry knows them.
    // "New Hope Program" added back to the title on 2026-11-05: the reviewer
    // pointed out it is the name people who have heard of it search for.
    title: "Save a shelter animal from euthanasia: ACC's at-risk list (the New Hope Program)",
    summary: 'Three times a week the NYC shelter lists cats and dogs who may be euthanised if nobody takes them, and each listing closes within about 42 hours. How to check an animal, who may adopt it, the two forms to fill in, and how to get a rescue group to pull it.',
    topics: ['urgent list', 'euthanasia list', 'at risk list', 'at-risk', 'new hope', 'euthanasia', 'euthanized', 'euthanised', 'put down', 'put to sleep', 'death row', 'kill list', 'ACC', 'pull', 'rescue partner', 'save a dog', 'save a cat', 'save a dog from the shelter', 'adopt from ACC', 'foster to save', 'reserve', 'A-number'],
  },
  {
    file: WB_ABUSE, tab: 'Report animal abuse', slug: 'report-animal-abuse',
    title: 'Reporting animal abuse or neglect',
    summary: 'Who to call in New York City, and what to do.',
    topics: ['animal abuse', 'animal cruelty', 'neglect', 'report abuse', 'dogfighting', 'hoarding', '311'],
  },
  {
    file: WB_CAT, tab: 'Emergency & poison control', slug: 'animal-emergency',
    title: 'Animal emergencies and poison control',
    summary: 'Where to go right now if you think an animal is hurt, very ill, poisoned or in danger.',
    topics: ['emergency', 'poisoning', '24 hour vet', 'hit by car', 'bleeding'],
    // Every hospital is listed, with hours and open-now, below the guide.
    omitSections: /^(BROOKLYN|MANHATTAN|QUEENS|STATEN ISLAND|BRONX) - /,
  },
  {
    file: WB_CAT, tab: 'Clinics, traps & support', slug: 'low-cost-clinics-and-trap-banks',
    title: 'Low-cost clinics and trap banks',
    summary: 'How to get a cat spayed or neutered for free or cheaply, where to borrow a humane trap, and dental care for feral cats.',
    topics: ['low-cost vet', 'spay neuter', 'borrow a trap', 'trap bank'],
    // Borough clinic lists, vet-bill help and owner support are listed below and have their own guides.
    omitSections: /^(BROOKLYN|MANHATTAN|QUEENS|BRONX|STATEN ISLAND) - |^HELP PAYING VET BILLS|^OWNER-SUPPORT/,
  },
  {
    file: WB_CAT, tab: 'Colony & feral care', slug: 'starting-tnr',
    title: 'Community cats, colonies and starting TNR',
    summary: 'How trap-neuter-return works in New York City, and who will help you do it.',
    topics: ['TNR', 'feral cats', 'colony care', 'community cats'],
  },
  {
    file: WB_CAT, tab: 'Specialty view', slug: 'cats-with-special-needs',
    title: 'Cats needing specialist help',
    summary: 'Neonatal kittens, critical medical cases, special needs, seniors and FeLV+/FIV+ cats.',
    topics: ['newborn kittens', 'bottle babies', 'sick cat', 'special needs cat'],
  },
  {
    file: WB_CAT, tab: 'Lost-found & behavior', slug: 'lost-and-found-cat',
    title: 'Lost or found a cat',
    summary: 'What to do first, where to post, and who helps with searching.',
    topics: ['lost cat', 'found cat', 'missing pet'],
  },
  {
    file: WB_CAT, tab: 'Owner support & surrender prev.', slug: 'keeping-your-cat',
    title: "Help keeping your cat",
    summary: 'Food, vet bills, housing, and temporary care, before surrender becomes the only option.',
    topics: ['cannot keep my cat', 'surrender', 'pet food help', 'cannot afford vet'],
    // Covered in full, and kept current, by the guide Help paying for veterinary care.
    omitSections: /^HELP PAYING VET BILLS|^PET INSURANCE|^DOMESTIC-VIOLENCE PET SAFE-KEEPING/,
  },
  {
    file: WB_DOG, tab: 'Owner support & surrender prev.', slug: 'keeping-your-dog',
    title: 'Help keeping your dog',
    summary: 'Support with costs, housing and behaviour, plus how surrender works if you still need it.',
    topics: ['cannot keep my dog', 'rehome dog', 'surrender dog', 'dog food help'],
    // Covered in full, and kept current, by the guide Help paying for veterinary care.
    omitSections: /^VET-BILL FINANCIAL AID|^PET INSURANCE|^DOMESTIC-VIOLENCE PET SAFE-KEEPING/,
  },
  {
    file: WB_DOG, tab: 'Low-cost vet, s-n & licensing', slug: 'low-cost-dog-care',
    title: 'Low-cost vet care, spay/neuter and dog licensing',
    summary: 'Affordable veterinary care across the five boroughs, and how to license a dog in NYC.',
    topics: ['low cost vet dog', 'dog license', 'spay neuter dog'],
    // Covered in full, and kept current, by the guide Help paying for veterinary care.
    omitSections: /^VET-BILL FINANCIAL AID|^PET INSURANCE/,
  },
  {
    file: WB_DOG, tab: 'Training, behavior & legal', slug: 'dog-behavior-and-legal',
    title: 'Dog behaviour, training and legal questions',
    summary: 'Behaviour help, bite reporting, breed rules and housing law.',
    topics: ['dog behavior', 'dog training', 'dog bite', 'landlord dog'],
  },
  {
    file: WB_DOG, tab: 'Lost-found & microchip', slug: 'lost-and-found-dog',
    title: 'Lost or found a dog',
    summary: 'The first hours matter most. Where to look, who to call, and how microchips help.',
    topics: ['lost dog', 'found dog', 'stray dog'],
  },
  {
    file: WB_DOG, tab: 'Breed-specific rescues', slug: 'breed-specific-dog-rescue',
    title: 'Breed-specific dog rescue',
    summary: 'Rescues that focus on a particular breed or group of breeds.',
    topics: ['breed rescue', 'specific breed'],
  },
  {
    file: WB_EXOTIC, tab: 'Wildlife rehabilitation', slug: 'found-wildlife',
    title: 'Found injured or orphaned wildlife',
    summary: 'Squirrels, rabbits, raccoons, deer, turtles and seals: who to call, and what not to do. Birds have their own guide.',
    topics: ['injured wildlife', 'baby squirrel', 'baby rabbit', 'wild animal', 'rehabber', 'raccoon', 'bat', 'deer', 'turtle', 'seal'],
    prepend: wildlifeWhoToCall,
    // Who to call first, then the animals people actually find, then how to
    // find a rehabber, then everything else (reviewer, 2026-11-05).
    sectionOrder: [
      'Found a baby squirrel',
      "The city's wildlife hospital",
      'Finding a licensed rehabber',
      "The state's register",
      'A second directory',
      'More situations',
      'Raccoons, skunks and bats',
      'Seals, whales',
      'Wild turtles',
      'Hawks, owls',
      "Can't take an injured bird",
      'What to do, and what not',
      'Vets who will see a wild animal',
    ],
  },
  {
    file: WB_EXOTIC, tab: 'Exotic-vet & emergency care', slug: 'exotic-pet-emergency',
    title: 'Exotic pet emergencies',
    summary: 'Rabbits, birds, reptiles and small mammals need an exotic-capable vet. Call ahead.',
    topics: ['rabbit emergency', 'bird sick', 'reptile vet', 'exotic vet'],
  },
  {
    file: WB_EXOTIC, tab: 'Species care & legality', slug: 'exotic-pet-legality',
    title: 'What you can legally keep in New York City',
    summary: 'Which animals are legal as pets in NYC, and which must go to a rehabber or sanctuary.',
    topics: ['is it legal', 'ferret ban', 'keep a wild animal', 'pet rules NYC'],
  },
  {
    file: WB_EXOTIC, tab: 'Financial aid & low-cost care', slug: 'help-paying-for-care',
    title: 'Help paying for veterinary care',
    summary: 'Grants, funds and low-cost options when you cannot afford treatment.',
    topics: ['cannot afford vet', 'financial aid', 'vet bill help'],
  },
  {
    file: WB_EXOTIC, tab: 'Owner support & surrender prev.', slug: 'rehoming-an-exotic-pet',
    title: 'Rehoming a rabbit, bird, reptile or small animal',
    summary: 'Never release a domestic animal outdoors. Where to surrender responsibly.',
    topics: ['rehome rabbit', 'surrender bird', 'give up reptile'],
  },
  {
    file: WB_EXOTIC, tab: 'Lost-found & microchip-ID', slug: 'lost-and-found-exotic',
    title: 'Lost or found a rabbit, bird or reptile',
    summary: 'Where to report, and how to tell a lost pet from a wild animal.',
    topics: ['lost rabbit', 'found parrot', 'escaped pet'],
  },
  {
    file: WB_EXOTIC, tab: 'Boarding, sitting & planning', slug: 'exotic-boarding-and-planning',
    // "Exotic" in the title since 2026-11-05: a reviewer read it as a guide
    // for every pet, and it is about rabbits, birds, reptiles and the like.
    title: 'Exotic pets: boarding, pet sitting and planning ahead',
    summary: 'For rabbits, birds, reptiles and small animals: care while you are away, and arranging for a pet to be looked after if you no longer can.',
    topics: ['exotic boarding', 'pet sitter', 'pet trust'],
  },
];

/**
 * Strip click-tracking parameters that were pasted along with the URLs. They
 * carry a referrer fingerprint, add nothing for the reader, and make the link
 * unreadable on a phone.
 */
const TRACKING_PARAMS = /[?&](fbclid|gclid|utm_[a-z]+|_ga|mc_cid|mc_eid|igshid)=[^&\s]*/gi;

export function cleanUrl(url: string): string {
  let out = url.replace(TRACKING_PARAMS, '');
  out = out.replace(/\?&/, '?').replace(/[?&]$/, '');
  return out;
}

function escapeMd(s: string): string {
  return s.replace(/([<>])/g, '\\$1');
}

/** Sections in the order a spec asks for; see TabSpec.sectionOrder. */
function orderSections<T extends { heading: string | null }>(sections: T[], order: string[] | undefined, slug: string): T[] {
  if (!order) return sections;
  const placed: T[] = [];
  for (const start of order) {
    const hit = sections.find((x) => x.heading?.startsWith(start));
    if (!hit) throw new Error(`Guide "${slug}": no section heading starts with "${start}". Update sectionOrder in guide-pages.ts.`);
    placed.push(hit);
  }
  return [...sections.filter((x) => !x.heading), ...placed, ...sections.filter((x) => x.heading && !placed.includes(x))];
}

/** Turn a parsed guide tab into a Markdown page. */
export function buildTabPage(spec: TabSpec, orgs: Org[] = []): GuidePage {
  const doc = parseGuideTab(spec.file, spec.tab);
  const redactions = new Set<string>();

  const clean = (s: string): string => {
    const r = scrubText(s);
    for (const id of r.removed) redactions.add(id);
    return escapeMd(r.text.replace(/https?:\/\/\S+/g, (u) => cleanUrl(u)));
  };

  const lines: string[] = [];
  lines.push(`# ${clean(spec.title)}`);
  lines.push('');
  lines.push(`_${clean(spec.summary)}_`);
  lines.push('');
  if (spec.prepend) lines.push(...spec.prepend(orgs));

  // The source's own title line is not shown: on review (2026-11-04) every
  // one was a spreadsheet label ("OWNER SUPPORT & KEEPING YOUR DOG (contacts
  // inline)") repeating the page title in shouting capitals.
  for (const p of doc.intro) {
    const t = clean(p);
    if (!t) continue;
    lines.push(t);
    lines.push('');
  }

  for (const section of orderSections(doc.sections, spec.sectionOrder, spec.slug)) {
    if (spec.omitSections && section.heading && spec.omitSections.test(section.heading)) continue;
    if (section.heading) {
      lines.push(`## ${clean(section.heading)}`);
      lines.push('');
    }
    let inList = false;
    for (const item of section.items) {
      const t = clean(item.text);
      if (!t) continue;
      if (item.kind === 'p') {
        if (inList) lines.push('');
        lines.push(t);
        lines.push('');
        inList = false;
      } else {
        lines.push(`${'  '.repeat(item.depth)}- ${t}`);
        inList = true;
      }
    }
    if (inList) lines.push('');
  }

  return {
    slug: spec.slug,
    title: spec.title,
    summary: spec.summary,
    topics: spec.topics,
    markdown: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n',
    source: `${spec.file} — ${spec.tab}`,
    redactions: [...redactions],
  };
}

/**
 * The wildlife document has no Word heading styles, so headings are inferred:
 * they are short, and they do not read as sentences.
 */
function looksLikeHeading(text: string): boolean {
  const t = text.trim();
  if (t.length > 60) return false;
  if (/^https?:\/\//i.test(t)) return false;
  // A sentence that merely lacks a full stop is still a sentence.
  if (/^(this|that|the|a|an|it|if|you|we|they|there|here|please|many|most|some|when|keep|put|never|avoid|do|don'?t)\b/i.test(t)) {
    return false;
  }
  return t.endsWith('?') || /[-–:]$/.test(t) || !/[.!]$/.test(t);
}

/**
 * The wildlife document is one volunteer's own writing, in the first person,
 * and the page should say whose. Set to null until the author has given a
 * name to publish; the page then shows nothing rather than a guess.
 */
export const WILDLIFE_GUIDE_BYLINE: string | null = 'community site admin';

/*
 * Edits to the wildlife document's prose, applied as it is read.
 *
 * The document is a volunteer's own writing and is read as delivered, so a
 * change to what it says is recorded here with its reason rather than made
 * silently in the file. Safety guidance is never touched; these are asides.
 * A stale edit throws, the same way a stale override does.
 */
const WILDLIFE_DOC_EDITS: Array<{ find: string; replace: string; reason: string }> = [
  {
    find: 'If a bird or small mammal is attacked by a cat, it is an emergency. Cats have an anaerobic bacterium called Pasteurella in their saliva which is deadly. If an animal attacked by a cat does not get the proper antibiotic in a short time (usually within the day) it is likely fatal. Please also note that very often a cat bite will leave NO visible wounds, even if the teeth have punctured the skin. Even more reason to get to a rehabber immediately! If cats are in the area where you find an injured bird, assume it may have been bitten, and get to a rehabber immediately.',
    replace: 'If a bird or small animal has been caught or bitten by another animal, it is an emergency, even if you can see no wound. A bite can leave no visible mark and still cause an infection that needs antibiotics from a rehabber or vet the same day. If you are not sure whether it was caught, assume it may have been, and get it to a rehabber immediately.',
    reason:
      'Decided by the reviewer 2026-11-04. The original named the germ in cat saliva and called it deadly, and a reader who wants to harm cats can use that against them. The instruction itself is kept whole: caught by an animal means an emergency, even with no wound, antibiotics the same day, assume it if unsure.',
  },
  {
    find: 'Never touch a bird after touching a cat. Wash your hands between animals.',
    replace: 'Wash your hands before you handle the bird, especially after touching any other animal, and between animals.',
    reason: 'Same decision: the hygiene instruction without singling out cats.',
  },
  {
    find: 'Imprinting is great for socializing cats and dogs who need safe homes, and we all know there are plenty of those to go around! ',
    replace: '',
    reason:
      'An aside about pets on a page for someone holding an injured wild animal. A reviewer asked for the cat references that are not safety guidance to go.',
  },
  {
    find: 'If you are unable to go, you can also contact NYC Bird Alliance Injured Bird response team (citywide network of volunteers specializing in care and transport of injured birds).',
    replace:
      "If you cannot take it yourself, email the Urban Wildlife Alliance helpline at helpline@urbanwildlifenyc.org with a short description, a photo or video of the bird, your phone number and your location (address or crossroads). NYC Bird Alliance, whose injured-bird page now sends people there, warns that you might not get a reply the same day and that a volunteer cannot always come, so you or a friend are likely the bird's best chance.",
    reason:
      "Out of date. NYC Bird Alliance's own injured-bird page, read 2026-11-05, sends anyone who cannot transport a bird to the Urban Wildlife Alliance helpline and no longer mentions an injured-bird team or address. The wildlife guide already said so, and a reviewer found the two guides disagreeing.",
  },
  {
    find: 'Email injuredbird@nycbirdalliance.org and someone will reply shortly. The email hotline is monitored by volunteers all day. When you compose the email, you will notice that it’s automatically populates with instructions-please read and follow them. It’s important to give your exact location and phone number so someone can help you faster. Please note these are all volunteers, just like us, their capacity may be limited, so please be kind and understanding.',
    replace: '',
    reason: 'The same out-of-date route: the address is not on NYC Bird Alliance\'s page any more (2026-11-05). The paragraph above now gives the current one.',
  },
  {
    find: 'Contact NYC Bird Alliance (there’s a team specializing in large birds) or call Urban Park Rangers.',
    replace: 'Call 311 and ask for the Urban Park Rangers, or ring the raptor rehabilitators in step 2 at the top of this page.',
    reason: "NYC Bird Alliance's pages (2026-11-05) name no large-bird team of its own; they list the Urban Park Rangers and the raptor rehabilitators, which is what this now says.",
  },
  {
    find: 'If you have any questions not answered here, please feel free to contact Divya at (718) 344-4424. She is the cofounder of Flatbush Cats, but also works with NYC Bird Alliance and other bird rescuers and rehabbers. She would be happy to help you!',
    replace: '',
    reason:
      'A volunteer\'s personal mobile, offered in a document shared privately. The privacy file records her agreement (2026-09-22), but the reviewer asked on 2026-11-05 whether it should be there at all. It should not: a crisis page sends calls at any hour to whatever number it shows, and every question this line invited has an organization that answers it (the Wild Bird Fund, the Urban Wildlife Alliance helpline). Removed until she asks for it back.',
  },
];

/*
 * The document's sections, in the order someone holding a bird needs them.
 * A reviewer found the guide hard to follow (2026-11-05): a section on
 * euthanasia sat in the middle of what to do, and a squirrel section sat
 * between the bite warning and how to tell whether a bird is hurt. Each
 * heading as the document has it, what the page calls it, and where it goes.
 * "merge" folds a section into the one before it, its heading kept as a bold
 * line. A heading not named here throws, so a changed document is noticed.
 */
const BIRD_SECTIONS: Array<{ from: string; to?: string; drop?: string; merge?: true; lead?: string }> = [
  { from: 'What to do now, step by step' },
  { from: 'If it was caught or bitten by an animal' },
  { from: 'WBF bird rescue resources', to: 'Finding a licensed rehabber yourself' },
  { from: 'DEC Find a Licensed Rehabber search tool', merge: true },
  { from: 'List of Licensed rehabbers in NY State', merge: true },
  {
    from: 'Is that bird injured?',
    to: 'Is it hurt, or a fledgling that is fine?',
    // Quoted from NYC Bird Alliance's injured-bird page (read 2026-11-05):
    // the document says how to tell a fledgling, but not how to tell a hurt
    // adult, which is the commoner case in the city.
    lead:
      "**Signs an adult bird needs help**, in NYC Bird Alliance's words: lying on its side or sitting motionless on its stomach; allowing humans to closely approach; attempting but failing to fly; bloody or with apparent wounds; visible broken legs or drooping wings; swollen or closed eyes. \"If you see an adult bird on the sidewalk with its eyes closed and/or not moving, the bird likely hit a window and is stunned.\" (https://nycbirdalliance.org/take-action/help-a-bird-in-trouble/what-to-do-if-you-find-an-injured-bird)",
  },
  { from: 'How to handle injured birds', to: 'How to catch it, box it and keep it calm' },
  { from: 'Why not to feed injured wildlife', to: 'Never give it food or water, and why' },
  { from: 'Where to take injured wildlife', to: 'Where to take it' },
  // Removed at the reviewer's request, 2026-11-05: not something anyone holding
  // an injured bird needs.
  { from: 'Why is some wildlife euthanized', drop: 'Removed at the reviewer\'s request.' },
  { from: 'Found a squirrel?', drop: 'Squirrels are in the wildlife guide, with the same link and current advice.' },
];

/** Puts the bird guide's sections in BIRD_SECTIONS order. */
function orderBirdSections(markdown: string): string {
  const chunks = markdown.split(/^(?=## )/m);
  const head = chunks.shift()!;
  const byHeading = new Map(chunks.map((c) => [c.slice(3, c.indexOf('\n')).trim(), c.slice(c.indexOf('\n'))]));
  const known = new Set(BIRD_SECTIONS.map((x) => x.from));
  const unknown = [...byHeading.keys()].filter((h) => !known.has(h));
  if (unknown.length) throw new Error(`Bird guide: sections not in BIRD_SECTIONS: ${unknown.join(', ')}. Add them in guide-pages.ts.`);
  const out: string[] = [head];
  for (const x of BIRD_SECTIONS) {
    const body = byHeading.get(x.from);
    if (body === undefined) throw new Error(`Bird guide: no section "${x.from}" any more. Update BIRD_SECTIONS in guide-pages.ts.`);
    if (x.drop) continue;
    const lead = x.lead ? `\n\n${x.lead}\n` : '';
    out.push(x.merge ? `\n**${x.from}**\n${body}` : `## ${x.to ?? x.from}${lead}${body}`);
  }
  return out.join('');
}

/*
 * Links in the document that have moved since it was written. NYC Audubon
 * became NYC Bird Alliance and the old domain no longer answers; the DEC
 * retired its old licence-search application for a new one.
 */
const WILDLIFE_LINK_UPDATES: Array<{ from: string; to: string; reason: string }> = [
  { from: 'https://www.nycaudubon.org/', to: 'https://nycbirdalliance.org/', reason: 'nycaudubon.org no longer resolves; the same pages exist at the new name.' },
  {
    from: 'https://www.dec.ny.gov/cfmx/extapps/sls_searches/index.cfm?p=live_rehab',
    to: 'https://appfactory.dec.ny.gov/SpecialLicensesSearchSystem/rehab',
    reason: 'The old search redirects to a generic page; this is the DEC licensed-rehabilitator search itself.',
  },
];

/** A record the guide relies on. Throws when it is gone, so the guide cannot quietly point at nothing. */
function must(orgs: Org[], id: string): Org {
  const org = orgs.find((o) => o.id === id);
  if (!org) throw new Error(`The wildlife guide refers to record "${id}", which no longer exists. Update guide-pages.ts.`);
  return org;
}

function phoneOf(org: Org): string {
  const p = org.phones[0];
  return p ? p.display : '';
}

/*
 * The block at the top of the wildlife guide. A reviewer timed how long it
 * took to reach a phone number on the page: the whole document. Contacts here
 * are read from the records, so whatever the weekly check or the overlay
 * corrects is corrected here too, and each line links to the record.
 */
const AH = 'https://ahnow.org/resources.php#';

/*
 * The steps at the top of the bird guide, with who to call at each, read from
 * the records so a corrected number is corrected here too.
 *
 * Rewritten 2026-11-06 after the reviewer's third reading: someone in a panic
 * does not tell a hawk from a pigeon, so there is one path for every wild
 * bird; the Wild Bird Fund is one rehabber of several and is not open at
 * night, so the places that answer at any hour sit beside it; and finding the
 * nearest licensed rehabber (Animal Help Now) is a step, not a footnote.
 * Animal Help Now's own answers are linked at the step they belong to.
 */
function whoToCallNow(orgs: Org[]): string[] {
  const wbf = must(orgs, 'the-wild-bird-fund');
  const uwa = must(orgs, 'urban-wildlife-alliance');
  const winorr = must(orgs, 'winorr-wildlife-in-need-of-rescue-and-rehabilitation');
  const amc = must(orgs, 'animal-medical-center');
  const star = must(orgs, 'save-the-animals-rescue-foundation');
  const vfw = must(orgs, 'volunteers-for-wildlife-wildlife-center-of-long-island');
  const wff = must(orgs, 'wildlife-freedom-foundation');
  const ahnow = must(orgs, 'animal-help-now-wildlife-emergency-finder');
  const fb = must(orgs, 'nyc-emergency-animal-rescue');
  const acc = must(orgs, 'animal-care-centers-of-nyc');
  const usda = must(orgs, 'usda-report-sick-birds-line');
  const nycprc = must(orgs, 'new-york-city-pigeon-rescue-central');
  const link = (o: Org, text = o.name): string => `[${text}](/org/${o.id})`;
  const helpline = uwa.emails.find((e) => e.value.startsWith('helpline@'))?.value ?? uwa.emails[0]?.value;

  return [
    '## What to do now, step by step',
    '',
    `1. **Does it need help?** A bird needs help if it hit a window, was caught or bitten by any animal (even with no wound you can see), is bleeding, cannot stand or fly, lets you walk right up to it, or has its eyes closed. A fully feathered young bird hopping on the ground with its parents nearby is usually a fledgling and fine: watch from a distance. Not sure? [Animal Help Now: I found a baby bird](${AH}babybird).`,
    `2. **Keep it safe, and keep yourself safe.** For a small bird: walk up slowly and quietly from behind, drop a towel or cloth over it and scoop it up. For a big bird (a hawk, owl, heron, goose or swan), or any bird you are not comfortable handling: do not try to catch it. Keep people and dogs away, keep it in sight, and go straight to step 4. How to capture and carry a wild animal: [Animal Help Now](${AH}transportwild).`,
    '3. **Box it.** A cardboard box or paper bag with a few small air holes, closed so it cannot get out, somewhere dark and quiet. **Never give it food or water.** **No heating pad for a bird that hit a window**: a warm room is enough. Only a cold, nearly naked baby bird needs gentle warmth.',
    '4. **Call or take it to a licensed rehabber today.**',
    `    - **Every day, 9am to 7pm:** ${link(wbf, 'the Wild Bird Fund')}, 565 Columbus Ave (between 87th and 88th), Manhattan. No appointment needed. ${phoneOf(wbf)}.`,
    `    - **At night, or any time it is closed:** ${link(amc, 'the Animal Medical Center')}, Manhattan, open 24 hours, takes hawks, owls and other birds of prey and waterfowl (as NYC Bird Alliance's list says). ${link(winorr, 'WINORR')}, licensed state and federal rehabbers who advise on any wild animal at any hour. ${link(star, 'Save the Animals Rescue Foundation')} (Long Island, birds of prey) has a 24-hour answering service.`,
    `    - **Find the nearest licensed rehabber who is available now:** ${link(ahnow, 'Animal Help Now')}, https://ahnow.org: type the address where the bird is. It lists licensed rehabbers near you, those available at this moment first.`,
    `    - **Other licensed rehabbers that take birds:** ${link(vfw, 'Volunteers for Wildlife')} (Long Island, weekdays 8am to 4pm), ${link(wff, 'Wildlife Freedom Foundation')} (Roosevelt Island, by email). Ring first: rehabbers fill up, especially in spring and summer.`,
    `5. **Cannot get it there?** Email ${link(uwa, 'Urban Wildlife Alliance')} at ${helpline} with a short description, a photo, your phone number and where you are; a volunteer cannot always come, or answer the same day. At the same time, ask to join ${link(fb, 'NYC Emergency Animal Rescue')} on Facebook (https://www.facebook.com/groups/nycemergencyanimalrescue/) and post the bird, where it is and a photo: members nearby often drive animals to a rehabber.`,
    '',
    '**Other birds:**',
    '',
    `- **A pet or farm bird** (parrot, budgie, chicken, domestic duck or goose, tame dove): the Wild Bird Fund cannot take these. ${link(acc, 'Animal Care Centers of NYC')}, 311 or ${phoneOf(acc)}.`,
    `- **A tame white or oddly coloured pigeon** is a domestic pigeon that cannot survive outside: ${link(nycprc, 'NYC Pigeon Rescue Central')}, or the Wild Bird Fund, which takes pigeons.`,
    `- **A bird stuck in a glue trap:** do not pull it off. Take it to a rehabber as it is. [Animal Help Now: glue traps](${AH}gluetrap).`,
    `- **A bird with a band on its leg:** get it help first, then report the band: [Animal Help Now](${AH}reportBandedBird).`,
    `- **Several sick or dead birds in one place:** ${link(usda, 'the USDA line')}, ${phoneOf(usda)}, or 311. Do not touch them with bare hands.`,
    '- **Not a bird?** Squirrels, rabbits, raccoons, deer, turtles and seals: [Found injured or orphaned wildlife](/guides/found-wildlife).',
    '',
    'The rest of this page explains each step, in the words of the volunteer who wrote it.',
    '',
  ];
}

/*
 * The same for every other wild animal. Never "leave it": someone who has
 * stopped to help is told who to call, at any hour (reviewer, 2026-11-06).
 */
function wildlifeWhoToCall(orgs: Org[]): string[] {
  const wbf = must(orgs, 'the-wild-bird-fund');
  const cottontail = must(orgs, 'cottontail-cottage-wildlife-rehab');
  const ahnow = must(orgs, 'animal-help-now-wildlife-emergency-finder');
  const dec = must(orgs, 'nys-dec-find-a-wildlife-rehabilitator');
  const marine = must(orgs, 'ny-marine-mammal-and-sea-turtle-stranding-hotline');
  const noaa = must(orgs, 'noaa-greater-atlantic-marine-mammal-and-sea-turtle-stranding-hotline');
  const nytts = must(orgs, 'new-york-turtle-and-tortoise-society');
  const decNyc = must(orgs, 'nys-dec-region-2');
  const usfws = must(orgs, 'usfws-wildlife-crime-tip-line');
  const winorr = must(orgs, 'winorr-wildlife-in-need-of-rescue-and-rehabilitation');
  const vfw = must(orgs, 'volunteers-for-wildlife-wildlife-center-of-long-island');
  const wff = must(orgs, 'wildlife-freedom-foundation');
  const fb = must(orgs, 'nyc-emergency-animal-rescue');
  const link = (o: Org, text = o.name): string => `[${text}](/org/${o.id})`;
  const afterHours = dec.phones[0]?.display ?? '';

  return [
    '## What to do now, step by step',
    '',
    '1. **Is it a bird?** Go to [Found an injured bird](/guides/found-an-injured-bird): birds you catch and box yourself.',
    '2. **Do not touch a wild mammal with bare hands, and keep pets and children away.** **Never give it food or water.**',
    `3. **Is it really orphaned?** A baby animal on its own is usually not abandoned: its mother may be away for hours. Watch from a distance. It needs help now if it is hurt, cold, covered in flies, was caught or bitten by an animal, or its mother is known to be dead. How to tell, and how to reunite a baby with its mother: [Animal Help Now](${AH}orphan), [reuniting](${AH}reunite).`,
    `4. **Find the nearest licensed rehabber who is available now:** ${link(ahnow, 'Animal Help Now')}, https://ahnow.org. Type the address where the animal is; it lists licensed rehabbers and wildlife hotlines near you, those available at this moment first. Or the ${link(dec, "state's list of licensed rehabilitators")}.`,
    '5. **Call for the animal you have found:**',
    `    - **Squirrel, opossum, rabbit or other small mammal:** ${link(wbf, 'the Wild Bird Fund')} takes small mammals, every day 9am to 7pm, 565 Columbus Ave, Manhattan, ${phoneOf(wbf)}. At any hour, and for a wild baby rabbit or a fox: ${link(cottontail, 'Cottontail Cottage')} (Westchester), ${phoneOf(cottontail)}, leave a message and they call back. Also ${link(wff, 'Wildlife Freedom Foundation')} (Roosevelt Island) and ${link(vfw, 'Volunteers for Wildlife')} (Long Island, weekdays). Baby squirrels: [Animal Help Now](${AH}babysquirrel).`,
    `    - **Raccoon, skunk or bat:** do not touch it. Call 311 and ask for the Urban Park Rangers, who handle these in the city. ${link(winorr, 'WINORR')} advises on any wild animal at any hour. Animal Help Now lists the licensed rehabbers outside the city who can take raccoons, skunks and bats. If a person or pet has touched it, call a doctor or vet now. Bats: [Animal Help Now](${AH}findbat).`,
    `    - **Deer, coyote or other large animal that is hurt:** do not go near it, and keep people and dogs back. Call 311 for the Urban Park Rangers; ${link(decNyc, 'DEC Region 2')}, ${phoneOf(decNyc)} on weekdays, or DEC's dispatch at any hour, ${afterHours}. If it is on a road or anyone is in danger, call 911. Injured deer: [Animal Help Now](${AH}deerneedshelp).`,
    `    - **Seal, whale, dolphin or sea turtle on a beach:** keep your distance and keep dogs away. ${link(marine, 'The stranding hotline')}, ${phoneOf(marine)}, any hour; if it does not answer, ${link(noaa, 'NOAA')}, ${phoneOf(noaa)}.`,
    `    - **A wild turtle:** if it is hurt, ${link(nytts, 'the New York Turtle and Tortoise Society')}, ${nytts.emails[0]?.value ?? ''}, or Animal Help Now. If it is crossing a road unhurt, help it across in the direction it was going: [Animal Help Now](${AH}turtle).`,
    `    - **An animal stuck in a glue trap, or with mange:** do not pull it off; call a rehabber. [Glue traps](${AH}gluetrap), [mange](${AH}animalmange).`,
    `6. **Nobody answering?** Ask to join ${link(fb, 'NYC Emergency Animal Rescue')} on Facebook (https://www.facebook.com/groups/nycemergencyanimalrescue/) and post the animal, where it is and a photo: members across the city help find a rehabber or transport. Keep calling the numbers above too.`,
    '',
    `**To report** someone keeping, selling or killing protected wildlife: ${link(usfws, 'the federal tip line')}, ${phoneOf(usfws)}, anonymously if you like, or ${link(decNyc, 'DEC Region 2')}.`,
    '',
    'The rest of this page explains each of these, animal by animal.',
    '',
  ];
}

export function buildWildlifeDocPage(orgs: Org[], path = 'research/injured-birds-wildlife-guide.docx'): GuidePage {
  const paragraphs = readDocxParagraphs(path);
  const redactions = new Set<string>();
  const applied = new Set<string>();
  const clean = (s: string): string => {
    const r = scrubText(s);
    for (const id of r.removed) redactions.add(id);
    let text = r.text;
    for (const e of WILDLIFE_DOC_EDITS) {
      if (text.includes(e.find)) {
        text = text.replace(e.find, e.replace);
        applied.add(e.find);
      }
    }
    for (const u of WILDLIFE_LINK_UPDATES) {
      if (text.includes(u.from)) {
        text = text.split(u.from).join(u.to);
        applied.add(u.from);
      }
    }
    return text.replace(/https?:\/\/\S+/g, (u) => cleanUrl(u));
  };

  // The document is titled "Injured birds and other wildlife"; since
  // 2026-11-05 other wildlife has its own guide, so the page says birds.
  const lines: string[] = [
    '# Found an injured bird',
    '',
    '_How to help an injured or baby wild bird in New York City, and the things that quietly make it worse. For other wild animals, see [Found injured or orphaned wildlife](/guides/found-wildlife)._',
    '',
    ...whoToCallNow(orgs),
  ];

  for (const p of paragraphs.slice(1)) {
    const text = clean(p.text);
    if (!text) continue; // wholly withheld
    // The bite warning is the document's first paragraph and its most
    // important one. It gets a heading so it reads as the instruction it is,
    // not as a preamble.
    if (/^If a bird or small animal has been caught or bitten/.test(text)) {
      lines.push('', '## If it was caught or bitten by an animal', '');
    }
    // Bare URLs read better as links on their own line.
    if (/^https?:\/\/\S+$/.test(text)) {
      lines.push(`<${text}>`);
      lines.push('');
      continue;
    }
    if (p.listItem || /^[-–]/.test(text)) {
      lines.push(`- ${text.replace(/^[-–]\s*/, '')}`);
      continue;
    }
    if (looksLikeHeading(text)) {
      lines.push('');
      lines.push(`## ${text.replace(/[-–:]$/, '').trim()}`);
      lines.push('');
      continue;
    }
    lines.push(text);
    lines.push('');
  }

  const stale = [...WILDLIFE_DOC_EDITS.map((e) => e.find), ...WILDLIFE_LINK_UPDATES.map((u) => u.from)].filter((k) => !applied.has(k));
  if (stale.length) {
    throw new Error(
      `Wildlife guide edits no longer match the document: ${stale.map((k) => JSON.stringify(k.slice(0, 60))).join(', ')}.\n` +
        'The document changed; remove the edit or update it in guide-pages.ts.',
    );
  }

  return {
    slug: 'found-an-injured-bird',
    title: 'Found an injured bird',
    summary: 'Who to call first, whether it needs help at all, how to catch and box it, and why food, water and heat can kill it.',
    topics: ['injured bird', 'window strike', 'baby bird', 'pigeon', 'fledgling', 'bird hit window', 'hawk', 'owl'],
    markdown: orderBirdSections(lines.join('\n')).replace(/\n{3,}/g, '\n\n').trim() + '\n',
    source: path,
    redactions: [...redactions],
    ...(WILDLIFE_GUIDE_BYLINE ? { byline: WILDLIFE_GUIDE_BYLINE } : {}),
  };
}

/*
 * Animal Help Now's answers, woven into the guide where someone would look
 * for each one. There used to be a separate page listing all of them; the
 * reviewer pointed out (2026-11-06) that nobody in a hurry opens a page about
 * another website. The bird and wildlife guides link most of theirs inline,
 * at the step they belong to; the rest are here. A test checks that every
 * question on ahnow.org/resources.php is linked from some guide.
 */
const AHNOW_WEAVE: Record<string, Array<[string, string]>> = {
  'found-an-injured-bird': [
    ['A bird hit my window', 'birdhitwindow'],
    ['Stopping birds hitting windows at home or work', 'preventbirdhitwindow'],
    ['A baby duck, goose or other ground-nesting bird', 'babygroundbird'],
    ['A baby owl, hawk or eagle', 'babyowl'],
    ['My cat or dog caught a bird', 'catdogattack'],
    ['Is it all right to feed wild birds?', 'feedingwildlife'],
    ['Can I get help transporting wildlife?', 'transporthelp'],
    ['Should I try to rehabilitate it myself?', 'rehab'],
  ],
  'found-wildlife': [
    ['A baby mammal', 'babymammal'],
    ['A reptile', 'reptile'],
    ['My cat or dog caught a wild animal', 'catdogattack'],
    ['A wild animal used to people', 'habituate'],
    ['A wild animal under the porch, in the garden or in the attic', 'wildlifeconflict'],
    ['Humane wildlife control standards, and how Animal Help Now rates companies', 'wildlifeconflict1'],
    ['More help with a wild animal where you do not want it', 'wildlifeconflict2'],
    ['Why humane solutions are better than a pest company', 'wildlifeconflict3'],
    ['Are live trapping and relocation humane?', 'wildlifeconflict4'],
    ['Before hiring anyone to remove an animal', 'wildlifeconflict5'],
    ['Is it all right to feed wildlife?', 'feedingwildlife'],
    ['Wildlife in a disaster', 'evacwild'],
    ['An animal rescue kit for the car or home', 'rescuekit'],
    ["A veterinarian's guide to injured wildlife, for vet clinics", 'vetguide'],
    ['Outside the United States', 'nonUSA'],
    ['A wildlife conflict outside the United States', 'nonUSAconflict'],
    ['How Animal Help Now works, and where its list of rehabbers comes from', 'maintocgeneral'],
    ['National animal organizations', 'otherorgs'],
    ['Careers helping animals', 'careers'],
    ['Animal Help Now posters and share graphics', 'promote'],
  ],
  'lost-and-found-cat': [
    ['I lost my pet', '1'],
    ["I found someone's pet", '2'],
    ['Keeping a found pet overnight', 'overnight'],
    ['Transporting an animal', 'transport'],
    ['An animal is wandering around my neighbourhood', 'wander'],
    ['A cat is stuck on a utility pole', 'catpole'],
  ],
  'lost-and-found-dog': [
    ['I lost my pet', '1'],
    ["I found someone's pet", '2'],
    ['Keeping a found pet overnight', 'overnight'],
    ['Transporting an animal', 'transport'],
    ['An animal is wandering around my neighbourhood', 'wander'],
  ],
  'animal-emergency': [
    ['An animal has swallowed poison', 'poison'],
    ['I need a vet but cannot get the animal there', 'canttransport'],
    ['An animal is in the road', 'road'],
  ],
  'report-animal-abuse': [
    ['I saw abuse or neglect', 'abuse'],
    ['I saw abuse or neglect online', 'abuseinternet'],
  ],
  'pets-in-a-disaster': [
    ['Evacuating animals and finding shelter', 'evac'],
    ['Lost or found an animal in a disaster', 'evaclostfound'],
    ['Preparing your pets for a disaster', 'evacprep'],
    ['An emergency supply kit for disasters and evacuations', 'emergencykit'],
  ],
  'help-paying-for-care': [['Help with vet bills', 'vetexpenses']],
  'keeping-your-cat': [
    ['Finding a new home for your pet', 'newhome'],
    ['Planning for your pets if you can no longer care for them', 'planahead'],
    ['Keeping indoor-outdoor cats safely indoors (catios)', 'catio'],
    ['Help with a pet in general', 'outsidecolo'],
  ],
  'keeping-your-dog': [
    ['Finding a new home for your pet', 'newhome'],
    ['Planning for your pets if you can no longer care for them', 'planahead'],
  ],
  'exotic-boarding-and-planning': [['Planning for your pets if you can no longer care for them', 'planahead']],
};

function weaveAhnow(page: GuidePage): GuidePage {
  const items = AHNOW_WEAVE[page.slug];
  if (!items) return page;
  const lines = [
    '',
    '## More answers from Animal Help Now',
    '',
    'Animal Help Now (ahnow.org) answers these questions for the whole country. Where it says "animal control" or "your local shelter", the New York City places are in this guide and its listings.',
    '',
    ...items.map(([q, a]) => `- [${q}](https://ahnow.org/resources.php#${a})`),
    '',
  ];
  return { ...page, markdown: page.markdown.trimEnd() + '\n' + lines.join('\n') };
}

export function buildAllGuidePages(orgs: Org[]): GuidePage[] {
  const pages = [buildWildlifeDocPage(orgs), ...GUIDE_PAGES.map((spec) => buildTabPage(spec, orgs))];
  for (const slug of Object.keys(AHNOW_WEAVE)) {
    if (!pages.some((p) => p.slug === slug)) throw new Error(`AHNOW_WEAVE names a guide that does not exist: ${slug}`);
  }
  // A link to another page of this site reads as that page's name, not as a
  // path: "[/guides/x](/guides/x)" becomes "[Its title](/guides/x)". The
  // research wrote these as full addresses on the live site, which also broke
  // them on every branch preview (2026-11-06).
  const titles = new Map(pages.map((p) => [`/guides/${p.slug}`, p.title]));
  const name = (path: string) => {
    const bare = path.replace(/[#?].*$/, '').replace(/\/$/, '');
    if (titles.has(bare)) return titles.get(bare)!;
    if (bare === '/directory') return 'Find help';
    if (bare === '/contribute') return 'Add a resource';
    return null;
  };
  const unknown: string[] = [];
  const named = pages.map((p) => ({
    ...p,
    markdown: p.markdown.replace(/\[(\/[^\]]*)\]\((\/[^)]*)\)/g, (all, text: string, href: string) => {
      if (text !== href) return all;
      const n = name(href);
      if (!n) unknown.push(`${p.slug}: ${href}`);
      return n ? `[${n}](${href})` : all;
    }),
  }));
  if (unknown.length) throw new Error(`Guides link to pages that do not exist: ${unknown.join(', ')}`);
  return named.map(weaveAhnow);
}

export function writeGuidePages(pages: GuidePage[], dir = 'content/guides'): void {
  for (const page of pages) {
    const front = [
      '---',
      `title: ${JSON.stringify(page.title)}`,
      `slug: ${page.slug}`,
      `summary: ${JSON.stringify(page.summary)}`,
      `topics: ${JSON.stringify(page.topics)}`,
      `source: ${JSON.stringify(page.source)}`,
      ...(page.byline ? [`byline: ${JSON.stringify(page.byline)}`] : []),
      '---',
      '',
    ].join('\n');
    writeFileSync(`${dir}/${page.slug}.md`, front + page.markdown, 'utf8');
  }
}

/** Tabs that were parsed but did not become a page, so nothing is lost silently. */
export function unusedTabs(): string[] {
  const used = new Set(GUIDE_PAGES.map((p) => `${p.file}—${p.tab}`));
  const out: string[] = [];
  for (const file of [WB_CAT, WB_DOG, WB_EXOTIC]) {
    for (const tab of guideTabsOf(file)) {
      if (!used.has(`${file}—${tab}`)) out.push(`${file.split('/').pop()} — ${tab}`);
    }
  }
  return out;
}
