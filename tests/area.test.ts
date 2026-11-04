import { test } from 'node:test';
import assert from 'node:assert/strict';
import { servesBoroughs, servesZip } from '../src/data/area.ts';

const citywide = { boroughs: ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'], zips: [], citywide: true };
const bluepearl = { boroughs: ['brooklyn'], zips: ['11217'], citywide: false };
const fosterDogs = { boroughs: ['brooklyn'], zips: ['11215'], citywide: false };
const queensOnly = { boroughs: ['queens'], zips: ['11101'], citywide: false };

test('area: a citywide resource answers every borough and every zip', () => {
  assert.equal(servesBoroughs(citywide, ['brooklyn']), true);
  assert.equal(servesZip(citywide, '11203'), true);
  assert.equal(servesZip({ ...citywide, boroughs: [] }, '10451'), true, 'citywide even with no borough list');
});

test('area: a zip shows the whole borough, not only records stored with that zip', () => {
  // The case a reviewer hit: East Flatbush, 11203.
  assert.equal(servesZip(bluepearl, '11203'), true, 'BluePearl Brooklyn is at 11217 and serves Brooklyn');
  assert.equal(servesZip(fosterDogs, '11203'), true);
  assert.equal(servesBoroughs(bluepearl, ['brooklyn']), true);
});

test('area: other boroughs stay out', () => {
  assert.equal(servesZip(queensOnly, '11203'), false);
  assert.equal(servesBoroughs(queensOnly, ['brooklyn']), false);
  assert.equal(servesBoroughs(queensOnly, ['brooklyn', 'queens']), true, 'boroughs are an OR');
});

test('area: a zip outside the city matches only records naming it', () => {
  assert.equal(servesZip(bluepearl, '07652'), false);
  assert.equal(servesZip({ boroughs: [], zips: ['07652'], citywide: false }, '07652'), true);
});

import { placeIn } from '../src/data/area.ts';

test('area: a zip typed in the search box is a place, not a word', () => {
  // A reviewer typed 10026 and got only Harlem Cats.
  assert.deepEqual(placeIn('10026'), { zip: '10026', boroughs: [], rest: '' });
  assert.deepEqual(placeIn('cat rescue 10128'), { zip: '10128', boroughs: [], rest: 'cat rescue' });
  assert.deepEqual(placeIn('injured pigeon in brooklyn'), { zip: null, boroughs: ['brooklyn'], rest: 'injured pigeon' });
  assert.deepEqual(placeIn('vet near harlem'), { zip: null, boroughs: ['manhattan'], rest: 'vet' });
});

test('area: numbers that are not city zips, and plain words, stay as search words', () => {
  assert.deepEqual(placeIn('07652'), { zip: null, boroughs: [], rest: '07652' });
  assert.deepEqual(placeIn('bluepearl'), { zip: null, boroughs: [], rest: 'bluepearl' });
});
