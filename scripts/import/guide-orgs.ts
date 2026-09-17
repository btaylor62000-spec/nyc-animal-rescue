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

export interface GuideOrgSpec {
  file: string;
  tab: string;
  /** Sections to mine. A section matches when its heading matches the pattern. */
  sections: RegExp;
  orgTypes: OrgType[];
  needs: Need[];
  animals: Animal[];
  /** Skip bullets that are cross-references rather than listings. */
  skip?: RegExp;
  note?: string;
}

export const GUIDE_ORG_SOURCES: GuideOrgSpec[] = [
  {
    file: 'research/NYC_Cat_Rescue_TNR_Reference.xlsx',
    tab: 'Emergency & poison control',
    sections: /24 ?hour ER|urgent care/i,
    orgTypes: ['emergency-vet', 'clinic'],
    needs: ['emergency-vet'],
    animals: ['cat', 'dog'],
  },
  {
    file: 'research/NYC_Dog_Rescue_Reference.xlsx',
    tab: 'Emergency & poison control',
    sections: /24-?hour ER|urgent care/i,
    orgTypes: ['emergency-vet', 'clinic'],
    needs: ['emergency-vet'],
    animals: ['cat', 'dog'],
  },
  {
    file: 'research/NYC_Cat_Rescue_TNR_Reference.xlsx',
    tab: 'Emergency & poison control',
    sections: /POISON/i,
    orgTypes: ['hotline'],
    needs: ['poison-control', 'emergency-vet'],
    animals: ['cat', 'dog', 'rabbit', 'small-mammal', 'bird-companion', 'reptile'],
    skip: /^Lilies are|^Some common/i,
  },
  {
    file: 'research/NYC_Cat_Rescue_TNR_Reference.xlsx',
    tab: 'Clinics, traps & support',
    sections: /TRAP BANKS/i,
    orgTypes: ['support-program'],
    needs: ['trap-bank', 'tnr'],
    animals: ['cat'],
  },
  {
    file: 'research/NYC_Cat_Rescue_TNR_Reference.xlsx',
    tab: 'Clinics, traps & support',
    sections: /clinics|CITYWIDE/i,
    orgTypes: ['clinic'],
    needs: ['low-cost-vet', 'spay-neuter'],
    animals: ['cat'],
  },
  {
    file: 'research/NYC_Exotic_SmallAnimal_Wildlife_Reference.xlsx',
    tab: 'Exotic-vet & emergency care',
    sections: /exotic|avian|vet/i,
    orgTypes: ['exotic-vet', 'clinic'],
    needs: ['exotic-vet', 'emergency-vet'],
    animals: ['rabbit', 'small-mammal', 'bird-companion', 'reptile'],
    skip: /^Wildlife is not|^If the animal is wild/i,
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

/** Where a name ends and an address or contact begins. */
function splitEntry(text: string): { name: string; rest: string } {
  const parts = text.split(/\s+[-–]\s+/);

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

  // "ASPCA Animal Poison Control (APCC): (888) 426-4435" -- a colon, not a
  // dash, separates the name from the number.
  const colon = /^([^:]{3,70}):\s*(.*)$/.exec(name);
  if (colon && /\d{3}[-.\s]?\d{3}[-.]\d{4}/.test(colon[2] ?? '')) {
    return { name: colon[1]!.trim(), rest: `${colon[2]} ${rest}`.trim() };
  }

  if (!name) {
    // No usable dash: take the leading clause before the first sentence break.
    const lead = /^([^.,:]{3,70})[.,:]\s*(.*)$/.exec(text);
    if (lead) return { name: lead[1]!.trim(), rest: lead[2]!.trim() };
    return { name: text.slice(0, 70).trim(), rest: text };
  }

  // "The Center for Avian & Exotic Medicine, 562 Columbus Avenue, ..." -- the
  // street address is glued on with a comma rather than a dash.
  const comma = /^([^,]{3,70}),\s*(\d.*)$/.exec(name);
  if (comma) {
    name = comma[1]!.trim();
    rest = `${comma[2]} ${rest}`.trim();
  }

  return { name: balanced(name.slice(0, 80).trim()), rest };
}

/**
 * Trim a name that was cut mid-parenthetical, e.g. "The Association of Avian
 * Veterinarians (aav". An unbalanced bracket always means the split landed in
 * the wrong place, so we keep only the part before it.
 */
function balanced(name: string): string {
  const opens = (name.match(/\(/g) ?? []).length;
  const closes = (name.match(/\)/g) ?? []).length;
  if (opens === closes) return name;
  return name.slice(0, name.lastIndexOf('(')).trim();
}

const STREET_RE =
  /\b\d+[-\d]*\s+[A-Z][\w'.]*(?:\s+[A-Z][\w'.]*){0,4}\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Pl|Place|Pkwy|Parkway|Dr|Drive|Ln|Lane|Sq|Square|Ct|Court|Hwy|Terrace|Turnpike)\b\.?/;

const HOURS_RE =
  /\b(?:24\/7(?:\/365)?|24 ?h(?:ou)?rs?\b|Open 24h?\b|24-?hour\b|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s*[-–]\s*(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[^.;]*|open (?:daily|7 days)[^.;]*|\d{1,2}(?::\d{2})?\s?[ap]m\s*[-–]\s*\d{1,2}(?::\d{2})?\s?[ap]m)/i;

export function extractGuideOrgs(spec: GuideOrgSpec): Org[] {
  const doc = parseGuideTab(spec.file, spec.tab);
  const out: Org[] = [];

  for (const section of doc.sections) {
    if (!section.heading || !spec.sections.test(section.heading)) continue;

    for (const bullet of section.bullets as GuideBullet[]) {
      const text = bullet.text.trim();
      if (spec.skip?.test(text)) continue;
      if (POINTER_RE.test(text)) continue;

      const phones = parsePhones(text);
      const emails = parseEmails(text);
      const urls = parseUrls(text);
      // A listing has to give someone a way to make contact.
      if (phones.values.length === 0 && emails.values.length === 0 && urls.values.length === 0) continue;

      const { name, rest } = splitEntry(text);
      if (!name || name.length < 3) continue;

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
        const geo = `${section.heading} ${text}`;
        for (const bp of BOROUGH_PATTERNS) if (bp.pattern.test(geo)) boroughs.add(bp.tag);
        for (const np of NEIGHBORHOOD_BOROUGH) if (np.pattern.test(geo)) boroughs.add(np.tag);
      }

      // "(see citywide)" is a cross-reference to another section, not a claim
      // that this clinic serves the whole city.
      const scopeText = `${section.heading} ${text}`.replace(/see citywide/gi, '');
      const citywide =
        /citywide|all 5 boroughs|national hotline|use from anywhere/i.test(scopeText) ||
        spec.orgTypes.includes('hotline');
      if (citywide) for (const b of ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'] as Borough[]) boroughs.add(b);

      out.push({
        id: slugify(name),
        name,
        aka: [],
        parent_org: null,
        org_types: [...spec.orgTypes],
        animals: [...spec.animals],
        needs: [...spec.needs],
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
        section: `${spec.tab} — ${section.heading}`,
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
