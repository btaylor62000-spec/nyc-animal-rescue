import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guidesFor } from '../src/data/guide-match.ts';
import { GUIDES } from '../src/data/guides.ts';

const slugs = (q: string) => guidesFor(q, GUIDES).map((g) => g.slug);

test('guide match: the shelter urgent list is found in the words people use', () => {
  for (const q of ['urgent list', 'euthanasia list', 'save a dog from the shelter', 'dog on the kill list', 'new hope']) {
    assert.ok(slugs(q).includes('save-an-at-risk-animal'), q);
  }
});

test('guide match: abuse searches point at the reporting guide', () => {
  assert.ok(slugs('report abuse').includes('report-animal-abuse'));
  assert.ok(slugs('animal cruelty').includes('report-animal-abuse'));
});

test('guide match: an organization name finds no guide, and short input finds nothing', () => {
  assert.deepEqual(slugs('bluepearl'), []);
  assert.deepEqual(slugs('a'), []);
});
