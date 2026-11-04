import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPosition } from '../src/data/position.ts';

test('a good fix in the city is used and says so', () => {
  const r = checkPosition(40.6681, -73.9806, 20);
  assert.equal(r.use, true);
  assert.match(r.note, /phone.s location/);
});

test('every borough is near enough to count', () => {
  for (const [lat, lon] of [[40.5795, -74.1502], [40.8448, -73.8648], [40.7282, -73.7949], [40.6782, -73.9442], [40.7831, -73.9712]]) {
    assert.equal(checkPosition(lat!, lon!, 30).use, true);
  }
});

test('a position far from the city is not used, and the reader is told why', () => {
  const r = checkPosition(41.8781, -87.6298, 15); // Chicago: a VPN, or a stale fix
  assert.equal(r.use, false);
  assert.match(r.note, /miles from New York City/);
  assert.match(r.note, /zip code/);
});

test('a vague fix is used but flagged', () => {
  const r = checkPosition(40.7, -73.95, 8000);
  assert.equal(r.use, true);
  assert.match(r.note, /only accurate to about 5 miles/);
});

test('nonsense coordinates are refused', () => {
  assert.equal(checkPosition(Number.NaN, 0, 10).use, false);
});
