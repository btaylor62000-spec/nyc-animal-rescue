/**
 * Gives each record its place on the map, from files only -- never the
 * network, so the import stays repeatable.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { Org } from '../../src/types.ts';
import { geocodeQuery } from './query.ts';

export function attachGeo(orgs: Org[]): { address: number; zip: number } {
  const cache = existsSync('data/geo.json') ? JSON.parse(readFileSync('data/geo.json', 'utf8')).entries : {};
  const zips: Record<string, [number, number]> = existsSync('data/zip-centroids.json')
    ? JSON.parse(readFileSync('data/zip-centroids.json', 'utf8')).zips
    : {};
  let address = 0;
  let zip = 0;
  for (const org of orgs) {
    org.geo = null;
    const hit = cache[org.id];
    if (hit && hit.lat !== null && hit.query === geocodeQuery(org)) {
      org.geo = { lat: hit.lat, lon: hit.lon, precision: 'address' };
      address++;
      continue;
    }
    // One zip is a place; several are a service area, and a citywide service
    // has no place at all. Neither is given a distance.
    const only = org.address?.zip ?? (org.zips.length === 1 ? org.zips[0] : undefined);
    const c = only ? zips[only] : undefined;
    if (c && !org.citywide) {
      org.geo = { lat: c[0], lon: c[1], precision: 'zip' };
      zip++;
    }
  }
  return { address, zip };
}
