/**
 * Whether a listing's hours say it is open around the clock.
 *
 * Shared by the directory card and the assistant's ranking, so the site and
 * the assistant can never disagree about which vets are open at 2am.
 *
 * "Emergency vet" here means a practice that takes emergencies, which
 * includes daytime urgent care: the Mayor's Alliance lists them that way, and
 * a vet that can see a wound at 3pm is the right answer at 3pm. What must not
 * happen is someone being sent to one at night, so the distinction is carried
 * by the hours rather than by leaving daytime practices out.
 */
const OPEN_24H = /\b24\s*\/\s*7\b|\b24\s*h(?:(?:ou)?rs?)?\b|\b24-hour\b/i;
const NOT_24H = /\bnot\s+24|\bno\b.{0,12}\b24/i;

/** True when the hours positively say 24 hours; null hours are not evidence. */
export function isOpen24h(hours: string | null | undefined): boolean {
  if (!hours) return false;
  return OPEN_24H.test(hours) && !NOT_24H.test(hours);
}

/** Hours are known and are not around the clock. */
export function hasLimitedHours(hours: string | null | undefined): boolean {
  return !!hours && !isOpen24h(hours);
}
