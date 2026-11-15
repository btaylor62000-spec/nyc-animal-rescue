/**
 * Driving times from the centre of every New York City zip code to every
 * emergency vet, measured once and published with the site.
 *
 * Why (owner, 2026-11-15, "lives depend on this"): the site sorted by
 * straight-line distance, which is wrong wherever a river is in the way. From
 * Fordham, Astoria is nearest as the crow flies, but Yonkers is four minutes
 * faster by road. A live routing service would cost money or be rate-limited
 * (rule 7), so the times are measured here, at build time, and looked up in
 * the browser and the assistant by zip.
 *
 * Source: the public OSRM demo server (router.project-osrm.org), car profile
 * on OpenStreetMap roads. Times assume no traffic, so they are best read as
 * "which is nearer", not "how long it will take at 6pm". Run again whenever an
 * emergency vet is added or moves: tests/drive-times.test.ts fails until you do.
 *
 *   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt npm run drive-times
 *   (the two variables only in a cloud session; see CLAUDE.md)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { LISTED_ORGS } from '../../src/data/orgs.ts';
import { takesEmergencies } from '../../src/data/rank.ts';
import { isNycZip } from '../../src/data/geo.ts';

const OSRM = 'https://router.project-osrm.org/table/v1/driving';
// The demo server allows about 100 places per request; stay well under it.
const SOURCES_PER_REQUEST = 50;

const hospitals = LISTED_ORGS.filter((o) => takesEmergencies(o) && o.geo)
  .map((o) => ({ id: o.id, lat: o.geo!.lat, lon: o.geo!.lon }))
  .sort((a, b) => a.id.localeCompare(b.id));

const centres: Record<string, [number, number]> = JSON.parse(readFileSync('data/zip-centroids.json', 'utf8')).zips;
const zips = Object.keys(centres).filter(isNycZip).sort();

const minutes: Record<string, Array<number | null>> = {};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < zips.length; i += SOURCES_PER_REQUEST) {
  const batch = zips.slice(i, i + SOURCES_PER_REQUEST);
  const coords = [...batch.map((z) => `${centres[z]![1]},${centres[z]![0]}`), ...hospitals.map((h) => `${h.lon},${h.lat}`)].join(';');
  const sources = batch.map((_, k) => k).join(';');
  const destinations = hospitals.map((_, k) => batch.length + k).join(';');
  const url = `${OSRM}/${coords}?sources=${sources}&destinations=${destinations}&annotations=duration`;
  let body: { code: string; durations: Array<Array<number | null>> } | null = null;
  for (let attempt = 1; attempt <= 4 && !body; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'nyc-animal-rescue drive-time table (build time, once per change)' } });
      if (res.ok) body = await res.json();
      else console.warn(`attempt ${attempt}: HTTP ${res.status}`);
    } catch (e) {
      console.warn(`attempt ${attempt}: ${(e as Error).message}`);
    }
    if (!body) await sleep(3000 * attempt);
  }
  if (!body || body.code !== 'Ok') throw new Error(`OSRM failed for zips ${batch[0]}-${batch.at(-1)}`);
  batch.forEach((z, k) => {
    minutes[z] = body!.durations[k]!.map((s) => (s === null ? null : Math.round(s / 60)));
  });
  console.log(`measured ${Math.min(i + SOURCES_PER_REQUEST, zips.length)} of ${zips.length} zips`);
  await sleep(1500);
}

const out = {
  $comment:
    'Minutes by car, no traffic, from the centre of each NYC zip code to each emergency vet, in the order of `hospitals`. Written by scripts/geo/drive-times.ts; do not edit by hand.',
  measuredOn: new Date().toISOString().slice(0, 10),
  source: 'OSRM public demo server (router.project-osrm.org), car profile, OpenStreetMap roads, no traffic',
  hospitals,
  minutes,
};
writeFileSync('data/drive-times.json', JSON.stringify(out) + '\n');
console.log(`wrote data/drive-times.json: ${zips.length} zips x ${hospitals.length} emergency vets`);
