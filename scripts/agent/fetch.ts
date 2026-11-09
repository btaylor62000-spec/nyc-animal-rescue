/**
 * Fetching other people's websites, politely.
 *
 * These are small volunteer organizations on cheap hosting. The checker
 * identifies itself, obeys robots.txt, waits between requests to the same
 * host, gives up quickly, and never retries hard. Being a nuisance to a rescue
 * group would be a poor way to run a site that exists to help them.
 */
import { AGENT } from './config.ts';

export interface FetchedPage {
  url: string;
  finalUrl: string;
  status: number;
  ok: boolean;
  redirected: boolean;
  /** The redirect left the domain we started on. */
  offDomain: boolean;
  html: string;
  error?: string;
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/** Do two URLs belong to the same organization's domain? */
export function sameSite(a: string, b: string): boolean {
  const ha = hostOf(a);
  const hb = hostOf(b);
  if (!ha || !hb) return false;
  if (ha === hb) return true;
  // A move to a subdomain, or from one to the apex, is still the same site.
  if (ha.endsWith(`.${hb}`) || hb.endsWith(`.${ha}`)) return true;
  // Two subdomains of one registrable domain: portal.311.nyc.gov sending its
  // sign-in to www1.nyc.gov was flagged as "moved or lost the domain" weekly.
  const base = (h: string) => h.split('.').slice(-2).join('.');
  if (base(ha) === base(hb) && !SHARED_HOSTS.has(base(ha))) return true;
  // The same name under another ending: heartsandbonesrescue.com -> .org.
  const stem = (h: string) => h.split('.').slice(-2)[0]!;
  if (stem(ha).length >= 6 && stem(ha) === stem(hb) && !SHARED_HOSTS.has(base(ha))) return true;
  // Its own site on a hosting service: animalprojectnyc.org ->
  // animalprojectnyc.squarespace.com.
  const tenant = (h: string) => (SHARED_HOSTS.has(base(h)) ? h.split('.')[0]! : null);
  return (tenant(hb) !== null && tenant(hb) === stem(ha)) || (tenant(ha) !== null && tenant(ha) === stem(hb));
}

/** Hosts where different subdomains belong to different people. */
const SHARED_HOSTS = new Set(['squarespace.com', 'wixsite.com', 'blogspot.com', 'webs.com', 'wordpress.com', 'github.io', 'rescuegroups.org', 'rescueme.org', 'homestead.com', 'weebly.com', 'carrd.co', 'linktr.ee', 'google.com']);

/** Links whose whole job is to send the reader to another site. */
export const REDIRECTOR = /^https?:\/\/(www\.)?(bit\.ly|forms\.gle|tinyurl\.com|goo\.gl|t\.co|linktr\.ee|ow\.ly|rebrand\.ly)\//i;

// --- robots.txt ------------------------------------------------------------

interface Robots {
  /** Disallowed path prefixes that apply to us. */
  disallow: string[];
  crawlDelayMs: number;
}

const robotsCache = new Map<string, Robots>();

/**
 * A deliberately small robots.txt reader: the User-agent groups that apply to
 * us, their Disallow paths, and Crawl-delay. Anything it cannot parse is
 * treated as "allowed", which matches how the standard is meant to fail.
 */
export function parseRobots(text: string, agent = 'nycanimalrescuebot'): Robots {
  const lines = text.split('\n').map((l) => l.replace(/#.*$/, '').trim());
  const groups: Array<{ agents: string[]; disallow: string[]; delay?: number }> = [];
  let current: { agents: string[]; disallow: string[]; delay?: number } | null = null;
  let lastWasAgent = false;

  for (const line of lines) {
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const field = m[1]!.toLowerCase();
    const value = m[2]!.trim();

    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === 'disallow' && value) current.disallow.push(value);
    if (field === 'crawl-delay') {
      const n = Number(value);
      if (Number.isFinite(n)) current.delay = n;
    }
  }

  // A group naming us wins over the wildcard group.
  const specific = groups.find((g) => g.agents.some((a) => a.includes(agent)));
  const wildcard = groups.find((g) => g.agents.includes('*'));
  const chosen = specific ?? wildcard;

  return {
    disallow: chosen?.disallow ?? [],
    crawlDelayMs: Math.max(AGENT.perHostDelayMs, (chosen?.delay ?? 0) * 1000),
  };
}

export function robotsAllows(robots: Robots, url: string): boolean {
  let path: string;
  try {
    const u = new URL(url);
    path = u.pathname + u.search;
  } catch {
    return false;
  }
  // "Disallow: /" blocks everything; an empty Disallow blocks nothing.
  return !robots.disallow.some((rule) => rule === '/' || (rule.length > 0 && path.startsWith(rule)));
}

async function loadRobots(origin: string, fetcher: typeof fetch): Promise<Robots> {
  const cached = robotsCache.get(origin);
  if (cached) return cached;

  let robots: Robots = { disallow: [], crawlDelayMs: AGENT.perHostDelayMs };
  const limit = deadline();
  try {
    const res = await fetcher(`${origin}/robots.txt`, { headers: { 'user-agent': AGENT.userAgent }, signal: limit.signal });
    if (res.ok) robots = parseRobots(await res.text());
    else await res.body?.cancel().catch(() => {});
  } catch {
    // No robots.txt, or it could not be read: the standard says carry on.
  } finally {
    limit.done();
  }
  robotsCache.set(origin, robots);
  return robots;
}

// --- throttling ------------------------------------------------------------

const lastRequestAt = new Map<string, number>();

async function waitTurn(host: string, delayMs: number): Promise<void> {
  const last = lastRequestAt.get(host) ?? 0;
  const wait = last + delayMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt.set(host, Date.now());
}

/*
 * One deadline for the whole page, headers and body alike, that really stops
 * the request. The old version only stopped *waiting* for the headers: the
 * request carried on, and reading the body had no limit at all, so a site
 * that sent its page slowly kept the run alive after every result was
 * written. On 2026-11-09 that held the link check open until GitHub
 * cancelled the job at 45 minutes, before anything was saved.
 */
function deadline(ms = AGENT.timeoutMs): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timed out after ${ms}ms`)), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

/**
 * Fetch one page, or explain why not.
 *
 * Never throws: an unreachable site is an ordinary outcome here, and the
 * rules engine decides what it means.
 */
export async function fetchPage(url: string, fetcher: typeof fetch = fetch): Promise<FetchedPage> {
  const base: FetchedPage = {
    url,
    finalUrl: url,
    status: 0,
    ok: false,
    redirected: false,
    offDomain: false,
    html: '',
  };

  let origin: string;
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ...base, error: 'not an http address' };
    origin = u.origin;
    host = u.hostname;
  } catch {
    return { ...base, error: 'not a valid address' };
  }

  const robots = await loadRobots(origin, fetcher);
  if (!robotsAllows(robots, url)) return { ...base, error: 'robots.txt asks us not to' };

  await waitTurn(host, robots.crawlDelayMs);

  const limit = deadline();
  try {
    const res = await fetcher(url, {
      headers: { 'user-agent': AGENT.userAgent, accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: limit.signal,
    });

    const finalUrl = res.url || url;
    const type = res.headers.get('content-type') ?? '';
    const isHtml = type.includes('html') || type === '';

    let html = '';
    if (res.ok && isHtml) {
      const text = await res.text();
      html = text.length > AGENT.maxBytes ? text.slice(0, AGENT.maxBytes) : text;
    } else {
      // An unread body keeps its connection open.
      await res.body?.cancel().catch(() => {});
    }

    return {
      url,
      finalUrl,
      status: res.status,
      ok: res.ok,
      redirected: finalUrl !== url,
      offDomain: finalUrl !== url && !sameSite(url, finalUrl),
      html,
    };
  } catch (err) {
    if (limit.signal.aborted) return { ...base, error: `timed out after ${AGENT.timeoutMs}ms` };
    // Node's fetch reports every network failure as "fetch failed" and puts
    // the reason in \`cause\`. The reason is the whole point: ENOTFOUND means
    // the domain no longer exists, a timeout means a bad afternoon.
    // Some causes carry no code, only a message -- a redirect loop is
    // "redirect count exceeded" -- and without it a live site that loops for
    // a client with no cookies looked exactly like a dead one.
    const c = (err as { cause?: { code?: string; message?: string } }).cause;
    const cause = c?.code ?? c?.message;
    return { ...base, error: cause ? `${(err as Error).message} (${cause})` : (err as Error).message };
  } finally {
    limit.done();
  }
}
