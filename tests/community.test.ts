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
    check: { page: 'https://www.makinbiscuits.org/', phone_seen: false, email_seen: true, checked_at: NOW },
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

test('a correction must change something and cannot rename', () => {
  assert.equal(validate({ kind: 'correct', orgId: 'x-y', fields: {} }).ok, false);
  assert.equal(validate({ kind: 'correct', orgId: 'x-y', fields: { name: 'New Name' } }).ok, false);
  assert.equal(validate({ kind: 'correct', orgId: 'x-y', fields: { phone: '718-555-0100' } }).ok, true);
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
    check: { page: 'https://example.org/contact', phone_seen: true, email_seen: false, checked_at: NOW },
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
  const record = org({ id: 'some-rescue', phones: [{ value: '7185550142', display: '(718) 555-0142' }] });
  const same: Submission = {
    version: 1, kind: 'correct', org_id: 'some-rescue', submitted_at: NOW, submitter_email: null, reason: null,
    fields: { phone: '7185550142' },
    check: { page: 'https://example.org', phone_seen: true, email_seen: false, checked_at: NOW },
  };
  const gone: Submission = { ...same, org_id: 'no-such-record' };
  const report = applyCorrections([record], [same, gone]);
  assert.equal(report.applied.length, 0);
  assert.equal(record.community, null);
  assert.deepEqual(report.orphaned, ['no-such-record']);
});
