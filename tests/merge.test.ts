import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeOrgs } from '../scripts/import/merge.ts';
import type { Org } from '../src/types.ts';

function org(over: Partial<Org> & { id: string; name: string }): Org {
  return {
    aka: [], parent_org: null, org_types: [], animals: [], needs: [], boroughs: [],
    citywide: false, outside_nyc: false, neighborhoods: null, zips: [], region_note: null,
    phones: [], emails: [], website: null, intake_urls: [], social: [], address: null,
    hours: null, notes: null, type_raw: null, confidence: 'Medium', status: 'active',
    status_note: null, source_urls: [], last_verified: null, section: null,
    source_files: ['test'], last_checked: null, check_status: 'unchecked',
    consecutive_failures: 0, change_log: [], privacy_hold: false, community: null,
    ...over,
  };
}

test('the same organization in two workbooks becomes one record', () => {
  const r = mergeOrgs([
    org({ id: 'animal-haven', name: 'Animal Haven', animals: ['cat'], source_files: ['cat.xlsx'] }),
    org({ id: 'animal-haven', name: 'Animal Haven', animals: ['dog'], source_files: ['dog.xlsx'] }),
  ]);
  assert.equal(r.orgs.length, 1);
  assert.deepEqual(r.orgs[0]?.animals.sort(), ['cat', 'dog']);
  assert.equal(r.orgs[0]?.source_files.length, 2);
});

test('two clinics with the same name at different addresses stay separate', () => {
  const r = mergeOrgs([
    org({ id: 'urgent-vets', name: 'Urgent Vets', address: { street: '3800 E Tremont Ave', zip: '10465' } }),
    org({ id: 'urgent-vets', name: 'Urgent Vets', address: { street: '32-33 Junction Blvd', zip: '11369' } }),
  ]);
  assert.equal(r.orgs.length, 2, 'merging these would publish the wrong number for an urgent case');
  assert.equal(r.keptApart.length, 1);
  assert.notEqual(r.orgs[0]?.id, r.orgs[1]?.id, 'ids must stay unique');
});

test('the same address written differently still merges', () => {
  const r = mergeOrgs([
    org({ id: 'completecare', name: 'CompleteCare Veterinary Center', address: { street: '1293 Clove Rd' } }),
    org({ id: 'completecare', name: 'CompleteCare Veterinary Center', address: { street: '1293 Clove Road' } }),
  ]);
  assert.equal(r.orgs.length, 1);
});

test('spelled-out ordinals match their numeric form', () => {
  const r = mergeOrgs([
    org({ id: 'bluepearl-brooklyn', name: 'BluePearl Brooklyn', address: { street: '190 3rd Ave' } }),
    org({ id: 'bluepearl-brooklyn', name: 'BluePearl Brooklyn', address: { street: '190 Third Ave' } }),
  ]);
  assert.equal(r.orgs.length, 1);
});

test('service-area ZIPs are not treated as a location conflict', () => {
  // K9Kastle serves southern Brooklyn but is incorporated in 10003.
  const r = mergeOrgs([
    org({ id: 'k9kastle', name: 'K9Kastle', zips: ['11204', '11214'] }),
    org({ id: 'k9kastle', name: 'K9Kastle', zips: ['10003'] }),
  ]);
  assert.equal(r.orgs.length, 1);
});

test('merging keeps the best confidence but the most cautious status', () => {
  const r = mergeOrgs([
    org({ id: 'x', name: 'Example Rescue', confidence: 'High', status: 'active' }),
    org({ id: 'x', name: 'Example Rescue', confidence: 'Low', status: 'verify', status_note: 'check first' }),
  ]);
  assert.equal(r.orgs[0]?.confidence, 'High');
  assert.equal(r.orgs[0]?.status, 'verify', 'a doubt in one source must not be erased by another');
  assert.equal(r.orgs[0]?.status_note, 'check first');
});

test('a shared phone at two addresses is reported, not silently merged', () => {
  const r = mergeOrgs([
    org({ id: 'verg', name: 'VERG', address: { street: '196 4th Ave' }, phones: [{ value: '7185229400', display: '(718) 522-9400' }] }),
    org({ id: 'verg-north', name: 'VERG North', address: { street: '318 Warren St' }, phones: [{ value: '7185229400', display: '(718) 522-9400' }] }),
  ]);
  assert.equal(r.orgs.length, 2);
  assert.equal(r.conflicts.filter((c) => c.field === 'address').length, 1);
});

test('the most recent verification date wins', () => {
  const r = mergeOrgs([
    org({ id: 'y', name: 'Another Rescue', last_verified: '2026-08-01' }),
    org({ id: 'y', name: 'Another Rescue', last_verified: '2026-08-29' }),
  ]);
  assert.equal(r.orgs[0]?.last_verified, '2026-08-29');
});

/*
 * "Rescue NYC" is made entirely of words the merge key discards -- `rescue`
 * and `nyc` -- so it reduces to an empty key and cannot be grouped by name.
 * Such records fall back to grouping by their own id, and that bucket used to
 * be assigned rather than appended to: a second record with the same slug
 * replaced the first outright. A bare discovery candidate wiped the real
 * record's animals, needs, boroughs and area, and nothing reported it, because
 * as far as the merge was concerned no cluster had been combined.
 */
test('a name that reduces to an empty merge key still merges rather than overwriting', () => {
  const real = org({
    id: 'rescue-nyc', name: 'Rescue NYC',
    org_types: ['rescue-foster'], animals: ['dog'], needs: ['adoption'],
    boroughs: ['manhattan'], neighborhoods: 'Manhattan-based',
    website: 'https://www.rescuenyc.org', source_files: ['dog.xlsx'],
  });
  const candidate = org({
    id: 'rescue-nyc', name: 'Rescue NYC',
    confidence: 'Low', check_status: 'new-unverified', source_files: ['discovery'],
  });

  const r = mergeOrgs([real, candidate]);

  assert.equal(r.orgs.length, 1, 'one record out');
  assert.equal(r.merged.length, 1, 'and it must be reported as a merge, not vanish silently');
  const out = r.orgs[0]!;
  assert.deepEqual(out.animals, ['dog'], 'the real record keeps its animals');
  assert.deepEqual(out.needs, ['adoption']);
  assert.deepEqual(out.boroughs, ['manhattan']);
  assert.deepEqual(out.org_types, ['rescue-foster']);
  assert.equal(out.neighborhoods, 'Manhattan-based');
  assert.equal(out.website, 'https://www.rescuenyc.org');
  assert.deepEqual(out.source_files.sort(), ['discovery', 'dog.xlsx']);
});

/*
 * The same guarantee stated as a rule rather than a case: a discovery
 * candidate carries almost no detail, and merging one in must never take
 * detail away from a record that has it, whichever order they arrive in.
 */
test('a sparse candidate never empties a populated field', () => {
  const populated: Partial<Org> = {
    org_types: ['rescue-foster'], animals: ['cat'],
    needs: ['adoption'], boroughs: ['queens'],
  };
  for (const order of ['real-first', 'candidate-first'] as const) {
    const real = org({ id: 'kitty-corner', name: 'Kitty Corner', ...populated, source_files: ['cat.xlsx'] });
    const cand = org({ id: 'kitty-corner', name: 'Kitty Corner', confidence: 'Low', source_files: ['discovery'] });
    const r = mergeOrgs(order === 'real-first' ? [real, cand] : [cand, real]);
    const out = r.orgs[0]!;
    assert.equal(r.orgs.length, 1, order);
    assert.ok(out.animals.includes('cat'), `${order}: animals survived`);
    assert.ok(out.needs.includes('adoption'), `${order}: needs survived`);
    assert.ok(out.boroughs.includes('queens'), `${order}: boroughs survived`);
    assert.ok(out.org_types.includes('rescue-foster'), `${order}: org types survived`);
  }
});
