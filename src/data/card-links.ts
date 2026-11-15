/**
 * Links every organization a card names to its listing.
 *
 * The full guides already do this (src/data/guide-mentions.ts), but the cards
 * did not: "Write to the Mayor's Office of Animal Welfare and your City Council
 * member" sat on the abuse card with neither linked, and the owner had to ask
 * three times (2026-11-15). The cards are written by hand, so nobody has to
 * remember to add the links: every name a listing answers to is linked when
 * the card is drawn, from the same name variants the guides use.
 *
 * The text is escaped here, because the result is put into the page as HTML.
 */
import { LISTED_ORGS, ORGS_BY_ID } from './orgs.ts';
import { buildMatchers } from './guide-mentions.ts';
import type { Org } from '../types.ts';

/*
 * Names the cards use that are too short or too loose for the guides' rules
 * (those skip anything under four letters, so "ACC" and "AMC" never match),
 * or that are written as a role rather than a name. Each id is checked by a
 * test, so a renamed record fails loudly instead of silently unlinking.
 */
export const CARD_ALIASES: Record<string, string> = {
  ACC: 'animal-care-centers-of-nyc',
  'Animal Medical Center': 'animal-medical-center',
  'City Council member': 'your-city-council-member',
  'Council member': 'your-city-council-member',
  'Mayor’s Office of Animal Welfare': 'nyc-mayors-office-of-animal-welfare',
  'Wild Bird Fund': 'the-wild-bird-fund',
  'poison control': 'aspca-animal-poison-control-center-24-7-hotline',
  'ASPCA Animal Poison Control': 'aspca-animal-poison-control-center-24-7-hotline',
  'Pet Poison Helpline': 'pet-poison-helpline-24-7-hotline',
  'Urban Wildlife Alliance': 'urban-wildlife-alliance',
  'Animal Haven': 'animal-haven-community-engagement',
  'PAWS NY': 'paws-ny',
  'Safe Horizon': 'safe-horizon',
  'URI PALS': 'uri-pals',
  'Neighborhood Cats': 'neighborhood-cats',
  'Petco Love Lost': 'petco-love-lost',
  'Toby Project': 'the-toby-project-feral-spay-neuter-clinic',
  'Humane Society of New York': 'humane-society-of-new-york',
  'Rabbit Rescue & Rehab': 'rabbit-rescue-and-rehab-nyc-chapter-house-rabbit-society',
  NYTTS: 'new-york-turtle-and-tortoise-society',
  'Northeast Avian Rescue': 'northeast-avian-rescue',
  'Animal Help Now': 'animal-help-now-wildlife-emergency-finder',
  AmbuVet: 'ambuvet-pet-ambulance',
  'Urgent Vets in the Bronx': 'urgent-vets-bronx',
  'Urgent Vets in Queens': 'urgent-vets-11369',
  'Animal Specialty Center': 'animal-specialty-center',
  'URvet Care in Astoria': 'urvet-care-astoria',
  'RedRover Relief': 'redrover-relief',
  'The Pet Fund': 'the-pet-fund',
  'Itty Bitty City': 'itty-bitty-city-kitties',
  'ACC Community Pets': 'acc-community-pets-program',
  'ACC’s Community Pets programme': 'acc-community-pets-program',
  'Saint Spiro': 'saint-spiro-cat-rescue-inc',
  'Little Wanderers': 'little-wanderers-nyc',
  'For Blake’s Sake': 'for-blakes-sake-rescue-inc',
  'Bronx Tails': 'bronx-tails-cat-rescue',
  'Cat Castle': 'cat-castle-nyc',
  'Feral Cat Initiative': 'nyc-feral-cat-initiative-bideawee',
  'ASPCA’s same-day waitlist': 'aspca-spay-neuter-nyc',
  'ASPCA offers free transport': 'aspca-spay-neuter-nyc',
  'ASPCA’s free clinics': 'aspca-community-veterinary-clinic',
};

/*
 * Named resources with no listing, linked to the address the guide itself
 * gives (a test checks the address is in that guide).
 */
export const CARD_URLS: Record<string, string> = {
  'Cat Stats': 'https://catstats.org/nyc',
  // Other guides, named in a card's words. A test checks each one exists.
  'the guide for an injured bird': '/guides/found-an-injured-bird',
  'the exotic pet emergency guide': '/guides/exotic-pet-emergency',
  'the exotic pets planning guide': '/guides/exotic-boarding-and-planning',
  'Cats needing specialist help': '/guides/cats-with-special-needs',
  'the guide on keeping your pet if you lose your home': '/guides/keep-your-pet-if-you-lose-your-home',
  'the animal emergencies guide': '/guides/animal-emergency',
  'the wildlife guide': '/guides/found-wildlife',
  // Directory lists, named in a card's words.
  'every kitten nursery': '/directory?need=neonatal',
  'every FIV+ and FeLV+ rescue': '/directory?need=retrovirus',
  'more lower-cost clinics, nearest first': '/directory?need=low-cost-vet&near=1',
  'rescues that take owner surrenders': '/directory?need=surrender',
  // Addresses the guides give.
  'ccpdt.org': 'https://www.ccpdt.org',
  'iaabc.org': 'https://iaabc.org',
  'dacvb.org': 'https://www.dacvb.org',
  'Know your zone': 'https://www.nyc.gov/knowyourzone',
  'Notify NYC': 'https://www.nyc.gov/notifynyc',
};

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const reEscape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '&amp;').replace(/[’']/g, "(?:'|’)");

interface Matcher { re: RegExp; org: Org }

let cache: Matcher[] | null = null;
function matchers(): Matcher[] {
  if (cache) return cache;
  const aliases: Matcher[] = [];
  for (const [name, id] of Object.entries(CARD_ALIASES)) {
    const org = ORGS_BY_ID.get(id);
    if (org) aliases.push({ re: new RegExp(`(?<![\\w&/@.-])${reEscape(name)}(?![\\w&-]|\\.\\w)`), org });
  }
  cache = [...aliases, ...buildMatchers(LISTED_ORGS)].sort((a, b) => b.re.source.length - a.re.source.length);
  return cache;
}

/** Ids of every alias that names no record: for the test. */
export function brokenAliases(): string[] {
  return Object.entries(CARD_ALIASES).filter(([, id]) => !ORGS_BY_ID.get(id)).map(([n, id]) => `${n} -> ${id}`);
}

/**
 * The text as HTML, with the first mention of each organization linked to
 * its page. `skip` holds organizations already linked nearby (a contact box
 * just below), so the same place is not linked twice in one breath.
 */
export function linkNames(text: string, skip: ReadonlySet<string> = new Set()): string {
  const html = escape(text);
  const hits: Array<{ at: number; end: number; org: Org }> = [];
  for (const { re, org } of matchers()) {
    for (const m of html.matchAll(new RegExp(re.source, 'g'))) hits.push({ at: m.index!, end: m.index! + m[0].length, org });
  }
  hits.sort((a, b) => a.at - b.at || b.end - a.end);
  const kept: typeof hits = [];
  for (const h of hits) {
    if (skip.has(h.org.id)) continue;
    if (kept.some((k) => h.at < k.end && k.at < h.end)) continue;
    if (kept.some((k) => k.org.id === h.org.id)) continue;
    kept.push(h);
  }
  let out = html;
  for (const h of [...kept].reverse()) {
    out = `${out.slice(0, h.at)}<a href="/org/${h.org.id}">${out.slice(h.at, h.end)}</a>${out.slice(h.end)}`;
  }
  for (const [name, url] of Object.entries(CARD_URLS)) {
    const at = out.indexOf(escape(name));
    if (at >= 0 && !out.slice(0, at).includes(`href="${escape(url)}"`)) {
      const rel = url.startsWith('/') ? '' : ' rel="noopener"';
      out = `${out.slice(0, at)}<a href="${escape(url)}"${rel}>${escape(name)}</a>${out.slice(at + escape(name).length)}`;
    }
  }
  return out;
}

/** The organizations a text names, for tests and reports. */
export function namedIn(text: string): string[] {
  return [...linkNames(text).matchAll(/href="\/org\/([a-z0-9-]+)"/g)].map((m) => m[1]!);
}
