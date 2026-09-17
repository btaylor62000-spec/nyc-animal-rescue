/**
 * The data-quality report.
 *
 * Written to build/reports/ on every import. Its job is to make the weak spots
 * in the directory visible -- entries with no way to make contact, stale
 * verification dates, low-confidence rows, and anything the tagging rules could
 * not place -- rather than letting them disappear into 245 tidy-looking files.
 */
import type { Org } from '../../src/types.ts';
import type { MergeResult } from './merge.ts';
import type { PrivacyReport } from './privacy.ts';
import type { TagTrace } from './tag.ts';

export interface ReportInput {
  orgs: Org[];
  merge: MergeResult;
  privacy: PrivacyReport;
  untagged: Array<{ id: string; name: string; fields: string[]; origin: string }>;
  traces: Map<string, TagTrace[]>;
  guidePages: Array<{ slug: string; title: string; bytes: number; redactions: string[] }>;
  unusedTabs: string[];
  staleDays: number;
}

function countBy<T>(items: T[], key: (t: T) => string[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const it of items) {
    for (const k of key(it)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function table(rows: Array<[string, number]>, header: [string, string]): string {
  const lines = [`| ${header[0]} | ${header[1]} |`, '| --- | ---: |'];
  for (const [k, v] of rows) lines.push(`| ${k} | ${v} |`);
  return lines.join('\n');
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

export function buildReport(input: ReportInput, today = new Date()): string {
  const { orgs } = input;
  const out: string[] = [];

  const reachable = (o: Org) =>
    o.phones.length > 0 || o.emails.length > 0 || o.website !== null || o.intake_urls.length > 0 || o.social.length > 0;
  const noContact = orgs.filter((o) => !reachable(o));
  const socialOnly = orgs.filter(
    (o) => o.phones.length === 0 && o.emails.length === 0 && o.website === null && o.social.length > 0,
  );

  const stale = orgs
    .filter((o) => o.last_verified && daysBetween(today, new Date(o.last_verified)) > input.staleDays)
    .sort((a, b) => (a.last_verified! < b.last_verified! ? -1 : 1));
  const neverVerified = orgs.filter((o) => !o.last_verified);

  out.push('# Data quality report');
  out.push('');
  out.push(`Generated ${today.toISOString().slice(0, 10)} from the three source workbooks and the wildlife guide.`);
  out.push('');

  out.push('## Totals');
  out.push('');
  out.push(`- **${orgs.length}** organizations after de-duplication`);
  out.push(`- **${input.merge.merged.length}** duplicate clusters merged`);
  out.push(`- **${input.guidePages.length}** guide pages generated`);
  out.push(`- **${orgs.filter((o) => o.status !== 'active').length}** entries flagged as not currently active`);
  out.push(`- **${noContact.length}** entries with no way at all to make contact`);
  out.push(`- **${input.privacy.removals.length}** personal contact details withheld`);
  out.push('');

  out.push('## Coverage');
  out.push('');
  out.push('### By animal');
  out.push('');
  out.push(table(countBy(orgs, (o) => o.animals), ['Animal', 'Organizations']));
  out.push('');
  out.push('### By need');
  out.push('');
  out.push(table(countBy(orgs, (o) => o.needs), ['Need', 'Organizations']));
  out.push('');
  out.push('### By borough');
  out.push('');
  out.push(table(countBy(orgs, (o) => o.boroughs), ['Borough', 'Organizations']));
  out.push('');
  out.push('### By confidence');
  out.push('');
  out.push(table(countBy(orgs, (o) => [o.confidence]), ['Confidence', 'Organizations']));
  out.push('');
  out.push('### By operating status');
  out.push('');
  out.push(table(countBy(orgs, (o) => [o.status]), ['Status', 'Organizations']));
  out.push('');

  out.push('## Gaps in coverage');
  out.push('');
  const thin = countBy(orgs, (o) => o.animals).filter(([, n]) => n <= 3);
  if (thin.length) {
    out.push('Animal types with three or fewer organizations. The source notes say several of these are genuine gaps in the city rather than oversights.');
    out.push('');
    out.push(table(thin, ['Animal', 'Organizations']));
  } else {
    out.push('No animal type has fewer than four organizations.');
  }
  out.push('');

  out.push('## Entries needing attention');
  out.push('');
  out.push(`### No contact method at all (${noContact.length})`);
  out.push('');
  if (noContact.length) {
    out.push('These have neither phone, email, website, intake form nor a social channel. They cannot be acted on and should either be researched or dropped.');
    out.push('');
    for (const o of noContact) out.push(`- **${o.name}** — ${o.region_note ?? 'no section'}`);
  } else {
    out.push('None. Every entry has at least one way to make contact.');
  }
  out.push('');

  out.push(`### Reachable only through social media (${socialOnly.length})`);
  out.push('');
  out.push('The weekly automated check cannot verify these, because Instagram and Facebook cannot be reliably scraped. They stay at Low confidence and carry a "verify via their social channel" note.');
  out.push('');
  for (const o of socialOnly.slice(0, 40)) {
    out.push(`- **${o.name}** — ${o.social.map((s) => `${s.platform} ${s.handle}`).join(', ')}`);
  }
  if (socialOnly.length > 40) out.push(`- …and ${socialOnly.length - 40} more`);
  out.push('');

  out.push(`### Verification older than ${input.staleDays} days (${stale.length})`);
  out.push('');
  if (stale.length) {
    for (const o of stale.slice(0, 40)) {
      out.push(`- **${o.name}** — last verified ${o.last_verified} (${daysBetween(today, new Date(o.last_verified!))} days ago)`);
    }
    if (stale.length > 40) out.push(`- …and ${stale.length - 40} more`);
  } else {
    out.push('None.');
  }
  out.push('');

  out.push(`### Never verified (${neverVerified.length})`);
  out.push('');
  out.push('Mostly entries extracted from guide prose, which carried no verification date of their own. They are set to Medium confidence and will get a real date after the first successful automated check.');
  out.push('');

  out.push('## Not currently active');
  out.push('');
  const inactive = orgs.filter((o) => o.status !== 'active');
  for (const o of inactive) {
    out.push(`- **${o.name}** — \`${o.status}\`: ${o.status_note ?? 'flagged by the source'}`);
  }
  out.push('');

  out.push('## De-duplication');
  out.push('');
  out.push(`### Merged (${input.merge.merged.length})`);
  out.push('');
  for (const m of input.merge.merged) {
    out.push(`- \`${m.into}\` ← ${m.from.length} records`);
  }
  out.push('');
  out.push(`### Deliberately kept apart (${input.merge.keptApart.length})`);
  out.push('');
  if (input.merge.keptApart.length) {
    for (const k of input.merge.keptApart) out.push(`- ${k.reason}`);
  } else {
    out.push('None.');
  }
  out.push('');

  out.push(`### Conflicts between sources (${input.merge.conflicts.length})`);
  out.push('');
  if (input.merge.conflicts.length) {
    out.push('Nothing here is auto-corrected. These are disagreements between the workbooks that a person should resolve.');
    out.push('');
    for (const c of input.merge.conflicts) {
      out.push(`- **${c.field}** — ${c.values.join('  vs  ')}`);
      out.push(`  - ${c.note}`);
    }
  } else {
    out.push('None.');
  }
  out.push('');

  out.push('## Tagging');
  out.push('');
  out.push(`### Rows the rules could not fully tag (${input.untagged.length})`);
  out.push('');
  if (input.untagged.length) {
    for (const u of input.untagged) out.push(`- **${u.name}** — missing ${u.fields.join(', ')} (${u.origin})`);
  } else {
    out.push('Every row received at least one animal, need, organization type and borough.');
  }
  out.push('');

  out.push('## Privacy');
  out.push('');
  out.push(`### Contact details withheld (${input.privacy.removals.length} removals)`);
  out.push('');
  out.push('These are personal numbers belonging to individuals, not organizational lines. Nothing here reaches the published site. Each needs the person\'s permission before it can be listed.');
  out.push('');
  for (const h of input.privacy.held) {
    const hits = input.privacy.removals.filter((r) => r.hold_id === h.id);
    const pages = input.guidePages.filter((p) => p.redactions.includes(h.id));
    out.push(`- **${h.person ?? h.id}** — ${h.reason}`);
    out.push(`  - Found in: ${h.found_in ?? 'source files'}`);
    if (h.ask) out.push(`  - To ask: ${h.ask}`);
    const where: string[] = [];
    if (hits.length) where.push(`${[...new Set(hits.map((x) => `${x.org_name} (${x.where})`))].join(', ')}`);
    if (pages.length) where.push(`guide page${pages.length > 1 ? 's' : ''}: ${pages.map((p) => p.title).join(', ')}`);
    out.push(`  - Removed from: ${where.length ? where.join('; ') : 'nothing in this run'}`);
  }
  for (const n of input.privacy.nameHolds) {
    const hits = input.privacy.removals.filter((r) => r.hold_id === n.id);
    out.push(`- **Name withheld: ${n.value}** — ${n.reason}`);
    out.push(`  - ${n.action} (applied in ${hits.length} place(s))`);
  }
  out.push('');

  const holdImpacted = orgs.filter((o) => o.privacy_hold);
  const holdUnreachable = holdImpacted.filter((o) => o.phones.length === 0 && o.emails.length === 0);
  out.push(`### Records affected by a hold (${holdImpacted.length})`);
  out.push('');
  for (const o of holdImpacted) {
    const reach = o.phones.length || o.emails.length ? 'still has a direct contact' : '**now has no phone or email**';
    out.push(`- **${o.name}** — ${reach}`);
  }
  out.push('');
  if (holdUnreachable.length) {
    out.push(`> ${holdUnreachable.length} of these are now reachable only through a website or directory listing. That is the cost of withholding, and it is worth weighing: ${holdUnreachable
      .map((o) => o.name)
      .join(', ')}. Asking permission would restore a direct line.`);
    out.push('');
  }

  out.push('## Guide pages');
  out.push('');
  out.push(table(input.guidePages.map((p) => [p.title, p.bytes]), ['Page', 'Bytes']));
  out.push('');
  const redacted = input.guidePages.filter((p) => p.redactions.length);
  if (redacted.length) {
    out.push('Pages with a withheld contact detail:');
    out.push('');
    for (const p of redacted) out.push(`- ${p.title} — ${p.redactions.join(', ')}`);
    out.push('');
  }

  out.push(`### Source tabs not turned into a page (${input.unusedTabs.length})`);
  out.push('');
  out.push('These were parsed (and mined for organizations where relevant) but have no page of their own. Listed so nothing is dropped silently.');
  out.push('');
  for (const t of input.unusedTabs) out.push(`- ${t}`);
  out.push('');

  return out.join('\n');
}
