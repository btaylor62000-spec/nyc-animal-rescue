import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasLimitedHours, isOpen24h } from '../src/data/hours.ts';

test('hours: the ways the sources write "open around the clock"', () => {
  for (const h of ['24/7', 'Open 24h', '24 hours', 'Open 24/7, 365 days', '24-hour emergency']) {
    assert.equal(isOpen24h(h), true, h);
  }
});

test('hours: "NOT 24hr" is daytime, not around the clock', () => {
  // Urgent Vets' source row says exactly this.
  const h = 'Sun-Wed 12pm-10pm, Thu-Sat 10am-12am (NOT 24hr)';
  assert.equal(isOpen24h(h), false);
  assert.equal(hasLimitedHours(h), true);
});

test('hours: unknown hours claim nothing either way', () => {
  assert.equal(isOpen24h(null), false);
  assert.equal(hasLimitedHours(null), false);
});

test('hours: a reported, unconfirmed "24 hours" is not open around the clock', () => {
  // Written when a clinic's own site and the other listings disagree. The
  // phrase "24 hours" is in the text, but as a claim somebody made.
  for (const h of [
    'Not confirmed - older listings say 24 hours, recent ones daytime only. Call before going',
    'Call for hours. Listed as 24 hours elsewhere',
    'Its website says open 24 hours; other listings give late hours only - call before going',
  ]) {
    assert.equal(isOpen24h(h), false, h);
    assert.equal(hasLimitedHours(h), false, h);
  }
});
