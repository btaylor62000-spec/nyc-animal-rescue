/**
 * What a link check found, in words a person can act on.
 *
 * Pure, like rules.ts: the network is in links.ts. A reviewer found links that
 * answered "page not found" on listings and guides, and nothing on the site
 * looked at guide links at all. This reports; it never edits a link, for the
 * reason the weekly check never edits a contact: a dead address is exactly when
 * guessing the new one is most tempting and most dangerous.
 */
import { pageProblem } from './rules.ts';

export type LinkVerdict = 'ok' | 'gone' | 'parked' | 'taken' | 'elsewhere' | 'blocked' | 'down';

export interface LinkEvidence {
  url: string;
  finalUrl: string;
  status: number;
  ok: boolean;
  offDomain: boolean;
  text: string;
  error?: string;
}

/** A domain that has lapsed and been parked or put up for sale. */
const PARKED = /\b(this domain (name )?(is|may be) for sale|buy this domain|domain (is )?parked|parked free|domain has expired|hugedomains|sedo domain parking|this domain isn'?t connected to a (web)?site)\b/i;
/*
 * A lapsed rescue domain bought for spam. Kittens and Barbells' address was
 * found sending readers to an online casino on 2026-11-04. Words no animal
 * charity's page uses.
 */
const TAKEN = /\b(casino|slots?\s+(online|gacor)|togel|judi|sabung ayam|sportsbook|online betting|poker online|viagra|cialis|replica watches|payday loans?)\b/i;
const SHORTENER = /^https?:\/\/(www\.)?(bit\.ly|forms\.gle|tinyurl\.com|goo\.gl|t\.co|linktr\.ee|ow\.ly|rebrand\.ly)\//i;
/** A page that says it is not there, while answering 200. */
const SOFT_404 = /\b(page not found|404 (error|not found)|this page (doesn'?t|does not) exist|nothing was found at this location|we couldn'?t find the page|page (you are looking for|you requested) (could not|cannot|can'?t) be found)\b/i;

export function linkVerdict(e: LinkEvidence): LinkVerdict {
  if ([404, 410].includes(e.status)) return 'gone';
  const problem = pageProblem({
    url: e.url, finalUrl: e.finalUrl, status: e.status, ok: e.ok, offDomain: e.offDomain,
    ownDomain: !e.offDomain, text: e.text, phones: [], emails: [], closure: [], error: e.error,
  });
  if (problem === 'gone') return 'gone';
  if (/\/lander\b/.test(e.finalUrl) || (e.ok && PARKED.test(e.text.slice(0, 4000)))) return 'parked';
  if (e.ok && TAKEN.test(e.text.slice(0, 6000))) return 'taken';
  if (problem === 'blocked') return 'blocked';
  if (problem === 'down') return 'down';
  if (e.ok && e.text.length < 6000 && SOFT_404.test(e.text)) return 'gone';
  // A shortener or form link exists to send readers elsewhere.
  if (e.offDomain && !SHORTENER.test(e.url)) return 'elsewhere';
  return 'ok';
}

export const VERDICT_WORDS: Record<LinkVerdict, string> = {
  ok: 'works',
  gone: 'page not found, or the site no longer exists',
  parked: 'the domain has lapsed: parked or for sale',
  taken: 'the address now belongs to someone else (spam or gambling): remove the link now',
  elsewhere: 'sends readers to a different site',
  blocked: 'refuses automated checks; a person needs to open it',
  down: 'did not answer this time (server error or timeout)',
};
