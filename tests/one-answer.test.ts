/*
 * Every way of asking gives the same places (owner, 2026-11-17: "each search
 * for the same topic must yield the exact same results regardless of how it
 * was searched ... lives depend on this").
 *
 * The master answer is Find help's tick-boxes. For every kind of help, every
 * animal and sixteen places, this asks Find help's search box (through the
 * shared reader, src/data/understand.ts) and the assistant the same words,
 * and checks each gives exactly the places the boxes give. The fuller audit,
 * which also reads every link in the built site, is
 * scripts/dev/consistency-audit.ts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LISTED_ORGS, ORGS_BY_ID } from '../src/data/orgs.ts';
import { hasNeed, matchesTopic } from '../src/data/topics.ts';
import { servesBoroughs, servesZip } from '../src/data/area.ts';
import { understand } from '../src/data/understand.ts';
import { TOPICS, listingsFor } from '../src/data/guide-listings.ts';
import { Retriever, type Corpus } from '../src/chat/retrieve.ts';
import { NEED_WORDS, ANIMAL_WORDS, PLACES, type Area } from '../scripts/dev/consistency-cases.ts';

const inArea = (id: string, area: Area) => {
  const o = ORGS_BY_ID.get(id)!;
  if (area.zip) return servesZip(o, area.zip);
  return area.boroughs?.length ? servesBoroughs(o, area.boroughs) : true;
};
const boxes = (need: string | null, animals: string[], area: Area) =>
  new Set(LISTED_ORGS.filter((o) => (!need || hasNeed(o.needs, need)) && matchesTopic(o, { animals }) && inArea(o.id, area)).map((o) => o.id));
const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

function linkShows(href: string): Set<string> {
  const p = new URL(href, 'https://x').searchParams;
  assert.ok(!p.has('list') && !p.has('anyneed'), `${href} is not tick-boxes`);
  const area: Area = { zip: p.get('zip') ?? undefined, boroughs: p.getAll('borough') };
  return boxes(p.get('need'), p.getAll('animal'), area);
}

test('the search box, the assistant and the tick-boxes agree for every kind of help, animal and place', () => {
  const retriever = new Retriever(JSON.parse(readFileSync('data/chat-corpus.json', 'utf8')) as Corpus);
  const wrong: string[] = [];
  for (const [need, w] of Object.entries(NEED_WORDS)) {
    for (const animal of w.animal ? [w.animal] : [null, ...Object.keys(ANIMAL_WORDS)]) {
      for (const place of PLACES) {
        const q = `${w.phrase}${animal && !w.animal ? ` for my ${ANIMAL_WORDS[animal]}` : ''}${place.words ? ` ${place.words}` : ''}`;
        const expected = boxes(need, animal ? [animal] : [], place.area);
        const u = understand(q);
        const box = u.need ? boxes(u.need, u.animals, { zip: u.zip ?? undefined, boroughs: u.boroughs }) : null;
        if (!box || !same(box, expected)) wrong.push(`search box: "${q}" gives ${box?.size ?? 'a word search'}, boxes ${expected.size}`);
        const r = retriever.retrieve(q, 10);
        const shown = r.topic ? linkShows(r.topic.href) : null;
        if (!shown || !same(shown, expected)) wrong.push(`Ask: "${q}" gives ${shown?.size ?? 'no list'}, boxes ${expected.size}`);
        else if (r.topic!.count !== shown.size) wrong.push(`Ask: "${q}" says ${r.topic!.count}, its link shows ${shown.size}`);
        for (const o of r.orgs) if (shown && !shown.has(o.id)) wrong.push(`Ask: "${q}" shows ${o.name}, not in its own "see all"`);
      }
    }
  }
  assert.deepEqual(wrong.slice(0, 20), [], `${wrong.length} differences`);
});

test('every list at the foot of a guide is exactly a set of tick-boxes', () => {
  for (const t of TOPICS) {
    const need = t.block.need ?? null;
    assert.ok(need, `${t.key}: a list with no kind of help cannot be a Find help choice`);
    assert.ok(!t.block.ids, `${t.key}: a hand-picked list cannot be a Find help choice`);
    const list = new Set(listingsFor(t.block).map((o) => o.id));
    assert.ok(same(list, boxes(need, t.block.animals ?? [], {})), `${t.key}: ${list.size} places, the boxes give ${boxes(need, t.block.animals ?? [], {}).size}`);
  }
});

/*
 * Phrases people really type, which the reader must not misread (each was
 * wrong once: spaying read as TNR, a senior pet as exotic, humane education
 * as a trap, a lost pet as exotic).
 */
test('the reader understands everyday wording', () => {
  const cases: Array<[string, string, string[]?]> = [
    ['where can I get my cat spayed cheaply', 'spay-neuter', ['cat']],
    ['rescue that takes senior dogs', 'senior', ['dog']],
    ['humane education classes for kids', 'education'],
    ['I lost my cat in Astoria', 'lost-found', ['cat']],
    ['my dog is lost', 'lost-found', ['dog']],
    ['my cat ate a lily', 'poison-control', ['cat']],
    ['my dog was hit by a car', 'emergency-vet', ['dog']],
    ['I found baby birds on the sidewalk', 'wildlife-rehab', ['bird-wild']],
    ['injured pigeon in Brooklyn', 'wildlife-rehab', ['pigeon']],
    ['free pet food in the Bronx', 'food-assistance', []],
    ['where can I borrow a trap', 'trap-bank', []],
    ['I can’t afford my vet bill', 'financial-aid', []],
    ['I have to give up my rabbit', 'surrender', ['rabbit']],
    ['my landlord says no pets', 'legal', []],
    ['found kittens in my yard', 'neonatal', ['cat']],
    ['my parrot is sick', 'exotic-vet', ['bird-companion']],
  ];
  for (const [q, need, animals] of cases) {
    const u = understand(q);
    assert.equal(u.need, need, q);
    if (animals) assert.deepEqual(u.animals.sort(), [...animals].sort(), q);
  }
});
