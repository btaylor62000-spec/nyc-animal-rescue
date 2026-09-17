import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alreadyKnown, extractRoster, summariseCoverage } from '../scripts/agent/discover.ts';
import { candidateToOrg } from '../scripts/import/discovered.ts';
import { mergeKey } from '../scripts/import/normalize.ts';

// --- coverage, without copying anyone's details ----------------------------

const REGISTER = [
  { county: 'KINGS', licensee_name: 'A Person', rabies_certified: 'No', species_accepted: 'Songbirds, Squirrels', license_expiration_date: '2028-12-31T00:00:00.000' },
  { county: 'KINGS', licensee_name: 'Another Person', rabies_certified: 'No', species_accepted: 'Waterfowl', license_expiration_date: '2028-12-31T00:00:00.000' },
  { county: 'BRONX', licensee_name: 'Third Person', rabies_certified: 'Yes', species_accepted: 'Raccoons', license_expiration_date: '2028-12-31T00:00:00.000' },
  { county: 'QUEENS', licensee_name: 'Expired Person', rabies_certified: 'Yes', species_accepted: 'Bats', license_expiration_date: '2020-12-31T00:00:00.000' },
  { county: 'NASSAU', licensee_name: 'Neighbour', rabies_certified: 'Yes', species_accepted: 'Skunks', license_expiration_date: '2028-12-31T00:00:00.000' },
];

test('coverage counts per borough, ignoring expired licences', () => {
  const c = summariseCoverage(REGISTER, '2026-09-17');
  assert.equal(c.boroughs.brooklyn?.licensed, 2);
  assert.equal(c.boroughs.bronx?.licensed, 1);
  assert.equal(c.boroughs.queens, undefined, 'an expired licence is not coverage');
  assert.equal(c.adjacent.NASSAU, 1);
});

test('coverage keeps no personal information whatsoever', () => {
  const serialised = JSON.stringify(summariseCoverage(REGISTER, '2026-09-17'));
  for (const name of ['A Person', 'Another Person', 'Third Person', 'Neighbour']) {
    assert.doesNotMatch(serialised, new RegExp(name, 'i'), `${name} must not survive the summary`);
  }
});

test('a borough with nobody rabies-certified is reported as a gap', () => {
  const c = summariseCoverage(REGISTER, '2026-09-17');
  assert.ok(c.gaps.some((g) => g.startsWith('brooklyn') && /rabies/.test(g)));
  assert.ok(!c.gaps.some((g) => g.startsWith('bronx') && /rabies/.test(g)), 'the Bronx has one, so it is not a gap');
});

test('a borough missing from the register entirely is reported', () => {
  const c = summariseCoverage(REGISTER, '2026-09-17');
  assert.ok(c.gaps.some((g) => g.startsWith('staten-island')));
});

// --- reading a roster page -------------------------------------------------

const ROSTER_HTML = `
<html><body>
<nav><a href="/">Home</a><a href="/about">About</a><a href="/donate">Donate</a></nav>
<main>
  <h1>Our rescue partners</h1>
  <ul>
    <li><a href="https://threeacresrescue.com">3 Acres Rescue</a></li>
    <li><a href="http://www.bestbullies.org/">Best Bullies</a></li>
    <li><a href="https://shelter.example.org/partners/internal">Our own partner page</a></li>
    <li><a href="https://shelter-cms.wpenginepowered.com/community">Community Outreach</a></li>
    <li><a href="https://threeacresrescue.com">3 Acres Rescue</a></li>
  </ul>
</main>
</body></html>`;

test('organization links are extracted and navigation is not', () => {
  const rows = extractRoster(ROSTER_HTML, 'https://shelter.example.org/partners');
  const names = rows.map((r) => r.name);
  assert.ok(names.includes('3 Acres Rescue'));
  assert.ok(names.includes('Best Bullies'));
  assert.ok(!names.includes('Home'));
  assert.ok(!names.includes('Donate'));
});

test('links back to the roster site itself are not organizations', () => {
  const rows = extractRoster(ROSTER_HTML, 'https://shelter.example.org/partners');
  assert.ok(!rows.some((r) => r.name === 'Our own partner page'));
});

test('the hosting platform is not mistaken for an organization', () => {
  const rows = extractRoster(ROSTER_HTML, 'https://shelter.example.org/partners');
  assert.ok(!rows.some((r) => r.name === 'Community Outreach'), 'a wpengine URL is the same site, not a partner');
});

test('the same organization listed twice appears once', () => {
  const rows = extractRoster(ROSTER_HTML, 'https://shelter.example.org/partners');
  assert.equal(rows.filter((r) => r.name === '3 Acres Rescue').length, 1);
});

test('a page with no links reports nothing rather than guessing', () => {
  assert.deepEqual(extractRoster('<html><body><p>Coming soon.</p></body></html>', 'https://x.org'), []);
});

// --- not re-adding what we already have ------------------------------------

test('a candidate already in the directory is recognised by name or domain', () => {
  const known = {
    keys: new Set([mergeKey('Best Bullies')]),
    hosts: new Set(['threeacresrescue.com']),
  };
  assert.equal(alreadyKnown({ name: 'Best Bullies, Inc.', website: null }, known), true);
  assert.equal(alreadyKnown({ name: 'Something Else', website: 'https://threeacresrescue.com' }, known), true);
  assert.equal(alreadyKnown({ name: 'Genuinely New Rescue', website: 'https://new.example.org' }, known), false);
});

// --- what a candidate becomes ----------------------------------------------

const CANDIDATE = {
  name: 'Long Island Bulldog Rescue',
  website: 'https://libr.example.org',
  source: 'ACC New Hope partners',
  sourceUrl: 'https://www.nycacc.org/new-hope-partners',
  firstSeen: '2026-10-01',
};

test('a candidate becomes a record that says it has not been checked', () => {
  const org = candidateToOrg(CANDIDATE);
  assert.equal(org.check_status, 'new-unverified');
  assert.equal(org.confidence, 'Low');
  assert.equal(org.last_verified, null, 'nothing has been verified, so there is no date');
  assert.match(org.notes ?? '', /has been checked yet/i);
  assert.equal(org.change_log[0]?.source, 'monthly-discovery');
});

test('a candidate claims no contact details it does not have', () => {
  const org = candidateToOrg(CANDIDATE);
  assert.deepEqual(org.phones, []);
  assert.deepEqual(org.emails, []);
  assert.deepEqual(org.boroughs, [], 'we do not know where it works');
});

test('tags are guessed only as far as the name supports', () => {
  const dog = candidateToOrg(CANDIDATE);
  assert.ok(dog.animals.includes('dog'), '"Bulldog Rescue" is about dogs');

  const opaque = candidateToOrg({ ...CANDIDATE, name: 'Air Twiga Animal Rescue' });
  assert.deepEqual(opaque.animals, [], 'a name that says nothing must not produce tags');
});
