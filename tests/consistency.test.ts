import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ORGS, checkedLine, needsConfirmation } from '../src/data/orgs.ts';
import type { Org } from '../src/types.ts';

/*
 * What a reader compares from card to card has to mean the same thing on
 * every card. A tag that appears on some vets and not others reads as a
 * statement about the ones without it.
 */
const takesEmergencies = (o: Org) => o.needs.includes('emergency-vet') && !o.needs.includes('poison-control');

test('every vet that takes emergencies has its hours recorded', () => {
  // Without hours a card can say neither "Open 24/7" nor "Not open overnight".
  const missing = ORGS.filter((o) => takesEmergencies(o) && !o.hours).map((o) => o.id);
  assert.deepEqual(missing, []);
});

test('nothing listed as an emergency vet is a rescue rather than a vet', () => {
  // Four rescues once were, from "emergency vet care" in what they pay for.
  const wrong = ORGS.filter(
    (o) => takesEmergencies(o) && !/vet|veterinar|hospital|medical|medicine|urgent|ambulance|VEG|VERG|BluePearl/i.test(`${o.name} ${o.type_raw ?? ''}`),
  ).map((o) => o.id);
  assert.deepEqual(wrong, []);
});

test('no two emergency vets share a name', () => {
  const names = ORGS.filter(takesEmergencies).map((o) => o.name);
  assert.deepEqual(names.filter((n, i) => names.indexOf(n) !== i), []);
});

test('a warning appears only where it should change what someone does', () => {
  const base = ORGS.find((o) => o.confidence === 'High' && o.status === 'active')!;
  assert.equal(needsConfirmation({ ...base, last_verified: null }), false, 'not yet re-checked is a fact, not a warning');
  assert.equal(needsConfirmation({ ...base, confidence: 'Low' }), true);
  assert.equal(needsConfirmation({ ...base, status: 'hiatus' }), true);
});

test('every entry says when it was last checked, in the same words', () => {
  const base = ORGS[0]!;
  assert.equal(checkedLine({ ...base, last_verified: null }), 'Not yet checked on their own website');
  assert.match(checkedLine({ ...base, last_verified: '2026-09-22' }), /^Checked on their own website 22 Sept? 2026$/);
});
