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
  /** The named author, for a guide written in the first person. */
  byline: string | null;
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
        byline: typeof data.byline === 'string' && data.byline ? data.byline : null,
        body,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export const GUIDES: Guide[] = load();
export const GUIDES_BY_SLUG = new Map(GUIDES.map((g) => [g.slug, g]));

/**
 * Every guide, by the situation someone arrives with. The home page and the
 * guides index are both built from this, and a test fails if a guide is in no
 * group, so a new guide cannot go missing from the home page (a reviewer found
 * that half of them were not on it, 2026-11-05).
 */
export const GUIDE_GROUPS: Array<{ title: string; slugs: string[] }> = [
  { title: 'An emergency', slugs: ['animal-emergency', 'exotic-pet-emergency', 'pets-in-a-disaster'] },
  { title: 'Wild birds and wildlife', slugs: ['found-an-injured-bird', 'found-wildlife', 'more-situations-animal-help-now'] },
  { title: 'Stray, lost or found', slugs: ['starting-tnr', 'lost-and-found-cat', 'lost-and-found-dog', 'lost-and-found-exotic'] },
  {
    title: 'Keeping your pet',
    slugs: ['keeping-your-cat', 'keeping-your-dog', 'keep-your-pet-if-you-lose-your-home', 'help-paying-for-care', 'low-cost-clinics-and-trap-banks', 'low-cost-dog-care'],
  },
  {
    title: 'Adopting, rehoming and special cases',
    slugs: ['save-an-at-risk-animal', 'cats-with-special-needs', 'breed-specific-dog-rescue', 'dog-behavior-and-legal', 'rehoming-an-exotic-pet', 'exotic-boarding-and-planning', 'exotic-pet-legality'],
  },
  { title: 'Cruelty and neglect', slugs: ['report-animal-abuse'] },
];

/** The groups with their guides, leaving out any slug that has no page. */
export const GUIDES_GROUPED = GUIDE_GROUPS.map((g) => ({
  title: g.title,
  guides: g.slugs.map((s) => GUIDES_BY_SLUG.get(s)).filter((x): x is Guide => Boolean(x)),
}));

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
