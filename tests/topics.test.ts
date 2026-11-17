import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LISTED_ORGS } from '../src/data/orgs.ts';
import { FIND_HELP, TOPICS, findHelpHref, listingsFor, topicHref, topicListsForPage, topicOf } from '../src/data/guide-listings.ts';
import { matchesTopic } from '../src/data/topics.ts';
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
  if (keys.length) return new Set(keys.flatMap((k) => lists[k]?.ids ?? []));
  const need = p.get('need') ?? undefined;
  const animals = p.getAll('animal');
  const anyNeeds = p.getAll('anyneed');
  return new Set(LISTED_ORGS.filter((o) => matchesTopic(o, { need, animals, anyNeeds })).map((o) => o.id));
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

test('the assistant answers a guide topic from that list, with the same count and link', () => {
  const corpus = JSON.parse(readFileSync('data/chat-corpus.json', 'utf8')) as Corpus;
  const r = new Retriever(corpus);
  const byKey = new Map((corpus.topics ?? []).map((t) => [t.key, t]));
  for (const [q, heading] of [
    ['where can I borrow a trap', 'Trap banks'],
    ['borrow a trap for TNR in Brooklyn', 'Trap banks'],
    ['where can I get free cat food in the Bronx', "NYC's free pet food pantries (the city's programme)"],
    ['my dog was hit by a car', 'Emergency and urgent-care vets'],
    ['I need a low cost spay for my cat', 'Low-cost spay and neuter'],
    ['I found an injured pigeon', 'Wildlife rehabilitators who take birds'],
    ['my rabbit is not eating', 'Avian and exotic vets'],
  ] as const) {
    const got = r.retrieve(q, 10);
    assert.ok(got.topic, `${q}: answered without a list`);
    assert.ok(got.topic!.headings.includes(heading), `${q}: lists ${got.topic!.headings.join(', ')}`);
    const union = new Set(got.topic!.keys.flatMap((k) => byKey.get(k)!.ids));
    for (const o of got.orgs) assert.ok(union.has(o.id), `${q}: ${o.name} is not on the list`);
    assert.equal(got.topic!.count, union.size, `${q}: count`);
    assert.deepEqual(directoryShows(got.topic!.href), union, `${q}: "see all" opens a different list`);
  }
});

test('the lists the assistant holds are the lists the site shows', () => {
  const corpus = JSON.parse(readFileSync('data/chat-corpus.json', 'utf8')) as Corpus;
  const page = topicListsForPage();
  for (const t of corpus.topics ?? []) assert.deepEqual(new Set(t.ids), new Set(page[t.key]?.ids), t.key);
});
