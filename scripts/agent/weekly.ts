/**
 * The weekly check.
 *
 *   npm run agent:weekly            check everything, write the overlay
 *   npm run agent:weekly -- --dry   check everything, write nothing
 *   npm run agent:weekly -- --limit=20 --only=wild-bird-fund
 *
 * Fetches each organization's own pages, decides what the evidence means
 * using the rules engine, and records the result in the overlay. It applies
 * very little and flags readily: everything it is unsure about ends up in the
 * report for a person to look at, and nothing is ever deleted.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import type { Org } from '../../src/types.ts';
import { AGENT } from './config.ts';
import { fetchPage, sameSite } from './fetch.ts';
import { detectClosure, extractContacts, htmlToText } from './extract.ts';
import { decide, toPatch, tooManyChanges, type Decision, type Evidence, type PageEvidence } from './rules.ts';
import { loadOverlay, saveOverlay, type OverlayEntry } from './overlay.ts';
import { commitMessage, writeReport, type RunSummary } from './report.ts';

const ORGS_DIR = 'data/orgs';
const REPORT_PATH = 'build/reports/weekly-check.md';
const COMMIT_MESSAGE_PATH = 'build/reports/weekly-commit-message.txt';

function loadOrgs(): Org[] {
  return readdirSync(ORGS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`${ORGS_DIR}/${f}`, 'utf8')) as Org)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Which pages to look at for one organization.
 *
 * Their own site first, then the intake form, then the sources the entry was
 * built from. Capped, because checking a directory of 287 groups should be a
 * few hundred polite requests, not a crawl.
 */
function pagesToCheck(org: Org): string[] {
  const urls: string[] = [];
  const add = (u: string | null | undefined) => {
    if (u && !urls.includes(u)) urls.push(u);
  };

  add(org.website);
  for (const intake of org.intake_urls) add(intake.url);

  // A contact page is where a changed number actually appears.
  if (org.website) {
    try {
      const origin = new URL(org.website).origin;
      for (const path of AGENT.contactPaths) {
        if (urls.length >= AGENT.maxPagesPerOrg) break;
        add(`${origin}${path}`);
      }
    } catch {
      // A malformed website field is caught by the rules engine.
    }
  }

  for (const src of org.source_urls) add(src);
  return urls.slice(0, AGENT.maxPagesPerOrg);
}

async function gather(org: Org, date: string): Promise<Evidence> {
  const pages: PageEvidence[] = [];

  for (const url of pagesToCheck(org)) {
    const fetched = await fetchPage(url);
    const text = fetched.html ? htmlToText(fetched.html) : '';
    const { phones, emails } = text ? extractContacts(text) : { phones: [], emails: [] };

    pages.push({
      url: fetched.url,
      finalUrl: fetched.finalUrl,
      status: fetched.status,
      ok: fetched.ok,
      offDomain: fetched.offDomain,
      // Only the organization's own domain counts as evidence about itself.
      ownDomain: org.website ? sameSite(org.website, fetched.finalUrl) : false,
      text,
      phones,
      emails,
      closure: text ? detectClosure(text) : [],
      error: fetched.error,
    });
  }

  return { orgId: org.id, date, pages };
}

/** Work through the list a few at a time, so one slow host does not hold it up. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]!, i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry');
  const only = args.find((a) => a.startsWith('--only='))?.slice(7);
  const limit = Number(args.find((a) => a.startsWith('--limit='))?.slice(8) ?? '0');

  const date = new Date().toISOString().slice(0, 10);
  let orgs = loadOrgs();
  if (only) orgs = orgs.filter((o) => o.id === only || o.id.includes(only));
  if (limit > 0) orgs = orgs.slice(0, limit);

  console.log(`Weekly check of ${orgs.length} organizations, ${date}${dryRun ? ' (dry run)' : ''}\n`);

  const decisions = new Map<string, Decision>();
  let done = 0;

  await mapWithConcurrency(orgs, AGENT.concurrency, async (org) => {
    const evidence = await gather(org, date);
    const decision = decide(org, evidence);
    decisions.set(org.id, decision);

    done++;
    if (done % 25 === 0 || done === orgs.length) {
      console.log(`  ${String(done).padStart(3)}/${orgs.length} checked`);
    }
  });

  // --- turn decisions into changes ---------------------------------------
  const summary: RunSummary = {
    date,
    total: orgs.length,
    ok: 0,
    verified: 0,
    changed: 0,
    needsReview: 0,
    unreachable: 0,
    closed: 0,
    skipped: 0,
    flags: [],
    changes: [],
    safetyValveTripped: false,
  };

  const patches = new Map<string, OverlayEntry>();

  for (const org of orgs) {
    const decision = decisions.get(org.id);
    if (!decision) continue;

    const { patch, log, flag } = toPatch(org, decision, date);

    switch (decision.kind) {
      case 'ok':
        summary.ok++;
        if (decision.verified) summary.verified++;
        break;
      case 'apply':
        summary.changed++;
        summary.changes.push(
          ...decision.changes.map((c) => ({
            org: org.name,
            id: org.id,
            field: c.field,
            from: c.from,
            to: c.to,
            evidenceUrl: c.evidenceUrl,
          })),
        );
        break;
      case 'needs-review':
        summary.needsReview++;
        break;
      case 'unreachable':
        summary.unreachable++;
        if (decision.flagged) summary.needsReview++;
        break;
      case 'closed':
        summary.closed++;
        summary.needsReview++;
        break;
      case 'skipped':
        summary.skipped++;
        break;
    }

    if (flag) summary.flags.push({ id: org.id, name: org.name, text: flag });
    patches.set(org.id, { ...(patch as OverlayEntry), ...(log.length ? { change_log: log } : {}) });
  }

  // --- the safety valve ---------------------------------------------------
  // A run that wants to rewrite a big share of the directory has broken. Keep
  // the report, discard the edits.
  if (tooManyChanges(summary.changed, orgs.length)) {
    summary.safetyValveTripped = true;
    console.error(
      `\nSTOPPING: this run wanted to change ${summary.changed} of ${orgs.length} records ` +
        `(over ${Math.round(AGENT.maxChangeShare * 100)}%). That almost always means the checker is broken, ` +
        'not that the directory changed. No edits have been written; the report explains what it wanted to do.',
    );
    for (const [id, patch] of patches) {
      // Keep only the harmless bookkeeping.
      patches.set(id, { last_checked: patch.last_checked });
    }
    summary.changes = summary.changes.slice(0, 50);
  }

  mkdirSync('build/reports', { recursive: true });
  writeFileSync(REPORT_PATH, writeReport(summary), 'utf8');
  // Written here rather than assembled in the workflow: the summary is already
  // in hand, and a commit message built out of shell quoting is a bug waiting
  // to happen.
  writeFileSync(COMMIT_MESSAGE_PATH, `${commitMessage(summary)}\n`, 'utf8');

  if (!dryRun) {
    const overlay = loadOverlay();
    for (const [id, patch] of patches) {
      const existing = overlay.entries[id] ?? {};
      overlay.entries[id] = {
        ...existing,
        ...patch,
        change_log: [...(existing.change_log ?? []), ...(patch.change_log ?? [])],
      };
      if (!overlay.entries[id]!.change_log?.length) delete overlay.entries[id]!.change_log;
    }
    overlay.updated = new Date().toISOString();
    saveOverlay(overlay);
    console.log(`\nWrote ${patches.size} entries to data/agent-overlay.json`);
  }

  console.log(
    `\n${summary.ok} unchanged (${summary.verified} re-verified), ${summary.changed} updated, ` +
      `${summary.needsReview} flagged, ${summary.unreachable} unreachable, ${summary.closed} closed or paused, ` +
      `${summary.skipped} not checkable`,
  );
  console.log(`Report: ${REPORT_PATH}`);

  // A tripped safety valve is a failure: the workflow should not commit edits.
  if (summary.safetyValveTripped) process.exitCode = 1;
}

void main();
