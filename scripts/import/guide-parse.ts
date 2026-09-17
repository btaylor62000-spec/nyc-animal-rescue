/**
 * Parser for the single-column "guide" tabs.
 *
 * Their shape is consistent across all three workbooks:
 *   line 1        title
 *   lines 2..n    intro / caveat paragraphs
 *   HEADING       a flush-left line that introduces a group
 *     - bullet    two-space-indented bullets, often with inline contacts
 *
 * The same parse feeds two consumers: the Markdown guide pages, and the
 * extraction of organizations (emergency rooms, clinics, trap banks) that
 * exist only inside these tabs and never made it into a directory row.
 */
import { readWorkbook } from '../lib/xlsx-lite.ts';

export interface GuideBullet {
  text: string;
  /** Nesting depth from the source indentation; 0 is a top-level bullet. */
  depth: number;
}

export interface GuideSection {
  heading: string | null;
  bullets: GuideBullet[];
  paragraphs: string[];
}

export interface GuideDoc {
  workbook: string;
  tab: string;
  title: string;
  intro: string[];
  sections: GuideSection[];
}

const BULLET_RE = /^(\s*)[-–•]\s+(.*)$/;

/**
 * Does this line carry a contact detail? This is what separates a listing from
 * a heading in the dog workbook, where entries are flush-left just like the
 * headings above them.
 */
function hasContact(line: string): boolean {
  return (
    /\(?\d{3}\)?[-.\s]\s?\d{3}[-.]\d{4}/.test(line) ||
    /[\w.+-]+@[\w-]+\.[\w.]+/.test(line) ||
    /https?:\/\//i.test(line) ||
    /\b[\w-]+\.(org|com|net|gov|edu|app|info|nyc)\b/i.test(line)
  );
}

/**
 * A flush-left line that introduces the entries beneath it.
 *
 * Capitalisation alone is not enough: real headings carry long lowercase
 * parentheticals ("BRONX - urgent care (for TRUE 24hr ER, Bronx residents are
 * advised to use Manhattan - AMC/BluePearl)"). What holds across all three
 * workbooks is that a heading opens with a run of capitals or is followed by
 * indented entries, is short, and never contains a contact detail of its own.
 */
function isHeading(line: string, nextNonBlank: string | undefined): boolean {
  if (/^\s/.test(line)) return false;
  if (BULLET_RE.test(line)) return false;
  if (line.length > 140) return false;
  if (!/[A-Za-z]/.test(line)) return false;
  if (hasContact(line)) return false;

  const opensWithCaps = /^[A-Z0-9][A-Z0-9 &/'.-]{2,}(?=[\s(:-]|$)/.test(line);
  const entriesFollow =
    nextNonBlank !== undefined && (BULLET_RE.test(nextNonBlank) || /^\s+\S/.test(nextNonBlank));
  return opensWithCaps || entriesFollow;
}

export function parseGuideTab(workbook: string, tab: string): GuideDoc {
  const sheets = readWorkbook(workbook);
  const sheet = sheets.find((s) => s.name === tab);
  if (!sheet) throw new Error(`${workbook}: tab "${tab}" not found`);

  const lines: string[] = sheet.rows.map((r) => r[0] ?? '');

  const title = (lines.find((l) => l.trim()) ?? tab).trim();
  const titleIdx = lines.findIndex((l) => l.trim() === title);

  const intro: string[] = [];
  const sections: GuideSection[] = [];
  let current: GuideSection | null = null;

  for (let i = titleIdx + 1; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    if (!raw.trim()) continue;

    const addBullet = (text: string, depth: number) => {
      if (!current) {
        current = { heading: null, bullets: [], paragraphs: [] };
        sections.push(current);
      }
      current.bullets.push({ text, depth });
    };

    // The cat workbook marks entries with "  - "; the exotic workbook indents
    // them without a dash; the dog workbook leaves them flush left.
    const bullet = BULLET_RE.exec(raw);
    if (bullet) {
      addBullet(bullet[2]!.trim(), bullet[1]!.length >= 4 ? 1 : 0);
      continue;
    }
    if (/^\s+\S/.test(raw)) {
      const indent = raw.length - raw.trimStart().length;
      addBullet(raw.trim(), indent >= 4 ? 1 : 0);
      continue;
    }

    const nextNonBlank = lines.slice(i + 1).find((l) => l.trim());
    if (isHeading(raw, nextNonBlank)) {
      current = { heading: raw.trim(), bullets: [], paragraphs: [] };
      sections.push(current);
      continue;
    }

    // Flush-left with a contact in it is a listing, not prose.
    if (hasContact(raw) && current) {
      addBullet(raw.trim(), 0);
      continue;
    }

    // Plain prose: part of the intro until the first heading appears.
    if (!current) intro.push(raw.trim());
    else current.paragraphs.push(raw.trim());
  }

  return { workbook, tab, title, intro, sections };
}

/** Every guide-style tab, i.e. everything that is not a directory or a note. */
export const INTERNAL_TABS = ['How to use', 'Progress log', 'Open gaps & to-do'];
export const DIRECTORY_TABS = ['NYC Cat Rescues', 'NYC Dog Rescues', 'Exotic, Small Animal & Wildlife'];

export function guideTabsOf(workbook: string): string[] {
  return readWorkbook(workbook)
    .map((s) => s.name)
    .filter((n) => !INTERNAL_TABS.includes(n) && !DIRECTORY_TABS.includes(n));
}
