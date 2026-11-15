import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareKeys, distanceBand, distanceMiles, rankKey, type Rankable } from '../src/data/rank.ts';

const PARK_SLOPE = { lat: 40.6681, lon: -73.9806 };
const WED_11PM = new Date('2026-11-05T04:00:00Z');
const vet = (over: Partial<Rankable>): Rankable => ({ needs: ['emergency-vet'], hours: '24/7', status: 'active', confidence: 'High', geo: null, ...over });
const order = (items: Array<[string, Rankable]>, ctx: Parameters<typeof rankKey>[1]) =>
  [...items].sort(([, a], [, b]) => compareKeys(rankKey(a, ctx), rankKey(b, ctx))).map(([n]) => n);

test('distance is in miles and banded roughly', () => {
  const verg = { lat: 40.67894, lon: -73.98349 }; // 196 4th Ave
  assert.ok(Math.abs(distanceMiles(PARK_SLOPE, verg) - 0.75) < 0.1);
  assert.deepEqual([0.5, 2, 4, 8, 20, null].map(distanceBand), [0, 1, 2, 3, 4, 5]);
});

test('at night in an emergency, an open hospital beats a nearer closed clinic', () => {
  const items: Array<[string, Rankable]> = [
    ['daytime clinic next door', vet({ hours: 'Mon-Fri 8am-7pm, Sat 9am-5pm, Sun closed', geo: { ...PARK_SLOPE, precision: 'address' } })],
    ['24/7 hospital 4 miles off', vet({ geo: { lat: 40.72, lon: -73.98, precision: 'address' } })],
  ];
  assert.deepEqual(order(items, { origin: PARK_SLOPE, now: WED_11PM, emergency: true }), ['24/7 hospital 4 miles off', 'daytime clinic next door']);
});

test('nearer first, but a rough band does not let weak evidence beat strong', () => {
  const items: Array<[string, Rankable]> = [
    ['Low, 2.1 mi', vet({ confidence: 'Low', geo: { lat: 40.6681 + 0.0304, lon: -73.9806, precision: 'zip' } })],
    ['High, 2.4 mi', vet({ confidence: 'High', geo: { lat: 40.6681 + 0.0347, lon: -73.9806, precision: 'address' } })],
    ['High, 9 mi', vet({ confidence: 'High', geo: { lat: 40.6681 + 0.13, lon: -73.9806, precision: 'address' } })],
  ];
  assert.deepEqual(order(items, { origin: PARK_SLOPE }), ['High, 2.4 mi', 'Low, 2.1 mi', 'High, 9 mi']);
});

test('without a location or an emergency, evidence alone decides', () => {
  const items: Array<[string, Rankable]> = [['Medium', vet({ confidence: 'Medium' })], ['High', vet({})]];
  assert.deepEqual(order(items, {}), ['High', 'Medium']);
});

// Owner, 2026-11-15: with no location, places outside the city never lead;
// with one, the nearest open places come first, wherever they are.
test('rank: without a location the city comes first; with one, the nearest', async () => {
  const fordham = { lat: 40.8615, lon: -73.8905 };
  const yonkers = { needs: ['emergency-vet'], hours: 'Open 24/7', status: 'active', confidence: 'High', geo: { lat: 40.9312, lon: -73.8987, precision: 'address' as const }, outside: true };
  const manhattan = { needs: ['emergency-vet'], hours: 'Open 24/7', status: 'active', confidence: 'Medium', geo: { lat: 40.7618, lon: -73.9591, precision: 'address' as const }, outside: false };
  const now = new Date('2026-11-15T08:00:00Z');
  assert.ok(compareKeys(rankKey(manhattan, { emergency: true, now }), rankKey(yonkers, { emergency: true, now })) < 0, 'no location: the city first');
  assert.ok(compareKeys(rankKey(manhattan, {}), rankKey(yonkers, {})) < 0, 'no location, no emergency: the city first');
  assert.ok(compareKeys(rankKey(yonkers, { origin: fordham, emergency: true, now }), rankKey(manhattan, { origin: fordham, emergency: true, now })) < 0, 'from Fordham: the nearer open hospital first');
});

test('directory: the page sorts places in the city first when there is no location', () => {
  const src = readFileSync('src/client/directory.ts', 'utf8');
  assert.match(src, /if \(a\.m\.outside !== b\.m\.outside\) return a\.m\.outside \? 1 : -1;/);
});

test('guide listings: places in the city are listed before places outside it', async () => {
  const { GUIDE_LISTINGS, listingsFor } = await import('../src/data/guide-listings.ts');
  for (const blocks of Object.values(GUIDE_LISTINGS)) {
    for (const b of blocks) {
      if (b.ids) continue;
      const list = listingsFor(b);
      const firstOutside = list.findIndex((o) => o.outside_nyc);
      if (firstOutside >= 0) assert.ok(list.slice(firstOutside).every((o) => o.outside_nyc), `${b.heading}: a city place comes after one outside`);
    }
  }
});
