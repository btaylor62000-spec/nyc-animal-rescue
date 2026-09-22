/**
 * What the site knows about its own upkeep.
 *
 * Everything here is derived at build time from files already in the
 * repository, so the status page costs nothing to serve and cannot drift from
 * the data it describes.
 *
 * It exists because the backlog was invisible. Records waiting on a person,
 * organizations found but not yet published, jobs that had never run — all of
 * it was discoverable only by reading the repository. A directory that asks
 * people to trust it should be able to say plainly how well it is being kept.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { CheckStatus, Confidence, Org } from '../types.ts';
import { ORGS } from './orgs.ts';

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

/** An ISO timestamp the epoch default should be reported as "never". */
function ranAt(stamp: string | undefined): string | null {
  if (!stamp) return null;
  const date = stamp.slice(0, 10);
  return date === '1970-01-01' ? null : date;
}

interface OverlayEntryShape {
  change_log?: Array<{ date?: string; source?: string }>;
}
const overlay = readJson<{ updated?: string; entries?: Record<string, OverlayEntryShape> }>(
  'data/agent-overlay.json',
  {},
);

/*
 * The overlay's own `updated` stamp is not evidence the weekly check ran: a
 * person correcting the agent by hand writes to the same file. Reporting a
 * hand edit as a completed automated run is precisely the false reassurance
 * this page exists to prevent, so the run date comes from change-log entries
 * the check itself wrote.
 */
const weeklyEntries = Object.values(overlay.entries ?? {}).filter((e) =>
  (e.change_log ?? []).some((c) => c.source === 'weekly-check'),
);
const weeklyLastRun =
  weeklyEntries
    .flatMap((e) => (e.change_log ?? []).filter((c) => c.source === 'weekly-check'))
    .map((c) => c.date)
    .filter((d): d is string => Boolean(d))
    .sort()
    .pop() ?? undefined;
const discovered = readJson<{ updated?: string; candidates?: Array<{ name: string }> }>(
  'data/discovered.json',
  {},
);
const holds = readJson<{ held?: Array<{ person?: string; ask?: string }> }>(
  'data/privacy-holds.json',
  {},
);

function countBy<K extends string>(pick: (o: Org) => K): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const o of ORGS) out[pick(o)] = (out[pick(o)] ?? 0) + 1;
  return out;
}

export const STATUS = {
  total: ORGS.length,
  byConfidence: countBy<Confidence>((o) => o.confidence),
  byCheck: countBy<CheckStatus>((o) => o.check_status),

  /** Entries the automation deliberately handed to a person. */
  needingAPerson: ORGS.filter(
    (o) => o.check_status === 'needs-review' || (o.status !== 'active' && o.status !== 'retired'),
  ),

  /** Found on a roster, published, but nothing has confirmed them. */
  unverified: ORGS.filter((o) => o.check_status === 'new-unverified' && !o.community?.added_on),
  /** Added or corrected by visitors through the site, awaiting a person's check. */
  fromVisitors: ORGS.filter((o) => o.community),

  /** Contacts withheld until the person agrees to be listed. */
  awaitingConsent: (holds.held ?? []).map((h) => ({ person: h.person ?? 'unnamed', ask: h.ask ?? '' })),

  jobs: {
    weeklyCheck: {
      name: 'Weekly contact check',
      what: 'Visits each organization’s own website and confirms the numbers and emails we list are still there.',
      cadence: 'Mondays',
      lastRun: ranAt(weeklyLastRun),
      records: weeklyEntries.length,
    },
    monthlyDiscovery: {
      name: 'Monthly discovery',
      what: 'Reads the city shelter’s partner roster and the city’s own resource pages for organizations we do not have.',
      cadence: '1st of the month',
      lastRun: ranAt(discovered.updated),
      records: (discovered.candidates ?? []).length,
    },
  },

  /**
   * Candidates discovery has found that are not in `data/orgs` yet. A non-zero
   * number here means someone found things and the import has not been re-run,
   * which is worth seeing rather than guessing at.
   */
  pendingImport: Math.max(
    0,
    (discovered.candidates ?? []).length -
      ORGS.filter((o) => o.source_files.includes('discovery')).length,
  ),
} as const;
