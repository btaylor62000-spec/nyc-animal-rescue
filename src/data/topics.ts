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

/**
 * A kind of help that brings another with it. Poison control: the two
 * hotlines, and the emergency vets open now (owner, 2026-11-17: "ticking
 * poison control should also show emergency vets open now").
 */
export const NEED_ALSO: Record<string, string[]> = { 'poison-control': ['emergency-vet'] };

/** Whether a place has a need, counting what that need brings with it. */
export function hasNeed(needs: readonly string[], need: string): boolean {
  return needs.includes(need) || (NEED_ALSO[need] ?? []).some((n) => needs.includes(n));
}

/** The one test of whether a place belongs to a need-and-animal topic. */
export function matchesTopic(o: { needs: readonly string[]; animals: readonly string[] }, f: TopicFilter): boolean {
  if (f.need && !hasNeed(o.needs, f.need)) return false;
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

/**
 * The one order for a list when nobody has said where they are: places in
 * the city first, then the best confirmed, then by name. The guides' lists,
 * Find help and the assistant all use it, so the same list reads the same
 * way in each (owner, 2026-11-17). A location or an emergency reorders it
 * (nearest, open now); nothing else does.
 */
const CONFIDENCE_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
export function compareListing(
  a: { outside: boolean; confidence: string; name: string },
  b: { outside: boolean; confidence: string; name: string },
): number {
  if (a.outside !== b.outside) return a.outside ? 1 : -1;
  const c = (CONFIDENCE_RANK[a.confidence] ?? 3) - (CONFIDENCE_RANK[b.confidence] ?? 3);
  if (c !== 0) return c;
  return a.name.localeCompare(b.name);
}

/** Places a list names to lead it, for a need and animals: the bird list, poisoning. */
export interface Lead { need: string; animals: string[]; ids: string[] }
export function leadFor(leads: readonly Lead[], need: string | undefined, animals: Iterable<string>): string[] {
  if (!need) return [];
  const wanted = [...animals];
  const want = [...wanted].sort().join(',');
  const forNeed = leads.filter((l) => l.need === need);
  // The list for exactly these animals; else one that covers them all ("a
  // pigeon" is led like the bird list); else the need's list for every animal
  // ("a man kicking pigeons" is led by 311, like any report).
  return (
    forNeed.find((l) => [...l.animals].sort().join(',') === want) ??
    (wanted.length ? forNeed.find((l) => l.animals.length && wanted.every((a) => l.animals.includes(a))) : undefined) ??
    forNeed.find((l) => l.animals.length === 0)
  )?.ids ?? [];
}
