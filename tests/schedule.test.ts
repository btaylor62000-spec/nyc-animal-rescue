import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openLabel, openState, parseSchedule } from '../src/data/schedule.ts';

// 2026-11-04 is a Wednesday. New York is UTC-5 in November.
const at = (iso: string) => new Date(iso);
const WED_10AM = at('2026-11-04T15:00:00Z');
const WED_11PM = at('2026-11-05T04:00:00Z');
const SUN_NOON = at('2026-11-08T17:00:00Z');

test('every way the directory writes round-the-clock hours is always open', () => {
  for (const h of ['24/7', 'Open 24/7', 'Open 24h', '24 hours']) {
    assert.deepEqual(openState(h, WED_11PM), { state: 'open', until: null }, h);
  }
});

test('a weekday timetable is read, closed days included', () => {
  const h = 'Mon-Fri 8am-7pm, Sat 9am-5pm, Sun closed';
  assert.equal(openLabel(openState(h, WED_10AM), WED_10AM), 'Open now · until 7pm');
  assert.equal(openLabel(openState(h, WED_11PM), WED_11PM), 'Closed now · opens tomorrow 8am');
  assert.equal(openLabel(openState(h, SUN_NOON), SUN_NOON), 'Closed now · opens tomorrow 8am');
});

test('half hours, wrap-around day ranges and midnight closing', () => {
  assert.equal(openLabel(openState('Mon-Fri 8:30am-6:30pm, Sat 9am-5pm, Sun 9am-3pm', SUN_NOON), SUN_NOON), 'Open now · until 3pm');
  // Urgent Vets: "Sun-Wed" wraps through the weekend; "12am" is midnight.
  const uv = 'Sun-Wed 12pm-10pm, Thu-Sat 10am-12am (NOT 24hr)';
  assert.equal(openLabel(openState(uv, WED_10AM), WED_10AM), 'Closed now · opens 12pm');
  assert.equal(openLabel(openState(uv, WED_11PM), WED_11PM), 'Closed now · opens tomorrow 10am');
});

test('every-day hours are read', () => {
  assert.equal(openLabel(openState('8am-10pm every day, including holidays', WED_11PM), WED_11PM), 'Closed now · opens tomorrow 8am');
  assert.equal(openLabel(openState('open 7 days 9am-7pm', WED_10AM), WED_10AM), 'Open now · until 7pm');
});

test('a note about another branch is not read as these hours', () => {
  const h = 'Mon-Fri 9am-7pm, Sat 10am-6pm; Sun closed (Bay Ridge: Sun 10am-6pm)';
  assert.equal(openState(h, SUN_NOON).state, 'closed');
});

test('hours that cannot be read with certainty are unknown, never open', () => {
  for (const h of ['Daytime only; hours vary by clinic (Chelsea: 8am-6pm)', 'Late hours, not 24/7 - call for hours', null]) {
    assert.equal(parseSchedule(h), null, String(h));
    assert.equal(openState(h, WED_10AM).state, 'unknown');
  }
});
