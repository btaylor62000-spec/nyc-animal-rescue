/**
 * Minimal, dependency-free .xlsx reader.
 *
 * Why this exists instead of a library: the three source workbooks are trusted,
 * local, and structurally simple (text cells only -- no formulas, styles or
 * dates-as-numbers that we depend on). SheetJS's npm build is pinned at 0.18.5
 * with open advisories and its fixed releases are not published to the npm
 * registry, which would leave a permanent Dependabot alert on a public repo.
 * ExcelJS would work but pulls a large transitive tree for a build-time-only
 * task. ~180 auditable lines keeps the import toolchain at zero runtime deps.
 *
 * Verified cell-for-cell against an independent openpyxl dump of all three
 * workbooks (see scripts/lib/xlsx-lite.test.ts).
 */
import { readFileSync } from 'node:fs';
import { readZipEntries } from './zip.ts';

const XML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
};

/** Decode XML text content, including numeric character references. */
function decodeXml(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (whole, ent: string) => {
    if (ent.startsWith('#x') || ent.startsWith('#X')) return String.fromCodePoint(parseInt(ent.slice(2), 16));
    if (ent.startsWith('#')) return String.fromCodePoint(parseInt(ent.slice(1), 10));
    return XML_ENTITIES[ent] ?? whole;
  });
}

/**
 * Concatenate the <t> runs inside a shared-string <si>, which is how Excel
 * represents a single cell whose text has mixed formatting.
 */
function siText(si: string): string {
  const parts: string[] = [];
  const re = /<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(si))) parts.push(decodeXml(m[1] ?? ''));
  return parts.join('');
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const out: string[] = [];
  const re = /<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(siText(m[1] ?? ''));
  return out;
}

/** Convert an A1-style reference to zero-based {row, col}. */
function refToRowCol(ref: string): { row: number; col: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  if (!m) throw new Error(`Bad cell ref: ${ref}`);
  let col = 0;
  for (const ch of m[1]!) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { row: parseInt(m[2]!, 10) - 1, col: col - 1 };
}

export interface Sheet {
  name: string;
  /** Dense grid of trimmed cell strings; empty cells are ''. */
  rows: string[][];
}

/** Read every worksheet from an .xlsx file, in workbook order. */
export function readWorkbook(path: string): Sheet[] {
  const files = readZipEntries(readFileSync(path));

  const workbookXml = files.get('xl/workbook.xml')?.toString('utf8');
  if (!workbookXml) throw new Error(`${path}: missing xl/workbook.xml`);
  const relsXml = files.get('xl/_rels/workbook.xml.rels')?.toString('utf8') ?? '';

  // rId -> target path, so sheet order and names come from the workbook itself
  // rather than from filename guessing (sheet1.xml is not always the first tab).
  const relTargets = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*\/>/g)) {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1];
    const target = /Target="([^"]+)"/.exec(m[0])?.[1];
    if (id && target) relTargets.set(id, target.replace(/^\/?(xl\/)?/, 'xl/'));
  }

  const shared = parseSharedStrings(files.get('xl/sharedStrings.xml')?.toString('utf8'));
  const sheets: Sheet[] = [];

  for (const m of workbookXml.matchAll(/<sheet\b[^>]*\/>/g)) {
    const name = decodeXml(/name="([^"]*)"/.exec(m[0])?.[1] ?? '');
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1];
    const target = rid ? relTargets.get(rid) : undefined;
    const xml = target ? files.get(target)?.toString('utf8') : undefined;
    if (!xml) throw new Error(`${path}: could not locate sheet data for "${name}"`);
    sheets.push({ name, rows: parseSheet(xml, shared) });
  }
  return sheets;
}

function parseSheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  let maxCol = 0;

  for (const cm of xml.matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = cm[1] ?? '';
    const body = cm[2] ?? '';
    const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
    if (!ref) continue;
    const { row, col } = refToRowCol(ref);
    const type = /t="([^"]+)"/.exec(attrs)?.[1] ?? 'n';

    let value = '';
    if (type === 's') {
      const idx = parseInt(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '-1', 10);
      value = shared[idx] ?? '';
    } else if (type === 'inlineStr') {
      value = siText(body);
    } else if (type === 'str') {
      // Cached formula result.
      value = decodeXml(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '');
    } else {
      value = decodeXml(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? '');
    }

    value = value.trim();
    if (!value) continue;

    while (rows.length <= row) rows.push([]);
    const r = rows[row]!;
    while (r.length <= col) r.push('');
    r[col] = value;
    if (col + 1 > maxCol) maxCol = col + 1;
  }

  // Pad to a dense rectangle so callers can index without bounds checks.
  for (const r of rows) while (r.length < maxCol) r.push('');
  return rows;
}
