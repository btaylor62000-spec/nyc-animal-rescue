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
