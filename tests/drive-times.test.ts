import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LISTED_ORGS } from '../src/data/orgs.ts';
import { compareKeys, rankKey, takesEmergencies } from '../src/data/rank.ts';
import { isNycZip } from '../src/data/geo.ts';
import { minutesFrom, nearestZip, type DriveTable } from '../src/data/drive.ts';

/*
 * Driving times decide which emergency hospital is shown first (owner,
 * 2026-11-15: "lives depend on this"). These tests fail when the table no
 * longer matches the hospitals, so a new or moved hospital cannot be ranked
 * by a stale measurement. The fix is always: npm run drive-times.
 */
const table: DriveTable = JSON.parse(readFileSync('data/drive-times.json', 'utf8'));
const centres: Record<string, [number, number]> = JSON.parse(readFileSync('data/zip-centroids.json', 'utf8')).zips;

test('drive times: every emergency vet with a place is measured, at the place it is now', () => {
  const measured = new Map(table.hospitals.map((h) => [h.id, h]));
  for (const o of LISTED_ORGS.filter((o) => takesEmergencies(o) && o.geo)) {
    const h = measured.get(o.id);
    assert.ok(h, `${o.id} has no driving times: run npm run drive-times`);
    assert.ok(Math.abs(h!.lat - o.geo!.lat) < 1e-4 && Math.abs(h!.lon - o.geo!.lon) < 1e-4, `${o.id} has moved since its driving times were measured: run npm run drive-times`);
  }
});

test('drive times: every NYC zip has a row, and every pair has a route', () => {
  for (const zip of Object.keys(centres).filter(isNycZip)) {
    const row = table.minutes[zip];
    assert.ok(row, `zip ${zip} has no driving times`);
    assert.equal(row!.length, table.hospitals.length, `zip ${zip}: wrong number of times`);
    assert.ok(row!.every((m) => typeof m === 'number' && m >= 0 && m < 180), `zip ${zip}: a missing or impossible time`);
  }
});

test('drive times: a location is matched to the nearest zip, and only inside the city', () => {
  assert.equal(nearestZip({ lat: 40.8615, lon: -73.8905 }, centres, table)?.startsWith('104'), true, 'Fordham is a Bronx zip');
  assert.equal(nearestZip({ lat: 42.65, lon: -73.75 }, centres, table), null, 'Albany is not in the city');
});

test('drive times: in an emergency the nearest by road comes first, not the nearest as the crow flies', () => {
  // From Fordham (10458) Astoria is nearer in a straight line; Yonkers is faster by road.
  const drive = minutesFrom('10458', table)!;
  const get = (id: string) => LISTED_ORGS.find((o) => o.id === id)!;
  const yonkers = get('animal-specialty-center');
  const astoria = get('urvet-care-astoria');
  assert.ok(drive.get(yonkers.id)! < drive.get(astoria.id)!, 'the measured times say Yonkers is faster');
  const ctx = { origin: { lat: 40.8615, lon: -73.8905 }, emergency: true, now: new Date('2026-11-16T08:00:00Z'), drive };
  const key = (o: typeof yonkers) => rankKey({ id: o.id, needs: o.needs, hours: o.hours, status: o.status, confidence: o.confidence, geo: o.geo, outside: o.outside_nyc }, ctx);
  assert.ok(compareKeys(key(yonkers), key(astoria)) < 0);
});
