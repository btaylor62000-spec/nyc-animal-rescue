import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPrivacyHolds, scrubText } from '../scripts/import/privacy.ts';
import type { Org } from '../src/types.ts';

// The live holds file changes as people agree to be listed (all three did on
// 2026-09-22). These tests are about the mechanism, so they use a fixture.
const HOLDS = 'tests/fixtures/privacy-holds.json';

function org(over: Partial<Org> & { id: string; name: string }): Org {
  return {
    aka: [], parent_org: null, org_types: [], animals: [], needs: [], boroughs: [],
    citywide: false, outside_nyc: false, neighborhoods: null, zips: [], region_note: null,
    phones: [], emails: [], website: null, intake_urls: [], social: [], address: null,
    hours: null, notes: null, type_raw: null, confidence: 'Medium', status: 'active',
    status_note: null, source_urls: [], last_verified: null, section: null,
    source_files: ['test'], last_checked: null, check_status: 'unchecked',
    consecutive_failures: 0, change_log: [], privacy_hold: false, community: null,
    ...over,
  };
}

test('a held personal number is removed from the phone list', () => {
  const o = org({
    id: 'winorr', name: 'WINORR',
    phones: [
      { value: '5162930587', display: '(516) 293-0587' },
      { value: '7184365163', display: '(718) 436-5163' },
    ],
  });
  const report = applyPrivacyHolds([o], HOLDS);
  assert.deepEqual(o.phones.map((p) => p.value), ['7184365163'], 'only the held number goes');
  assert.equal(o.privacy_hold, true);
  assert.ok(report.removals.length >= 1);
});

test('a held number written differently in prose is still caught', () => {
  const o = org({ id: 'x', name: 'Example', notes: 'Call 516 987 3961 any time.' });
  applyPrivacyHolds([o], HOLDS);
  assert.doesNotMatch(o.notes ?? '', /987/);
});

test('guide prose drops the whole passage around a personal number', () => {
  const r = scrubText('If you have questions, contact Divya at (718) 344-4424. She is happy to help.', HOLDS);
  assert.equal(r.text, '', 'leaving "She is happy to help" would still point at the person');
  assert.ok(r.removed.includes('divya-personal-mobile'));
});

test('text with no held value is returned untouched', () => {
  const input = 'Call the Wild Bird Fund at (646) 306-2862.';
  assert.equal(scrubText(input, HOLDS).text, input);
});

/*
 * Withholding a number is only half the job. The importer files prose that was
 * sitting in a contact column into the notes ("Phone: Home Phone: cell
 * (Bobby)"), and the org page renders the notes -- so cutting the digits alone
 * leaves text that still names the person, still reads as an invitation, and
 * points at numbers that are no longer on the page.
 */
test('prose describing a withheld number is removed from the notes too', () => {
  const o = org({
    id: 'winorr', name: 'WINORR',
    phones: [{ value: '5162930587', display: '(516) 293-0587' }],
    notes:
      'Non-profit run by licensed rehabbers from their home for 20+ years. ' +
      'Phone: Home Phone: cell (Bobby) / Email: (reach by phone; also on Facebook) ' +
      'Intake: Call directly (numbers at left). Listed by NYC Bird Alliance',
  });
  applyPrivacyHolds([o], HOLDS);

  const notes = o.notes ?? '';
  assert.doesNotMatch(notes, /Home Phone/i, 'a label for a withheld number must not survive');
  assert.doesNotMatch(notes, /cell \(Bobby\)/i, 'it must not still name the person');
  assert.doesNotMatch(notes, /numbers at left/i, 'it must not point at numbers that are gone');
  assert.doesNotMatch(notes, /Call directly/i);
  assert.match(notes, /licensed rehabbers/, 'the description of the organization stays');
  assert.match(notes, /NYC Bird Alliance/, 'and so does the route that still works');
});

/*
 * The over-correction this guards against: a name hold does not take any
 * contact away, so "Phone: (no public phone; email only)" is still true and
 * still useful. An earlier version dropped it, and took the Intake lines after
 * it along too, because it bounded the segment by the next *withheld* label
 * rather than the next label of any kind.
 */
test('a name hold leaves contact prose alone', () => {
  const o = org({
    id: 'rabbit-rescue', name: 'Rabbit Rescue & Rehab',
    notes:
      'All-volunteer 501(c)(3). For WILD rabbits refers to Cottontail Cottage (Briggitte), (914) 933-7559. ' +
      'Phone: (no public phone; email only) Intake: Contact form + email Intake: /foster',
  });
  applyPrivacyHolds([o], HOLDS);

  const notes = o.notes ?? '';
  assert.doesNotMatch(notes, /Briggitte/i, 'the held first name still goes');
  assert.match(notes, /no public phone; email only/, 'but a phone note that is still true stays');
  assert.match(notes, /Intake: Contact form \+ email/, 'and text after it is not swallowed');
  assert.match(notes, /933-7559/, 'the public organization number is untouched');
});
