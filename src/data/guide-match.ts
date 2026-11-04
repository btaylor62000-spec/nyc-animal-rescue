/**
 * Which guides answer a search typed into the directory.
 *
 * The directory lists organizations; the steps live in the guides. Someone
 * searching "urgent list" or "report abuse" was shown only organizations and
 * never the page that says what to do first. A reviewer found exactly that
 * for the shelter's urgent list, where hours matter.
 *
 * A guide matches when one of its topic phrases appears in the query as whole
 * words, or the query is the start of a topic ("euthan" while typing).
 */
export interface GuideTopics {
  slug: string;
  title: string;
  summary: string;
  topics: string[];
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function guidesFor(query: string, guides: GuideTopics[], limit = 2): GuideTopics[] {
  const q = ` ${fold(query)} `;
  if (q.trim().length < 3) return [];
  const scored: Array<{ g: GuideTopics; score: number }> = [];
  for (const g of guides) {
    let best = 0;
    for (const t of [...g.topics, g.title]) {
      const topic = fold(t);
      if (topic.length < 3) continue;
      if (q.includes(` ${topic} `)) best = Math.max(best, topic.length);
      else if (q.trim().length >= 4 && topic.startsWith(q.trim())) best = Math.max(best, q.trim().length);
    }
    if (best) scored.push({ g, score: best });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.g);
}
