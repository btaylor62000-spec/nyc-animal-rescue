/**
 * Does every way of looking for help give the same places? (Owner,
 * 2026-11-17: "check every single possible scenario across the whole site".)
 *
 * The master list is Find help's tick-boxes: a kind of help, an animal (or
 * none), a place (or none). For every combination this asks the same thing
 * through every other door and records each difference:
 *
 *   - Find help's search box, with the words a person would type;
 *   - the assistant (Ask), with the same words;
 *   - every list at the foot of a guide, every Find help guide button, and
 *     every link into Find help anywhere on the built site.
 *
 *   npx tsx scripts/dev/consistency-audit.ts   (after npm run build)
 *
 * Writes build/reports/consistency-audit.json and prints a summary.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LISTED_ORGS, ORGS_BY_ID, NEED_LABELS, ANIMAL_LABELS } from '../../src/data/orgs.ts';
import { matchesTopic } from '../../src/data/topics.ts';
import { servesBoroughs, servesZip, placeIn } from '../../src/data/area.ts';
import { buildIndex, runSearch, type SearchRecordLike } from '../../src/data/search.ts';
import { TOPICS, listingsFor, findHelpHref, FIND_HELP, topicListsForPage } from '../../src/data/guide-listings.ts';
import { Retriever, type Corpus } from '../../src/chat/retrieve.ts';

type Area = { boroughs?: string[]; zip?: string };

/** Find help's tick-boxes: the master answer. */
function boxes(need: string | null, animals: string[], area: Area): Set<string> {
  return new Set(
    LISTED_ORGS.filter((o) => (!need || o.needs.includes(need as never)) && matchesTopic(o, { animals }) && inArea(o.id, area)).map((o) => o.id),
  );
}
function inArea(id: string, area: Area): boolean {
  const o = ORGS_BY_ID.get(id)!;
  if (area.zip) return servesZip(o, area.zip);
  if (area.boroughs?.length) return servesBoroughs(o, area.boroughs);
  return true;
}

/** What Find help shows for a link, by the page's own rules (src/client/directory.ts). */
const LISTS = topicListsForPage();
function linkShows(href: string): Set<string> {
  const p = new URL(href, 'https://x').searchParams;
  const area: Area = { zip: p.get('zip') ?? undefined, boroughs: p.getAll('borough') };
  const keys = p.getAll('list');
  if (keys.length) return new Set(keys.flatMap((k) => LISTS[k]?.ids ?? []).filter((id) => inArea(id, area)));
  const needs = p.getAll('need');
  const anyNeeds = p.getAll('anyneed');
  const animals = p.getAll('animal');
  return new Set(
    LISTED_ORGS.filter((o) => needs.every((n) => o.needs.includes(n as never)) && matchesTopic(o, { anyNeeds, animals }) && inArea(o.id, area)).map((o) => o.id),
  );
}
/** Whether a link can be made by ticking boxes (rather than a named list or an "any of" link). */
function isBoxes(href: string): boolean {
  const p = new URL(href, 'https://x').searchParams;
  return !p.has('list') && !p.has('anyneed') && p.getAll('need').length <= 1;
}

/** Find help's search box, as the page runs it. */
const records = JSON.parse(readFileSync('dist/search-index.json', 'utf8')) as SearchRecordLike[];
const index = buildIndex(records);
function searchBox(q: string): Set<string> {
  const lowered = q.toLowerCase();
  const isName = lowered.length >= 4 && LISTED_ORGS.some((o) => o.name.toLowerCase().includes(lowered));
  const place = isName ? { zip: null, boroughs: [] as string[], rest: q } : placeIn(q);
  const area: Area = { zip: place.zip ?? undefined, boroughs: place.boroughs };
  let ids: string[];
  if (place.rest.trim()) {
    ids = runSearch(index, place.rest).map((h) => h.id);
    if (!ids.length) ids = LISTED_ORGS.filter((o) => o.name.toLowerCase().includes(place.rest.toLowerCase())).map((o) => o.id);
  } else ids = LISTED_ORGS.map((o) => o.id);
  return new Set(ids.filter((id) => ORGS_BY_ID.has(id) && inArea(id, area)));
}

/** The assistant: which places its "see all" opens, and whether its cards are among them. */
const corpus = JSON.parse(readFileSync('data/chat-corpus.json', 'utf8')) as Corpus;
const retriever = new Retriever(corpus);

// --- what people say -------------------------------------------------------
const NEED_WORDS: Record<string, { phrase: string; animal?: string }> = {
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
const ANIMAL_WORDS: Record<string, string> = {
  cat: 'cat', dog: 'dog', rabbit: 'rabbit', 'small-mammal': 'guinea pig', 'bird-companion': 'parrot',
  'bird-wild': 'wild bird', pigeon: 'pigeon', reptile: 'turtle', amphibian: 'frog', fish: 'fish',
  farm: 'chicken', equine: 'horse', wildlife: 'squirrel', marine: 'seal', invertebrate: 'tarantula',
};
const PLACES: Array<{ words: string; area: Area }> = [
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

interface Row {
  door: string;
  question: string;
  need: string;
  animal: string | null;
  place: string;
  expected: number;
  got: number | null;
  problem: string;
  missing?: string[];
  extra?: string[];
}
const rows: Row[] = [];
const names = (ids: Iterable<string>) => [...ids].map((id) => ORGS_BY_ID.get(id)?.name ?? id);
function diff(expected: Set<string>, got: Set<string>) {
  return { missing: names([...expected].filter((id) => !got.has(id))), extra: names([...got].filter((id) => !expected.has(id))) };
}

let asked = 0;
for (const [need, w] of Object.entries(NEED_WORDS)) {
  const animals = w.animal ? [w.animal] : [null, ...Object.keys(ANIMAL_WORDS)];
  for (const animal of animals) {
    for (const place of PLACES) {
      const animalWords = animal && !w.animal ? ` for my ${ANIMAL_WORDS[animal]}` : '';
      const question = `${w.phrase}${animalWords}${place.words ? ` ${place.words}` : ''}`;
      const expected = boxes(need, animal ? [animal] : [], place.area);
      const base = { question, need, animal, place: place.words || '(no place)', expected: expected.size };
      asked++;

      // Ask
      const r = retriever.retrieve(question, 10);
      if (!r.topic) {
        rows.push({ door: 'ask', ...base, got: null, problem: 'Ask gives cards but no list, so its places cannot be checked against Find help' });
      } else {
        const shown = linkShows(r.topic.href);
        const p = new URL(r.topic.href, 'https://x').searchParams;
        const askedNeed = p.get('need');
        if (askedNeed && askedNeed !== need) {
          rows.push({ door: 'ask', ...base, got: shown.size, problem: `Ask answered a different kind of help: ${NEED_LABELS[askedNeed as never] ?? askedNeed}` });
        } else if (shown.size !== expected.size || [...expected].some((id) => !shown.has(id))) {
          rows.push({ door: 'ask', ...base, got: shown.size, problem: 'Ask lists different places from Find help', ...diff(expected, shown) });
        }
        const outside = r.orgs.filter((o) => !shown.has(o.id));
        if (outside.length) rows.push({ door: 'ask', ...base, got: shown.size, problem: 'Ask shows cards that its own "see all" does not list', extra: outside.map((o) => o.name) });
      }

      // Find help search box
      const box = searchBox(question);
      if (box.size !== expected.size || [...expected].some((id) => !box.has(id))) {
        rows.push({ door: 'find-help-search-box', ...base, got: box.size, problem: "Find help's search box gives different places from its tick-boxes", ...diff(expected, box) });
      }
    }
  }
}

// Every list at the foot of a guide: is it exactly a set of Find help boxes?
for (const t of TOPICS) {
  const list = new Set(listingsFor(t.block).map((o) => o.id));
  const need = t.block.need ?? (t.block.cityPantries ? 'food-assistance' : null);
  const expected = boxes(need, t.block.animals ?? [], {});
  if (list.size !== expected.size || [...expected].some((id) => !list.has(id))) {
    rows.push({ door: 'guide-list', question: `${t.guide}: "${t.heading}"`, need: need ?? '(none)', animal: (t.block.animals ?? []).join('+') || null, place: '(no place)', expected: expected.size, got: list.size, problem: 'Guide list differs from the matching Find help boxes', ...diff(expected, list) });
  }
}

// The 26 Find help guide buttons.
for (const [slug, i] of Object.entries(FIND_HELP)) {
  const href = findHelpHref(slug);
  if (href.startsWith('/directory') && !isBoxes(href)) {
    rows.push({ door: 'find-help-button', question: slug, need: String(i), animal: null, place: '(no place)', expected: 0, got: linkShows(href).size, problem: `Find help button opens a named list, not tick-boxes: ${href}` });
  }
}

// Every link into Find help anywhere on the built site.
function* htmlFiles(dir: string): Generator<string> {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (f.endsWith('.html')) yield p;
  }
}
const linkPages = new Map<string, Set<string>>();
for (const file of htmlFiles('dist')) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/href="(\/directory\/?\?[^"]+)"/g)) {
    const href = m[1]!.replace(/&#38;|&amp;/g, '&');
    (linkPages.get(href) ?? linkPages.set(href, new Set()).get(href)!).add(file.replace(/^dist\//, '/').replace(/index\.html$/, ''));
  }
}
for (const [href, pages] of linkPages) {
  if (!isBoxes(href)) rows.push({ door: 'site-link', question: href, need: '', animal: null, place: '', expected: 0, got: linkShows(href).size, problem: `Link opens Find help as a named list or "any of", not tick-boxes (on ${pages.size} page(s), e.g. ${[...pages][0]})` });
  if (linkShows(href).size === 0) rows.push({ door: 'site-link', question: href, need: '', animal: null, place: '', expected: 0, got: 0, problem: `Link opens an empty list (e.g. ${[...pages][0]})` });
}

writeFileSync('build/reports/consistency-audit.json', JSON.stringify({ asked, links: linkPages.size, rows }, null, 1));
const byProblem = new Map<string, number>();
for (const r of rows) byProblem.set(`${r.door} | ${r.problem.replace(/:.*$/, '')}`, (byProblem.get(`${r.door} | ${r.problem.replace(/:.*$/, '')}`) ?? 0) + 1);
console.log(`Questions asked in each place: ${asked}; links into Find help checked: ${linkPages.size}; differences: ${rows.length}`);
for (const [k, n] of [...byProblem].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(6)}  ${k}`);
void ANIMAL_LABELS;
