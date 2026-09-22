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
import { ANIMAL_SYNONYMS, NEED_SYNONYMS, SPANISH_ANIMALS, SPANISH_NEEDS } from '../data/synonyms.ts';
import { boroughsIn } from '../data/geo.ts';
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
  /**
   * The question is about someone harming or neglecting an animal, rather than
   * an animal needing care. It routes somewhere completely different — to the
   * police, not to a vet or a rescue — so it cannot be left to overlap with
   * the general "legal" tag, which also covers bite reports and housing law.
   */
  abuse: boolean;
  /** True when we know neither where they are nor what animal it is. */
  needsLocation: boolean;
  needsAnimal: boolean;
}

// --- signal extraction -----------------------------------------------------

/**
 * Combine two synonym tables for the same tags.
 *
 * Concatenates rather than replacing: a plain object spread would have the
 * Spanish list overwrite the English one for every tag it covers, which is
 * exactly the bug this exists to prevent.
 */
function withTranslations(
  base: Record<string, string>,
  extra: Partial<Record<string, string>>,
): Record<string, string> {
  const out: Record<string, string> = { ...base };
  for (const [tag, words] of Object.entries(extra)) {
    if (!words) continue;
    out[tag] = out[tag] ? `${out[tag]} ${words}` : words;
  }
  return out;
}

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

const ANIMAL_WORDS = buildLookup(withTranslations(ANIMAL_SYNONYMS, SPANISH_ANIMALS));

/**
 * Needs are matched on words that are not also animal words.
 *
 * The synonym lists are phrases, and splitting "community cat" into words put
 * "cat" into the TNR vocabulary -- so every question mentioning a cat was read
 * as a question about trap-neuter-return. A word that names an animal tells us
 * which animal, never which service.
 */
const NEED_WORDS = (() => {
  const needs = buildLookup(withTranslations(NEED_SYNONYMS, SPANISH_NEEDS));
  for (const word of ANIMAL_WORDS.keys()) needs.delete(word);
  return needs;
})();

/**
 * Words that describe an animal in trouble now. Deliberately broad: sending
 * someone to an emergency vet who did not need one costs a phone call, while
 * missing one can cost the animal.
 */
/*
 * Reporting cruelty someone else is committing.
 *
 * Deliberately not matching a person escaping an abusive partner. "I'm
 * leaving an abusive partner and can't take my dog" contains the same words
 * and is a completely different request: they need somewhere for the dog, not
 * a tip line. That routes to the owner-support guides, which already carry
 * the domestic-violence pet programmes, and there is an eval case that fails
 * if this pattern swallows it.
 */
const ABUSE_RE =
  /\b(abuse\w*|abusive|cruel|cruelty|neglect\w*|mistreat\w*|maltreat\w*|beat(en|ing)?|starv\w*|hoard\w*|dog ?fight\w*|animal fighting|chained (up|dog|outside)|kept chained|tether\w*|report (my |a |the )?(neighbou?r|owner)|turn (them|him|her) in|animal control|humane law)\b/i;

/*
 * The same words, from the other side.
 *
 * "abusive" matches the pattern above, but someone leaving an abusive partner
 * is not reporting cruelty — they need somewhere for their pet, which is the
 * owner-support route and already carries the domestic-violence programmes.
 * The giveaway is that the abuser is *theirs*: a partner, an ex, a household.
 * An abusive owner or neighbour is still a report.
 */
const ABUSE_VICTIM_RE =
  /\b(domestic violence|abusive (partner|ex|husband|wife|boyfriend|girlfriend|relationship|home|household)|(leaving|escap\w*|flee\w*) (an?|my) (abusive|violent))\b/i;

const EMERGENCY_RE =
  /\b(emergenc\w*|urgent|dying|dead|bleed\w*|blood|broken|fracture\w*|seizure|seizing|convuls\w*|collaps\w*|unconscious|limp|not breathing|can'?t breathe|struggling to breathe|breathing (funny|hard|heavy|fast|weird|strange)|labou?red breathing|wheez\w*|gasping|choking|hit by|hit a car|run over|attacked|mauled|bitten|bite|caught by a cat|cat (got|caught|brought)|brought (it |me |in )?(a |home)|poison\w*|toxic|ate .{0,20}(chocolate|lily|lilies|rat poison|antifreeze|pill)|overdose|hit (?:the |a |my |our |his |her |its )?window|window strike|flew into|stuck|trapped|drowning|hypothermi\w*|freezing|shock|won'?t move|can'?t stand|can'?t walk|paralys\w*|gushing|severe|critical|24 ?hours?|24\/7|right now|tonight|asap|\d{1,2} ?[ap]m)\b/i;

/**
 * A small mammal or bird that has stopped eating is an emergency even though
 * nothing looks wrong: a rabbit or guinea pig in gut stasis has hours, not
 * days. This is the most commonly missed emergency on the whole site.
 */
const NOT_EATING_RE = /\b(not eating|isn'?t eating|won'?t eat|hasn'?t eaten|stopped eating|not drinking|no appetite|off (his|her|its) food)\b/i;

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

  const boroughs: string[] = boroughsIn(question);
  const zips = [...new Set((q.match(/\b1[01]\d{3}\b/g) ?? []))];

  const wild = animals.has('wildlife') || animals.has('bird-wild') || animals.has('pigeon') || animals.has('marine');

  // A cat's saliva is fatal to a bird or small mammal without antibiotics, and
  // the bite often leaves no visible wound -- so "my cat brought in a sparrow,
  // it looks ok" is an emergency precisely when it does not look like one.
  const catAttack = wild && /\bcats?\b/i.test(q);

  // A cat living outside is a community-cat question even when nobody says
  // "TNR" -- which is the whole point, because the people who need TNR most
  // are the ones who have not heard of it.
  if (
    animals.has('cat') &&
    /\b(stray|feral|outside|outdoors?|under (my|the|our)|in (my|our) (yard|garden|porch|backyard|driveway|alley)|living (outside|under|in)|colony|neighbou?rhood cat|community cat)\b/i.test(q)
  ) {
    needs.add('tnr');
  }

  // A herbivore that has stopped eating cannot wait until morning.
  const gutStasis =
    NOT_EATING_RE.test(q) && (animals.has('rabbit') || animals.has('small-mammal') || animals.has('bird-companion'));

  const emergency = EMERGENCY_RE.test(q) || catAttack || gutStasis;
  const abuse = ABUSE_RE.test(q) && !ABUSE_VICTIM_RE.test(q);
  // Reporting cruelty is a legal matter, so the tag that carries the police
  // and tip lines is added whether or not the wording tripped it on its own.
  if (abuse) needs.add('legal');
  if (emergency) needs.add('emergency-vet');
  if (NEONATE_RE.test(q)) needs.add('neonatal');

  // Wild animals go to rehabilitators, not to vets or rescues.
  if (wild) needs.add('wildlife-rehab');
  // An exotic pet emergency needs an exotic-capable practice, not any ER.
  if (emergency && (animals.has('rabbit') || animals.has('small-mammal') || animals.has('bird-companion') || animals.has('reptile'))) {
    needs.add('exotic-vet');
  }

  return {
    animals: [...animals],
    needs: [...needs],
    boroughs,
    zips,
    emergency,
    abuse,
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

/**
 * Needs in order of how specifically they determine the answer.
 *
 * The first of these that a question implies becomes its *primary* need, and
 * organizations offering that need are ranked above everything else. This is
 * what stops a well-known general rescue outranking the one group that
 * hand-rears unweaned kittens, or a nearby vet outranking the city's bird
 * hospital.
 */
const NEED_PRIORITY = [
  'poison-control',
  'wildlife-rehab',
  // Before emergency-vet: a rabbit or parrot in trouble needs a practice that
  // treats exotics, and most 24-hour emergency rooms do not.
  'exotic-vet',
  'emergency-vet',
  'neonatal',
  'trap-bank',
  'retrovirus',
  'colony-care',
  'tnr',
  'lost-found',
  'microchip',
  'financial-aid',
  'food-assistance',
  'owner-support',
  'surrender',
  'spay-neuter',
  'low-cost-vet',
  'medical-special-needs',
  'behavior-training',
  'boarding',
  'senior',
  'breed-specific',
  'adoption',
  'foster',
] as const;

function primaryNeed(needs: string[], abuse = false): string | null {
  /*
   * Reporting cruelty outranks the whole list. The phrase "animal abuse" puts
   * `wildlife-rehab` into the needs by way of the word "animal", and that sits
   * second in this order, so without this the results were led by wildlife
   * hospitals for a question about the police.
   */
  if (abuse && needs.includes('legal')) return 'legal';
  for (const n of NEED_PRIORITY) if (needs.includes(n)) return n;
  return needs[0] ?? null;
}

/**
 * Take the best results, but make sure each thing the person asked about is
 * represented at least once.
 *
 * "I can't afford to feed my cats" is two needs -- money and food -- and pure
 * ranking filled every slot with one of them. Someone in that position should
 * see both kinds of help, not the top ten of whichever scored higher.
 */
function coverEveryNeed(
  scored: Array<{ org: CorpusOrg; score: number }>,
  needs: string[],
  limit: number,
): CorpusOrg[] {
  const chosen = scored.slice(0, limit);
  if (needs.length < 2 || scored.length <= limit) return chosen.map((c) => c.org);

  const picked = new Set(chosen.map((c) => c.org.id));
  for (const need of needs) {
    if (chosen.some((c) => c.org.needs.includes(need))) continue;
    const best = scored.find((c) => !picked.has(c.org.id) && c.org.needs.includes(need));
    if (!best) continue;
    // Displace the weakest result that is not itself the only cover for a need.
    for (let i = chosen.length - 1; i >= 0; i--) {
      const candidate = chosen[i]!;
      const stillCovered = candidate.org.needs.every((n) =>
        !needs.includes(n) || chosen.some((c, j) => j !== i && c.org.needs.includes(n)),
      );
      if (!stillCovered) continue;
      picked.delete(candidate.org.id);
      chosen[i] = best;
      picked.add(best.org.id);
      break;
    }
  }
  return chosen.sort((a, b) => b.score - a.score).map((c) => c.org);
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

    // 1. The one thing they need most.
    const primary = primaryNeed(s.needs, s.abuse);
    if (primary && org.needs.includes(primary)) score += 25;
    if (s.needs.length) {
      score += s.needs.filter((n) => n !== primary && org.needs.includes(n)).length * 4;
    }

    /*
     * 1b. A cruelty report goes to a reporting channel, not to a support
     *     programme. Every contact on the abuse guide carries `legal`, so that
     *     tag alone cannot separate "call this to report it" from "call this
     *     if a person is in danger too" — and the domestic-violence hotline
     *     wins on plain relevance, because its description is full of the word
     *     abuse. The reporting channels are the ones that are also a referral
     *     route, so that pairing is what gets the nudge.
     *
     *     The support lines are still retrieved, just below; a question that
     *     mentions someone being at risk scores them up on its own terms.
     */
    if (s.abuse && org.needs.includes('legal') && org.needs.includes('referral')) score += 12;
    if (s.abuse && !org.needs.includes('legal')) score -= 15;

    // 2. The right animal. A rabbit question answered with a cat rescue is a
    //    wasted phone call, and species specificity is a real signal: the bird
    //    hospital lists pigeons, the vet that "also sees wildlife" does not.
    if (s.animals.length) {
      const hits = s.animals.filter((a) => org.animals.includes(a)).length;
      score += hits * 10;
      if (hits === 0) score -= 10;
    }

    // 3. Reachable from where they are.
    if (s.boroughs.length || s.zips.length) {
      const inBorough = s.boroughs.some((b) => org.boroughs.includes(b));
      const inZip = s.zips.some((z) => org.zips.includes(z));
      if (inBorough || inZip) score += 6;
      else if (org.citywide) score += 3;
      else score -= 5;
    }

    // 4. A poison hotline is the right answer to a poisoning and the wrong
    //    answer to everything else. It is tagged as an emergency service, so
    //    without this it led every trauma question ahead of the actual
    //    emergency rooms.
    if (org.needs.includes('poison-control') && !s.needs.includes('poison-control')) score -= 10;

    // 5. What we are surest about, and what they can act on now.
    score += org.confidence === 'High' ? 4 : org.confidence === 'Medium' ? 2 : 0;
    if (org.phones.length) score += 2;
    if (org.status !== 'active') score -= 8;
    if (org.outsideNyc) score -= 3;

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
      // Free-text relevance breaks ties; it does not decide the answer. Left
      // stronger, it put a general vet ahead of the city's bird hospital for
      // "a pigeon hit my window" simply because the wording matched better.
      .map((org) => ({ org, score: this.fit(org, signals) + Math.min(relevance.get(org.id) ?? 0, 12) * 0.5 }))
      .sort((a, b) => b.score - a.score || a.org.name.localeCompare(b.org.name));

    return {
      orgs: coverEveryNeed(scored, signals.needs, limit),
      guide: this.bestGuide(question, signals),
      signals,
    };
  }

  /**
   * Which guide answers this situation.
   *
   * Routed by signal rather than by text similarity, because similarity kept
   * choosing wrong: "I need to rehome my cockatiel" matched the dog guide, and
   * "there is a seal on the beach" matched the cat guide, simply because the
   * cat and dog guides are longer and share more ordinary words. The rules run
   * in order and the first match wins; free-text search is the fallback for
   * anything they do not cover.
   */
  private routeGuide(s: Signals): string | null {
    const has = (n: string) => s.needs.includes(n);
    const animal = (a: string) => s.animals.includes(a);
    const exotic = animal('rabbit') || animal('small-mammal') || animal('bird-companion') || animal('reptile') || animal('amphibian') || animal('fish');

    /*
     * Abuse before anything else, including wildlife.
     *
     * Someone reporting cruelty is not asking for animal care at all — they
     * need the police. And "animal abuse" trips the wildlife vocabulary on the
     * word "animal", so without this the question "how do I report animal
     * abuse?" answered with a wild bird hospital. A reviewer hit exactly that.
     */
    if (s.abuse) return 'report-animal-abuse';

    // Wildlife first: it is the route people most often get wrong, and the
    // consequences of getting it wrong are the least reversible.
    if (animal('bird-wild') || animal('pigeon')) return 'found-an-injured-bird';
    if (animal('wildlife') || animal('marine')) return 'found-wildlife';

    if (has('poison-control')) return 'animal-emergency';
    if (has('emergency-vet')) return exotic ? 'exotic-pet-emergency' : 'animal-emergency';
    if (has('exotic-vet')) return 'exotic-pet-emergency';

    if (has('neonatal')) return 'cats-with-special-needs';
    if (has('trap-bank') || has('tnr') || has('colony-care') || has('working-cat')) return 'starting-tnr';

    if (has('lost-found') || has('microchip')) {
      if (exotic) return 'lost-and-found-exotic';
      return animal('dog') ? 'lost-and-found-dog' : 'lost-and-found-cat';
    }

    if (has('financial-aid')) return 'help-paying-for-care';
    if (has('food-assistance') || has('owner-support')) {
      if (exotic) return 'rehoming-an-exotic-pet';
      return animal('dog') ? 'keeping-your-dog' : 'keeping-your-cat';
    }
    if (has('surrender')) {
      if (exotic) return 'rehoming-an-exotic-pet';
      return animal('dog') ? 'keeping-your-dog' : 'keeping-your-cat';
    }

    if (has('spay-neuter') || has('low-cost-vet')) {
      return animal('dog') ? 'low-cost-dog-care' : 'low-cost-clinics-and-trap-banks';
    }

    if (has('retrovirus') || has('medical-special-needs') || has('senior')) {
      if (exotic) return 'exotic-pet-emergency';
      return animal('dog') ? 'keeping-your-dog' : 'cats-with-special-needs';
    }

    if (has('legal') || has('licensing')) return exotic ? 'exotic-pet-legality' : 'dog-behavior-and-legal';
    if (has('behavior-training')) return animal('dog') ? 'dog-behavior-and-legal' : 'lost-and-found-cat';
    if (has('boarding')) return exotic ? 'exotic-boarding-and-planning' : 'keeping-your-cat';
    /*
     * `advocacy` is, in this directory, almost entirely about the shelter's
     * at-risk list: its vocabulary is "at risk, death row, pull, rescue
     * partner, new hope". Someone asking to save an animal before it is put
     * down was being answered with breed-specific rescue, which cannot pull
     * from ACC on their behalf.
     */
    if (has('advocacy')) return 'save-an-at-risk-animal';
    if (has('breed-specific')) return 'breed-specific-dog-rescue';

    return null;
  }

  private bestGuide(question: string, signals: Signals): Retrieved['guide'] {
    const routed = this.routeGuide(signals);

    // Within the chosen guide, pick the section that best fits the question.
    if (routed) {
      const inGuide = this.guideIndex
        .search(question, { combineWith: 'OR' })
        .find((h) => (h.id as string).startsWith(`${routed}#`));
      const chunk = this.chunks.get((inGuide?.id as string) ?? `${routed}#0`) ?? this.chunks.get(`${routed}#0`);
      if (chunk) return { slug: chunk.slug, title: chunk.title, heading: chunk.heading, text: chunk.text };
    }

    const hit = this.guideIndex.search(question, { combineWith: 'OR' })[0];
    if (!hit) return null;
    const chunk = this.chunks.get(hit.id as string);
    return chunk ? { slug: chunk.slug, title: chunk.title, heading: chunk.heading, text: chunk.text } : null;
  }
}
