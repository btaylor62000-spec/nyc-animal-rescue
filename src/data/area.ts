/**
 * Whether a listing answers someone looking in a borough or a zip code.
 *
 * Used by the directory's filters, and tested on its own, because getting it
 * wrong hides help from exactly the person filtering for it.
 *
 * The zip codes stored on a record say where an organization *is* -- the
 * workbook's "zip" column is usually the street address -- not who it will
 * help. Foster Dogs is "NYC-wide" and carries 11215; BluePearl Brooklyn
 * carries 11217. Reading them as a service area hid both, and about sixty
 * other Brooklyn resources, from someone typing 11203. So a zip answers
 * everything serving its borough and everything citywide; nearness is
 * handled by ordering from the zip, never by hiding.
 */
import { zipToBorough } from './geo.ts';

export interface AreaFacts {
  boroughs: readonly string[];
  zips: readonly string[];
  citywide: boolean;
}

export function servesBoroughs(o: AreaFacts, wanted: Iterable<string>): boolean {
  if (o.citywide) return true;
  for (const b of wanted) if (o.boroughs.includes(b)) return true;
  return false;
}

export function servesZip(o: AreaFacts, zip: string): boolean {
  if (o.citywide || o.zips.includes(zip)) return true;
  const borough = zipToBorough(zip);
  return borough !== null && o.boroughs.includes(borough);
}
