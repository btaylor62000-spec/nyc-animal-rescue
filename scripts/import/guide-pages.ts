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
}

interface TabSpec {
  file: string;
  tab: string;
  slug: string;
  title: string;
  summary: string;
  topics: string[];
}

const WB_CAT = 'research/NYC_Cat_Rescue_TNR_Reference.xlsx';
const WB_DOG = 'research/NYC_Dog_Rescue_Reference.xlsx';
const WB_EXOTIC = 'research/NYC_Exotic_SmallAnimal_Wildlife_Reference.xlsx';

/**
 * Which tabs become pages, and what each page is called in plain language.
 * Tabs not listed here are still parsed for organization extraction; they just
 * do not get a page of their own.
 */
export const GUIDE_PAGES: TabSpec[] = [
  {
    file: WB_CAT, tab: 'Emergency & poison control', slug: 'animal-emergency',
    title: 'Animal emergencies and poison control',
    summary: 'Where to go right now if an animal is injured, collapsed, bleeding, or has swallowed something toxic.',
    topics: ['emergency', 'poisoning', '24 hour vet', 'hit by car', 'bleeding'],
  },
  {
    file: WB_CAT, tab: 'Clinics, traps & support', slug: 'low-cost-clinics-and-trap-banks',
    title: 'Low-cost clinics and trap banks',
    summary: 'Free and low-cost spay/neuter by borough, and where to borrow a humane trap.',
    topics: ['low-cost vet', 'spay neuter', 'borrow a trap', 'trap bank'],
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
  },
  {
    file: WB_DOG, tab: 'Owner support & surrender prev.', slug: 'keeping-your-dog',
    title: 'Help keeping your dog',
    summary: 'Support with costs, housing and behaviour, plus how surrender works if you still need it.',
    topics: ['cannot keep my dog', 'rehome dog', 'surrender dog', 'dog food help'],
  },
  {
    file: WB_DOG, tab: 'Low-cost vet, s-n & licensing', slug: 'low-cost-dog-care',
    title: 'Low-cost vet care, spay/neuter and dog licensing',
    summary: 'Affordable veterinary care across the five boroughs, and how to license a dog in NYC.',
    topics: ['low cost vet dog', 'dog license', 'spay neuter dog'],
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
    summary: 'Only licensed rehabilitators may legally handle wild animals. Where to take them, and what not to do.',
    topics: ['injured wildlife', 'baby squirrel', 'wild animal', 'rehabber'],
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
    title: 'Boarding, pet sitting and planning ahead',
    summary: 'Care while you are away, and arranging for a pet to be looked after if you no longer can.',
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

/** Turn a parsed guide tab into a Markdown page. */
export function buildTabPage(spec: TabSpec): GuidePage {
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

  // The source's own title line often carries a caveat worth keeping.
  if (doc.title && doc.title !== spec.title) {
    lines.push(`> ${clean(doc.title)}`);
    lines.push('');
  }
  for (const p of doc.intro) {
    const t = clean(p);
    if (!t) continue;
    lines.push(t);
    lines.push('');
  }

  for (const section of doc.sections) {
    if (section.heading) {
      lines.push(`## ${clean(section.heading)}`);
      lines.push('');
    }
    for (const p of section.paragraphs) {
      const t = clean(p);
      if (!t) continue;
      lines.push(t);
      lines.push('');
    }
    for (const b of section.bullets) {
      const t = clean(b.text);
      if (!t) continue;
      lines.push(`${'  '.repeat(b.depth)}- ${t}`);
    }
    if (section.bullets.length) lines.push('');
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

export function buildWildlifeDocPage(path = 'research/injured-birds-wildlife-guide.docx'): GuidePage {
  const paragraphs = readDocxParagraphs(path);
  const redactions = new Set<string>();
  const clean = (s: string): string => {
    const r = scrubText(s);
    for (const id of r.removed) redactions.add(id);
    return r.text.replace(/https?:\/\/\S+/g, (u) => cleanUrl(u));
  };

  const title = paragraphs[0]?.text ?? 'Injured birds and other wildlife';
  const lines: string[] = [
    `# ${title}`,
    '',
    '_How to help an injured bird or wild animal in New York City, and the things that quietly make it worse._',
    '',
    '> **If a cat may have touched it, treat it as an emergency.** Cat saliva carries bacteria that are fatal to birds and small mammals without prompt antibiotics, and a cat bite often leaves no visible wound.',
    '',
  ];

  for (const p of paragraphs.slice(1)) {
    const text = clean(p.text);
    if (!text) continue; // wholly withheld
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

  return {
    slug: 'found-an-injured-bird',
    title: 'Found an injured bird',
    summary: 'How to catch, contain and transport an injured bird, and why food, water and heat can kill it.',
    topics: ['injured bird', 'window strike', 'baby bird', 'pigeon', 'fledgling', 'bird hit window'],
    markdown: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n',
    source: path,
    redactions: [...redactions],
  };
}

export function buildAllGuidePages(): GuidePage[] {
  return [buildWildlifeDocPage(), ...GUIDE_PAGES.map(buildTabPage)];
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
