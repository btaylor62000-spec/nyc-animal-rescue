import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pantryOrgs, pantryToOrg } from '../scripts/import/pantries.ts';

const PROG = {
  name: 'NYC pet food pantry programme',
  announced: '2026-10',
  sourceUrl: 'https://example.gov/map.pdf',
  pressUrl: 'https://example.com/story',
  note: 'programme note',
  addedOn: '2026-11-03',
};

const base = { name: 'Test Pantry', address: '1 Main St.', zip: '11111', borough: 'queens' as const };

test('a pantry becomes a cat-and-dog food-assistance record with its address', () => {
  const o = pantryToOrg({ ...base, phone: '7185550100', ownSite: true }, PROG);
  assert.deepEqual(o.needs, ['food-assistance', 'owner-support']);
  assert.deepEqual(o.animals, ['cat', 'dog']);
  assert.deepEqual(o.boroughs, ['queens']);
  assert.equal(o.address?.street, '1 Main St.');
  assert.deepEqual(o.zips, ['11111']);
});

test('a number read on the organization own site is Medium; a directory is Low', () => {
  const own = pantryToOrg({ ...base, phone: '7185550100', ownSite: true }, PROG);
  const dir = pantryToOrg({ ...base, phone: '7185550100', ownSite: false }, PROG);
  assert.equal(own.confidence, 'Medium');
  assert.equal(dir.confidence, 'Low');
  assert.match(dir.notes ?? '', /public pantry directory/i);
});

test('a pantry with no agreed number publishes none rather than guessing', () => {
  const o = pantryToOrg({ ...base, note: 'listings disagree' }, PROG);
  assert.deepEqual(o.phones, []);
  assert.equal(o.confidence, 'Low');
});

test('every record warns that the pet food is new and says to ring first', () => {
  for (const o of pantryOrgs()) {
    assert.match(o.notes ?? '', /ring before travelling/i, `${o.name} must tell someone to ring first`);
    assert.ok(o.source_urls.length > 0, `${o.name} must say where it came from`);
    assert.equal(o.status, 'active');
  }
});

test('the real file carries all 22 programme places and an address for each', () => {
  const orgs = pantryOrgs();
  // 22 places, but New York Common Pantry is in the programme twice, so 21.
  assert.equal(orgs.length, 21);
  const twoBoroughs = orgs.filter((o) => o.boroughs.length === 2);
  assert.equal(twoBoroughs.length, 1);
  for (const o of orgs) assert.ok(o.address?.street, `${o.name} is missing its address`);
});

test('a phone number that is published is recorded with the page it came from', () => {
  for (const o of pantryOrgs()) {
    if (!o.phones.length) continue;
    const entry = o.change_log.find((c) => c.field === 'phones');
    assert.ok(entry?.evidence_url, `${o.name} must record where its number came from`);
  }
});
