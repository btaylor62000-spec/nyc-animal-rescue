/**
 * The weekly report, written for a person who has two minutes.
 *
 * It becomes both a file in the repository and the body of a single GitHub
 * issue that is reopened and rewritten each week, so the flagged items are in
 * one place rather than scattered across a new issue every Monday.
 */
export interface RunSummary {
  date: string;
  total: number;
  ok: number;
  verified: number;
  changed: number;
  needsReview: number;
  unreachable: number;
  closed: number;
  skipped: number;
  /**
   * Records whose patch changes something a reader can see: a contact, a
   * status, or a confidence level. Bookkeeping (check dates, failure counts,
   * a needs-review flag) does not count. The workflow uses this to decide
   * whether the run goes to main or to a pull request.
   */
  proposed: number;
  flags: Array<{ id: string; name: string; text: string }>;
  changes: Array<{ org: string; id: string; field: string; from: string | null; to: string | null; evidenceUrl: string }>;
  safetyValveTripped: boolean;
}

export function writeReport(s: RunSummary): string {
  const out: string[] = [];

  out.push(`# Weekly data check — ${s.date}`);
  out.push('');

  if (s.safetyValveTripped) {
    out.push('> **This run made no changes.**');
    out.push('>');
    out.push(
      `> It wanted to change ${s.changed} of ${s.total} records, which is far more than a real week of change. ` +
        'That pattern means the checker itself has broken — a parser regression, or a network returning the same ' +
        'page for every request — so nothing was applied. The list below is what it *wanted* to do; treat it as a ' +
        'bug report, not a set of corrections.',
    );
    out.push('');
  }

  out.push(`Checked **${s.total}** organizations.`);
  out.push('');
  out.push('| Outcome | Count |');
  out.push('| --- | ---: |');
  out.push(`| Unchanged | ${s.ok} |`);
  out.push(`| …of those, contacts re-confirmed on their own site | ${s.verified} |`);
  out.push(`| Contact updated automatically | ${s.changed} |`);
  out.push(`| Flagged for a person | ${s.needsReview} |`);
  out.push(`| Website unreachable | ${s.unreachable} |`);
  out.push(`| Says it has closed or paused | ${s.closed} |`);
  out.push(`| Not checkable (social only, or no website) | ${s.skipped} |`);
  out.push('');

  if (s.changes.length) {
    out.push(`## Changes applied (${s.changes.length})`);
    out.push('');
    out.push('Each of these had its old value gone from the organization’s own site and exactly one replacement there.');
    out.push('');
    for (const c of s.changes) {
      out.push(`- **${c.org}** — ${c.field}: \`${c.from ?? '—'}\` → \`${c.to ?? '—'}\`  `);
      out.push(`  Evidence: ${c.evidenceUrl} · [entry](https://nycanimalrescue.org/org/${c.id})`);
    }
    out.push('');
  }

  if (s.flags.length) {
    out.push(`## Needs a person (${s.flags.length})`);
    out.push('');
    out.push('Nothing here has been changed. These are the things the checker would not decide on its own.');
    out.push('');
    for (const f of s.flags) {
      out.push(`- ${f.text}  `);
      out.push(`  [entry](https://nycanimalrescue.org/org/${f.id}) · \`data/orgs/${f.id}.json\``);
    }
    out.push('');
  }

  if (!s.changes.length && !s.flags.length) {
    out.push('## Nothing to do');
    out.push('');
    out.push('No contact details changed and nothing needs attention. The directory is as it was.');
    out.push('');
  }

  out.push('---');
  out.push('');
  out.push(
    'This report is written by the weekly check in `scripts/agent`. Automated changes are recorded in ' +
      '`data/agent-overlay.json` and appear in each entry’s change log, which is published on the site’s ' +
      'About page. To undo an automated change, delete its entry from the overlay and re-run `npm run import`.',
  );

  return `${out.join('\n')}\n`;
}

/** A short line for the commit message. */
export function commitMessage(s: RunSummary): string {
  if (s.safetyValveTripped) {
    return `Weekly check ${s.date}: no changes applied (safety valve tripped)`;
  }
  const bits: string[] = [];
  if (s.changed) bits.push(`${s.changed} contact${s.changed === 1 ? '' : 's'} updated`);
  if (s.closed) bits.push(`${s.closed} closed or paused`);
  if (s.needsReview) bits.push(`${s.needsReview} flagged`);
  if (s.verified) bits.push(`${s.verified} re-verified`);
  const headline = bits.length ? bits.join(', ') : 'no changes';
  const proposal = s.proposed
    ? `Proposes ${s.proposed} change(s) a reader would see; nothing is live until this is merged.`
    : '';

  return [
    `Weekly data check ${s.date}: ${headline}`,
    '',
    `Checked ${s.total} organizations against their own websites.`,
    proposal,
    s.changed
      ? `Applied ${s.changed} contact change(s), each with the old value gone and exactly one replacement on the organization's own site.`
      : 'No contact details met the bar for an automatic change.',
    s.needsReview ? `${s.needsReview} item(s) flagged for a person; nothing was changed for those.` : '',
    '',
    'See build/reports/weekly-check.md.',
  ]
    .filter((l) => l !== '')
    .join('\n');
}
