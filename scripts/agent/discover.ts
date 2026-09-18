/**
 * The monthly discovery run.
 *
 *   npm run agent:discover            look for new resources, write candidates
 *   npm run agent:discover -- --dry   look, write nothing
 *
 * Two different jobs, deliberately kept apart:
 *
 *   1. COVERAGE. The state's register of licensed wildlife rehabilitators is
 *      a list of private individuals -- names, and often a home phone. It is
 *      read here for what it says about *coverage*: how many licensed
 *      rehabbers each borough has, and which species they are permitted to
 *      take. None of it is copied into the directory. People who need a
 *      rehabber are sent to the state's own search tool, which exists for
 *      exactly that and is kept current by the people it lists.
 *
 *   2. CANDIDATES. Organizational rosters -- the city shelter's rescue
 *      partners, the citywide alliance's member list -- are read for
 *      organizations we do not already have. Those are written to
 *      data/discovered.json as candidates, never straight into the directory.
 *      The importer turns them into records marked "newly found, not yet
 *      verified", and they stay out of the assistant's answers until a weekly
 *      check has actually found a working contact on their own site.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { Org } from '../../src/types.ts';
import { AGENT } from './config.ts';
import { fetchPage, hostOf } from './fetch.ts';
import { htmlToText } from './extract.ts';
import { mergeKey } from '../import/normalize.ts';

const DISCOVERED_PATH = 'data/discovered.json';
const COVERAGE_PATH = 'data/wildlife-coverage.json';
const REPORT_PATH = 'build/reports/monthly-discovery.md';

const NYC_COUNTIES: Record<string, string> = {
  KINGS: 'brooklyn',
  QUEENS: 'queens',
  'NEW YORK': 'manhattan',
  BRONX: 'bronx',
  RICHMOND: 'staten-island',
};

/** Counties people in the city are routinely referred to. */
const ADJACENT_COUNTIES = ['NASSAU', 'SUFFOLK', 'WESTCHESTER', 'ROCKLAND', 'PUTNAM', 'ORANGE'];

// --- 1. coverage -----------------------------------------------------------

interface DecRow {
  county?: string;
  city?: string;
  licensee_name?: string;
  license_type?: string;
  rabies_certified?: string;
  species_accepted?: string;
  license_expiration_date?: string;
}

export interface CoverageReport {
  source: string;
  fetched: string;
  note: string;
  boroughs: Record<string, { licensed: number; rabiesCertified: number; species: string[] }>;
  adjacent: Record<string, number>;
  gaps: string[];
}

/**
 * Summarise the state register without copying anything from it.
 *
 * Only counts and species names leave this function. No name, phone number,
 * city or licence number is retained anywhere.
 */
export function summariseCoverage(rows: DecRow[], today: string): CoverageReport {
  const boroughs: CoverageReport['boroughs'] = {};
  const adjacent: Record<string, number> = {};

  for (const raw of rows) {
    const county = (raw.county ?? '').toUpperCase().trim();
    const expired = raw.license_expiration_date ? raw.license_expiration_date.slice(0, 10) < today : false;
    if (expired) continue;

    const borough = NYC_COUNTIES[county];
    if (borough) {
      const entry = (boroughs[borough] ??= { licensed: 0, rabiesCertified: 0, species: [] });
      entry.licensed++;
      if ((raw.rabies_certified ?? '').toLowerCase().startsWith('y')) entry.rabiesCertified++;
      for (const s of (raw.species_accepted ?? '').split(/[,;/]/)) {
        const species = s.trim().toLowerCase();
        if (species && !entry.species.includes(species)) entry.species.push(species);
      }
      continue;
    }
    if (ADJACENT_COUNTIES.includes(county)) adjacent[county] = (adjacent[county] ?? 0) + 1;
  }

  for (const entry of Object.values(boroughs)) entry.species.sort();

  const gaps: string[] = [];
  for (const [borough, entry] of Object.entries(boroughs)) {
    if (entry.licensed === 0) gaps.push(`${borough}: no licensed rehabilitators on the register`);
    if (entry.rabiesCertified === 0) {
      gaps.push(
        `${borough}: nobody on the register is rabies-certified, so raccoons, skunks and bats cannot be taken here — ` +
          'these go to surrounding counties, or to 311 and the Urban Park Rangers',
      );
    }
  }
  for (const borough of Object.values(NYC_COUNTIES)) {
    if (!boroughs[borough]) gaps.push(`${borough}: no licensed rehabilitators on the register`);
  }

  return {
    source: 'https://data.ny.gov/resource/p5wx-nivw.json (NYS DEC licensed wildlife rehabilitators)',
    fetched: today,
    note:
      'Counts only. The register lists private individuals, including home telephone numbers, and none of it is ' +
      'published on this site. People needing a rehabilitator are sent to the DEC search tool and Animal Help Now.',
    boroughs,
    adjacent,
    gaps,
  };
}

async function fetchCoverage(today: string): Promise<CoverageReport | null> {
  const url = 'https://data.ny.gov/resource/p5wx-nivw.json?$limit=5000';
  try {
    const res = await fetch(url, { headers: { 'user-agent': AGENT.userAgent, accept: 'application/json' } });
    if (!res.ok) {
      console.error(`  DEC register returned ${res.status}; skipping the coverage summary this month.`);
      return null;
    }
    return summariseCoverage((await res.json()) as DecRow[], today);
  } catch (err) {
    console.error(`  Could not read the DEC register: ${(err as Error).message}`);
    return null;
  }
}

// --- 2. candidates ---------------------------------------------------------

export interface Candidate {
  name: string;
  website: string | null;
  source: string;
  sourceUrl: string;
  firstSeen: string;
}

interface RosterSource {
  name: string;
  url: string;
  /** Only links whose text looks like an organization are considered. */
  note: string;
}

const ROSTERS: RosterSource[] = [
  {
    name: 'ACC New Hope partners',
    url: 'https://www.nycacc.org/new-hope-partners',
    note: 'Rescue groups approved to pull animals from the city shelter.',
  },
  {
    name: 'NYC Animal Welfare resources',
    url: 'https://www.nyc.gov/site/animalwelfare/resources/resources.page',
    note: "The city's own animal-welfare resource pages.",
  },
];

/**
 * A roster the research relied on that no longer exists.
 *
 * The Mayor's Alliance published a participating-organization directory for
 * years, and the source workbooks name it as a standing way to surface newer
 * groups. Their site has since been rebuilt and the list is gone. Recorded
 * here so nobody spends an afternoon looking for it again, and so the monthly
 * report can say plainly that a source we leaned on has disappeared.
 */
const RETIRED_ROSTERS = [
  {
    name: "Mayor's Alliance participating organizations",
    note:
      'Their site no longer publishes a member directory — it now has only About, Need Help and Want to Help ' +
      'pages. The organization itself remains in the directory as a referral hub. If the list reappears, add it ' +
      'back to ROSTERS in scripts/agent/discover.ts.',
  },
];

/** Words that mean a link is site furniture rather than an organization. */
/**
 * Hosts that belong to the roster's own operator or to the platform hosting
 * it. A link to one of these is site furniture, not a rescue group.
 */
const PLATFORM_HOSTS =
  /(^|\.)(wpenginepowered\.com|wpengine\.com|squarespace\.com|wixsite\.com|godaddysites\.com|nycacc\.app|shopify\.com|mailchi\.mp|paypal\.com|givebutter\.com|classy\.org|donorbox\.org|google\.com|forms\.gle|linktr\.ee|bit\.ly)$/i;

/** How many candidates one run may add, so a redesign cannot flood the directory. */
const MAX_NEW_PER_RUN = 40;

const NOT_AN_ORG =
  /^(home|about|contact|donate|volunteer|adopt|search|menu|login|sign in|privacy|terms|read more|learn more|click here|back|next|previous|share|facebook|twitter|instagram|youtube|subscribe|newsletter|events?|news|blog|faq|support us|give|shop|store)$/i;

/**
 * Pull organization names and links out of a roster page.
 *
 * Deliberately shallow: it reads anchor text and href, and nothing else. These
 * pages get redesigned, and a brittle scraper that silently returns nothing is
 * worse than one that plainly reports it found nothing.
 */
/**
 * Does this host look like a real domain?
 *
 * `new URL()` is happy to parse a malformed href -- a roster page carrying
 * `http://http//www.example.org/.org` yields the hostname `http`, which is not
 * internal, is not a platform host, and so used to be stored verbatim as an
 * organization's website. The stored value was then unusable: it could never be
 * fetched, so the weekly check could never verify the record either.
 *
 * Requiring a dotted name with an alphabetic suffix rejects that without
 * needing a list of valid endings.
 */
function looksLikeDomain(host: string | null): boolean {
  if (!host) return false;
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(host);
}

export function extractRoster(html: string, pageUrl: string): Array<{ name: string; website: string | null }> {
  const found = new Map<string, string | null>();
  const pageHost = hostOf(pageUrl);

  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1]!;
    const name = htmlToText(m[2]!).replace(/\s+/g, ' ').trim();

    if (name.length < 4 || name.length > 80) continue;
    if (NOT_AN_ORG.test(name)) continue;
    if (!/[A-Za-z]{3}/.test(name)) continue;
    // Anchor text that is itself a URL or an address is not a name.
    if (/^https?:|^www\.|@/.test(name)) continue;

    let website: string | null = null;
    try {
      const resolved = new URL(href, pageUrl);
      if (resolved.protocol.startsWith('http')) {
        const host = hostOf(resolved.href);
        // An outbound link is the organization's own site; an internal one is
        // navigation on the roster page itself.
        const internal = !host || host === pageHost || PLATFORM_HOSTS.test(host);
        // A malformed href can parse into a hostname that is not a domain at
        // all, and storing it would create a record nothing can ever verify.
        if (!internal && looksLikeDomain(host)) {
          website = `${resolved.origin}${resolved.pathname}`.replace(/\/$/, '');
        }
      }
    } catch {
      continue;
    }
    if (!website) continue;
    if (!found.has(name)) found.set(name, website);
  }

  return [...found].map(([name, website]) => ({ name, website }));
}

function loadOrgs(): Org[] {
  return readdirSync('data/orgs')
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`data/orgs/${f}`, 'utf8')) as Org);
}

/** Do we already have this organization, by name or by domain? */
export function alreadyKnown(
  candidate: { name: string; website: string | null },
  known: { keys: Set<string>; hosts: Set<string> },
): boolean {
  if (known.keys.has(mergeKey(candidate.name))) return true;
  const host = candidate.website ? hostOf(candidate.website) : null;
  return Boolean(host && known.hosts.has(host));
}

// --- main ------------------------------------------------------------------

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry');
  const today = new Date().toISOString().slice(0, 10);

  console.log(`Monthly discovery, ${today}${dryRun ? ' (dry run)' : ''}\n`);

  console.log('Reading the state wildlife-rehabilitator register for coverage...');
  const coverage = await fetchCoverage(today);
  if (coverage) {
    const counts = Object.entries(coverage.boroughs)
      .map(([b, v]) => `${b} ${v.licensed}`)
      .join(', ');
    console.log(`  Licensed rehabilitators by borough: ${counts || 'none found'}`);
    console.log(`  ${coverage.gaps.length} coverage gap(s) noted`);
  }

  const orgs = loadOrgs();
  const known = {
    keys: new Set(orgs.flatMap((o) => [mergeKey(o.name), ...o.aka.map(mergeKey)]).filter(Boolean)),
    hosts: new Set(orgs.map((o) => (o.website ? hostOf(o.website) : null)).filter((h): h is string => Boolean(h))),
  };

  const existing: Candidate[] = existsSync(DISCOVERED_PATH)
    ? (JSON.parse(readFileSync(DISCOVERED_PATH, 'utf8')) as { candidates: Candidate[] }).candidates ?? []
    : [];
  const seenNames = new Set(existing.map((c) => mergeKey(c.name)));

  const fresh: Candidate[] = [];
  const rosterNotes: string[] = [];

  for (const roster of ROSTERS) {
    console.log(`\nReading ${roster.name}...`);
    const page = await fetchPage(roster.url);
    if (!page.ok || !page.html) {
      const why = page.error ?? `HTTP ${page.status}`;
      console.log(`  Could not read it (${why}).`);
      rosterNotes.push(`**${roster.name}** could not be read this month (${why}). ${roster.url}`);
      continue;
    }

    const rows = extractRoster(page.html, page.finalUrl);
    const novel = rows.filter((r) => !alreadyKnown(r, known) && !seenNames.has(mergeKey(r.name)));
    console.log(`  ${rows.length} organizations listed, ${novel.length} not already in the directory`);

    if (rows.length === 0) {
      rosterNotes.push(
        `**${roster.name}** returned a page with no organization links. The page has probably been redesigned; ` +
          `the extractor in \`scripts/agent/discover.ts\` needs a look. ${roster.url}`,
      );
    }

    for (const r of novel) {
      // Capped per run. The first pass over a long roster is a backfill, and
      // dropping two hundred unverified entries into the directory at once
      // would bury the ones people actually rely on. The rest follow next month.
      if (fresh.length >= MAX_NEW_PER_RUN) {
        rosterNotes.push(
          `**${roster.name}** listed more new organizations than one run adds (${novel.length} in total). ` +
            `${MAX_NEW_PER_RUN} were taken this month; the rest will follow next month.`,
        );
        break;
      }
      seenNames.add(mergeKey(r.name));
      fresh.push({ name: r.name, website: r.website, source: roster.name, sourceUrl: roster.url, firstSeen: today });
    }
  }

  // --- write -------------------------------------------------------------
  mkdirSync('build/reports', { recursive: true });

  const all = [...existing, ...fresh].sort((a, b) => a.name.localeCompare(b.name));

  if (!dryRun) {
    writeFileSync(
      DISCOVERED_PATH,
      `${JSON.stringify(
        {
          $comment:
            'Organizations found on authoritative rosters that are not yet in the directory. The importer turns ' +
            'these into records marked "newly found, not yet verified": low confidence, labelled on the site, and ' +
            'kept out of the assistant’s answers until a weekly check finds a working contact on their own site.',
          updated: new Date().toISOString(),
          candidates: all,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    if (coverage) writeFileSync(COVERAGE_PATH, `${JSON.stringify(coverage, null, 2)}\n`, 'utf8');
  }

  writeFileSync(REPORT_PATH, buildReport(today, coverage, fresh, all.length, rosterNotes), 'utf8');

  console.log(`\n${fresh.length} new candidate(s); ${all.length} awaiting verification in total`);
  console.log(`Report: ${REPORT_PATH}`);
}

function buildReport(
  today: string,
  coverage: CoverageReport | null,
  fresh: Candidate[],
  total: number,
  notes: string[],
): string {
  const out: string[] = [`# Monthly discovery — ${today}`, ''];

  out.push(`Found **${fresh.length}** organizations not already in the directory. ${total} are awaiting verification in total.`);
  out.push('');
  out.push(
    'Nothing here is live on the site as a verified entry. Candidates are added as "newly found, not yet verified", ' +
      'and are kept out of the assistant’s answers until a weekly check finds a working contact on their own site.',
  );
  out.push('');

  if (fresh.length) {
    out.push('## New candidates');
    out.push('');
    for (const c of fresh) {
      out.push(`- **${c.name}** — ${c.website ?? 'no website found'}  `);
      out.push(`  From ${c.source}`);
    }
    out.push('');
  }

  if (RETIRED_ROSTERS.length) {
    out.push('## Sources that no longer exist');
    out.push('');
    for (const r of RETIRED_ROSTERS) out.push(`- **${r.name}** — ${r.note}`);
    out.push('');
  }

  if (notes.length) {
    out.push('## Sources that could not be read');
    out.push('');
    for (const n of notes) out.push(`- ${n}`);
    out.push('');
  }

  if (coverage) {
    out.push('## Wildlife rehabilitator coverage');
    out.push('');
    out.push(
      'Counts from the state register. **No names or contact details from it are published** — it lists private ' +
        'individuals, often with a home telephone number. This is here to show where the city is thin, and to keep ' +
        'the guides honest about it.',
    );
    out.push('');
    out.push('| Borough | Licensed | Rabies-certified |');
    out.push('| --- | ---: | ---: |');
    for (const [borough, v] of Object.entries(coverage.boroughs).sort()) {
      out.push(`| ${borough} | ${v.licensed} | ${v.rabiesCertified} |`);
    }
    out.push('');

    const adjacent = Object.entries(coverage.adjacent).sort((a, b) => b[1] - a[1]);
    if (adjacent.length) {
      out.push(`Nearby counties people are referred to: ${adjacent.map(([c, n]) => `${c} (${n})`).join(', ')}.`);
      out.push('');
    }

    if (coverage.gaps.length) {
      out.push('### Gaps');
      out.push('');
      for (const g of coverage.gaps) out.push(`- ${g}`);
      out.push('');
    }
  }

  out.push('---');
  out.push('');
  out.push('Written by `scripts/agent/discover.ts`.');
  return `${out.join('\n')}\n`;
}

void main();
