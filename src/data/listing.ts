/**
 * Which records the directory lists and the assistant may recommend.
 *
 * One rule, read by both, so the site and the assistant agree about what
 * exists. Every record still gets its own page, so an old link or a guide
 * that cites one never lands on nothing.
 */
import type { Org } from '../types.ts';

/**
 * Reporting lines that belong in guidance, not among the rescues.
 *
 * Someone with a sick bird in their hand should not be offered the federal
 * avian-flu reporting line as if it were help for the bird, or a
 * law-enforcement tip line as if it were a rescue. The injured-bird guide
 * cites both, with the context that says what they are for.
 */
export const GUIDANCE_ONLY: ReadonlySet<string> = new Set([
  'usda-report-sick-birds-line',
  'usfws-wildlife-crime-tip-line',
]);

/**
 * Never listed again, and never re-checked: groups taken off for serious
 * reasons that a working website does not undo. Everything else marked
 * closed or moved is still checked every week, because rescues close, pause
 * and reopen all the time (reviewer, 2026-11-05).
 */
export const DO_NOT_LIST: ReadonlyMap<string, string> = new Map([
  [
    'cats-of-meow-york',
    "The Queens Chronicle reported in June 2023 that its founder was arrested after police allegedly found more than 40 neglected cats in the group's care.",
  ],
]);

/** Listed in the directory and offered by the assistant. */
export function isListed(org: Pick<Org, 'id' | 'status'>): boolean {
  if (DO_NOT_LIST.has(org.id)) return false;
  if (org.status === 'retired' || org.status === 'relocated') return false;
  return !GUIDANCE_ONLY.has(org.id);
}
