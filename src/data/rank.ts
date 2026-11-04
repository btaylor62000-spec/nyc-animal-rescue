/**
 * How results are ordered for a person, shared by the directory (in the
 * browser) and the assistant (on the server), so the two cannot disagree.
 *
 * In order:
 *   1. In an emergency, somewhere open now beats somewhere whose hours are
 *      unknown, which beats somewhere closed.
 *   2. With a location, nearer beats further -- in rough bands rather than to
 *      the tenth of a mile, because a map point can be a zip code's centre and
 *      a High-confidence hospital 2.4 miles away should not lose to a Low one
 *      at 2.1.
 *   3. Firmer evidence first.
 *   4. Then exact distance, then whatever order the caller already had.
 */
import type { Geo } from '../types.ts';
import { openState } from './schedule.ts';

export interface Origin { lat: number; lon: number }

export interface Rankable {
  needs: string[];
  hours: string | null;
  status: string;
  confidence: string;
  geo?: Geo | null;
  /** Based outside the city. Without a location, in-city help comes first. */
  outside?: boolean;
}

export function distanceMiles(a: Origin, b: Origin): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 0: under 1.5 mi, 1: under 3, 2: under 6, 3: under 12, 4: further, 5: no place. */
export function distanceBand(miles: number | null): number {
  if (miles === null) return 5;
  if (miles < 1.5) return 0;
  if (miles < 3) return 1;
  if (miles < 6) return 2;
  if (miles < 12) return 3;
  return 4;
}

/** Whether the record is a vet that takes emergencies and so has an open/closed state worth sorting on. */
export function takesEmergencies(o: Pick<Rankable, 'needs' | 'status'>): boolean {
  return o.needs.includes('emergency-vet') && !o.needs.includes('poison-control') && (o.status === 'active' || o.status === 'verify');
}

const OPEN_RANK = { open: 0, unknown: 1, closed: 2 } as const;
const CONF_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

export interface RankContext {
  origin?: Origin | null;
  now?: Date;
  /** The person needs help now: put open places first. */
  emergency?: boolean;
}

/** Sort keys for one record; compare them left to right. */
export function rankKey(o: Rankable, ctx: RankContext): number[] {
  const open = ctx.emergency && takesEmergencies(o) ? OPEN_RANK[openState(o.hours, ctx.now ?? new Date()).state] : 1;
  const miles = ctx.origin && o.geo ? distanceMiles(ctx.origin, o.geo) : null;
  return [
    ctx.emergency ? open : 0,
    // Without a location, distance is unknown, but a hospital on Long Island
    // still should not lead the list for someone in the city.
    ctx.origin ? distanceBand(miles) : o.outside ? 1 : 0,
    CONF_RANK[o.confidence] ?? 3,
    miles ?? Number.MAX_SAFE_INTEGER,
  ];
}

export function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Words that mean the reader needs a vet now, for when no need filter says so. */
// "urgent list" is the city shelter's at-risk list, not a vet emergency;
// read as one, it re-sorted a search for it as if someone needed a hospital.
export const EMERGENCY_QUERY = /\b(emergenc\w*|urgent\w*(?! list)|24 ?\/ ?7|24 ?hours?|after ?hours|overnight|open now|\ber\b|bleed\w*|hit by)\b/i;
