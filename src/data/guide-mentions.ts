/*
 * Every organization a guide names is shown the same way.
 *
 * A reviewer read the guides on 2026-11-05 and found a mix: some names linked
 * to their listing, some followed by a phone number typed into the research,
 * some with nothing at all, so a reader could not tell where to tap or whether
 * a number was current. Guide prose is copied research and is not rewritten
 * here. Two things are added to it when the page is built, from the records
 * themselves:
 *
 *   1. The first time a section names an organization with a listing, the
 *      name links to that listing.
 *   2. Each section ends with "Contacts for this section": every listed
 *      organization the section names, with its current main phone and
 *      website. These come from the listing, so a number corrected there is
 *      corrected here at the next build, and the guide can never show a
 *      different one.
 *
 * Done at build time rather than at import so the contacts are always the
 * listing's, whichever overlay or correction reached it last.
 */
import type { Org } from '../types.ts';
import { telHref } from './tel.ts';

export interface Mention {
  org: Org;
  /** The exact words matched in the prose. */
  text: string;
}

// Names too generic to identify one organization on their own.
const GENERIC = new Set(
  [
    'animal rescue', 'cat rescue', 'dog rescue', 'rescue', 'humane society', 'animal hospital', 'nyc', 'new york', 'spca', 'aspca clinic',
    // Parent organizations with several listings: the prose usually means the
    // organization in general, and linking one programme would mislead.
    'aspca', 'humane world for animals', 'hsus', 'acc', 'nys dec', 'dec', 'nyc acc', 'petco', 'veg', 'bond vet',
  ].map((s) => s.toLowerCase()),
);

// Places, which turn up as the second half of a branch's name ("Urgent Vets -
// Bronx") and would otherwise link every mention of a borough to one clinic.
const PLACE = /^(the )?(bronx|south bronx|queens|brooklyn|manhattan|staten island|harlem|east harlem|bay ridge|astoria|long island|westchester|new jersey|upper east side|upper west side|chelsea|williamsburg|park slope|flatbush|bushwick|jamaica|flushing|ridgewood|forest hills|greenpoint|sunset park|downtown brooklyn|midtown|soho|tribeca|nyc|new york city)$/i;

// Bracketed words that are another organization, not this one's other name.
const NOT_THIS_ORG = new Set(['North Shore Animal League America']);

/** The ways a record's name is written in the research. */
export function nameVariants(org: Org): string[] {
  const out = new Set<string>();
  const add = (s: string | undefined) => {
    const t = (s ?? '').replace(/\s+/g, ' ').replace(/,?\s+Inc\.?$/, '').trim();
    if (t.length < 4 || GENERIC.has(t.toLowerCase()) || PLACE.test(t) || NOT_THIS_ORG.has(t)) return;
    out.add(t);
    if (/^The /.test(t) && t.length > 8) out.add(t.slice(4));
  };
  for (const n of [org.name, ...(org.aka ?? [])]) {
    add(n);
    const bare = n.replace(/\s*\[[^\]]*\]/g, '').replace(/\s*\([^)]*\)/g, '').trim();
    add(bare);
    // "WINORR - Wildlife In Need Of Rescue and Rehabilitation", "BBAWC /
    // Brooklyn Cat Cafe": the first part, and a later one when it is a name in
    // its own right rather than a place or a programme ("Bronx", "Clinic").
    const parts = bare.split(/\s+[-–—/]\s+/);
    if (parts.length > 1) {
      add(parts[0]);
      for (const p of parts.slice(1)) if (p.split(' ').length >= 3) add(p);
    }
    // Bracketed names: an acronym ("(UUWR)") or a name in title case
    // ("(Kitty Haven)", "(Brooklyn Animal Resource Coalition)").
    for (const m of n.matchAll(/\(([^()]+)\)/g)) {
      const inner = m[1]!.trim();
      if (/^[A-Z][A-Z0-9&]{2,9}$/.test(inner)) add(inner);
      else if (/^(?:[A-Z][\w'’&.-]*|of|and|for|the|&)(?:\s+(?:[A-Z][\w'’&.-]*|of|and|for|the|&))+$/.test(inner)) add(inner);
    }
  }
  return [...out];
}

interface Matcher {
  re: RegExp;
  org: Org;
}

const bareName = (o: Org) => o.name.replace(/\s*\[[^\]]*\]/g, '').replace(/\s*\([^)]*\)/g, '').replace(/,?\s+Inc\.?$/, '').trim();

/** A name as it appears in rendered HTML: "&" is "&amp;", an apostrophe may be curly or "&#39;". */
function htmlPattern(v: string): string {
  return v
    .split('')
    .map((c) => (c === '&' ? '&amp;' : c === "'" || c === '’' ? "(?:'|’|&#39;)" : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('');
}

/**
 * One pattern per name variant, longest first so "ASPCA Animal Poison Control
 * Center" is found before "ASPCA". A variant that more than one listing uses
 * ("Urgent Vets" for two branches) is linked only when exactly one of them is
 * called that and nothing more ("Animal Care Centers of NYC" is the shelter,
 * not its Brooklyn branch); otherwise it is left out, since linking it would
 * pick a branch for the reader.
 */
/*
 * Short names the research uses that cannot be worked out from a record's
 * name. A reviewer found Cottontail Cottage named in the wildlife guide with
 * no link and no contacts (2026-11-05): its record is "Cottontail Cottage
 * Wildlife Rehab". Each id is checked by a test.
 */
export const MENTION_ALIASES: Record<string, string> = {
  'Cottontail Cottage': 'cottontail-cottage-wildlife-rehab',
  'Anjellicle Cats': 'anjellicle-cats-rescue',
  'Brooklyn Bridge Animal Welfare Coalition': 'brooklyn-bridge-animal-welfare-coalition-brooklyn-cat-cafe',
  'Long Island Rabbit Rescue': 'long-island-rabbit-rescue-group',
  'NYC Pigeon Rescue Central': 'new-york-city-pigeon-rescue-central',
  NYCPRC: 'new-york-city-pigeon-rescue-central',
  // The bird guide's author writes the Wild Bird Fund as "WBF" throughout.
  WBF: 'the-wild-bird-fund',
  FCI: 'nyc-feral-cat-initiative-bideawee',
  'NYC Feral Cat Initiative': 'nyc-feral-cat-initiative-bideawee',
  'NYC 24-hour Domestic Violence Hotline': 'nyc-domestic-violence-hotline',
  'RedRover Relief': 'redrover-relief',
  'DomesticShelters.org': 'domesticsheltersorg',
};

/*
 * A name that means one listing in one guide only. "ASPCA" is the parent of
 * several listings and is not linked in general, but in the TNR guides it is
 * always the spay/neuter service, whose listing carries the transport and
 * trap bank a reviewer found missing (2026-11-05).
 */
export const GUIDE_ALIASES: Record<string, Record<string, string>> = {
  'starting-tnr': { ASPCA: 'aspca-spay-neuter-nyc' },
  'low-cost-clinics-and-trap-banks': { ASPCA: 'aspca-spay-neuter-nyc' },
};

const pattern = (v: string) => new RegExp(`(?<![\\w&/@.-])${htmlPattern(v)}(?![\\w&-]|\\.\\w)`);

export function buildMatchers(orgs: Org[], slug?: string): Matcher[] {
  const byVariant = new Map<string, Org[]>();
  for (const o of orgs) {
    for (const v of nameVariants(o)) (byVariant.get(v) ?? byVariant.set(v, []).get(v)!).push(o);
  }
  const byId = new Map(orgs.map((o) => [o.id, o]));
  const out: Matcher[] = [];
  for (const [v, id] of Object.entries({ ...MENTION_ALIASES, ...(slug ? GUIDE_ALIASES[slug] : {}) })) {
    const org = byId.get(id);
    if (org) {
      out.push({ re: pattern(v), org });
      byVariant.delete(v);
    }
  }
  for (const [v, list] of byVariant) {
    let org: Org | undefined = list[0];
    if (new Set(list.map((o) => o.id)).size !== 1) {
      const exact = list.filter((o) => bareName(o) === v || bareName(o) === `The ${v}`);
      org = new Set(exact.map((o) => o.id)).size === 1 ? exact[0] : undefined;
    }
    if (!org) continue;
    out.push({ re: pattern(v), org });
  }
  return out.sort((a, b) => b.re.source.length - a.re.source.length);
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The line of contacts for one organization, from its listing. */
export function contactLine(org: Org): string {
  const bits: string[] = [`<a href="/org/${org.id}">${escapeHtml(org.name)}</a>`];
  const phone = org.phones[0];
  if (phone) bits.push(`<a href="${telHref(phone.value)}" translate="no">${escapeHtml(phone.display)}</a>`);
  if (org.emails[0]) bits.push(`<a href="mailto:${escapeHtml(org.emails[0].value)}">${escapeHtml(org.emails[0].value)}</a>`);
  if (org.website) {
    const host = org.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
    bits.push(`<a href="${escapeHtml(org.website)}" rel="noopener">${escapeHtml(host.length > 40 ? host.slice(0, 40) + '…' : host)}</a>`);
  }
  const flag = org.status !== 'active' ? ' <span class="tag tag--strong">Confirm it is still running</span>' : '';
  return bits.join(' · ') + flag;
}

/**
 * Links each section's first mention of every listed organization and adds
 * the section's contacts box. `html` is a rendered guide.
 */
export function annotateMentions(html: string, orgs: Org[], matchers = buildMatchers(orgs)): { html: string; named: Org[] } {
  const byId = new Map(orgs.map((o) => [o.id, o]));
  const allNamed = new Map<string, Org>();
  // Sections start at each <h2>; the part before the first one is the intro.
  const sections = html.split(/(?=<h2[\s>])/);
  const out = sections.map((section) => {
    const seen = new Map<string, Org>();
    // Links the research already made to a listing count as mentions.
    for (const m of section.matchAll(/href="\/org\/([a-z0-9-]+)\/?"/g)) {
      const o = byId.get(m[1]!);
      if (o) seen.set(o.id, o);
    }
    const parts = section.split(/(<[^>]+>)/);
    let inAnchor = 0;
    let inHeading = 0;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      if (part.startsWith('<')) {
        if (/^<a[\s>]/i.test(part)) inAnchor++;
        else if (/^<\/a>/i.test(part)) inAnchor = Math.max(0, inAnchor - 1);
        else if (/^<h[1-6][\s>]/i.test(part)) inHeading++;
        else if (/^<\/h[1-6]>/i.test(part)) inHeading = Math.max(0, inHeading - 1);
        continue;
      }
      if (inAnchor || inHeading || !part.trim()) continue;
      // Every organization named in this piece of text, at its earliest
      // mention; where two names overlap ("ASPCA Animal Poison Control
      // Center" and "ASPCA"), the longer wins.
      const hits: Array<{ at: number; end: number; org: Org }> = [];
      // Every occurrence, not just the first: "Farm Sanctuary" first appears
      // inside "Woodstock Farm Sanctuary", and only a later one is its own.
      for (const { re, org } of matchers) {
        for (const m of part.matchAll(new RegExp(re.source, 'g'))) hits.push({ at: m.index!, end: m.index! + m[0].length, org });
      }
      hits.sort((a, b) => a.at - b.at || b.end - a.end);
      const kept: typeof hits = [];
      for (const h of hits) {
        if (kept.some((k) => h.at < k.end && k.at < h.end)) continue;
        const earlier = kept.find((k) => k.org.id === h.org.id);
        if (!earlier) kept.push(h);
      }
      let text = part;
      for (const h of [...kept].reverse()) {
        if (!seen.has(h.org.id)) text = `${text.slice(0, h.at)}<a href="/org/${h.org.id}">${text.slice(h.at, h.end)}</a>${text.slice(h.end)}`;
      }
      for (const h of kept) seen.set(h.org.id, h.org);
      parts[i] = text;
    }
    let body = parts.join('');
    for (const [id, o] of seen) allNamed.set(id, o);
    if (seen.size > 0) {
      body +=
        `<aside class="guide-contacts"><p class="guide-contacts__title">Contacts for this section</p><ul>` +
        [...seen.values()].map((o) => `<li>${contactLine(o)}</li>`).join('') +
        `</ul></aside>`;
    }
    return body;
  });
  return { html: out.join(''), named: [...allNamed.values()] };
}
