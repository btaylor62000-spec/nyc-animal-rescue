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
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import type { Org } from '../../src/types.ts';
import { AGENT } from './config.ts';
import { fetchPage, sameSite } from './fetch.ts';
import { detectClosure, extractContacts, htmlToText } from './extract.ts';
import { decide, needsBrowser, toPatch, tooManyFlags, type Decision, type Evidence, type PageEvidence } from './rules.ts';
import { closeBrowser, renderPage } from './browser.ts';
import { loadOverlay, saveOverlay, type OverlayEntry } from './overlay.ts';
import { commitMessage, writeReport, type RunSummary } from './report.ts';

const ORGS_DIR = 'data/orgs';
const REPORT_PATH = 'build/reports/weekly-check.md';
const COMMIT_MESSAGE_PATH = 'build/reports/weekly-commit-message.txt';
// Read by the workflow to decide whether the run may commit to main
// (bookkeeping only) or must open a pull request (a reader could see it).
const SUMMARY_PATH = 'build/reports/weekly-summary.json';

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

  const evidenceOf = (f: { url: string; finalUrl: string; status: number; ok: boolean; offDomain: boolean; html: string; error?: string }, rendered = false): PageEvidence => {
    const text = f.html ? htmlToText(f.html) : '';
    const { phones, emails } = text ? extractContacts(text) : { phones: [], emails: [] };
    return {
      url: f.url,
      finalUrl: f.finalUrl,
      status: f.status,
      ok: f.ok,
      offDomain: f.offDomain,
      // Only the organization's own domain counts as evidence about itself.
      ownDomain: org.website ? sameSite(org.website, f.finalUrl) : false,
      text,
      phones,
      emails,
      closure: text ? detectClosure(text) : [],
      error: f.error,
      ...(rendered ? { rendered: true } : {}),
    };
  };

  for (const url of pagesToCheck(org)) {
    let page = evidenceOf(await fetchPage(url));
    // A plain request could not read it: try once in a real browser (see
    // browser.ts). Whichever read more is the evidence.
    if (needsBrowser(page)) {
      const r = await renderPage(url);
      if (r) {
        const offDomain = !sameSite(url, r.finalUrl);
        const second = evidenceOf({ ...r, offDomain }, true);
        if (second.ok && second.text.length > page.text.length) page = second;
      }
    }
    pages.push(page);
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

  // Other branches' numbers, by website host: see Evidence.siblingPhones.
  const hostOf = (u: string | null) => { try { return u ? new URL(u).hostname.replace(/^www\./, '') : null; } catch { return null; } };
  const byHost = new Map<string, Array<{ id: string; phones: string[] }>>();
  for (const o of loadOrgs()) {
    const h = hostOf(o.website);
    if (h) byHost.set(h, [...(byHost.get(h) ?? []), { id: o.id, phones: o.phones.map((p) => p.value) }]);
  }
  const siblingsOf = (org: Org) =>
    (byHost.get(hostOf(org.website) ?? '') ?? []).filter((x) => x.id !== org.id).flatMap((x) => x.phones);

  const decisions = new Map<string, Decision>();
  let done = 0;

  await mapWithConcurrency(orgs, AGENT.concurrency, async (org) => {
    const evidence = { ...(await gather(org, date)), siblingPhones: siblingsOf(org) };
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
    needsReview: 0,
    unreachable: 0,
    blocked: 0,
    skipped: 0,
    proposed: 0,
    flags: [],
    manualOnly: [],
    addressesNotSeen: [],
    safetyValveTripped: false,
  };

  const siteCount = new Map<string, number>();
  for (const o of loadOrgs()) if (o.website) siteCount.set(o.website, (siteCount.get(o.website) ?? 0) + 1);
  const sharedSites = new Set([...siteCount].filter(([, n]) => n > 1).map(([site]) => site));

  const patches = new Map<string, OverlayEntry>();

  for (const org of orgs) {
    const decision = decisions.get(org.id);
    if (!decision) continue;

    const { patch, log, flag } = toPatch(org, decision, date);

    switch (decision.kind) {
      case 'ok':
        summary.ok++;
        if (decision.verified) summary.verified++;
        // A website several listings share is a chain's home page, which
        // names no one branch: all four BluePearl hospitals were reported
        // as "address not seen" against bluepearlvet.com.
        if (decision.addressNotSeen && !sharedSites.has(org.website ?? '')) {
          summary.addressesNotSeen.push({ id: org.id, name: org.name, street: decision.addressNotSeen, website: org.website });
        }
        break;
      case 'needs-review':
        summary.needsReview++;
        break;
      case 'unreachable':
        summary.unreachable++;
        if (decision.flagged) summary.needsReview++;
        break;
      case 'blocked':
        summary.blocked++;
        if (decision.stale) summary.needsReview++;
        summary.manualOnly.push({ id: org.id, name: org.name, website: org.website, lastConfirmed: decision.lastConfirmed });
        break;
      case 'skipped':
        summary.skipped++;
        break;
    }

    if (flag) summary.flags.push({ id: org.id, name: org.name, text: flag });
    // A change-log entry is written exactly when a field a reader can see
    // changes, so it is the honest test of "does a person need to look".
    if (log.length) summary.proposed++;
    patches.set(org.id, { ...(patch as OverlayEntry), ...(log.length ? { change_log: log } : {}) });
  }

  // --- the safety valve ---------------------------------------------------
  // A run that flags a big share of the directory has broken. Keep the
  // report, write nothing but the check dates.
  if (tooManyFlags(summary.needsReview, orgs.length, summary.verified)) {
    summary.safetyValveTripped = true;
    console.error(
      `\nSTOPPING: this run flagged ${summary.needsReview} of ${orgs.length} records ` +
        `(over ${Math.round(AGENT.maxChangeShare * 100)}%). That almost always means the checker is broken, ` +
        'not that the directory changed. Nothing but the check date has been written; the report lists what it saw.',
    );
    for (const [id, patch] of patches) {
      // Keep only the harmless bookkeeping.
      patches.set(id, { last_checked: patch.last_checked });
    }
    summary.proposed = 0;
  }

  // Never-confirmed first, then oldest: the top of the list is the to-do.
  summary.manualOnly.sort((a, b) => (a.lastConfirmed ?? '').localeCompare(b.lastConfirmed ?? '') || a.name.localeCompare(b.name));

  mkdirSync('build/reports', { recursive: true });
  writeFileSync(REPORT_PATH, writeReport(summary), 'utf8');
  // Written here rather than assembled in the workflow: the summary is already
  // in hand, and a commit message built out of shell quoting is a bug waiting
  // to happen.
  writeFileSync(COMMIT_MESSAGE_PATH, `${commitMessage(summary)}\n`, 'utf8');
  const { flags: _flags, manualOnly: _manualOnly, addressesNotSeen: _addresses, ...counts } = summary;
  writeFileSync(SUMMARY_PATH, `${JSON.stringify(counts, null, 2)}\n`, 'utf8');

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
    `\n${summary.ok} unchanged (${summary.verified} re-verified), ` +
      `${summary.needsReview} flagged, ${summary.unreachable} unreachable, ${summary.blocked} for a person to check, ${summary.skipped} not checkable`,
  );
  console.log(`Report: ${REPORT_PATH}`);

  // A tripped safety valve is a failure: the workflow should not commit edits.
  if (summary.safetyValveTripped) process.exitCode = 1;
}

/*
 * Run only when this file is the program being executed.
 *
 * Without this, *importing* the module runs the whole job: `tests/discovery.test.ts`
 * imports three pure helpers from here, and merely doing so performed a real
 * discovery run and rewrote `data/discovered.json` and the report on every
 * `npm test`. Anyone following the documented pre-push command would stage
 * unreviewed candidate records into an emergency directory without knowing.
 *
 * It matters more now that discovery fetches each new organization's website:
 * an import side effect would make the test suite crawl the internet.
 */
const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) void main().finally(() => closeBrowser());
