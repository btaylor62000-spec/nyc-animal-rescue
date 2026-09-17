/**
 * Settings for the automated checks.
 *
 * Everything here is deliberately conservative. A wrong phone number on an
 * emergency listing is worse than a slightly stale one, so the agent is built
 * to hesitate: it changes little, flags readily, and never deletes.
 */
export const AGENT = {
  /**
   * Identifies the checker and says where to complain. Anyone whose logs we
   * appear in should be able to find out what we are and ask us to stop.
   */
  userAgent:
    'NYCAnimalRescueBot/1.0 (+https://nycanimalrescue.org/about; weekly contact check; contact via the site)',

  /** Per-request timeout. Small sites on slow hosts are common here. */
  timeoutMs: 15_000,

  /** Minimum gap between requests to the same host. */
  perHostDelayMs: 2_000,

  /** How many hosts to work on at once. */
  concurrency: 4,

  /** Pages fetched per organization: the site, the intake form, the sources. */
  maxPagesPerOrg: 4,

  /** Bytes of HTML to read before giving up on a page. */
  maxBytes: 1_500_000,

  /**
   * Consecutive weekly failures before an organization is flagged for a
   * person to look at. Three weeks of silence is a real signal; one is a bad
   * afternoon for someone's web host.
   */
  failuresBeforeReview: 3,

  /**
   * If a single run would change more than this share of the directory,
   * nothing is applied. That pattern means the checker has broken, not that
   * a fifth of New York's rescues changed their phone number this week.
   */
  maxChangeShare: 0.15,

  /** Paths worth checking beyond the recorded ones. */
  contactPaths: ['/contact', '/contact-us', '/about', '/help'],
} as const;

/** Phrases that mean an organization has stopped, paused, or closed intake. */
export const CLOSURE_PATTERNS: Array<{ pattern: RegExp; severity: 'closed' | 'paused'; label: string }> = [
  { pattern: /\b(we (have|'ve) (now )?closed|permanently closed|has closed its doors|ceased operations|no longer operating|no longer in operation)\b/i, severity: 'closed', label: 'says it has closed' },
  { pattern: /\b(this (organization|organisation|rescue|charity) (has|is) (now )?(closed|dissolved|shut down))\b/i, severity: 'closed', label: 'says it has closed' },
  { pattern: /\b(we are (currently )?(on )?(a )?(hiatus|pause|paused)|on hiatus|operations are paused|temporarily closed|we are taking a break)\b/i, severity: 'paused', label: 'says it is paused' },
  { pattern: /\b(not (currently )?accepting (new )?(intakes?|surrenders?|animals|applications)|intakes? (are )?(currently )?(closed|paused|suspended)|surrenders? (are )?(currently )?(closed|paused|suspended)|at capacity)\b/i, severity: 'paused', label: 'says it is not accepting intakes' },
  { pattern: /\b(domain (is )?for sale|this domain is available|parked domain|buy this domain)\b/i, severity: 'closed', label: 'domain appears to be parked or for sale' },
];
