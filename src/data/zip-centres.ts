/**
 * Centres of New York City's zip codes, for "nearest to 11215" without the
 * reader turning on location services -- which many people, reasonably, never
 * do. Read at build time from data/zip-centroids.json (Census ZCTA points).
 */
import type { Origin } from './rank.ts';

export type ZipCentres = Record<string, [number, number]>;

/** A five-digit zip typed or written in a question, if we know its centre. */
export function zipOrigin(zip: string | undefined | null, centres: ZipCentres): Origin | null {
  const c = zip ? centres[zip.trim()] : undefined;
  return c ? { lat: c[0], lon: c[1] } : null;
}
