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
import { boroughsIn, zipToBorough } from './geo.ts';

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

/*
 * A place typed into the main search box.
 *
 * People type "10026" or "cat rescue harlem" into the search box, not into
 * the filter panel. As a word search, "10026" found the one record whose text
 * mentioned it (Harlem Cats) and hid every citywide resource and every other
 * Manhattan group. A reviewer hit exactly that on the live site after the zip
 * filter had been fixed -- the filter was never where people typed. So a zip
 * or a borough in the query becomes the same place filter, and only the
 * remaining words are searched.
 */
export interface PlaceInQuery {
  zip: string | null;
  boroughs: string[];
  /** The query with the place taken out; empty when it was only a place. */
  rest: string;
}

const ZIP_IN_TEXT = /\b(1[01]\d{3})\b/;
const BOROUGH_WORDS = /\b(manhattan|brooklyn|bklyn|queens|the bronx|bronx|staten island|harlem|east harlem|upper east side|upper west side|astoria|williamsburg|bushwick|flatbush|bed-?stuy|park slope|washington heights|inwood|long island city|jackson heights|flushing|jamaica|sunset park|bay ridge|crown heights)\b/gi;

export function placeIn(query: string): PlaceInQuery {
  let rest = query;
  let zip: string | null = null;
  const z = ZIP_IN_TEXT.exec(rest);
  if (z && zipToBorough(z[1]!)) {
    zip = z[1]!;
    rest = rest.replace(z[0], ' ');
  }
  const boroughs = zip ? [] : boroughsIn(rest);
  if (boroughs.length) rest = rest.replace(BOROUGH_WORDS, ' ');
  rest = rest.replace(/\b(in|near|around|nyc|ny|new york( city)?)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  return { zip, boroughs, rest };
}
