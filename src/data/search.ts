/**
 * Shared search behaviour.
 *
 * Lives outside the browser bundle so three consumers behave identically: the
 * directory's search box, the tests, and the Phase 3 chat assistant, which
 * retrieves against the same index server-side. A word that finds a record in
 * the search box must find the same record for the assistant, or the two will
 * disagree about what the site contains.
 */
import MiniSearch, { type Options, type SearchOptions } from 'minisearch';

export interface SearchRecordLike {
  id: string;
  name: string;
  aka: string[];
  animals: string[];
  needs: string[];
  boroughs: string[];
  zips: string[];
  text: string;
  keywords: string;
}

/**
 * Words that appear in almost every phrasing and in almost every record, so
 * matching on them tells us nothing. Kept deliberately short: anything that
 * could name an animal, a need or a place stays in.
 */
export const STOPWORDS = new Set([
  'a', 'an', 'the', 'my', 'me', 'i', 'im', 'is', 'are', 'was', 'were', 'be', 'been',
  'to', 'of', 'for', 'in', 'on', 'at', 'and', 'or', 'but', 'it', 'its', 'this', 'that',
  'with', 'from', 'by', 'as', 'do', 'does', 'did', 'can', 'cant', 'cannot', 'could',
  'should', 'would', 'have', 'has', 'had', 'get', 'got', 'need', 'needs', 'want',
  'wants', 'please', 'what', 'where', 'when', 'how', 'who', 'why', 'some', 'any',
  'very', 'just', 'really', 'there', 'here', 'about', 'into', 'out', 'up', 'down',
  'now', 'then', 'no', 'not', 'dont', 'something', 'someone', 'anyone', 'am', 'pm',
  'thanks', 'hi', 'hello', 'if', 'so', 'too', 'than', 'also', 'them', 'they', 'we',
  'you', 'your', 'our', 'us', 'he', 'she', 'his', 'her', 'their', 'anything',
  'please', 'help', 'looking', 'find', 'finding', 'near', 'around', 'right',
]);

/**
 * A deliberately small suffix stripper, applied to both the index and the
 * query so they meet in the middle. Without it "spayed" never finds a clinic
 * listed as doing "spay", and "kittens" misses "kitten".
 *
 * It is not a real stemmer and does not try to be: an aggressive one would
 * collapse words that matter here -- a "rehabber" is not "rehab".
 */
export function stem(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('ies') && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith('sses')) return word.slice(0, -2);
  if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
  if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('es') && word.length > 4) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
  return word;
}

/**
 * Fold accents before anything else looks at the word.
 *
 * Without this "pájaro" becomes "pjaro" and matches nothing, so a question
 * asked in Spanish retrieves cat rescues for an injured bird. It also makes
 * "cafe" find "Café" in an organization's name.
 */
function foldAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function processTerm(term: string): string | null {
  const t = foldAccents(term.toLowerCase()).replace(/[^a-z0-9]/g, '');
  if (t.length < 2) return null;
  return STOPWORDS.has(t) ? null : stem(t);
}

/** The distinct, meaningful terms in a query, after the same processing. */
export function processQuery(q: string): string[] {
  return [...new Set(q.split(/\s+/).map(processTerm).filter((t): t is string => Boolean(t)))];
}

const SEARCH_OPTIONS: SearchOptions = {
  // Fuzzy and prefix matching on short words does more harm than good: it
  // turns "baby" into "bay" and "lost" into "cost". Both are applied only once
  // a term is long enough for a near-miss to be a typo rather than a
  // different word.
  prefix: (term: string) => term.length > 3,
  fuzzy: (term: string) => (term.length > 5 ? 0.2 : false),
  boost: { name: 5, aka: 4, keywords: 3.5, needs: 3, animals: 3, boroughs: 2, zips: 2, text: 1 },
};

export const MINISEARCH_OPTIONS: Options<SearchRecordLike> = {
  fields: ['name', 'aka', 'needs', 'animals', 'boroughs', 'zips', 'keywords', 'text'],
  storeFields: ['id'],
  processTerm,
  searchOptions: SEARCH_OPTIONS,
  extractField: (doc, field) => {
    const v = (doc as unknown as Record<string, unknown>)[field];
    return Array.isArray(v) ? v.join(' ') : String(v ?? '');
  },
};

export function buildIndex(records: SearchRecordLike[]): MiniSearch<SearchRecordLike> {
  const mini = new MiniSearch<SearchRecordLike>(MINISEARCH_OPTIONS);
  mini.addAll(records);
  return mini;
}

export interface Hit {
  id: string;
  score: number;
  terms: string[];
}

/**
 * Run a query.
 *
 * People type whole situations -- "injured pigeon brooklyn" -- not keywords.
 * Requiring every term is precise when it works and useless when it does not,
 * so this tries AND first and widens to OR when that leaves too little. A
 * widened result still has to cover a meaningful share of the query, because
 * without that floor one incidental word drags in a third of the directory.
 */
export function runSearch(index: MiniSearch<SearchRecordLike>, q: string): Hit[] {
  const query = q.trim();
  if (!query) return [];

  const terms = processQuery(query);
  let hits = index.search(query, { combineWith: 'AND' }) as unknown as Hit[];

  if (hits.length < 5) {
    const loose = index.search(query, { combineWith: 'OR' }) as unknown as Hit[];
    const floor = terms.length >= 3 ? 2 : 1;
    const covered = loose.filter((h) => {
      const matched = new Set(h.terms.map(stem));
      return terms.filter((t) => matched.has(t)).length >= floor;
    });
    if (covered.length > hits.length) hits = covered;
    else if (covered.length === 0 && loose.length > hits.length) hits = loose;
  }
  return hits;
}
