/**
 * The import.
 *
 *   npm run import
 *
 * Reads the three workbooks and the wildlife document, produces one JSON file
 * per organization under data/orgs/, the guide pages under content/guides/,
 * the JSON Schema, and a data-quality report.
 *
 * Re-runnable and idempotent: running it twice on unchanged sources produces
 * byte-identical output, so `git status` after an import is a real signal that
 * something in the sources changed.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
// The 2020-12 entry point, matching the $schema the generated schema declares.
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import type { Org } from '../../src/types.ts';
import { MAIN_SOURCES, readDirectory, type DraftOrg } from './directory.ts';
import { GUIDE_ORG_SOURCES, extractGuideOrgs } from './guide-orgs.ts';
import { mergeOrgs } from './merge.ts';
import { OVERRIDES, PARENT_PREFIXES } from './overrides.ts';
import { applyPrivacyHolds } from './privacy.ts';
import { buildAllGuidePages, unusedTabs, writeGuidePages } from './guide-pages.ts';
import { ORG_SCHEMA } from './schema.ts';
import { buildReport } from './report.ts';
import type { TagTrace } from './tag.ts';

const ORGS_DIR = 'data/orgs';
const GUIDES_DIR = 'content/guides';
const REPORTS_DIR = 'build/reports';
const STALE_DAYS = 90;

const KEY_ORDER = Object.keys(ORG_SCHEMA.properties);

/** Stable key order, so re-running produces byte-identical files. */
function stableStringify(value: unknown): string {
  return `${JSON.stringify(value, orderedReplacer, 2)}\n`;
}
function orderedReplacer(this: unknown, _key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'id' in (value as object) && 'name' in (value as object)) {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of KEY_ORDER) if (k in src) out[k] = src[k];
    for (const k of Object.keys(src)) if (!(k in out)) out[k] = src[k];
    return out;
  }
  return value;
}

/**
 * Link programme-level records to the organization they belong to, so the site
 * can show "part of Animal Care Centers of NYC" rather than presenting a
 * fragment as an independent group.
 */
function linkParents(orgs: Org[]): number {
  const byId = new Set(orgs.map((o) => o.id));
  let linked = 0;
  for (const org of orgs) {
    if (org.parent_org) continue;
    for (const rule of PARENT_PREFIXES) {
      if (org.id === rule.parent) break;
      if (!rule.prefix.test(org.name)) continue;
      if (!byId.has(rule.parent)) break;
      org.parent_org = rule.parent;
      linked++;
      break;
    }
  }
  return linked;
}

function applyOverrides(orgs: Org[]): string[] {
  const byId = new Map(orgs.map((o) => [o.id, o]));
  const applied: string[] = [];
  const missing: string[] = [];

  for (const ov of OVERRIDES) {
    const org = byId.get(ov.id);
    if (!org) {
      missing.push(ov.id);
      continue;
    }
    if (ov.addAnimals) org.animals = [...new Set([...org.animals, ...ov.addAnimals])];
    if (ov.addNeeds) org.needs = [...new Set([...org.needs, ...ov.addNeeds])];
    if (ov.set) Object.assign(org, ov.set);
    applied.push(ov.id);
  }

  if (missing.length) {
    // A stale override is a silent no-op otherwise, which is how curated fixes
    // rot. Fail loudly instead.
    throw new Error(
      `Overrides reference ids that no longer exist: ${missing.join(', ')}.\n` +
        'Either the record was renamed or the override is obsolete; update scripts/import/overrides.ts.',
    );
  }
  return applied;
}

function main(): void {
  console.log('Reading source workbooks…');

  const drafts: DraftOrg[] = [];
  for (const spec of MAIN_SOURCES) {
    const rows = readDirectory(spec);
    console.log(`  ${spec.label.padEnd(7)} ${String(rows.length).padStart(3)} directory rows`);
    drafts.push(...rows);
  }

  const traces = new Map<string, TagTrace[]>();
  const untagged: Array<{ id: string; name: string; fields: string[]; origin: string }> = [];
  const mainOrgs: Org[] = drafts.map((d) => {
    const { _trace, _untagged, _origin, ...org } = d;
    traces.set(org.id, _trace);
    if (_untagged.length) untagged.push({ id: org.id, name: org.name, fields: _untagged, origin: _origin });
    return org;
  });

  let guideOrgs: Org[] = [];
  for (const spec of GUIDE_ORG_SOURCES) {
    const found = extractGuideOrgs(spec);
    guideOrgs = guideOrgs.concat(found);
  }
  console.log(`  guide   ${String(guideOrgs.length).padStart(3)} organizations extracted from guide prose`);

  console.log('De-duplicating…');
  const merge = mergeOrgs([...mainOrgs, ...guideOrgs]);
  console.log(`  ${mainOrgs.length + guideOrgs.length} -> ${merge.orgs.length} (${merge.merged.length} clusters merged)`);

  const applied = applyOverrides(merge.orgs);
  console.log(`  ${applied.length} curated overrides applied`);
  console.log(`  ${linkParents(merge.orgs)} programme records linked to a parent organization`);

  console.log('Applying privacy holds…');
  const privacy = applyPrivacyHolds(merge.orgs);
  console.log(`  ${privacy.removals.length} personal contact details withheld`);

  console.log('Validating against the schema…');
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  // Typed as a plain predicate: Ajv's inferred type guard would otherwise
  // narrow `org` to `never` in the failure branch.
  const validate = ajv.compile(ORG_SCHEMA) as ((data: unknown) => boolean) & { errors?: unknown };
  const failures: string[] = [];
  for (const org of merge.orgs) {
    if (validate(org)) continue;
    failures.push(`${org.id}: ${ajv.errorsText(validate.errors as never, { separator: '; ' })}`);
  }
  if (failures.length) {
    console.error(`\n${failures.length} record(s) failed validation:\n`);
    for (const f of failures.slice(0, 20)) console.error(`  - ${f}`);
    process.exitCode = 1;
    return;
  }
  console.log(`  ${merge.orgs.length} records valid`);

  // --- write -------------------------------------------------------------
  mkdirSync(ORGS_DIR, { recursive: true });
  mkdirSync(GUIDES_DIR, { recursive: true });
  mkdirSync(REPORTS_DIR, { recursive: true });
  mkdirSync('schema', { recursive: true });

  // Clear generated files so a removed source row does not leave an orphan.
  for (const f of readdirSync(ORGS_DIR)) if (f.endsWith('.json')) rmSync(`${ORGS_DIR}/${f}`);
  for (const f of readdirSync(GUIDES_DIR)) if (f.endsWith('.md')) rmSync(`${GUIDES_DIR}/${f}`);

  const sorted = [...merge.orgs].sort((a, b) => a.id.localeCompare(b.id));
  for (const org of sorted) writeFileSync(`${ORGS_DIR}/${org.id}.json`, stableStringify(org), 'utf8');
  console.log(`Wrote ${sorted.length} files to ${ORGS_DIR}/`);

  writeFileSync('schema/org.schema.json', `${JSON.stringify(ORG_SCHEMA, null, 2)}\n`, 'utf8');

  const pages = buildAllGuidePages();
  writeGuidePages(pages, GUIDES_DIR);
  console.log(`Wrote ${pages.length} guide pages to ${GUIDES_DIR}/`);

  const report = buildReport({
    orgs: sorted,
    merge,
    privacy,
    untagged,
    traces,
    guidePages: pages.map((p) => ({
      slug: p.slug,
      title: p.title,
      bytes: Buffer.byteLength(p.markdown, 'utf8'),
      redactions: p.redactions,
    })),
    unusedTabs: unusedTabs(),
    staleDays: STALE_DAYS,
  });
  writeFileSync(`${REPORTS_DIR}/data-quality.md`, report, 'utf8');

  // A machine-readable trace of why each tag was applied, for debugging rules.
  writeFileSync(
    `${REPORTS_DIR}/tagging-trace.json`,
    `${JSON.stringify(Object.fromEntries([...traces].sort((a, b) => a[0].localeCompare(b[0]))), null, 2)}\n`,
    'utf8',
  );

  console.log(`Wrote ${REPORTS_DIR}/data-quality.md`);
  console.log('\nDone.');
}

main();
