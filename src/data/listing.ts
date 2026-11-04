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

/** Listed in the directory and offered by the assistant. */
export function isListed(org: Pick<Org, 'id' | 'status'>): boolean {
  if (org.status === 'retired' || org.status === 'relocated') return false;
  return !GUIDANCE_ONLY.has(org.id);
}
