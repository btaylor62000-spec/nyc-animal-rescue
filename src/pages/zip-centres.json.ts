import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { isNycZip } from '../data/geo.ts';

/**
 * New York City zip code centres, for "nearest to 11215" in the directory.
 *
 * Fetched only when someone types a zip into that box, so nobody else pays
 * for it. Sorting by a typed zip needs no location services at all.
 */
export const GET: APIRoute = () => {
  const all: Record<string, [number, number]> = JSON.parse(readFileSync('data/zip-centroids.json', 'utf8')).zips;
  const nyc = Object.fromEntries(Object.entries(all).filter(([z]) => isNycZip(z)));
  return new Response(JSON.stringify(nyc), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  });
};
