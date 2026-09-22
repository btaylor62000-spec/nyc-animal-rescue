import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { detectContacts, evidenceFromHtml, org } from './helpers/agent.ts';
import type { Org } from '../src/types.ts';
import { detectClosure, extractContacts, htmlToText, normalizePhone } from '../scripts/agent/extract.ts';
import { parseRobots, robotsAllows, sameSite } from '../scripts/agent/fetch.ts';
import { decide, isCheckable, isPlaceholderPhone, leavesTheCity, toPatch, tooManyChanges } from '../scripts/agent/rules.ts';

const fixture = (name: string) => readFileSync(`tests/fixtures/agent/${name}`, 'utf8');
const DATE = '2026-09-24';

// --- extraction ------------------------------------------------------------

test('scripts and styles are not read as page text', () => {
  const text = htmlToText(fixture('unchanged.html'));
  assert.doesNotMatch(text, /var tracking/);
  assert.match(text, /volunteer-run TNR group/);
});

test('phone numbers are found and normalised', () => {
  const { phones } = detectContacts(fixture('unchanged.html'));
  assert.ok(phones.includes('7185550142'));
});

test('an EIN is not mistaken for a phone number', () => {
  const { phones } = detectContacts(fixture('unchanged.html'));
  assert.ok(!phones.includes('8731475180'), 'EIN 87-3147518 must not become a phone number');
});

test('a tracking script number is not picked up as a contact', () => {
  const { phones } = detectContacts(fixture('unchanged.html'));
  assert.ok(!phones.includes('5555555555'));
});

test('email addresses are found, image files are not', () => {
  const { emails } = extractContacts('write to help@example.org or see logo@2x.png');
  assert.deepEqual(emails, ['help@example.org']);
});

test('phone normalisation handles the ways people write numbers', () => {
  assert.equal(normalizePhone('(718) 555-0142'), '7185550142');
  assert.equal(normalizePhone('718.555.0142'), '7185550142');
  assert.equal(normalizePhone('1-718-555-0142'), '7185550142');
  assert.equal(normalizePhone('555-0142'), null);
});

test('closure language is detected with the sentence around it', () => {
  const signals = detectClosure(htmlToText(fixture('closed.html')));
  assert.equal(signals[0]?.severity, 'closed');
  assert.match(signals[0]!.quote, /we have closed/i);
});

test('a pause is distinguished from a closure', () => {
  const signals = detectClosure(htmlToText(fixture('paused.html')));
  assert.ok(signals.length > 0);
  assert.equal(signals.every((s) => s.severity === 'paused'), true);
});

test('a parked domain is treated as a closure', () => {
  const signals = detectClosure(htmlToText(fixture('parked.html')));
  assert.equal(signals[0]?.severity, 'closed');
});

test('an ordinary page produces no closure signal', () => {
  assert.deepEqual(detectClosure(htmlToText(fixture('unchanged.html'))), []);
});

// --- robots.txt ------------------------------------------------------------

test('a group naming us takes precedence over the wildcard group', () => {
  const robots = parseRobots(fixture('robots.txt'));
  assert.deepEqual(robots.disallow, ['/private']);
  assert.equal(robotsAllows(robots, 'https://example.org/contact'), true);
  assert.equal(robotsAllows(robots, 'https://example.org/private/x'), false);
  // The wildcard group's rules do not apply once a specific group exists.
  assert.equal(robotsAllows(robots, 'https://example.org/admin'), true);
});

test('a wildcard disallow-all is obeyed', () => {
  const robots = parseRobots('User-agent: *\nDisallow: /');
  assert.equal(robotsAllows(robots, 'https://example.org/'), false);
});

test('an empty disallow blocks nothing', () => {
  const robots = parseRobots('User-agent: *\nDisallow:');
  assert.equal(robotsAllows(robots, 'https://example.org/anything'), true);
});

test('crawl delay is respected when longer than our own', () => {
  assert.ok(parseRobots('User-agent: *\nCrawl-delay: 10').crawlDelayMs >= 10_000);
});

test('subdomains count as the same site', () => {
  assert.equal(sameSite('https://example.org/a', 'https://www.example.org/b'), true);
  assert.equal(sameSite('https://example.org/a', 'https://donate.example.org/b'), true);
  assert.equal(sameSite('https://example.org/a', 'https://somethingelse.com/b'), false);
});

// --- the rules engine ------------------------------------------------------

test('an unchanged page verifies the record', () => {
  const record = org({ phones: [{ value: '7185550142', display: '(718) 555-0142' }] });
  const decision = decide(record, evidenceFromHtml(record, fixture('unchanged.html'), DATE));
  assert.deepEqual(decision, { kind: 'ok', verified: true });

  const { patch } = toPatch(record, decision, DATE);
  assert.equal(patch.last_verified, DATE, 'seeing the stored number on their own site is what verification means');
  assert.equal(patch.check_status, 'ok');
});

test('a single replacement number is applied, with evidence', () => {
  const record = org({ phones: [{ value: '7185550142', display: '(718) 555-0142' }] });
  const decision = decide(record, evidenceFromHtml(record, fixture('changed-phone.html'), DATE));
  assert.equal(decision.kind, 'apply');

  const { patch, log } = toPatch(record, decision, DATE);
  assert.deepEqual(patch.phones, [{ value: '7185550999', display: '(718) 555-0999' }]);
  assert.equal(log[0]?.from, '7185550142');
  assert.equal(log[0]?.to, '7185550999');
  assert.ok(log[0]?.evidence_url, 'a change must record where it was seen');
});

test('two candidate numbers are a question for a person, not a change', () => {
  const record = org({ phones: [{ value: '7185550142', display: '(718) 555-0142' }] });
  const decision = decide(record, evidenceFromHtml(record, fixture('two-new-numbers.html'), DATE));
  assert.equal(decision.kind, 'needs-review');

  const { patch } = toPatch(record, decision, DATE);
  assert.equal(patch.phones, undefined, 'nothing may be overwritten when the evidence is ambiguous');
  assert.equal(patch.check_status, 'needs-review');
});

test('a closure is flagged and the record is never deleted', () => {
  const record = org({ phones: [{ value: '7185550142', display: '(718) 555-0142' }] });
  const decision = decide(record, evidenceFromHtml(record, fixture('closed.html'), DATE));
  assert.equal(decision.kind, 'closed');

  const { patch, log, flag } = toPatch(record, decision, DATE);
  assert.equal(patch.status, 'retired');
  assert.match(String(patch.status_note), /closed/i);
  assert.ok(log[0]?.evidence_url);
  assert.ok(flag);
  assert.equal(patch.phones, undefined, 'a closed organization keeps its contacts on the record');
});

test('a pause sets hiatus rather than closed', () => {
  const record = org({ phones: [{ value: '7185550142', display: '(718) 555-0142' }] });
  const decision = decide(record, evidenceFromHtml(record, fixture('paused.html'), DATE));
  assert.equal(decision.kind, 'closed');
  assert.equal(toPatch(record, decision, DATE).patch.status, 'hiatus');
});

test('one unreachable week is not yet a problem', () => {
  const record = org({ consecutive_failures: 0 });
  const decision = decide(record, { orgId: record.id, date: DATE, pages: [
    { url: 'https://example.org', finalUrl: 'https://example.org', status: 0, ok: false, offDomain: false, ownDomain: true, text: '', phones: [], emails: [], closure: [], error: 'timed out' },
  ] });
  assert.deepEqual(decision, { kind: 'unreachable', failures: 1, flagged: false });

  const { patch } = toPatch(record, decision, DATE);
  assert.equal(patch.check_status, 'unreachable');
  assert.equal(patch.confidence, undefined, 'one bad week must not downgrade anyone');
});

test('three unreachable weeks flags the record and downgrades confidence once', () => {
  const record = org({ consecutive_failures: 2, confidence: 'High' });
  const decision = decide(record, { orgId: record.id, date: DATE, pages: [
    { url: 'https://example.org', finalUrl: 'https://example.org', status: 500, ok: false, offDomain: false, ownDomain: true, text: '', phones: [], emails: [], closure: [], error: 'server error' },
  ] });
  assert.deepEqual(decision, { kind: 'unreachable', failures: 3, flagged: true });

  const { patch, log } = toPatch(record, decision, DATE);
  assert.equal(patch.check_status, 'needs-review');
  assert.equal(patch.confidence, 'Medium');
  assert.match(String(patch.status_note), /may no longer be active/i);
  assert.equal(log[0]?.field, 'confidence');

  // A fourth failure must not downgrade a second time.
  const later = org({ consecutive_failures: 3, confidence: 'Medium' });
  const laterDecision = decide(later, { orgId: later.id, date: DATE, pages: [
    { url: 'https://example.org', finalUrl: 'https://example.org', status: 500, ok: false, offDomain: false, ownDomain: true, text: '', phones: [], emails: [], closure: [], error: 'server error' },
  ] });
  assert.equal(toPatch(later, laterDecision, DATE).patch.confidence, undefined);
});

test('a redirect off the domain is flagged rather than followed', () => {
  const record = org();
  const decision = decide(record, { orgId: record.id, date: DATE, pages: [
    { url: 'https://bushwickstreetcats.org', finalUrl: 'https://casino-example.com', status: 200, ok: true, offDomain: true, ownDomain: false, text: 'unrelated', phones: [], emails: [], closure: [] },
  ] });
  assert.equal(decision.kind, 'needs-review');
  assert.match((decision as { reason: string }).reason, /different domain/i);
});

test('a social-only organization is skipped, not failed', () => {
  const record = org({ website: null, intake_urls: [], social: [{ platform: 'instagram', handle: 'bushwickcats' }] });
  assert.equal(isCheckable(record).checkable, false);

  const decision = decide(record, { orgId: record.id, date: DATE, pages: [] });
  assert.equal(decision.kind, 'skipped');
  assert.match((decision as { reason: string }).reason, /social/i);

  const { patch } = toPatch(record, decision, DATE);
  assert.equal(patch.last_checked, DATE);
  assert.equal(patch.confidence, undefined, 'a group we cannot check must not be penalised for it');
});

test('the safety valve trips when too much of the directory would change', () => {
  assert.equal(tooManyChanges(10, 300), false);
  assert.equal(tooManyChanges(50, 300), true, '50 of 300 is well past the threshold');
  assert.equal(tooManyChanges(0, 0), false);
});

test('a check never produces a deletion', () => {
  const record = org({ phones: [{ value: '7185550142', display: '(718) 555-0142' }] });
  for (const name of ['unchanged.html', 'changed-phone.html', 'two-new-numbers.html', 'closed.html', 'paused.html', 'parked.html']) {
    const decision = decide(record, evidenceFromHtml(record, fixture(name), DATE));
    const { patch } = toPatch(record, decision, DATE);
    assert.notEqual(patch.phones, null, `${name} produced a null phone list`);
    assert.ok(!('id' in patch), `${name} tried to change the record id`);
    if ('phones' in patch) {
      assert.ok(Array.isArray(patch.phones) && (patch.phones as unknown[]).length > 0, `${name} emptied the phone list`);
    }
  }
});

test('a contact we simply could not read is not reported as a change', () => {
  // Their number is in an image or loaded by script: we see no numbers at all.
  const record = org({ phones: [{ value: '7185550142', display: '(718) 555-0142' }] });
  const html = '<html><body><main><h1>Bushwick Street Cats</h1>' +
    '<p>We are a volunteer TNR group working across Bushwick and Ridgewood. ' +
    'Our contact details are on the poster in the shop window, and we answer messages ' +
    'through our help form. Please include your location and two photographs.</p>' +
    '<p>We also run monthly clinics for certified caretakers, and lend traps.</p></main></body></html>';
  const decision = decide(record, evidenceFromHtml(record, html, DATE));
  assert.deepEqual(decision, { kind: 'ok', verified: false }, 'not seeing a number is not evidence it changed');

  const { patch } = toPatch(record, decision, DATE);
  assert.equal(patch.last_verified, undefined, 'but it must not be recorded as verified either');
  assert.equal(patch.last_checked, DATE);
});

test('their number missing while other numbers are present is a real signal', () => {
  const record = org({ phones: [{ value: '7185550142', display: '(718) 555-0142' }] });
  const decision = decide(record, evidenceFromHtml(record, fixture('two-new-numbers.html'), DATE));
  assert.equal(decision.kind, 'needs-review');
});

test('an almost-empty page is treated as a broken fetch', () => {
  const record = org({ phones: [{ value: '7185550142', display: '(718) 555-0142' }] });
  const decision = decide(record, evidenceFromHtml(record, '<html><body><p>Loading…</p></body></html>', DATE));
  assert.equal(decision.kind, 'needs-review');
  assert.match((decision as { reason: string }).reason, /almost no readable text/i);
});

// --- guards on replacing a contact ----------------------------------------
//
// All three come from one live failure. On 2026-09-21 the check set both VEG
// emergency hospitals to a New Jersey number at High confidence, citing VEG's
// own page — which does not carry that number as a reader sees it. VEG renders
// its location numbers in the browser, so a plain fetch reads markup nobody is
// shown. Every clause of the rule was satisfied; the result was a wrong number
// on a 24-hour emergency listing.

/** Evidence shaped like the VEG page: the real number absent, one other present. */
function pageWith(numbers: string[], record: Org) {
  const html = `<html><body><main><p>Open 24 hours. Call us.</p>
    ${numbers.map((n) => `<p>Phone: ${n}</p>`).join('\n')}
    <p>${'Emergency and critical care for pets across the city. '.repeat(8)}</p>
  </main></body></html>`;
  return evidenceFromHtml(record, html, DATE);
}

test('an emergency listing is never rewritten unattended', () => {
  const er = org({
    id: 'veg-ralph-ave', name: 'VEG Ralph Ave',
    needs: ['emergency-vet'],
    phones: [{ value: '7186776700', display: '(718) 677-6700' }],
    emails: [],
  });
  const d = decide(er, pageWith(['(201) 438-7122'], er));
  assert.equal(d.kind, 'needs-review', 'must flag rather than apply');
  if (d.kind === 'needs-review') assert.match(d.reason, /emergency listing/i);
});

test('the same evidence on an ordinary record still applies', () => {
  const ordinary = org({
    phones: [{ value: '7185550142', display: '(718) 555-0142' }],
    emails: [],
    needs: ['tnr'],
  });
  const d = decide(ordinary, pageWith(['(718) 555-9000'], ordinary));
  assert.equal(d.kind, 'apply', 'the guard must not freeze the whole directory');
});

test('a replacement that leaves the city is flagged, not applied', () => {
  const rec = org({
    phones: [{ value: '7185550142', display: '(718) 555-0142' }],
    emails: [],
    needs: ['tnr'],
  });
  const d = decide(rec, pageWith(['(201) 438-7122'], rec));
  assert.equal(d.kind, 'needs-review');
  if (d.kind === 'needs-review') assert.match(d.reason, /outside New York City/i);
});

test('a template placeholder is never taken as a contact', () => {
  const rec = org({
    phones: [{ value: '9292822271', display: '(929) 282-2271' }],
    emails: [],
    needs: ['adoption'],
  });
  const d = decide(rec, pageWith(['(212) 222-1234'], rec));
  assert.equal(d.kind, 'needs-review');
  if (d.kind === 'needs-review') assert.match(d.reason, /placeholder/i);
});

test('placeholder detection covers the usual template numbers', () => {
  for (const bad of ['2122221234', '9999999999', '1234567890', '0000000000']) {
    assert.equal(isPlaceholderPhone(bad), true, `${bad} is not a real contact`);
  }
  for (const good of ['7186776700', '9174236444', '2018858987', '5854964660']) {
    assert.equal(isPlaceholderPhone(good), false, `${good} is a real number`);
  }
});

test('moving into the city, or within it, is not treated as suspicious', () => {
  assert.equal(leavesTheCity('7186776700', '2014387122'), true, '718 -> 201 leaves');
  assert.equal(leavesTheCity('7186776700', '9174236444'), false, '718 -> 917 stays');
  assert.equal(leavesTheCity('2014387122', '7186776700'), false, 'arriving is fine');
});

// --- "at capacity" is not a closure ---------------------------------------
//
// The 2026-09-21 run flagged the city's open-admission shelter as not
// accepting intakes, on the strength of "if we are currently at capacity,
// adopters will be directed to sign up for a waitlist" — a conditional, on an
// adoption page, about visitors rather than intake. ACC cannot refuse intake;
// showing it closed would send someone with nowhere else to go nowhere at all.

test('a conditional about capacity is not a closure signal at all', () => {
  const text =
    'Adoption process: we ask prospective adopters to have no more than two people in their party. ' +
    'If we are currently at capacity, adopters will be directed to sign up for a waitlist.';
  assert.deepEqual(detectClosure(text), [], 'a hypothetical is not a statement');
});

test('capacity language asks a person rather than closing the record', () => {
  const text = 'We cannot take owner surrenders, as all our foster homes are at capacity with dogs from open-intake partners.';
  const signals = detectClosure(text);
  assert.equal(signals.length, 1);
  assert.equal(signals[0]?.severity, 'review', 'a full foster network is not a paused organization');
});

test('a real closure or pause still decides on its own', () => {
  assert.equal(detectClosure('We have closed our doors after 20 years.')[0]?.severity, 'closed');
  assert.equal(detectClosure('WUUWR is on hiatus from wildlife rehab.')[0]?.severity, 'paused');
  assert.equal(detectClosure('We are not currently accepting new intakes.')[0]?.severity, 'paused');
});

test('a review-level signal produces needs-review, not a status change', () => {
  const rec = org({ phones: [{ value: '7185550142', display: '(718) 555-0142' }] });
  const html = `<html><body><main><p>Our foster homes are at capacity right now.</p>
    <p>${'We rehome dogs across the five boroughs and run adoption events. '.repeat(6)}</p>
    <p>Call (718) 555-0142.</p></main></body></html>`;
  const d = decide(rec, evidenceFromHtml(rec, html, DATE));
  assert.equal(d.kind, 'needs-review');
  if (d.kind === 'needs-review') assert.match(d.reason, /may or may not/i);
});

// The workflow commits bookkeeping straight to main and sends anything else
// to a pull request, using "did the patch carry a change-log entry" as the
// test. That only works if the log is written exactly when a reader could see
// the difference, so pin that down.
test('bookkeeping patches carry no change log, reader-visible ones always do', () => {
  const record = org({ phones: [{ value: '2125551234', display: '(212) 555-1234' }], consecutive_failures: 0 });
  const quiet = [
    { kind: 'skipped', reason: 'no website' },
    { kind: 'ok', verified: true },
    { kind: 'needs-review', reason: 'two candidates' },
    { kind: 'unreachable', failures: 1, flagged: false },
  ] as const;
  for (const decision of quiet) {
    assert.equal(toPatch(record, decision as never, DATE).log.length, 0, decision.kind);
  }

  const visible = [
    { kind: 'apply', changes: [{ field: 'phones', from: '2125551234', to: '2125556789', evidenceUrl: 'https://x.org' }] },
    { kind: 'closed', severity: 'closed', reason: 'closed', quote: 'we have closed', evidenceUrl: 'https://x.org' },
    { kind: 'unreachable', failures: 3, flagged: true },
  ] as const;
  for (const decision of visible) {
    assert.ok(toPatch(record, decision as never, DATE).log.length > 0, decision.kind);
  }
});
