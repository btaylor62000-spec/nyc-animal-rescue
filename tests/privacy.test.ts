import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyPrivacyHolds, scrubText } from '../scripts/import/privacy.ts';
import type { Org } from '../src/types.ts';

function org(over: Partial<Org> & { id: string; name: string }): Org {
  return {
    aka: [], parent_org: null, org_types: [], animals: [], needs: [], boroughs: [],
    citywide: false, outside_nyc: false, neighborhoods: null, zips: [], region_note: null,
    phones: [], emails: [], website: null, intake_urls: [], social: [], address: null,
    hours: null, notes: null, type_raw: null, confidence: 'Medium', status: 'active',
    status_note: null, source_urls: [], last_verified: null, section: null,
    source_files: ['test'], last_checked: null, check_status: 'unchecked',
    consecutive_failures: 0, change_log: [], privacy_hold: false,
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
  const report = applyPrivacyHolds([o]);
  assert.deepEqual(o.phones.map((p) => p.value), ['7184365163'], 'only the held number goes');
  assert.equal(o.privacy_hold, true);
  assert.ok(report.removals.length >= 1);
});

test('a held number written differently in prose is still caught', () => {
  const o = org({ id: 'x', name: 'Example', notes: 'Call 516 987 3961 any time.' });
  applyPrivacyHolds([o]);
  assert.doesNotMatch(o.notes ?? '', /987/);
});

test('guide prose drops the whole passage around a personal number', () => {
  const r = scrubText('If you have questions, contact Divya at (718) 344-4424. She is happy to help.');
  assert.equal(r.text, '', 'leaving "She is happy to help" would still point at the person');
  assert.ok(r.removed.includes('divya-personal-mobile'));
});

test('text with no held value is returned untouched', () => {
  const input = 'Call the Wild Bird Fund at (646) 306-2862.';
  assert.equal(scrubText(input).text, input);
});
