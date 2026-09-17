/**
 * Retrieval for the chat assistant.
 *
 * Runs in the Workers runtime, so it uses no Node APIs. It reuses the same
 * MiniSearch configuration as the site's search box, so a resource someone can
 * find by typing in the directory is a resource the assistant can find too.
 *
 * On top of free-text search it extracts three signals from the question --
 * which animal, what is needed, and where -- because those change the answer
 * more than wording does. A question that mentions Brooklyn should not be
 * answered with a Staten Island clinic.
 */
import MiniSearch from 'minisearch';
import { MINISEARCH_OPTIONS, processQuery, runSearch, type SearchRecordLike } from '../data/search.ts';
import { ANIMAL_SYNONYMS, NEED_SYNONYMS } from '../data/synonyms.ts';
import type { CorpusGuide, CorpusOrg } from '../../scripts/import/corpus.ts';

export interface Corpus {
  orgs: CorpusOrg[];
  guides: CorpusGuide[];
}

export interface Signals {
  animals: string[];
  needs: string[];
  boroughs: string[];
  zips: string[];
  /** The question describes an animal in immediate danger. */
  emergency: boolean;
  /** True when we know neither where they are nor what animal it is. */
  needsLocation: boolean;
  needsAnimal: boolean;
}

// --- signal extraction -----------------------------------------------------

/** word -> tags, built once from the same synonym lists search uses. */
function buildLookup(source: Record<string, string>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [tag, words] of Object.entries(source)) {
    for (const word of new Set(words.split(/\s+/))) {
      if (word.length < 3) continue;
      const existing = map.get(word);
      if (existing) existing.push(tag);
      else map.set(word, [tag]);
    }
  }
  return map;
}

const ANIMAL_WORDS = buildLookup(ANIMAL_SYNONYMS);
const NEED_WORDS = buildLookup(NEED_SYNONYMS);

const BOROUGH_PATTERNS: Array<[string, RegExp]> = [
  ['brooklyn', /\bbrooklyn\b|\bbklyn\b|\bbk\b|\bkings county\b/i],
  ['queens', /\bqueens\b|\blic\b|\bastoria\b|\bflushing\b|\bjamaica\b|\bridgewood\b|\brockaway\b/i],
  ['bronx', /\bbronx\b|\briverdale\b|\bfordham\b/i],
  ['manhattan', /\bmanhattan\b|\bharlem\b|\bues\b|\buws\b|\bsoho\b|\bchelsea\b|\bwashington heights\b|\binwood\b/i],
  ['staten-island', /\bstaten island\b|\bstaten\b|\brichmond county\b/i],
];

/**
 * Words that describe an animal in trouble now. Deliberately broad: sending
 * someone to an emergency vet who did not need one costs a phone call, while
 * missing one can cost the animal.
 */
const EMERGENCY_RE =
  /\b(emergenc\w*|urgent|dying|dead|bleed\w*|blood|broken|fracture\w*|seizure|seizing|convuls\w*|collaps\w*|unconscious|limp|not breathing|can'?t breathe|struggling to breathe|gasping|choking|hit by|hit a car|run over|attacked|mauled|bitten|bite|caught by a cat|cat got|poison\w*|toxic|ate .{0,20}(chocolate|lily|lilies|rat poison|antifreeze|pill)|overdose|hit (the |a )?window|window strike|flew into|stuck|trapped|drowning|hypothermi\w*|freezing|shock|won'?t move|can'?t stand|can'?t walk|paralys\w*|gushing|severe|critical|24 ?hours?|24\/7|right now|tonight|asap)\b/i;

/** A kitten or nestling with eyes closed is an emergency of a different kind. */
const NEONATE_RE = /\b(newborn|days? old|eyes closed|unweaned|no fur|naked|nestling|bottle|neonat\w*)\b/i;

export function extractSignals(question: string): Signals {
  const q = question.toLowerCase();
  const terms = processQuery(question);

  const animals = new Set<string>();
  const needs = new Set<string>();
  for (const t of terms) {
    for (const tag of ANIMAL_WORDS.get(t) ?? []) animals.add(tag);
    for (const tag of NEED_WORDS.get(t) ?? []) needs.add(tag);
  }

  const boroughs = BOROUGH_PATTERNS.filter(([, re]) => re.test(q)).map(([b]) => b);
  const zips = [...new Set((q.match(/\b1[01]\d{3}\b/g) ?? []))];

  const emergency = EMERGENCY_RE.test(q);
  if (emergency) needs.add('emergency-vet');
  if (NEONATE_RE.test(q)) needs.add('neonatal');

  // Wild animals go to rehabilitators, not to vets or rescues.
  const wild = animals.has('wildlife') || animals.has('bird-wild') || animals.has('pigeon');
  if (wild) needs.add('wildlife-rehab');

  return {
    animals: [...animals],
    needs: [...needs],
    boroughs,
    zips,
    emergency,
    needsLocation: boroughs.length === 0 && zips.length === 0,
    needsAnimal: animals.size === 0,
  };
}

// --- retrieval -------------------------------------------------------------

export interface Retrieved {
  orgs: CorpusOrg[];
  guide: { slug: string; title: string; heading: string; text: string } | null;
  signals: Signals;
}

function toSearchRecord(o: CorpusOrg): SearchRecordLike {
  return {
    id: o.id,
    name: o.name,
    aka: o.aka,
    animals: o.animals,
    needs: o.needs,
    boroughs: o.boroughs,
    zips: o.zips,
    text: o.text,
    keywords: o.keywords,
  };
}

export class Retriever {
  private readonly index: MiniSearch<SearchRecordLike>;
  private readonly byId: Map<string, CorpusOrg>;
  private readonly guideIndex: MiniSearch<{ id: string; title: string; heading: string; text: string; topics: string }>;
  private readonly chunks: Map<string, { slug: string; title: string; heading: string; text: string }>;

  constructor(private readonly corpus: Corpus) {
    this.index = new MiniSearch<SearchRecordLike>(MINISEARCH_OPTIONS);
    this.index.addAll(corpus.orgs.map(toSearchRecord));
    this.byId = new Map(corpus.orgs.map((o) => [o.id, o]));

    this.chunks = new Map();
    const chunkDocs = corpus.guides.flatMap((g) =>
      g.chunks.map((c, i) => {
        const id = `${g.slug}#${i}`;
        this.chunks.set(id, { slug: g.slug, title: g.title, heading: c.heading, text: c.text });
        return { id, title: g.title, heading: c.heading, text: c.text, topics: g.topics.join(' ') };
      }),
    );
    this.guideIndex = new MiniSearch({
      fields: ['title', 'heading', 'topics', 'text'],
      storeFields: ['id'],
      processTerm: MINISEARCH_OPTIONS.processTerm,
      searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 4, heading: 3, topics: 4, text: 1 } },
    });
    this.guideIndex.addAll(chunkDocs);
  }

  /**
   * Score how well a record fits the signals we read from the question.
   *
   * Free-text relevance alone puts a Staten Island clinic in front of someone
   * who said they are in Brooklyn, so place, animal and need are scored
   * explicitly on top of it.
   */
  private fit(org: CorpusOrg, s: Signals): number {
    let score = 0;

    if (s.needs.length) {
      const hits = s.needs.filter((n) => org.needs.includes(n)).length;
      score += hits * 6;
      // The single most consequential routing decision on the whole site.
      if (s.needs.includes('emergency-vet') && org.needs.includes('emergency-vet')) score += 14;
      if (s.needs.includes('wildlife-rehab') && org.needs.includes('wildlife-rehab')) score += 14;
      if (s.needs.includes('poison-control') && org.needs.includes('poison-control')) score += 14;
    }

    if (s.animals.length) {
      const hits = s.animals.filter((a) => org.animals.includes(a)).length;
      score += hits * 5;
      // A rabbit question answered with a cat rescue is a wasted phone call.
      if (hits === 0) score -= 8;
    }

    if (s.boroughs.length || s.zips.length) {
      const inBorough = s.boroughs.some((b) => org.boroughs.includes(b));
      const inZip = s.zips.some((z) => org.zips.includes(z));
      if (inBorough || inZip) score += 5;
      else if (org.citywide) score += 2;
      else score -= 4;
    }

    // Prefer what we are surest about, and what someone can act on now.
    score += org.confidence === 'High' ? 3 : org.confidence === 'Medium' ? 1 : 0;
    if (org.phones.length) score += 2;
    if (org.status !== 'active') score -= 6;
    if (org.outsideNyc) score -= 2;

    return score;
  }

  retrieve(question: string, limit = 10): Retrieved {
    const signals = extractSignals(question);

    // Free-text relevance, then re-ranked by how well each record fits the
    // signals. Records that match the signals but not the wording still get a
    // chance, which matters when someone describes a situation without naming
    // any organization or service.
    const hits = runSearch(this.index, question);
    const relevance = new Map(hits.map((h, i) => [h.id, Math.max(0, 30 - i)]));

    const candidates = new Set<string>(hits.slice(0, 60).map((h) => h.id));
    if (signals.needs.length || signals.animals.length) {
      for (const org of this.corpus.orgs) {
        const needMatch = signals.needs.some((n) => org.needs.includes(n));
        const animalMatch = signals.animals.length === 0 || signals.animals.some((a) => org.animals.includes(a));
        if (needMatch && animalMatch) candidates.add(org.id);
      }
    }

    const scored = [...candidates]
      .map((id) => this.byId.get(id))
      .filter((o): o is CorpusOrg => Boolean(o))
      .map((org) => ({ org, score: this.fit(org, signals) + (relevance.get(org.id) ?? 0) * 0.5 }))
      .sort((a, b) => b.score - a.score || a.org.name.localeCompare(b.org.name));

    return {
      orgs: scored.slice(0, limit).map((s) => s.org),
      guide: this.bestGuide(question, signals),
      signals,
    };
  }

  private bestGuide(question: string, signals: Signals): Retrieved['guide'] {
    // Steer to the guide that matches the situation, not just the words.
    const steer: string[] = [];
    if (signals.animals.includes('bird-wild') || signals.animals.includes('pigeon')) steer.push('injured bird window strike fledgling');
    if (signals.animals.includes('wildlife')) steer.push('wildlife rehabilitator licensed');
    if (signals.needs.includes('emergency-vet')) steer.push('emergency poison 24 hour');
    if (signals.needs.includes('neonatal')) steer.push('neonatal bottle baby kitten');
    if (signals.needs.includes('tnr') || signals.needs.includes('trap-bank')) steer.push('tnr trap colony');
    if (signals.needs.includes('owner-support') || signals.needs.includes('surrender')) steer.push('keeping your pet surrender');
    if (signals.needs.includes('lost-found')) steer.push('lost found microchip');

    const query = [question, ...steer].join(' ');
    const hit = this.guideIndex.search(query, { combineWith: 'OR' })[0];
    if (!hit) return null;
    const chunk = this.chunks.get(hit.id as string);
    return chunk ? { slug: chunk.slug, title: chunk.title, heading: chunk.heading, text: chunk.text } : null;
  }
}
