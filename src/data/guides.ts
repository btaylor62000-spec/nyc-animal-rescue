/**
 * Loading the Markdown guide pages produced by the import.
 *
 * They live in `content/guides/` rather than `src/`, because they are
 * generated output that the importer rewrites wholesale on every run.
 */
import { readFileSync, readdirSync } from 'node:fs';

const DIR = 'content/guides';

export interface Guide {
  slug: string;
  title: string;
  summary: string;
  topics: string[];
  source: string;
  body: string;
}

/** Minimal YAML front-matter reader: the importer writes JSON-ish values. */
function parseFrontMatter(raw: string): { data: Record<string, unknown>; body: string } {
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, unknown> = {};
  for (const line of m[1]!.split('\n')) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const value = kv[2]!.trim();
    try {
      data[kv[1]!] = JSON.parse(value);
    } catch {
      data[kv[1]!] = value;
    }
  }
  return { data, body: raw.slice(m[0].length) };
}

function load(): Guide[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, body } = parseFrontMatter(readFileSync(`${DIR}/${f}`, 'utf8'));
      return {
        slug: (data.slug as string) ?? f.replace(/\.md$/, ''),
        title: (data.title as string) ?? f,
        summary: (data.summary as string) ?? '',
        topics: (data.topics as string[]) ?? [],
        source: (data.source as string) ?? '',
        body,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export const GUIDES: Guide[] = load();
export const GUIDES_BY_SLUG = new Map(GUIDES.map((g) => [g.slug, g]));

/**
 * The order guides appear in the index: the ones people arrive in a hurry for
 * come first, the reference material after.
 */
const FEATURED = [
  'animal-emergency',
  'found-an-injured-bird',
  'found-wildlife',
  'exotic-pet-emergency',
  'cats-with-special-needs',
  'starting-tnr',
];

export const GUIDES_ORDERED: Guide[] = [
  ...FEATURED.map((s) => GUIDES_BY_SLUG.get(s)).filter((g): g is Guide => Boolean(g)),
  ...GUIDES.filter((g) => !FEATURED.includes(g.slug)),
];
