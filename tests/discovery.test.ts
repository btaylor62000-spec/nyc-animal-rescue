import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const DISCOVERED = 'data/discovered.json';
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

/*
 * A roster page carrying a malformed href -- "http://http//www.example.org/.org"
 * -- parses without throwing, and its hostname is "http". That is not the page's
 * own host and not a platform host, so it used to be accepted and stored as an
 * organization's website. The stored value could never be fetched, so the
 * weekly check could never verify that record either: a candidate that was
 * permanently unverifiable from the moment it was created.
 */
test('a malformed link is not stored as an organization website', () => {
  const html = `
    <a href="http://http//www.rescuenyc.org/.org">Rescue NYC</a>
    <a href="https://www.realrescue.org/about">Real Rescue Group</a>
  `;
  const found = extractRoster(html, 'https://www.nycacc.org/new-hope-partners');
  const byName = new Map(found.map((f) => [f.name, f.website]));

  assert.equal(byName.get('Rescue NYC'), undefined, 'a host that is not a domain is rejected outright');
  assert.equal(byName.get('Real Rescue Group'), 'https://www.realrescue.org/about', 'a real link still works');
});

/*
 * A roster gives a name and a link, nothing more. That used to mean a new
 * entry had no way to be contacted -- and no way ever to become verified,
 * because the weekly check confirms stored contacts rather than finding them.
 * Discovery now reads the organization's own site once and keeps what it
 * publishes, so an entry arrives usable and honest about its provenance.
 */
test('a candidate carries the contacts discovery read from its own site', () => {
  const o = candidateToOrg({
    name: 'Example Rescue',
    website: 'https://www.examplerescue.org',
    source: 'ACC New Hope partners',
    sourceUrl: 'https://www.nycacc.org/new-hope-partners',
    firstSeen: '2026-09-18',
    phones: ['7185551234'],
    emails: ['help@examplerescue.org'],
    contactsFrom: 'https://www.examplerescue.org/contact',
  });

  assert.deepEqual(o.phones, [{ value: '7185551234', display: '(718) 555-1234' }]);
  assert.deepEqual(o.emails, [{ value: 'help@examplerescue.org' }]);

  // Usable, but never claiming to be checked.
  assert.equal(o.confidence, 'Low');
  assert.equal(o.last_verified, null);
  assert.match(o.notes ?? '', /nobody has confirmed them/);

  // And where they came from is on the record, not just asserted.
  const contacts = o.change_log.find((c) => c.field === 'contacts');
  assert.ok(contacts, 'the source of the contacts is in the change log');
  assert.equal(contacts?.evidence_url, 'https://www.examplerescue.org/contact');
});

test('a candidate with nothing readable still enters, and says so', () => {
  const o = candidateToOrg({
    name: 'Quiet Rescue',
    website: 'https://www.quietrescue.org',
    source: 'ACC New Hope partners',
    sourceUrl: 'https://www.nycacc.org/new-hope-partners',
    firstSeen: '2026-09-18',
  });
  assert.deepEqual(o.phones, []);
  assert.match(o.notes ?? '', /Nothing about this entry has been checked yet/);
});

/*
 * Importing the agent must not run it.
 *
 * This file imports three pure helpers from `discover.ts`. While that module
 * called `main()` at the top level, doing so performed a real discovery run
 * and rewrote `data/discovered.json` and the monthly report on every
 * `npm test` -- so the documented pre-push command quietly staged unreviewed
 * candidate records. Now that discovery also fetches each new organization's
 * website, the same slip would make the test suite crawl the internet.
 *
 * Checked in a child process, because by the time a test runs, this file's own
 * import has already happened.
 */
test('importing the discovery agent does not run it', () => {
  const before = readFileSync(DISCOVERED, 'utf8');
  execFileSync(
    process.execPath,
    ['--import', 'tsx', '--input-type=module', '-e', "await import('./scripts/agent/discover.ts');"],
    { stdio: 'pipe', timeout: 60_000 },
  );
  assert.equal(readFileSync(DISCOVERED, 'utf8'), before, 'importing the module must write nothing');
});
