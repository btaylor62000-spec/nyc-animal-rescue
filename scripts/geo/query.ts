/**
 * The one-line address sent to the geocoder for a record, shared by the
 * geocoding script and the importer. The importer only trusts a stored
 * coordinate whose query matches the record's current address, so an
 * address corrected later is never left pointing at the old place.
 */
import type { Org } from '../../src/types.ts';

const BOROUGH_CITY: Record<string, string> = {
  manhattan: 'New York', brooklyn: 'Brooklyn', queens: 'Queens', bronx: 'Bronx', 'staten-island': 'Staten Island',
};

function stateFor(zip: string | undefined): string {
  if (!zip) return 'NY';
  if (/^06/.test(zip)) return 'CT';
  if (/^0[78]/.test(zip)) return 'NJ';
  return 'NY';
}

export function geocodeQuery(org: Pick<Org, 'address' | 'boroughs' | 'zips'>): string | null {
  const street = org.address?.street?.trim();
  if (!street || !/^\d/.test(street)) return null; // "PO Box 22948" is not a place
  const zip = org.address?.zip ?? (org.zips.length === 1 ? org.zips[0] : undefined);
  const city = org.address?.city ?? (org.boroughs.length === 1 ? BOROUGH_CITY[org.boroughs[0]!] : undefined);
  if (!zip && !city) return null; // a street with no town is a guess
  return [street, city, `${stateFor(zip)}${zip ? ` ${zip}` : ''}`].filter(Boolean).join(', ');
}
