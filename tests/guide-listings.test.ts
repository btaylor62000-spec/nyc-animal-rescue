import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUIDE_LISTINGS, directoryHref, listingsFor } from '../src/data/guide-listings.ts';
import { GUIDES_BY_SLUG } from '../src/data/guides.ts';

test('guide listings: every guide named exists and every block has listings', () => {
  for (const [slug, blocks] of Object.entries(GUIDE_LISTINGS)) {
    assert.ok(GUIDES_BY_SLUG.has(slug), `no guide ${slug}`);
    for (const b of blocks) assert.ok(listingsFor(b).length > 0, `${slug}: ${b.heading} is empty`);
  }
});

test('guide listings: the pet food list carries the city pantries and links to the same filter', () => {
  const food = GUIDE_LISTINGS['keeping-your-cat']!.find((b) => b.need === 'food-assistance')!;
  const ids = listingsFor(food).map((o) => o.id);
  assert.ok(ids.includes('the-campaign-against-hunger'), 'a city pet food pantry');
  assert.equal(directoryHref(food), '/directory?need=food-assistance&animal=cat');
});
