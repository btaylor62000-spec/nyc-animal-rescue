import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emergencyVets } from '../src/data/emergency-page.ts';
import { isOpen24h } from '../src/data/hours.ts';

test('the emergency page has 24-hour hospitals to offer, every one callable', () => {
  const vets = emergencyVets();
  const h24 = vets.filter((v) => isOpen24h(v.hours));
  assert.ok(h24.length >= 20, `only ${h24.length} 24-hour hospitals`);
  for (const v of vets) assert.match(v.tel, /^tel:\+1\d{10}$/, v.name);
  // The page measures distance to these; one without a place on the map
  // could never come up as "nearest".
  for (const v of h24) assert.ok(v.geo, `${v.name} has no place on the map`);
});

test('only walk-in urgent care can be offered as the daytime extra', () => {
  const urgent = emergencyVets().filter((v) => v.urgentCare && !isOpen24h(v.hours)).map((v) => v.id).sort();
  assert.deepEqual(urgent, ['instavet-urgent-care', 'urgent-vets-bronx']);
});
