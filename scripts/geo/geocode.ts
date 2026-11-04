/**
 * Looks up each listing's street address once, and keeps the answer.
 *
 *   npm run import && npm run geocode && npm run import
 *
 * Uses the Census Bureau's public geocoder: free, no key, no account, made for
 * US street addresses. Results are cached in data/geo.json by record, with the
 * exact query sent, so a re-run only asks about addresses that are new or have
 * changed, and the import itself never touches the network -- it stays
 * byte-for-byte repeatable.
 *
 * An address the geocoder cannot match is stored as unmatched, not guessed:
 * that listing falls back to its zip code's centre, or to no position at all.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import type { Org } from '../../src/types.ts';
import { geocodeQuery } from './query.ts';

const CACHE = 'data/geo.json';
interface Entry { query: string; lat: number | null; lon: number | null; matched: string | null }

const cache: Record<string, Entry> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')).entries : {};
const orgs = readdirSync('data/orgs').filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(`data/orgs/${f}`, 'utf8')) as Org);

async function lookup(query: string): Promise<Omit<Entry, 'query'>> {
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`;
  const res = await fetch(url, { headers: { 'user-agent': 'NYCAnimalRescueBot/1.0 (+https://nyc-animal-rescue.pages.dev/about)' } });
  if (!res.ok) throw new Error(`Census geocoder answered ${res.status} for ${query}`);
  const match = (await res.json()).result?.addressMatches?.[0];
  if (!match) return { lat: null, lon: null, matched: null };
  return { lat: Number(match.coordinates.y.toFixed(5)), lon: Number(match.coordinates.x.toFixed(5)), matched: match.matchedAddress };
}

const next: Record<string, Entry> = {};
let asked = 0;
for (const org of orgs.sort((a, b) => a.id.localeCompare(b.id))) {
  const query = geocodeQuery(org);
  if (!query) continue;
  if (cache[org.id]?.query === query) {
    next[org.id] = cache[org.id]!;
    continue;
  }
  next[org.id] = { query, ...(await lookup(query)) };
  asked++;
  console.log(`${next[org.id]!.lat === null ? 'no match' : 'found   '}  ${org.id}: ${query}`);
}
writeFileSync(CACHE, `${JSON.stringify({ $comment: 'Street addresses looked up with the Census Bureau geocoder by npm run geocode. Keyed by record id; a coordinate is used only while the record\'s address still produces the same query.', entries: next }, null, 1)}\n`);
const unmatched = Object.values(next).filter((e) => e.lat === null).length;
console.log(`\n${Object.keys(next).length} addresses (${asked} looked up now, ${unmatched} unmatched) in ${CACHE}`);
