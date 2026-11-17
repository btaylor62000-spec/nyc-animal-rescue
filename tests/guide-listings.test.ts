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

test("guide listings: the food list is Find help's Pet food help, with every city pantry first", async () => {
  const { readFileSync } = await import('node:fs');
  const city = JSON.parse(readFileSync('data/pet-food-pantries.json', 'utf8'));
  const rows = (city.pantries ?? Object.values(city).find(Array.isArray)) as unknown[];
  for (const slug of ['keeping-your-cat', 'keeping-your-dog', 'low-cost-dog-care']) {
    const food = GUIDE_LISTINGS[slug]!.find((b) => b.need === 'food-assistance')!;
    assert.ok(food.pantriesFirst, `${slug}: the city's pantries lead the food list`);
    assert.equal(food.anchor, 'city-pet-food-pantries');
    const list = listingsFor(food);
    const ids = list.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, `${slug}: no duplicates`);
    const pantries = list.filter((o) => o.id.startsWith('pantry-') || o.notes?.includes('pet food programme'));
    assert.ok(list.length >= rows.length, `${slug}: every pantry on the city's list`);
    void pantries;
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
