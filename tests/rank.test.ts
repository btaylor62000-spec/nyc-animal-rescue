import { test } from 'node:test';
import assert from 'node:assert/strict';
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
