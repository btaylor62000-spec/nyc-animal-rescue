import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LISTED_ORGS } from '../src/data/orgs.ts';
import { GUIDES, GUIDE_TIERS } from '../src/data/guides.ts';

/*
 * The "What do you need?" buttons on Find help (src/pages/directory.astro),
 * grouped like the guides on the home page (owner, 2026-11-16). Read as text:
 * the page is Astro. A button must never open an empty list or a missing guide.
 */
const page = readFileSync('src/pages/directory.astro', 'utf8');
const block = page.slice(page.indexOf('const PICK_GROUPS'), page.indexOf('const PICKS ='));

test('the Find help buttons use the home page tiers', () => {
  for (const t of GUIDE_TIERS) assert.match(block, new RegExp(`\\n  ${t.key}: \\[`), `no buttons for the ${t.title} tier`);
});

test('every Find help button opens a list with something in it, or a real guide', () => {
  const hrefs = [...block.matchAll(/href: '([^']+)'/g)].map((m) => m[1]!);
  assert.ok(hrefs.length >= 15, 'too few buttons found: is the block still where this test looks?');
  for (const href of hrefs) {
    if (href.startsWith('/guides/')) {
      assert.ok(GUIDES.some((g) => `/guides/${g.slug}` === href), `${href} is not a guide`);
      continue;
    }
    const need = new URL(href, 'https://x').searchParams.get('need');
    assert.ok(need, `${href} names no need`);
    const n = LISTED_ORGS.filter((o) => o.needs.includes(need as never)).length;
    assert.ok(n > 0, `${href}: no listing has the need "${need}"`);
  }
});
