/**
 * Whether a position reported by a phone can be trusted to sort by.
 *
 * Shared by the directory and the assistant. Location only ever changes the
 * order of results, never which results are shown, so a wrong position costs
 * order, not information -- but it should still not be used silently. A phone
 * can report a cell tower miles away, a VPN's country, or its last fix from
 * yesterday; each case gets a plain sentence and the zip box as the way out.
 */
import { distanceMiles } from './rank.ts';

/** Roughly City Hall; everything in the five boroughs is within about 20 miles. */
const NYC = { lat: 40.7128, lon: -74.006 };
/** Beyond this the reader is not in or near the city, or the position is wrong. */
const MAX_MILES_FROM_NYC = 30;
/** Worse than this and "0.4 mi" on a card would be fiction. */
const POOR_ACCURACY_METRES = 3000;

export type PositionCheck =
  | { use: true; note: string }
  | { use: false; note: string };

export function checkPosition(lat: number, lon: number, accuracyMetres: number | null | undefined): PositionCheck {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { use: false, note: 'Your phone did not give a usable location. Type your zip code instead.' };
  }
  const away = distanceMiles(NYC, { lat, lon });
  if (away > MAX_MILES_FROM_NYC) {
    return {
      use: false,
      note: `Your phone places you about ${Math.round(away)} miles from New York City, so results are not sorted by it. If that is wrong, type your zip code instead.`,
    };
  }
  const acc = accuracyMetres ?? null;
  if (acc !== null && acc > POOR_ACCURACY_METRES) {
    const miles = Math.round((acc / 1609) * 10) / 10;
    return {
      use: true,
      note: `Sorted from your phone's location, but it is only accurate to about ${miles} miles. If the order looks wrong, type your zip code instead.`,
    };
  }
  return { use: true, note: 'Sorted from your phone’s location, straight-line and approximate. Not where you are? Type your zip code instead.' };
}
