/**
 * The overlay: where the automated checks record what they have learned.
 *
 * The importer regenerates `data/orgs/*.json` wholesale from the source
 * workbooks, so anything the agent wrote directly into those files would be
 * destroyed the next time someone re-ran the import. Instead the agent writes
 * here, and the importer applies this file as its last step. Both can run, in
 * either order, and neither loses the other's work.
 *
 * It is also the smallest useful diff: one file, one entry per organization
 * that has actually changed, which makes the weekly commit readable.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { ChangeLogEntry, CheckStatus, Confidence, Org } from '../../src/types.ts';

export const OVERLAY_PATH = 'data/agent-overlay.json';

/** What the agent is allowed to change about a record. */
export interface OverlayEntry {
  /** ISO date of the last completed check, successful or not. */
  last_checked?: string;
  /** ISO date the stored contacts were last seen on the organization's own site. */
  last_verified?: string;
  check_status?: CheckStatus;
  consecutive_failures?: number;
  confidence?: Confidence;
  status?: Org['status'];
  status_note?: string | null;
  /** Replacement contact values, only ever applied under the rules engine. */
  phones?: Org['phones'];
  emails?: Org['emails'];
  website?: string | null;
  /**
   * Replacement intake links.
   *
   * A dead link on a record is the same problem as a dead phone number, and
   * these are what a reader taps to surrender or adopt. Two of ACC's returned
   * 404 and there was no way to correct them without editing generated files.
   */
  intake_urls?: Org['intake_urls'];
  /**
   * Replacement prose.
   *
   * Clearing `phones` does not remove a number that the source also wrote into
   * the record's free text, and the org page renders that text -- so a number
   * withdrawn from the contact list can still be sitting in the notes for a
   * reader to dial. The rules engine never writes this; it exists so a person
   * correcting the agent can take a wrong contact out of the prose too.
   */
  notes?: string | null;
  /** Appended to the record's change log, never replacing it. */
  change_log?: ChangeLogEntry[];
}

export interface Overlay {
  $comment: string;
  /** ISO timestamp of the last agent run that wrote this file. */
  updated: string;
  entries: Record<string, OverlayEntry>;
}

const EMPTY: Overlay = {
  $comment:
    'Written by the automated checks in scripts/agent and applied by the importer. ' +
    'Edit by hand only to correct the agent; the importer will keep whatever is here. ' +
    'To discard an automated change, delete its entry and re-run the import.',
  updated: '1970-01-01T00:00:00.000Z',
  entries: {},
};

export function loadOverlay(path = OVERLAY_PATH): Overlay {
  if (!existsSync(path)) return { ...EMPTY, entries: {} };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Overlay;
    return { ...EMPTY, ...parsed, entries: parsed.entries ?? {} };
  } catch {
    return { ...EMPTY, entries: {} };
  }
}

export function saveOverlay(overlay: Overlay, path = OVERLAY_PATH): void {
  // Sorted keys so a re-run with identical findings produces an identical file
  // and therefore an empty diff.
  const entries: Record<string, OverlayEntry> = {};
  for (const id of Object.keys(overlay.entries).sort()) entries[id] = overlay.entries[id]!;
  writeFileSync(path, `${JSON.stringify({ ...overlay, entries }, null, 2)}\n`, 'utf8');
}

/**
 * Apply the overlay to a record.
 *
 * Change-log entries accumulate rather than replace, because the log is the
 * public record of what the automation did and why.
 */
export function applyOverlay(org: Org, entry: OverlayEntry | undefined): Org {
  if (!entry) return org;

  const { change_log: newEntries, ...fields } = entry;
  const merged: Org = { ...org, ...fields };

  if (newEntries?.length) {
    const seen = new Set(org.change_log.map((c) => `${c.date}|${c.field}|${c.from}|${c.to}`));
    const additions = newEntries.filter((c) => !seen.has(`${c.date}|${c.field}|${c.from}|${c.to}`));
    merged.change_log = [...org.change_log, ...additions];
  }
  return merged;
}
