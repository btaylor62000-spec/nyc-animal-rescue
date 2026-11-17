import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDES, LINES_BY_TIER } from '../src/data/guides.ts';
import { FIND_HELP, GUIDE_LISTINGS, findHelpHref, listingsFor } from '../src/data/guide-listings.ts';

/*
 * One map of help across the site (owner, 2026-11-16): Find help's buttons
 * and the assistant's starting points are the home page's 26 numbered guide
 * lines. These check that every guide has a place on Find help, that every
 * list it opens has something in it, and that both pages are built from the
 * lines rather than from a hand-made list that can drift.
 */
test('every guide has a Find help link, and none is left over', () => {
  const slugs = GUIDES.map((g) => g.slug).sort();
  assert.deepEqual(Object.keys(FIND_HELP).sort(), slugs);
});

test('every Find help list has listings', () => {
  for (const [slug, index] of Object.entries(FIND_HELP)) {
    if (index === null) continue;
    assert.ok(GUIDE_LISTINGS[slug]?.[index], `${slug}: no list ${index} on that guide`);
    assert.ok(listingsFor(GUIDE_LISTINGS[slug]![index]!).length > 0, `${slug}: its list is empty`);
    assert.match(findHelpHref(slug), new RegExp(`guide=${slug}$`));
  }
});

test('Find help and the assistant are built from the guide lines', () => {
  assert.equal(LINES_BY_TIER.flatMap((t) => t.lines).length, GUIDES.length);
  // Both pages draw the same component, which is built from the lines.
  assert.match(readFileSync('src/components/GuideLines.astro', 'utf8'), /LINES_BY_TIER\.map/);
  assert.match(readFileSync('src/pages/directory.astro', 'utf8'), /<GuideLines mode="link"/);
  assert.match(readFileSync('src/pages/ask.astro', 'utf8'), /<GuideLines mode="ask" id="chat-examples"/);
});
