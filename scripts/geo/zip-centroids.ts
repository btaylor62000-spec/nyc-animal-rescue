/**
 * Builds data/zip-centroids.json from the Census Bureau's ZCTA gazetteer.
 *
 *   npm run geo:zips -- path/to/2024_Gaz_zcta_national.zip
 *
 * Download the file from
 * https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_zcta_national.zip
 *
 * A listing that gives one zip code and no street is placed at that zip's
 * centre, so it can still be sorted by distance -- roughly, and labelled as
 * roughly. Only New York, New Jersey and Connecticut are kept: nobody here is
 * travelling further for help, and the whole country would be 33,000 rows.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readZipEntries } from '../lib/zip.ts';

const input = process.argv[2];
if (!input) throw new Error('Give the path to 2024_Gaz_zcta_national.zip');

const entries = readZipEntries(readFileSync(input));
const txt = [...entries.entries()].find(([name]) => name.endsWith('.txt'));
if (!txt) throw new Error('No .txt file in the gazetteer zip');

// ZIP prefixes: CT 060-069, NJ 070-089, NY 100-149.
const KEEP = /^(06\d|0[78]\d|1[0-4]\d)\d\d$/;
const out: Record<string, [number, number]> = {};
const lines = txt[1].toString('utf8').split('\n');
const header = lines[0]!.split('\t').map((h) => h.trim());
const col = (name: string) => header.indexOf(name);
const [iZip, iLat, iLon] = [col('GEOID'), col('INTPTLAT'), col('INTPTLONG')];
for (const line of lines.slice(1)) {
  const f = line.split('\t').map((x) => x.trim());
  const zip = f[iZip];
  if (!zip || !KEEP.test(zip)) continue;
  // Five decimal places is about a metre; the centre of a zip is not that exact.
  out[zip] = [Number(Number(f[iLat]).toFixed(4)), Number(Number(f[iLon]).toFixed(4))];
}
const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(
  'data/zip-centroids.json',
  `${JSON.stringify({ $comment: 'Zip code centres (internal points) from the Census Bureau 2024 ZCTA gazetteer, CT/NJ/NY only. Regenerate with npm run geo:zips.', zips: sorted })}\n`,
);
console.log(`Wrote ${Object.keys(sorted).length} zip centres to data/zip-centroids.json`);
