/**
 * Driving times to emergency vets, looked up by zip code.
 *
 * The times are measured at build time (scripts/geo/drive-times.ts) from the
 * centre of every NYC zip code, because straight-line distance is wrong where
 * a river is in the way: from Fordham, Astoria is nearest as the crow flies
 * and Yonkers is four minutes faster by road (owner, 2026-11-15: "lives
 * depend on this"). Shared by the directory in the browser and the assistant
 * on the server, so they order hospitals the same way.
 */
import { distanceMiles, type Origin } from './rank.ts';

export interface DriveTable {
  measuredOn: string;
  hospitals: Array<{ id: string; lat: number; lon: number }>;
  /** Minutes by car, no traffic, in the order of `hospitals`; null where no route was found. */
  minutes: Record<string, Array<number | null>>;
}

/**
 * The zip whose centre is nearest a position, among the zips we measured. A
 * position more than two miles from every centre is outside the city (or the
 * fix is wrong), and straight-line distance is used instead.
 */
export function nearestZip(o: Origin, centres: Record<string, [number, number]>, table: DriveTable): string | null {
  let best: string | null = null;
  let bestMiles = 2;
  for (const zip of Object.keys(table.minutes)) {
    const c = centres[zip];
    if (!c) continue;
    const miles = distanceMiles(o, { lat: c[0], lon: c[1] });
    if (miles < bestMiles) {
      bestMiles = miles;
      best = zip;
    }
  }
  return best;
}

/** Minutes from one zip to each emergency vet we have a time for. */
export function minutesFrom(zip: string | null | undefined, table: DriveTable | null | undefined): Map<string, number> | null {
  if (!zip || !table) return null;
  const row = table.minutes[zip];
  if (!row) return null;
  const out = new Map<string, number>();
  table.hospitals.forEach((h, i) => {
    const m = row[i];
    if (m !== null && m !== undefined) out.set(h.id, m);
  });
  return out;
}

/** How a driving time is shown: a measurement without traffic, so "about". */
export function driveLabel(minutes: number): string {
  return `about ${Math.max(1, minutes)} min by car`;
}
