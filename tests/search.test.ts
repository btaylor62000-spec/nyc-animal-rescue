import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ORGS, toSearchRecord } from '../src/data/orgs.ts';
import { buildIndex, processQuery, runSearch, stem } from '../src/data/search.ts';

const index = buildIndex(ORGS.map(toSearchRecord));
const nameOf = new Map(ORGS.map((o) => [o.id, o.name]));

/** The ids of the top `n` results, for readable assertions. */
function top(q: string, n = 5): string[] {
  return runSearch(index, q).slice(0, n).map((h) => h.id);
}
function topNames(q: string, n = 5): string[] {
  return top(q, n).map((id) => nameOf.get(id) ?? id);
}

test('stemming meets query and index in the middle', () => {
  assert.equal(stem('kittens'), 'kitten');
  assert.equal(stem('spayed'), 'spay');
  assert.equal(stem('puppies'), 'puppy');
  assert.equal(stem('feeding'), 'feed');
  assert.equal(stem('cat'), 'cat', 'short words are left alone');
  assert.equal(stem('loss'), 'loss', 'a double-s ending is not a plural');
});

test('stopwords are dropped from a natural query', () => {
  assert.deepEqual(processQuery('what do I do if my cat is hurt'), ['cat', 'hurt']);
  assert.deepEqual(processQuery('   '), []);
});

test('an empty query returns nothing rather than everything', () => {
  assert.deepEqual(runSearch(index, ''), []);
});

test('a name search finds the organization', () => {
  assert.equal(top('wild bird fund')[0], 'the-wild-bird-fund');
});

test('"hit by a car" reaches emergency vets, not cat rescues by name', () => {
  const ids = top('my cat was hit by a car', 6);
  const emergency = ORGS.filter((o) => ids.includes(o.id) && o.needs.includes('emergency-vet'));
  assert.ok(emergency.length >= 2, `expected emergency vets, got ${topNames('my cat was hit by a car', 6).join(', ')}`);
});

test('"spayed" finds spay/neuter services despite the suffix', () => {
  const ids = top('where can i get my cat spayed cheap', 6);
  const spay = ORGS.filter((o) => ids.includes(o.id) && o.needs.includes('spay-neuter'));
  assert.ok(spay.length >= 2, `got ${topNames('where can i get my cat spayed cheap', 6).join(', ')}`);
});

test('"borrow a trap" finds trap banks', () => {
  const ids = top('borrow a trap for tnr', 5);
  const banks = ORGS.filter((o) => ids.includes(o.id) && o.needs.includes('trap-bank'));
  assert.ok(banks.length >= 2, `got ${topNames('borrow a trap for tnr', 5).join(', ')}`);
});

test('a species word reaches records tagged only with its category', () => {
  // "squirrel" appears in no tag; it reaches wildlife records via synonyms.
  const ids = top('baby squirrel found', 8);
  const wildlife = ORGS.filter((o) => ids.includes(o.id) && (o.animals.includes('wildlife') || o.needs.includes('wildlife-rehab')));
  assert.ok(wildlife.length >= 1, `got ${topNames('baby squirrel found', 8).join(', ')}`);
});

test('a zip code finds resources in that zip', () => {
  const ids = top('11217', 5);
  assert.ok(ids.length > 0);
  const inZip = ORGS.filter((o) => ids.includes(o.id) && (o.zips.includes('11217') || o.citywide));
  assert.equal(inZip.length, ids.length, 'every result should cover that zip');
});

test('a common word alone does not return the whole directory', () => {
  const all = runSearch(index, 'my pet needs help');
  assert.ok(all.length < ORGS.length * 0.75, `too broad: ${all.length} of ${ORGS.length}`);
});

test('a query with no plausible match returns few or no results', () => {
  const hits = runSearch(index, 'quantum submarine tax accountancy');
  assert.ok(hits.length < 5, `expected a near-empty result, got ${hits.length}`);
});

test('every record is reachable by its own name', () => {
  // A record nobody can find by name is effectively not in the directory.
  const unreachable: string[] = [];
  for (const org of ORGS) {
    const hits = runSearch(index, org.name).slice(0, 10);
    if (!hits.some((h) => h.id === org.id)) unreachable.push(org.name);
  }
  assert.deepEqual(unreachable, [], 'these records cannot be found by their own name');
});
