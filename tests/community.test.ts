import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate, normalizeWebsiteInput, type Submission } from '../src/contribute/protocol.ts';
import { applyCorrections, submissionToOrg } from '../scripts/import/community.ts';
import { org } from './helpers/agent.ts';

const NOW = '2026-09-22T15:04:05.000Z';

function addition(over: Partial<Submission['fields']> = {}): Submission {
  return {
    version: 1,
    kind: 'add',
    org_id: 'makin-biscuits',
    submitted_at: NOW,
    submitter_email: null,
    reason: null,
    fields: {
      name: 'Makin Biscuits',
      website: 'https://www.makinbiscuits.org/',
      email: 'hello@makinbiscuits.org',
      what: 'Foster-based cat rescue in Astoria, Queens. Specialises in pregnant cats and bottle babies.',
      boroughs: ['queens'],
      ...over,
    },
    check: { page: 'https://www.makinbiscuits.org/', phone_seen: false, email_seen: true, site_read: true, note: null, checked_at: NOW },
  };
}

test('an addition needs a name, a website, one contact, a sentence and a place', () => {
  const good = validate({ kind: 'add', fields: addition().fields });
  assert.equal(good.ok, true);

  const noContact = validate({ kind: 'add', fields: { ...addition().fields, email: undefined } });
  assert.equal(noContact.ok, false);

  const social = validate({ kind: 'add', fields: { ...addition().fields, website: 'https://www.instagram.com/makinbiscuits' } });
  assert.equal(social.ok, false, 'a social page is not their own website and cannot be checked');

  const nowhere = validate({ kind: 'add', fields: { ...addition().fields, boroughs: [], zip: undefined } });
  assert.equal(nowhere.ok, false);
});

test('phone numbers are normalised and bad ones refused', () => {
  const v = validate({ kind: 'add', fields: { ...addition().fields, phone: '(718) 555-0100' } });
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.fields.phone, '7185550100');
  assert.equal(validate({ kind: 'add', fields: { ...addition().fields, phone: '555-0100' } }).ok, false);
});

test('a website without a scheme gets one; a bare word does not pass', () => {
  assert.equal(normalizeWebsiteInput('makinbiscuits.org'), 'https://makinbiscuits.org/');
  assert.equal(normalizeWebsiteInput('makinbiscuits'), null);
});

test('a correction must change something, and the locked name it carries is ignored', () => {
  assert.equal(validate({ kind: 'correct', orgId: 'x-y', fields: {} }).ok, false);
  // The form always sends the current name from its read-only box; that is
  // not a change, and it must neither count as one nor be refused.
  assert.equal(validate({ kind: 'correct', orgId: 'x-y', fields: { name: 'Same Name' } }).ok, false);
  const v = validate({ kind: 'correct', orgId: 'x-y', fields: { name: 'Same Name', hours: 'By appointment' } });
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.fields.name, undefined);
});

test('an addition publishes as a labelled, low-confidence, unverified record with tags from its own words', () => {
  const rec = submissionToOrg(addition());
  assert.equal(rec.id, 'makin-biscuits');
  assert.equal(rec.confidence, 'Low');
  assert.equal(rec.check_status, 'new-unverified', 'excluded from the assistant until checked');
  assert.equal(rec.community?.added_on, '2026-09-22');
  assert.ok(rec.animals.includes('cat'));
  assert.ok(rec.needs.includes('neonatal'), 'bottle babies is a neonatal need');
  assert.ok(rec.boroughs.includes('queens'));
  assert.deepEqual(rec.emails, [{ value: 'hello@makinbiscuits.org' }]);
  assert.match(rec.notes ?? '', /Added by a visitor/);
  assert.equal(rec.change_log[0]?.source, 'community');
});

test('a correction overwrites the contact, logs it with the page it was checked on, and labels the record', () => {
  const record = org({ id: 'some-rescue', phones: [{ value: '7185550142', display: '(718) 555-0142' }], last_verified: '2026-09-01' });
  const fix: Submission = {
    version: 1,
    kind: 'correct',
    org_id: 'some-rescue',
    submitted_at: NOW,
    submitter_email: null,
    reason: 'Their site shows the new number.',
    fields: { phone: '7185550999' },
    check: { page: 'https://example.org/contact', phone_seen: true, email_seen: false, site_read: true, note: null, checked_at: NOW },
  };
  const report = applyCorrections([record], [fix]);
  assert.deepEqual(report.applied, [{ id: 'some-rescue', fields: ['phone'] }]);
  assert.deepEqual(record.phones, [{ value: '7185550999', display: '(718) 555-0999' }]);
  assert.equal(record.community?.corrected_on, '2026-09-22');
  assert.equal(record.last_verified, null, 'nothing has confirmed what is now shown');
  const entry = record.change_log.at(-1)!;
  assert.equal(entry.source, 'community');
  assert.equal(entry.evidence_url, 'https://example.org/contact');
  assert.match(entry.note ?? '', /new number/);
});

test('a correction that changes nothing leaves no trace, and one for a missing record is reported', () => {
  const record = org({ id: 'some-rescue', phones: [{ value: '7185550142', display: '(718) 555-0142' }], website: 'https://example.org' });
  const same: Submission = {
    version: 1, kind: 'correct', org_id: 'some-rescue', submitted_at: NOW, submitter_email: null, reason: null,
    fields: { phone: '7185550142' },
    check: { page: 'https://example.org', phone_seen: true, email_seen: false, site_read: true, note: null, checked_at: NOW },
  };
  // The form re-sends the current website with a trailing slash added.
  const slash: Submission = { ...same, fields: { phone: '7185550142', website: 'https://example.org/' } };
  const gone: Submission = { ...same, org_id: 'no-such-record' };
  const report = applyCorrections([record], [same, slash, gone]);
  assert.equal(report.applied.length, 0);
  assert.equal(record.community, null);
  assert.deepEqual(report.orphaned, ['no-such-record']);
});

// --- an unconfirmed submission is published, not refused --------------------
//
// Requiring the contact to appear on the organization's own page refused 63%
// of submissions whose details were correct: numbers rendered in the browser,
// numbers on a contact page, sites that answer 403 to anything automated. The
// contributor is told what could not be confirmed; they are not turned away.

/** An addition whose contact the quick check could not find. */
function unconfirmedAddition(note = 'The contact given was not found on their website.'): Submission {
  const s = addition({ phone: '7185550142' });
  s.check = { page: 'https://www.makinbiscuits.org/', phone_seen: false, email_seen: false, site_read: true, note, checked_at: NOW };
  return s;
}

test('an addition we could not confirm is still published, and says so', () => {
  const record = submissionToOrg(unconfirmedAddition());
  assert.ok(record, 'the organization must be published');
  assert.deepEqual(record!.phones.map((p) => p.value), ['7185550142'], 'with the contact the visitor gave');
  assert.equal(record!.confidence, 'Low');
  assert.equal(record!.check_status, 'new-unverified');
  assert.match(record!.change_log[0]!.note ?? '', /not found on their website/i);
});

test('an addition whose website could not be read at all is still published', () => {
  const s = unconfirmedAddition('Their website could not be reached.');
  s.check.site_read = false;
  s.check.page = null;
  const record = submissionToOrg(s);
  assert.ok(record);
  assert.equal(record!.confidence, 'Low');
  assert.match(record!.change_log[0]!.note ?? '', /could not be reached/i);
});

test('a confirmed addition says that instead', () => {
  const record = submissionToOrg(addition());
  assert.match(record!.change_log[0]!.note ?? '', /was found on the website/i);
});

test('an unconfirmed correction is applied but stops claiming to be verified', () => {
  const target = org({ id: 'makin-biscuits', phones: [{ value: '7185550100', display: '(718) 555-0100' }], confidence: 'High', last_verified: '2026-08-26' });
  const s: Submission = {
    ...addition({ phone: '7185550142' }),
    kind: 'correct',
    check: { page: 'https://www.makinbiscuits.org/', phone_seen: false, email_seen: false, site_read: true, note: 'not found', checked_at: NOW },
  };

  const report = applyCorrections([target], [s]);
  assert.deepEqual(target.phones.map((p) => p.value), ['7185550142'], 'someone reporting a wrong number has usually just rung it');
  assert.equal(target.confidence, 'Low', 'but the entry must stop claiming to be well evidenced');
  assert.equal(target.check_status, 'needs-review');
  assert.equal(target.last_verified, null);
  assert.equal(report.unconfirmed.length, 1, 'and it is listed for a person');
});

test('a confirmed correction keeps its confidence', () => {
  const target = org({ id: 'makin-biscuits', phones: [{ value: '7185550100', display: '(718) 555-0100' }], confidence: 'High' });
  const s: Submission = {
    ...addition({ phone: '7185550142' }),
    kind: 'correct',
    check: { page: 'https://www.makinbiscuits.org/', phone_seen: true, email_seen: false, site_read: true, note: null, checked_at: NOW },
  };
  const report = applyCorrections([target], [s]);
  assert.equal(target.confidence, 'High');
  assert.equal(report.unconfirmed.length, 0);
});
