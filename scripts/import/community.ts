/**
 * Publishing what visitors submit.
 *
 * A submission arrives as one JSON file in `data/community/`, written by the
 * contribute endpoint after its quick check passed: the phone or email the
 * visitor gave was found on the website they gave. That is thin evidence and
 * the records say so.
 *
 * An addition becomes a record labelled "added by a visitor, not yet checked".
 * Low confidence, last in every ranking, and excluded from the assistant until
 * a weekly check or a person confirms it -- the same treatment as a roster
 * discovery. Someone browsing can find it; someone in a crisis is not handed
 * it as though it were checked.
 *
 * A correction overwrites the record's contact details. That was a decision
 * made on 2026-09-22 with the risk understood: a visitor's correction is
 * applied as soon as the site rebuilds, labelled as a visitor's, and logged
 * with the page it was checked against. The weekly check then verifies the
 * new contact like any other.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import type { Animal, Borough, ChangeLogEntry, Need, Org } from '../../src/types.ts';
import type { Submission } from '../../src/contribute/protocol.ts';
import { BOROUGH_PATTERNS, NEIGHBORHOOD_BOROUGH } from '../../src/data/geo.ts';
import { ANIMAL_RULES, NEED_RULES, ORG_TYPE_RULES, inferRegion, zipToBorough } from './taxonomy.ts';
import { applyRules } from './tag.ts';
import { formatPhone, slugify } from './normalize.ts';

export const COMMUNITY_DIR = 'data/community';

export function loadSubmissions(dir = COMMUNITY_DIR): Submission[] {
  if (!existsSync(dir)) return [];
  const out: Submission[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    try {
      const parsed = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8')) as Submission;
      if (parsed.version === 1 && (parsed.kind === 'add' || parsed.kind === 'correct')) out.push(parsed);
    } catch {
      // A malformed file is skipped, not fatal: one bad submission must not
      // stop the site from building.
    }
  }
  return out.sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));
}

function day(iso: string): string {
  return iso.slice(0, 10);
}

const ALL_BOROUGHS: Borough[] = ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'];

/** Build a record from an addition. The visitor's words are tagged by the same rules as the research workbooks. */
export function submissionToOrg(s: Submission): Org {
  const f = s.fields;
  const name = f.name ?? s.org_id;
  const what = f.what ?? '';
  const src = { name, type: '', notes: what, section: '', animals_served: (f.animals ?? []).join(' '), areas: '' };

  const animals = new Set<Animal>(f.animals ?? []);
  for (const t of applyRules(ANIMAL_RULES, src).tags) animals.add(t as Animal);
  const needs = new Set<Need>(applyRules(NEED_RULES, src).tags as Need[]);
  const orgTypes = applyRules(ORG_TYPE_RULES, src).tags;

  const boroughs = new Set<Borough>(f.boroughs ?? []);
  const geoText = `${what} ${f.address ?? ''}`;
  for (const bp of BOROUGH_PATTERNS) if (bp.pattern.test(geoText)) boroughs.add(bp.tag);
  for (const np of NEIGHBORHOOD_BOROUGH) if (np.pattern.test(geoText)) boroughs.add(np.tag);
  const zipBorough = f.zip ? zipToBorough(f.zip) : null;
  if (zipBorough) boroughs.add(zipBorough);
  const citywide = ALL_BOROUGHS.every((b) => boroughs.has(b));

  const region = inferRegion({ name, phones: f.phone ? [f.phone] : [] });
  const added = day(s.submitted_at);

  const log: ChangeLogEntry[] = [
    {
      date: added,
      field: 'record',
      from: null,
      to: 'added',
      evidence_url: s.check.page,
      source: 'community',
      note: 'Submitted by a visitor to the site. The contact given was found on the website given, and nothing else has been checked.',
    },
  ];

  return {
    id: s.org_id,
    name,
    aka: [],
    parent_org: null,
    org_types: orgTypes,
    animals: [...animals],
    needs: [...needs],
    boroughs: [...boroughs],
    citywide,
    outside_nyc: region.outsideNyc && boroughs.size === 0,
    neighborhoods: null,
    zips: f.zip ? [f.zip] : [],
    region_note: null,
    phones: f.phone ? [{ value: f.phone, display: formatPhone(f.phone) }] : [],
    emails: f.email ? [{ value: f.email }] : [],
    website: f.website ?? null,
    intake_urls: [],
    social: [],
    address: f.address ? { street: f.address, ...(f.zip ? { zip: f.zip } : {}) } : null,
    hours: f.hours ?? null,
    notes:
      `${what}\n\nAdded by a visitor to this site on ${added}. Their website showed this contact detail on that day, ` +
      'but nobody here has checked it, and we do not know whether they are still operating. Confirm before relying on it.',
    type_raw: null,
    confidence: 'Low',
    status: 'active',
    status_note: null,
    source_urls: f.website ? [f.website] : [],
    last_verified: null,
    section: 'Added by visitors',
    source_files: ['community'],
    last_checked: null,
    check_status: 'new-unverified',
    consecutive_failures: 0,
    change_log: log,
    privacy_hold: false,
    community: { added_on: added, corrected_on: null },
  };
}

export interface CorrectionReport {
  applied: Array<{ id: string; fields: string[] }>;
  /** Corrections whose record no longer exists. */
  orphaned: string[];
}

/** Apply corrections, oldest first, so the latest word wins. */
export function applyCorrections(orgs: Org[], submissions: Submission[]): CorrectionReport {
  const byId = new Map(orgs.map((o) => [o.id, o]));
  const report: CorrectionReport = { applied: [], orphaned: [] };

  for (const s of submissions.filter((x) => x.kind === 'correct')) {
    const org = byId.get(s.org_id);
    if (!org) {
      report.orphaned.push(s.org_id);
      continue;
    }
    const f = s.fields;
    const date = day(s.submitted_at);
    const changed: string[] = [];
    const entry = (field: string, from: string | null, to: string | null): ChangeLogEntry => ({
      date,
      field,
      from,
      to,
      evidence_url: s.check.page,
      source: 'community',
      note: s.reason ? `A visitor wrote: ${s.reason}` : 'Corrected by a visitor to the site.',
    });

    if (f.phone && !org.phones.some((p) => p.value === f.phone)) {
      org.change_log.push(entry('phones', org.phones.map((p) => p.value).join(', ') || null, f.phone));
      org.phones = [{ value: f.phone, display: formatPhone(f.phone) }];
      changed.push('phone');
    }
    if (f.email && !org.emails.some((e) => e.value === f.email)) {
      org.change_log.push(entry('emails', org.emails.map((e) => e.value).join(', ') || null, f.email));
      org.emails = [{ value: f.email }];
      changed.push('email');
    }
    // The form re-sends the current website, normalised with a trailing
    // slash; that is not a change.
    const sameSite = (a: string | null, b: string | null): boolean =>
      (a ?? '').replace(/\/+$/, '').toLowerCase() === (b ?? '').replace(/\/+$/, '').toLowerCase();
    if (f.website && !sameSite(f.website, org.website)) {
      org.change_log.push(entry('website', org.website, f.website));
      org.website = f.website;
      changed.push('website');
    }
    if (f.address && org.address?.street !== f.address) {
      org.change_log.push(entry('address', org.address?.street ?? null, f.address));
      org.address = { ...(org.address ?? {}), street: f.address, ...(f.zip ? { zip: f.zip } : {}) };
      changed.push('address');
    }
    if (f.hours && f.hours !== org.hours) {
      org.change_log.push(entry('hours', org.hours, f.hours));
      org.hours = f.hours;
      changed.push('hours');
    }
    if (f.zip && !org.zips.includes(f.zip)) {
      org.zips = [...org.zips, f.zip];
      const b = zipToBorough(f.zip);
      if (b && !org.boroughs.includes(b)) org.boroughs.push(b);
      changed.push('zip');
    }
    if (f.boroughs?.length) {
      const before = new Set(org.boroughs);
      for (const b of f.boroughs) if (!before.has(b)) org.boroughs.push(b);
      if (org.boroughs.length !== before.size) changed.push('boroughs');
    }
    if (f.animals?.length) {
      const before = new Set(org.animals);
      for (const a of f.animals) if (!before.has(a)) org.animals.push(a);
      if (org.animals.length !== before.size) changed.push('animals');
    }
    if (f.what) {
      org.notes = `${org.notes ? `${org.notes}\n\n` : ''}Update from a visitor on ${date}: ${f.what}`;
      changed.push('notes');
    }

    if (!changed.length) continue;
    // The record has been touched by someone whose work nothing has checked,
    // so its verification date no longer describes what is shown.
    org.last_verified = null;
    org.community = { added_on: org.community?.added_on ?? null, corrected_on: date };
    report.applied.push({ id: org.id, fields: changed });
  }
  return report;
}

/** The slug an addition will publish under, so the endpoint and the importer agree. */
export function submissionSlug(name: string): string {
  return slugify(name);
}
