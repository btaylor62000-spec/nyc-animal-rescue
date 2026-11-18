/*
 * One group, one listing; and every listing is a group (owner, 2026-11-17).
 *
 * The research came as a cat workbook and a dog workbook. A group in both
 * became two listings, one "cats only" and one "dogs only" (Pets of the
 * Homeless, the city's spay/neuter page, Friends of Animals, RescueNYC), and
 * a few section headings became listings of their own ("Condition-specific
 * (cats)", "Herding breeds", "Microchip registration"). The owner found the
 * first one by reading Find help. These checks find the rest before anyone
 * reads them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { LISTED_ORGS } from '../src/data/orgs.ts';

/*
 * Listings that rightly share a website: branches at different addresses, and
 * programmes of one organization that someone looks for by name. Each line
 * says which. A new pair must be added here on purpose, or merged.
 */
const SHARED_SITE_OK: Record<string, string> = {
  'nycacc.org': 'ACC and its Brooklyn and small-animal centres',
  'animalhaven.org': 'Animal Haven and its community engagement programme',
  'bronxvetcenter.com': 'two Bronx Veterinary Center branches at different addresses',
  'onelovevet.com': 'three One Love hospitals at different addresses',
  'nycommonpantry.org': 'New York Common Pantry and its Bronx site',
  'animalalliancenyc.org': "the Mayor's Alliance and its Helping Pets and People in Crisis programme",
  'reboundhounds.org': 'Rebound Hounds and its Fospice programme',
  'tobyproject.org': 'The Toby Project and its feral clinic',
};

const site = (u: string | null) =>
  u ? u.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[?#].*$/, '').replace(/\/+$/, '') : null;

test('no two listings share a website unless they are branches or programmes of one group', () => {
  const by = new Map<string, string[]>();
  for (const o of LISTED_ORGS) {
    const s = site(o.website);
    if (s) by.set(s, [...(by.get(s) ?? []), o.id]);
  }
  const dupes = [...by].filter(([s, ids]) => ids.length > 1 && !SHARED_SITE_OK[s.split('/')[0]!]);
  assert.deepEqual(dupes.map(([s, ids]) => `${s}: ${ids.join(', ')}`), [], 'merge these with NAME_ALIASES in scripts/import/overrides.ts, or add them to SHARED_SITE_OK with a reason');
});

test('no listing is a workbook heading', () => {
  const HEADING = /^(condition-specific|herding breeds|microchip registration|.*\brouting\b|.*\bindex$)|\((cats|dogs)\)$/i;
  const bad = LISTED_ORGS.filter((o) => HEADING.test(o.name)).map((o) => `${o.id}: ${o.name}`);
  assert.deepEqual(bad, [], 'drop these with DROP_NAMES in scripts/import/overrides.ts');
});
