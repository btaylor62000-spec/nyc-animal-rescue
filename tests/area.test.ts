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
