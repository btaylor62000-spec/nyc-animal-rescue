import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pantryOrgs, pantryToOrg } from '../scripts/import/pantries.ts';

const PROG = {
  name: 'NYC pet food pantry programme',
  announced: '2026-10',
  sourceUrl: 'https://example.gov/map.pdf',
  pressUrl: 'https://example.com/story',
  note: 'programme note',
  addedOn: '2026-11-03',
};

const base = {
  name: 'Test Pantry',
  address: '1 Main St.',
  zip: '11111',
  borough: 'queens' as const,
  programmePhone: '7185550100',
};

test('a pantry becomes a cat-and-dog food-assistance record with its address', () => {
  const o = pantryToOrg(base, PROG);
  assert.deepEqual(o.needs, ['food-assistance', 'owner-support']);
  assert.deepEqual(o.animals, ['cat', 'dog']);
  assert.equal(o.address?.street, '1 Main St.');
  assert.deepEqual(o.zips, ['11111']);
});

test("the city's programme number comes first and is labelled", () => {
  const o = pantryToOrg(base, PROG);
  const first = o.phones[0];
  assert.ok(first);
  assert.equal(first.value, '7185550100');
  assert.equal(first.label, 'Pet food programme');
});

test('an organization main line is kept alongside it, not instead of it', () => {
  const o = pantryToOrg({ ...base, mainPhone: '7185550199', ownSite: true }, PROG);
  assert.deepEqual(o.phones.map((p) => p.value), ['7185550100', '7185550199']);
  const second = o.phones[1];
  assert.ok(second);
  assert.equal(second.label, 'Main line');
  assert.match(o.notes ?? '', /different number/i);
});

test('every record warns the pet food is new and says to ring first', () => {
  for (const o of pantryOrgs()) {
    assert.match(o.notes ?? '', /ring before travelling/i, `${o.name} must tell someone to ring first`);
    const lead = o.phones[0];
    assert.ok(lead, `${o.name} must carry the programme number`);
    assert.equal(lead.label, 'Pet food programme');
    assert.equal(o.status, 'active');
    assert.ok(o.address?.street, `${o.name} is missing its address`);
  }
});

test('the real file carries all 22 programme places', () => {
  const orgs = pantryOrgs();
  // 22 places, but New York Common Pantry is in the programme twice, so 21.
  assert.equal(orgs.length, 21);
  assert.equal(orgs.filter((o) => o.boroughs.length === 2).length, 1);
});

/*
 * The city's map lists a named member of staff against every pantry. They are
 * individuals, and the rule is that individuals are not published -- so no
 * record may carry one, however it got there.
 */
test('no staff name from the source reaches a record', () => {
  const source = JSON.parse(readFileSync('data/pet-food-pantries.json', 'utf8'));
  const blob = JSON.stringify(pantryOrgs()).toLowerCase();
  for (const name of ['endriss', 'auguste', 'zaientz', 'bracetty', 'tweedy', 'samuels', 'caballero',
    'al-amin', 'secon', 'grimaldi', 'negron', 'rodriguez', 'caban', 'delorbe', 'ottley', 'stodolski',
    'sibanda', 'hutchins', 'guillem', 'orwoll', 'carter-thomas', 'boodhoo', 'ytac', 'phelan',
    'asaro', 'rathgen', 'alwill']) {
    assert.ok(!blob.includes(name), `a staff name leaked into a record: ${name}`);
  }
  assert.ok(!JSON.stringify(source).toLowerCase().includes('endriss'), 'staff names must not be stored either');
});
