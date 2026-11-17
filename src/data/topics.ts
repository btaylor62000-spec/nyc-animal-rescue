/**
 * Which places belong to a topic: one rule for the whole site.
 *
 * Owner, 2026-11-17: "each search for the same topic must yield the exact
 * same results regardless of how it was searched". Borrowing a trap gave 4
 * places at the foot of a guide, a different count in Find help, and other
 * groups again from the assistant, because each used its own rule. Now the
 * guides' lists (guide-listings.ts), the directory's need and animal filters
 * (src/client/directory.ts) and the assistant's cards (src/chat/retrieve.ts)
 * all ask this file, and tests/topics.test.ts compares them for every list.
 *
 * No data imports: the directory runs this in the browser.
 */

export interface TopicFilter {
  need?: string;
  /** Any one of these needs, for a list such as "a vet or a shelter scans chips". */
  anyNeeds?: string[];
  /** Serves any one of these animals. */
  animals?: string[];
}

/**
 * A place serves an animal when it says so, or when it names no animal at
 * all: a hotline, a fund or a city office serves every animal. The guides
 * always counted those; the directory's animal filter used to leave them out,
 * which is why the same topic gave different counts.
 */
export function servesAnimals(orgAnimals: readonly string[], wanted: Iterable<string>): boolean {
  const list = [...wanted];
  if (list.length === 0 || orgAnimals.length === 0) return true;
  return list.some((a) => orgAnimals.includes(a));
}

/** The one test of whether a place belongs to a need-and-animal topic. */
export function matchesTopic(o: { needs: readonly string[]; animals: readonly string[] }, f: TopicFilter): boolean {
  if (f.need && !o.needs.includes(f.need)) return false;
  if (f.anyNeeds?.length && !f.anyNeeds.some((n) => o.needs.includes(n))) return false;
  return servesAnimals(o.animals, f.animals ?? []);
}

/**
 * The directory link for a topic. A plain need with at most one animal is
 * an ordinary filter; anything the filter panel cannot say (a fixed list of
 * places, the city's pantries, several animals at once) is a named list,
 * `list=<key>`, whose places are written into the directory page at build
 * time from the same rule.
 */
export function topicQuery(t: { key: string; plain: TopicFilter | null }): URLSearchParams {
  const p = new URLSearchParams();
  if (t.plain?.need) {
    p.set('need', t.plain.need);
    for (const a of t.plain.animals ?? []) p.append('animal', a);
  } else {
    p.set('list', t.key);
  }
  return p;
}
