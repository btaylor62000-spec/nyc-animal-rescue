/**
 * Organizations that exist only inside the guide tabs.
 *
 * The 24-hour emergency rooms, poison-control lines, feral-friendly clinics,
 * trap banks and wildlife rehabbers were never given directory rows -- they sit
 * in prose bullets. They are also the highest-stakes entries on the site (the
 * home page leads with "Is this an emergency?"), so they are promoted to real
 * records here rather than left as text.
 */
import type { Animal, Borough, Need, Org, OrgType } from '../../src/types.ts';
import { parseGuideTab, type GuideBullet } from './guide-parse.ts';
import { BOROUGH_PATTERNS, NEIGHBORHOOD_BOROUGH, zipToBorough } from './taxonomy.ts';
import { parseEmails, parsePhones, parseUrls, slugify } from './normalize.ts';

/** One section of a guide tab, with the tags its entries should receive. */
export interface SectionRule {
  pattern: RegExp;
  needs: Need[];
  orgTypes: OrgType[];
  /** Overrides the tab-level animals when a section is species-specific. */
  animals?: Animal[];
}

export interface GuideOrgSpec {
  file: string;
  tab: string;
  rules: SectionRule[];
  /** Animals every entry in this tab serves, unless a rule overrides it. */
  animals: Animal[];
  /** Bullets to ignore outright. */
  skip?: RegExp;
}

const WB_CAT = 'research/NYC_Cat_Rescue_TNR_Reference.xlsx';
const WB_DOG = 'research/NYC_Dog_Rescue_Reference.xlsx';
const WB_EXOTIC = 'research/NYC_Exotic_SmallAnimal_Wildlife_Reference.xlsx';

const PETS_ALL: Animal[] = ['cat', 'dog'];
const EXOTIC_PETS: Animal[] = ['rabbit', 'small-mammal', 'bird-companion', 'reptile'];

export const GUIDE_ORG_SOURCES: GuideOrgSpec[] = [
  {
    file: WB_CAT,
    tab: 'Emergency & poison control',
    animals: PETS_ALL,
    skip: /^Lilies are|^Some common/i,
    rules: [
      { pattern: /24 ?hour ER|urgent care/i, needs: ['emergency-vet'], orgTypes: ['emergency-vet', 'clinic'] },
      {
        pattern: /POISON/i,
        needs: ['poison-control', 'emergency-vet'],
        orgTypes: ['hotline'],
        animals: ['cat', 'dog', 'rabbit', 'small-mammal', 'bird-companion', 'reptile'],
      },
    ],
  },
  {
    file: WB_DOG,
    tab: 'Emergency & poison control',
    animals: PETS_ALL,
    skip: /^Some common/i,
    rules: [{ pattern: /24-?hour ER|urgent care/i, needs: ['emergency-vet'], orgTypes: ['emergency-vet', 'clinic'] }],
  },
  {
    file: WB_CAT,
    tab: 'Clinics, traps & support',
    animals: ['cat'],
    rules: [
      { pattern: /TRAP BANKS/i, needs: ['trap-bank', 'tnr'], orgTypes: ['support-program'] },
      { pattern: /clinics|CITYWIDE/i, needs: ['low-cost-vet', 'spay-neuter'], orgTypes: ['clinic'] },
    ],
  },
  {
    file: WB_CAT,
    tab: 'Owner support & surrender prev.',
    animals: ['cat'],
    rules: [
      { pattern: /ACC OWNER SUPPORT/i, needs: ['owner-support', 'surrender'], orgTypes: ['government', 'support-program'] },
      { pattern: /PET FOOD PANTRIES/i, needs: ['food-assistance', 'owner-support'], orgTypes: ['support-program'] },
      { pattern: /SENIOR \/ DISABILITY/i, needs: ['owner-support', 'senior'], orgTypes: ['support-program'] },
      { pattern: /TEMPORARY \/ CRISIS CARE/i, needs: ['owner-support', 'boarding'], orgTypes: ['support-program'] },
      { pattern: /DOMESTIC-VIOLENCE/i, needs: ['owner-support', 'boarding'], orgTypes: ['support-program'] },
      { pattern: /HOSPICE/i, needs: ['owner-support', 'senior', 'sanctuary'], orgTypes: ['support-program'] },
      { pattern: /HELP PAYING VET BILLS/i, needs: ['financial-aid', 'owner-support'], orgTypes: ['support-program'] },
    ],
  },
  {
    file: WB_DOG,
    tab: 'Owner support & surrender prev.',
    animals: ['dog'],
    rules: [
      { pattern: /ACC OWNER SUPPORT/i, needs: ['owner-support', 'surrender'], orgTypes: ['government', 'support-program'] },
      { pattern: /PET FOOD PANTRIES/i, needs: ['food-assistance', 'owner-support'], orgTypes: ['support-program'] },
      { pattern: /SENIOR \/ DISABILITY/i, needs: ['owner-support', 'senior'], orgTypes: ['support-program'] },
      { pattern: /TEMPORARY \/ CRISIS CARE/i, needs: ['owner-support', 'boarding'], orgTypes: ['support-program'] },
      { pattern: /DOMESTIC-VIOLENCE/i, needs: ['owner-support', 'boarding'], orgTypes: ['support-program'] },
      { pattern: /HOSPICE/i, needs: ['owner-support', 'senior', 'sanctuary'], orgTypes: ['support-program'] },
      { pattern: /BEHAVIOR SUPPORT/i, needs: ['behavior-training', 'owner-support'], orgTypes: ['support-program'] },
      { pattern: /VET-BILL FINANCIAL AID/i, needs: ['financial-aid', 'owner-support'], orgTypes: ['support-program'] },
      { pattern: /HOUSING SUPPORT/i, needs: ['owner-support', 'legal'], orgTypes: ['support-program'] },
    ],
  },
  {
    file: WB_EXOTIC,
    tab: 'Owner support & surrender prev.',
    animals: EXOTIC_PETS,
    // Both sections are "for this species, go here" routing lines rather than
    // organization listings. The guide page carries them.
    rules: [],
  },
  {
    file: WB_CAT,
    tab: 'Lost-found & behavior',
    animals: ['cat'],
    // The "LOST A CAT" and behaviour sections are step-by-step advice with
    // inline links, not listings; they are served by the guide page instead.
    rules: [{ pattern: /MICROCHIP REGISTRIES/i, needs: ['microchip', 'lost-found'], orgTypes: ['support-program'] }],
  },
  {
    file: WB_DOG,
    tab: 'Lost-found & microchip',
    animals: ['dog'],
    rules: [{ pattern: /MICROCHIP REGISTRIES/i, needs: ['microchip', 'lost-found'], orgTypes: ['support-program'] }],
  },
  {
    file: WB_DOG,
    tab: 'Low-cost vet, s-n & licensing',
    animals: ['dog'],
    rules: [
      { pattern: /SPAY-NEUTER/i, needs: ['spay-neuter', 'low-cost-vet'], orgTypes: ['clinic'] },
      { pattern: /VETERINARY CLINICS|VET CLINICS|DOG DENTAL/i, needs: ['low-cost-vet'], orgTypes: ['clinic'] },
      { pattern: /COMMUNITY PETS/i, needs: ['owner-support'], orgTypes: ['government', 'support-program'] },
      { pattern: /PET FOOD \/ SUPPLIES/i, needs: ['food-assistance'], orgTypes: ['support-program'] },
      { pattern: /VACCINE \+ MICROCHIP/i, needs: ['microchip', 'low-cost-vet'], orgTypes: ['clinic'] },
      { pattern: /VET-BILL FINANCIAL AID/i, needs: ['financial-aid'], orgTypes: ['support-program'] },
    ],
  },
  {
    file: WB_EXOTIC,
    tab: 'Exotic-vet & emergency care',
    animals: EXOTIC_PETS,
    skip: /^Wildlife is not|^If the animal is wild/i,
    rules: [{ pattern: /exotic|avian|vet/i, needs: ['exotic-vet', 'emergency-vet'], orgTypes: ['exotic-vet', 'clinic'] }],
  },
  {
    file: WB_EXOTIC,
    tab: 'Financial aid & low-cost care',
    animals: EXOTIC_PETS,
    rules: [
      { pattern: /vet-bill funds/i, needs: ['financial-aid'], orgTypes: ['support-program'] },
      { pattern: /LOW-COST exotic care/i, needs: ['low-cost-vet', 'exotic-vet'], orgTypes: ['clinic'] },
      { pattern: /FOOD & SUPPLY/i, needs: ['food-assistance'], orgTypes: ['support-program'] },
    ],
  },
  {
    file: WB_EXOTIC,
    tab: 'Wildlife rehabilitation',
    animals: ['wildlife', 'bird-wild'],
    // The "licensed rehabbers" section lists private individuals by name and
    // personal mobile. Those are people, not organizations, and they are
    // covered by the privacy holds -- so only the veterinary practices that
    // accept wildlife are promoted to records here.
    skip: /^Bobby & Cathy|^Robert Spragg/i,
    rules: [{ pattern: /veterinarians who will see WILDLIFE/i, needs: ['wildlife-rehab'], orgTypes: ['clinic'] }],
  },
];

/**
 * Bullets that point at someone else's list rather than being a listing
 * themselves: "Rabbit Rescue & Rehab keeps a rabbit-savvy vet-care page",
 * "Toby Project weekly MOBILE clinic serves Queens". They belong in the guide
 * prose, not in the directory as if they were an organization.
 */
const POINTER_RE =
  /\b(keeps?|maintains?|see the|see also|refer to|listed (at|on|in)|ha(?:s|ve)\b[\w' -]{0,30}(search|list|page|directory|finder|tools?)|check the|browse|find a vet|serves? (Queens|Brooklyn|Manhattan|the Bronx|SI|Staten Island)\b)/i;

const CONTACT_IN_PART_RE =
  /\(?\d{3}\)?[-.\s]\s?\d{3}[-.]\d{4}|@|https?:\/\/|\b[\w-]+\.(org|com|net|gov|app)\b/i;

/**
 * A geography prefix used as a column header inside a bullet list:
 * "BROOKLYN - Animal Clinic of Bay Ridge: lower-cost vet care, ...".
 * The prefix is the borough, not the organization's name.
 */
const GEO_PREFIX_RE =
  /^(BRONX|BROOKLYN|QUEENS|MANHATTAN|STATEN ISLAND|CITYWIDE|NYC|NATIONWIDE|WESTCHESTER[- ]ADJACENT(?:\s*\([^)]*\))?|LONG ISLAND|NEW JERSEY)$/i;

/**
 * Phrases that are instructions or prose, not organization names. Without this
 * the narrative bullets ("1. Check ACC 24/7: ...", "Searchable by county and
 * species") would become records that no one can act on.
 */
function looksLikeOrgName(name: string): boolean {
  const n = name.trim();
  if (n.length < 3 || n.length > 80) return false;
  // A bullet that lists several organizations at once. There is no safe way to
  // split the contacts back onto the right names, so it stays in the prose.
  if (/\s\+\s/.test(n)) return false;
  if ((n.match(/\s\/\s/g) ?? []).length >= 2) return false;
  if (GEO_PREFIX_RE.test(n)) return false;
  if (/^\d+[.)]\s/.test(n)) return false; // "1. Check ACC..."
  if (/[?]$/.test(n)) return false;
  if (/^['"\u2018\u2019\u201c\u201d]/.test(n)) return false; // a quoted phrase, not a name
  // Opens with an instruction to the reader rather than a name.
  if (/^(check|report|update|look|search|call|email|text|dial|ask|post|use|visit|register|find|start|go|bring|keep|do|don'?t|if|when|how|why|what|where|note|tip|see|for|any|general|authoritative|searchable|most|some|all)\b/i.test(n)) {
    return false;
  }
  // Needs at least one capitalised word or an all-caps acronym to read as a name.
  if (!/[A-Z]/.test(n)) return false;
  return true;
}

/** Where a name ends and an address or contact begins. */
function splitEntry(text: string): { name: string; rest: string; borough: string | null } {
  let parts = text.split(/\s+[-–]\s+/);

  // Strip a leading geography column header and remember it.
  let borough: string | null = null;
  const head = parts[0]?.trim() ?? '';
  if (parts.length > 1 && GEO_PREFIX_RE.test(head)) {
    borough = head;
    parts = parts.slice(1);
  }

  let name = '';
  let i = 0;
  const first = parts[0]?.trim() ?? '';
  if (first && !/^\d/.test(first) && !CONTACT_IN_PART_RE.test(first)) {
    name = first;
    i = 1;
    // Join one more fragment only when it reads like a branch qualifier:
    // "BluePearl - Midtown", "VEG - Ralph Ave", "Urgent Vets - Bronx".
    const second = parts[1]?.trim();
    if (
      second &&
      second.length <= 30 &&
      !second.includes(',') &&
      !/^\d/.test(second) &&
      !CONTACT_IN_PART_RE.test(second)
    ) {
      name = `${name} - ${second}`;
      i = 2;
    }
  }
  let rest = parts.slice(i).join(' - ').trim();

  if (!name) {
    // No usable dash: take the leading clause before the first sentence break.
    const lead = /^([^.,:]{3,70})[.,:]\s*(.*)$/.exec(parts.join(' - '));
    if (lead) return { name: trimVerbPhrase(balanced(lead[1]!.trim())), rest: lead[2]!.trim(), borough };
    return { name: trimVerbPhrase(balanced(text.slice(0, 70).trim())), rest: text, borough };
  }

  // Everything after a colon is description, not name: both
  // "ASPCA Animal Poison Control (APCC): (888) 426-4435" and
  // "Animal Clinic of Bay Ridge: lower-cost vet care, 689 86th St".
  const colon = /^([^:]{3,70}):\s*(.*)$/.exec(name);
  if (colon) {
    name = colon[1]!.trim();
    rest = `${colon[2]} ${rest}`.trim();
  }

  // "The Center for Avian & Exotic Medicine, 562 Columbus Avenue, ..." -- the
  // street address is glued on with a comma rather than a dash.
  const comma = /^([^,]{3,70}),\s*(\d.*)$/.exec(name);
  if (comma) {
    name = comma[1]!.trim();
    rest = `${comma[2]} ${rest}`.trim();
  }

  return { name: trimVerbPhrase(balanced(name.slice(0, 80).trim())), rest, borough };
}

/**
 * Trim a name that was cut mid-parenthetical, e.g. "The Association of Avian
 * Veterinarians (aav". An unbalanced bracket always means the split landed in
 * the wrong place, so we keep only the part before it.
 */
function balanced(name: string): string {
  let out = name;
  // Repeat: a name can be cut inside a nested parenthetical.
  for (let i = 0; i < 4; i++) {
    const opens = (out.match(/\(/g) ?? []).length;
    const closes = (out.match(/\)/g) ?? []).length;
    if (opens === closes) break;
    const cut = out.lastIndexOf('(');
    if (cut <= 0) break;
    out = out.slice(0, cut).trim();
  }
  return out.replace(/[\s,;:.\-\u2013]+$/, '').trim();
}

/**
 * Trim a trailing verb phrase so an organization keeps its name:
 * "Sean Casey Animal Rescue runs low-cost vaccine clinics" -> "Sean Casey
 * Animal Rescue". Applied only when something substantial is left.
 */
const TRAILING_VERB_RE =
  /\s+\b(runs?|provides?|hosts?|offers?|maintains?|operates?|accepts?|covers?|assists?|helps?|handles?|supports?|serves?|takes?|gives?|works?|is|are|was|were|has|have|will|can|does)\b\s+.*$/i;

function trimVerbPhrase(name: string): string {
  const trimmed = name.replace(TRAILING_VERB_RE, '').trim();
  return trimmed.length >= 3 ? trimmed : name;
}

/**
 * A street address. Most NYC addresses use numbered streets ("196 4th Ave",
 * "510 E 62nd St"), so the name portion has to accept ordinals and single
 * compass letters, not just capitalised words.
 */
const STREET_RE =
  /\b\d+(?:-\d+)?\s+(?:(?:[A-Z][\w'.-]*|\d{1,3}(?:st|nd|rd|th)|[NSEW])\s+){1,5}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Pl|Place|Pkwy|Parkway|Dr|Drive|Ln|Lane|Sq|Square|Ct|Court|Hwy|Highway|Terrace|Turnpike)\b\.?/;

const HOURS_RE =
  /\b(?:24\/7(?:\/365)?|24 ?h(?:ou)?rs?\b|Open 24h?\b|24-?hour\b|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s*[-–]\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[^.;]*|open (?:daily|7 days)[^.;]*|\d{1,2}(?::\d{2})?\s?[ap]m\s*[-–]\s*\d{1,2}(?::\d{2})?\s?[ap]m)/i;

/**
 * A bullet that packs several organizations into one line, e.g.
 * "Ocean Hill Cats (info@oceanhillcats.com), Good Home (info@...), Mama Chris".
 * There is no safe way to split contacts back onto the right names, so these
 * stay in the guide prose instead of becoming a wrong record.
 */
function listsManyOrgs(phoneCount: number, emailCount: number, urlCount: number): boolean {
  return phoneCount + emailCount + urlCount >= 4;
}

export function extractGuideOrgs(spec: GuideOrgSpec): Org[] {
  const doc = parseGuideTab(spec.file, spec.tab);
  const out: Org[] = [];

  for (const section of doc.sections) {
    if (!section.heading) continue;
    const rule = spec.rules.find((r) => r.pattern.test(section.heading!));
    if (!rule) continue;

    for (const bullet of section.bullets as GuideBullet[]) {
      const text = bullet.text.trim();
      if (spec.skip?.test(text)) continue;
      if (POINTER_RE.test(text)) continue;

      const phones = parsePhones(text);
      const emails = parseEmails(text);
      const urls = parseUrls(text);
      // A listing has to give someone a way to make contact.
      if (phones.values.length === 0 && emails.values.length === 0 && urls.values.length === 0) continue;
      if (listsManyOrgs(phones.values.length, emails.values.length, urls.values.length)) continue;

      const { name, rest, borough: geoPrefix } = splitEntry(text);
      if (!looksLikeOrgName(name)) continue;

      const zip = /\b(1[01]\d{3})\b/.exec(text)?.[1] ?? null;
      const street = STREET_RE.exec(text)?.[0] ?? null;
      const hours = HOURS_RE.exec(text)?.[0]?.trim() ?? null;

      // A ZIP is unambiguous; heading and prose are not. Section headings here
      // routinely name a *different* borough as a referral ("BRONX - urgent
      // care (... residents are advised to use Manhattan)"), so a ZIP wins
      // outright rather than being merged with what the prose mentions.
      const boroughs = new Set<Borough>();
      const zipBorough = zip ? zipToBorough(zip) : null;
      if (zipBorough) {
        boroughs.add(zipBorough);
      } else {
        const geo = `${geoPrefix ?? ''} ${section.heading} ${text}`;
        for (const bp of BOROUGH_PATTERNS) if (bp.pattern.test(geo)) boroughs.add(bp.tag);
        for (const np of NEIGHBORHOOD_BOROUGH) if (np.pattern.test(geo)) boroughs.add(np.tag);
      }

      // "(see citywide)" is a cross-reference to another section, not a claim
      // that this resource serves the whole city.
      const scopeText = `${geoPrefix ?? ''} ${section.heading} ${text}`.replace(/see citywide/gi, '');
      const citywide =
        /citywide|all 5 boroughs|national hotline|use from anywhere|nationwide/i.test(scopeText) ||
        rule.orgTypes.includes('hotline');
      if (citywide) for (const b of ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'] as Borough[]) boroughs.add(b);

      out.push({
        id: slugify(name),
        name,
        aka: [],
        parent_org: null,
        org_types: [...rule.orgTypes],
        animals: [...(rule.animals ?? spec.animals)],
        needs: [...rule.needs],
        boroughs: [...boroughs],
        citywide,
        outside_nyc: false,
        neighborhoods: null,
        zips: zip ? [zip] : [],
        region_note: section.heading,
        phones: phones.values,
        emails: emails.values,
        website: urls.values[0] ?? null,
        intake_urls: [],
        social: [],
        address: street || zip ? { street: street ?? undefined, zip: zip ?? undefined } : null,
        hours,
        notes: rest || text,
        type_raw: null,
        // These come from a curated, recently verified list rather than from
        // each organization's own site, so they are Medium by the project's
        // own definition -- never High.
        confidence: 'Medium',
        status: 'active',
        status_note: null,
        source_urls: [],
        last_verified: null,
        section: `${spec.tab} \u2014 ${section.heading}`,
        source_files: [spec.file],
        last_checked: null,
        check_status: 'unchecked',
        consecutive_failures: 0,
        change_log: [],
        privacy_hold: false,
      });
    }
  }
  return out;
}
