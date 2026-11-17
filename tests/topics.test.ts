import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LISTED_ORGS } from '../src/data/orgs.ts';
import { FIND_HELP, TOPICS, findHelpHref, listingsFor, topicHref, topicListsForPage, topicOf } from '../src/data/guide-listings.ts';
import { matchesTopic } from '../src/data/topics.ts';
import { servesBoroughs, servesZip } from '../src/data/area.ts';
import { ORGS_BY_ID } from '../src/data/orgs.ts';
import { GLANCE } from '../src/data/guide-glance.ts';
import { Retriever, type Corpus } from '../src/chat/retrieve.ts';

/*
 * One topic, one set of places, however it is reached (owner, 2026-11-17:
 * "borrow a trap resources should yield the same results through the guide,
 * find help and ask ... check each and every instance"). These compare, for
 * every list on the site, the guide's list, the directory link that opens it
 * (from the guide, Find help, a card or the assistant) and the assistant's
 * answer.
 */

/** What the directory shows for a link, by the browser's own rule (src/client/directory.ts). */
function directoryShows(href: string, lists = topicListsForPage()): Set<string> {
  const p = new URL(href, 'https://x').searchParams;
  const keys = p.getAll('list');
  const boroughs = p.getAll('borough');
  const zip = p.get('zip');
  // The directory's own place rule (src/data/area.ts), applied after the list.
  const inArea = (id: string) => {
    const o = ORGS_BY_ID.get(id)!;
    if (zip) return servesZip(o, zip);
    return boroughs.length ? servesBoroughs(o, boroughs) : true;
  };
  if (keys.length) return new Set(keys.flatMap((k) => lists[k]?.ids ?? []).filter(inArea));
  const need = p.get('need') ?? undefined;
  const animals = p.getAll('animal');
  const anyNeeds = p.getAll('anyneed');
  return new Set(LISTED_ORGS.filter((o) => matchesTopic(o, { need, animals, anyNeeds }) && inArea(o.id)).map((o) => o.id));
}
const ids = (xs: Array<{ id: string }>) => new Set(xs.map((o) => o.id));

test('every guide list opens in the directory with exactly the same places', () => {
  for (const t of TOPICS) {
    assert.deepEqual(directoryShows(topicHref(t)), ids(listingsFor(t.block)), `${t.key} "${t.heading}"`);
  }
});

test('every Find help button opens one of its own guide’s lists, unchanged', () => {
  for (const [slug, index] of Object.entries(FIND_HELP)) {
    if (index === null) continue;
    const t = topicOf(slug, index);
    assert.deepEqual(directoryShows(findHelpHref(slug)), ids(listingsFor(t.block)), `Find help for ${slug}`);
  }
});

test('every directory link on a card opens a list with places in it', () => {
  const hrefs = JSON.stringify(GLANCE).match(/\/directory\?[^"'\\]+/g) ?? [];
  assert.ok(hrefs.length > 10);
  for (const href of hrefs) assert.ok(directoryShows(href).size > 0, href);
});

test("a typed question is Find help's boxes: the same kind of help, count and link", () => {
  const corpus = JSON.parse(readFileSync('data/chat-corpus.json', 'utf8')) as Corpus;
  const r = new Retriever(corpus);
  for (const [q, need] of [
    ['where can I borrow a trap', 'trap-bank'],
    ['borrow a trap for TNR in Brooklyn', 'trap-bank'],
    ['where can I get free cat food in the Bronx', 'food-assistance'],
    ['free cat food 10458', 'food-assistance'],
    ['free pet food in the Bronx', 'food-assistance'],
    ['free dog food in the bronx', 'food-assistance'],
    ['where can I borrow a trap in Brooklyn', 'trap-bank'],
    ['my dog was hit by a car', 'emergency-vet'],
    ['I need a low cost spay for my cat', 'spay-neuter'],
    ['I found an injured pigeon', 'wildlife-rehab'],
    ['my rabbit is not eating', 'exotic-vet'],
    ['my cat ate a lily', 'poison-control'],
  ] as const) {
    const got = r.retrieve(q, 10);
    assert.ok(got.topic, `${q}: answered without a list`);
    assert.equal(new URL(got.topic!.href, 'https://x').searchParams.get('need'), need, `${q}: ${got.topic!.href}`);
    const shown = directoryShows(got.topic!.href);
    for (const o of got.orgs) assert.ok(shown.has(o.id), `${q}: ${o.name} is not in what "see all" opens`);
    assert.equal(got.topic!.count, shown.size, `${q}: the count is not what "see all" opens`);
  }
});

test('the lists the assistant holds are the lists the site shows', () => {
  const corpus = JSON.parse(readFileSync('data/chat-corpus.json', 'utf8')) as Corpus;
  const page = topicListsForPage();
  for (const t of corpus.topics ?? []) assert.deepEqual(new Set(t.ids), new Set(page[t.key]?.ids), t.key);
});

/*
 * The Ask buttons are the 26 guide lines (GuideLines.astro). Each must answer
 * from the list its Find help button opens, or from the guide's own lists
 * where Find help opens the guide (owner, 2026-11-17: "make 1000% sure").
 */
test('every Ask button answers from the same list as its Find help button', async () => {
  const { LINES_BY_TIER } = await import('../src/data/guides.ts');
  const corpus = JSON.parse(readFileSync('data/chat-corpus.json', 'utf8')) as Corpus;
  const r = new Retriever(corpus);
  for (const l of LINES_BY_TIER.flatMap((t) => t.lines)) {
    const got = r.retrieve(l.label, 10);
    const index = FIND_HELP[l.guide.slug];
    const expected = index === null || index === undefined
      ? (corpus.topics ?? []).filter((t) => t.guide === l.guide.slug).map((t) => t.key)
      : [`${l.guide.slug}.${index}`];
    assert.deepEqual(got.topic?.keys ?? [], expected, `${l.number} "${l.label}"`);
    const union = new Set(expected.flatMap((k) => (corpus.topics ?? []).find((t) => t.key === k)!.ids));
    for (const o of got.orgs) assert.ok(union.has(o.id), `${l.number}: ${o.name} is not on the Find help list`);
  }
});

test('a badly hurt bird: the Animal Medical Center is on the bird list everywhere', () => {
  const t = TOPICS.find((x) => x.key === 'found-an-injured-bird.0')!;
  const list = listingsFor(t.block).map((o) => o.id);
  assert.deepEqual(list.slice(0, 3), ['the-wild-bird-fund', 'animal-medical-center', 'animal-help-now-wildlife-emergency-finder']);
  assert.ok(directoryShows(findHelpHref('found-an-injured-bird')).has('animal-medical-center'));
});

/*
 * What the owner did (2026-11-17): Find help, tick "Pet food help" and "The
 * Bronx": 15 places. The assistant must give the same 15 for the same
 * question, and the same 13 as ticking "Cat" too when the question says cat.
 */
test('the assistant matches the filter panel for pet food in the Bronx', () => {
  const corpus = JSON.parse(readFileSync('data/chat-corpus.json', 'utf8')) as Corpus;
  const r = new Retriever(corpus);
  const panel = (animals: string[]) => directoryShows(`/directory?need=food-assistance&borough=bronx${animals.map((a) => `&animal=${a}`).join('')}`).size;
  assert.equal(r.retrieve('free pet food in the Bronx', 10).topic!.count, panel([]));
  assert.equal(r.retrieve('where can I get free cat food in the Bronx', 10).topic!.count, panel(['cat']));
  assert.equal(r.retrieve('free dog food in the bronx', 10).topic!.count, panel(['dog']));
});
