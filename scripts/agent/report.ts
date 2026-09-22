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
  needsReview: number;
  unreachable: number;
  skipped: number;
  /**
   * Records whose patch changes something a reader can see: a contact, a
   * status, or a confidence level. Bookkeeping (check dates, failure counts,
   * a needs-review flag) does not count. The workflow uses this to decide
   * whether the run goes to main or to a pull request.
   */
  proposed: number;
  flags: Array<{ id: string; name: string; text: string }>;
  safetyValveTripped: boolean;
}

export function writeReport(s: RunSummary): string {
  const out: string[] = [];

  out.push(`# Weekly data check — ${s.date}`);
  out.push('');

  if (s.safetyValveTripped) {
    out.push('> **This run wrote nothing but the check date.**');
    out.push('>');
    out.push(
      `> It flagged ${s.needsReview} of ${s.total} records, which is far more than a real week of change. ` +
        'That pattern means the checker itself has broken — a parser regression, or a network returning the same ' +
        'page for every request — so its flags were not recorded. The list below is what it saw; treat it as a ' +
        'bug report, not a set of findings.',
    );
    out.push('');
  }

  out.push(`Checked **${s.total}** organizations.`);
  out.push('');
  out.push('| Outcome | Count |');
  out.push('| --- | ---: |');
  out.push(`| Unchanged | ${s.ok} |`);
  out.push(`| …of those, contacts re-confirmed on their own site | ${s.verified} |`);
  out.push(`| Flagged for a person | ${s.needsReview} |`);
  out.push(`| Website unreachable | ${s.unreachable} |`);
  out.push(`| Not checkable (social only, or no website) | ${s.skipped} |`);
  out.push('');

  if (s.flags.length) {
    out.push(`## Needs a person (${s.flags.length})`);
    out.push('');
    out.push('Nothing here has been changed. The checker reports what it saw and a person decides what it means.');
    out.push('');
    for (const f of s.flags) {
      out.push(`- ${f.text}  `);
      out.push(`  [entry](https://nycanimalrescue.org/org/${f.id}) · \`data/orgs/${f.id}.json\``);
    }
    out.push('');
  }

  if (!s.flags.length) {
    out.push('## Nothing to do');
    out.push('');
    out.push('No contact details changed and nothing needs attention. The directory is as it was.');
    out.push('');
  }

  out.push('---');
  out.push('');
  out.push(
    'This report is written by the weekly check in `scripts/agent`. It never changes a contact: it confirms ' +
      'the ones stored, and flags what it cannot confirm. Its bookkeeping lives in `data/agent-overlay.json`; ' +
      'to undo an entry, delete it from the overlay and re-run `npm run import`.',
  );

  return `${out.join('\n')}\n`;
}

/** A short line for the commit message. */
export function commitMessage(s: RunSummary): string {
  if (s.safetyValveTripped) {
    return `Weekly check ${s.date}: nothing recorded (safety valve tripped)`;
  }
  const bits: string[] = [];
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
    'No contact was changed: the check confirms stored contacts and flags what it cannot confirm.',
    s.needsReview ? `${s.needsReview} item(s) flagged for a person; nothing was changed for those.` : '',
    '',
    'See build/reports/weekly-check.md.',
  ]
    .filter((l) => l !== '')
    .join('\n');
}
