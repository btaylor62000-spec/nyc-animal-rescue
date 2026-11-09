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

test('guide listings: the city pantries have their own block, every one of them, and the other food list leaves them out', async () => {
  const { readFileSync } = await import('node:fs');
  const city = JSON.parse(readFileSync('data/pet-food-pantries.json', 'utf8'));
  const rows = (city.pantries ?? Object.values(city).find(Array.isArray)) as unknown[];
  for (const slug of ['keeping-your-cat', 'keeping-your-dog', 'low-cost-dog-care']) {
    const pantries = GUIDE_LISTINGS[slug]!.find((b) => b.cityPantries)!;
    assert.equal(listingsFor(pantries).length, rows.length, `${slug}: every pantry on the city's list`);
    assert.equal(pantries.anchor, 'city-pet-food-pantries');
    const other = GUIDE_LISTINGS[slug]!.find((b) => b.need === 'food-assistance')!;
    assert.ok(!listingsFor(other).some((o) => o.id === 'the-campaign-against-hunger'), `${slug}: no duplicates`);
  }
  assert.ok(listingsFor(GUIDE_LISTINGS['report-animal-abuse']![0]!).some((o) => o.id === 'nyc-311'));
});

test('guide listings: every guide has a list built from the listings', () => {
  for (const slug of GUIDES_BY_SLUG.keys()) assert.ok(GUIDE_LISTINGS[slug], `guide ${slug} has no listings block`);
});

/*
 * A block that names entries by id skips any id that is not listed, without
 * a word. The abuse guide named ASPCA Community Engagement for weeks after
 * it was deliberately left unlisted, and nobody could tell from the page.
 */
test('every entry a guide names by id is a listed entry', () => {
  for (const [slug, blocks] of Object.entries(GUIDE_LISTINGS)) {
    for (const b of blocks) {
      if (!b.ids) continue;
      const found = new Set(listingsFor(b).map((o) => o.id));
      for (const id of b.ids) assert.ok(found.has(id), `${slug} / "${b.heading}" names ${id}, which is not listed`);
    }
  }
});
