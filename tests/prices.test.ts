import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { hasPrice, withoutPrices } from '../src/data/prices.ts';

// The reviewer decided on 2026-11-04 that no price appears anywhere a reader
// can see: prices go stale first, and a fee printed beside the poison control
// number can stop someone ringing it.

test('no listing shows a price', () => {
  const found: string[] = [];
  for (const f of readdirSync('data/orgs')) {
    const r = JSON.parse(readFileSync(`data/orgs/${f}`, 'utf8'));
    for (const k of ['notes', 'status_note']) if (typeof r[k] === 'string' && hasPrice(r[k])) found.push(`${r.id}.${k}`);
  }
  assert.deepEqual(found, []);
});

test('no guide shows a price', () => {
  const found = readdirSync('content/guides').filter((f) => hasPrice(readFileSync(`content/guides/${f}`, 'utf8')));
  assert.deepEqual(found, []);
});

test('an income limit is kept: it is how someone tells whether they qualify', () => {
  const t = 'Grants toward urgent care; household income under $60,000/yr; paid to the vet.';
  assert.equal(hasPrice(t), false);
  assert.equal(withoutPrices(t), t);
});

test('the price goes, the contact beside it stays', () => {
  assert.equal(withoutPrices('(888) 426-4435 - 24/7, vet toxicologists. Consult fee ~$95 (waived w/ HomeAgain microchip).'),
    '(888) 426-4435 - 24/7, vet toxicologists.');
  assert.equal(withoutPrices('Bklyn: (347) 816-2899. Bronx/Queens mobile: Tobyprojectnyc@gmail.com. $5 rabies only.'),
    'Bklyn: (347) 816-2899. Bronx/Queens mobile: Tobyprojectnyc@gmail.com.');
});

test('a clause that only made sense beside the price goes with it', () => {
  assert.equal(withoutPrices('Call to request an appointment. Its own page says every appointment needs a $50 non-refundable deposit, and can be moved with 48 hours’ notice.'),
    'Call to request an appointment.');
  assert.equal(withoutPrices('Pick-up in Brooklyn; $50 refundable deposit per trap, cash or check; keep for 14 days.'),
    'Pick-up in Brooklyn; keep for 14 days.');
});

test('a bullet that was only a price disappears rather than leaving an empty dash', () => {
  assert.equal(withoutPrices('- one\n- Fees: $8.50 a year\n- two'), '- one\n- two');
});

test('a reward is kept: it is a reason to report', () => {
  const t = 'Humane World offers a standing reward of $5,000 for information leading to a conviction.';
  assert.equal(hasPrice(t), false);
  assert.equal(withoutPrices(t), t);
});
