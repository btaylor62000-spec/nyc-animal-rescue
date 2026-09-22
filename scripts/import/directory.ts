/**
 * Reads the three main directory tabs into draft records.
 *
 * Row shape in the source: row 1 is a title, row 2 a caveat, row 4 the header,
 * and below that a mix of organization rows and section headings (a row with
 * only column A filled). Section headings are carried down onto the rows
 * beneath them and become both `region_note` and a tagging signal.
 */
import { readWorkbook, type Sheet } from '../lib/xlsx-lite.ts';
import type { Animal, Borough, Confidence, Org, Status } from '../../src/types.ts';
import {
  ANIMAL_RULES, BOROUGH_PATTERNS, NEED_RULES, NEIGHBORHOOD_BOROUGH,
  ORG_TYPE_RULES, SECTION_ANIMALS, STATUS_RULES, zipToBorough,
} from './taxonomy.ts';
import { applyRules, type TagSource, type TagTrace } from './tag.ts';
import { parseDate, parseEmails, parseLabeledUrls, parsePhones, parseSocial, parseUrls, parseZips, slugify } from './normalize.ts';

/** Header labels differ slightly between the three workbooks. */
const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name'],
  type: ['type'],
  areas: ['neighborhoods served', 'areas served'],
  animals_served: ['animals served'],
  zips: ['zip codes', 'zip'],
  phone: ['phone'],
  email: ['email'],
  website: ['website'],
  intake: ['intake/help form link', 'intake / help form', 'intake/help form'],
  social: ['instagram or other channel'],
  notes: ['notes'],
  confidence: ['confidence'],
  source_url: ['source url'],
  last_verified: ['last verified'],
};

export interface DraftOrg extends Org {
  /** Why each tag was applied; kept out of the published JSON. */
  _trace: TagTrace[];
  /** Fields the importer could not tag with confidence. */
  _untagged: string[];
  /** Source workbook + tab + row, for the report. */
  _origin: string;
}

export interface SourceSpec {
  file: string;
  tab: string;
  /** Animal every row in this workbook is assumed to serve. */
  baseAnimals: Animal[];
  label: string;
}

export const MAIN_SOURCES: SourceSpec[] = [
  { file: 'research/NYC_Cat_Rescue_TNR_Reference.xlsx', tab: 'NYC Cat Rescues', baseAnimals: ['cat'], label: 'cat' },
  { file: 'research/NYC_Dog_Rescue_Reference.xlsx', tab: 'NYC Dog Rescues', baseAnimals: ['dog'], label: 'dog' },
  { file: 'research/NYC_Exotic_SmallAnimal_Wildlife_Reference.xlsx', tab: 'Exotic, Small Animal & Wildlife', baseAnimals: [], label: 'exotic' },
  // Organizations a reviewer found missing from the site, each confirmed on
  // its own website before being added. Kept in a workbook of its own rather
  // than edited into the reference workbooks, which are someone else's
  // research and are read as they were delivered.
  { file: 'research/NYC_Reviewer_Additions.xlsx', tab: 'Reviewer additions', baseAnimals: [], label: 'review' },
];

function headerIndex(headerRow: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(key)) idx[field] = i;
    }
  });
  return idx;
}

/**
 * Strip status markers the source embedded in names -- "(RETIRED - do not
 * rely)", "[RELOCATED - no longer NYC]" -- so the displayed name is clean and
 * the meaning moves into `status`.
 */
function cleanName(raw: string): string {
  return raw
    .replace(/\s*[[(](RETIRED|RELOCATED|VERIFY|MOVED|INACTIVE)[^\])]*[\])]/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function detectStatus(texts: string[]): { status: Status; note: string | null } {
  for (const rule of STATUS_RULES) {
    for (const t of texts) {
      if (t && rule.pattern.test(t)) return { status: rule.tag, note: rule.note };
    }
  }
  return { status: 'active', note: null };
}

function confidenceOf(raw: string): Confidence {
  const v = raw.trim().toLowerCase();
  if (v.startsWith('high')) return 'High';
  if (v.startsWith('med')) return 'Medium';
  return 'Low';
}

export function readDirectory(spec: SourceSpec): DraftOrg[] {
  const sheets: Sheet[] = readWorkbook(spec.file);
  const sheet = sheets.find((s) => s.name === spec.tab);
  if (!sheet) throw new Error(`${spec.file}: tab "${spec.tab}" not found`);

  const header = sheet.rows[3] ?? [];
  const idx = headerIndex(header);
  for (const required of ['name', 'type', 'confidence']) {
    if (idx[required] === undefined) throw new Error(`${spec.tab}: missing "${required}" column`);
  }

  const get = (row: string[], field: string): string =>
    idx[field] === undefined ? '' : (row[idx[field]!] ?? '').trim();

  const out: DraftOrg[] = [];
  let section = '';

  for (let r = 4; r < sheet.rows.length; r++) {
    const row = sheet.rows[r] ?? [];
    const first = (row[0] ?? '').trim();
    if (!first) continue;
    const hasOtherCells = row.slice(1).some((c) => c.trim());

    // A row with only column A filled is a section heading.
    if (!hasOtherCells) {
      section = first.replace(/\s{2,}/g, ' ').trim();
      continue;
    }

    out.push(buildDraft(spec, sheet.name, r + 1, row, get, section));
  }
  return out;
}

function buildDraft(
  spec: SourceSpec,
  tab: string,
  rowNumber: number,
  row: string[],
  get: (row: string[], field: string) => string,
  section: string,
): DraftOrg {
  const rawName = get(row, 'name');
  const name = cleanName(rawName);
  const typeRaw = get(row, 'type');
  const notesRaw = get(row, 'notes');
  const areas = get(row, 'areas');
  const animalsServed = get(row, 'animals_served');

  const src: TagSource = { name: rawName, type: typeRaw, notes: notesRaw, section, animals_served: animalsServed, areas };

  // --- contacts -----------------------------------------------------------
  const phones = parsePhones(get(row, 'phone'));
  const emails = parseEmails(get(row, 'email'));
  const websites = parseUrls(get(row, 'website'));
  const intake = parseLabeledUrls(get(row, 'intake'));
  const social = parseSocial(get(row, 'social'));
  const zipInfo = parseZips(get(row, 'zips'));
  const sourceUrls = parseUrls(get(row, 'source_url'));

  // Prose that was sitting in contact columns is preserved, attributed to the
  // column it came from so the note reads sensibly.
  const residueNotes: string[] = [
    ...phones.residue.map((t) => `Phone: ${t}`),
    ...emails.residue.map((t) => `Email: ${t}`),
    ...websites.residue.map((t) => `Website: ${t}`),
    ...intake.residue.map((t) => `Intake: ${t}`),
    ...social.residue.map((t) => `Other channel: ${t}`),
  ];

  // --- tags ---------------------------------------------------------------
  const animalTags = applyRules(ANIMAL_RULES, src);
  const needTags = applyRules(NEED_RULES, src);
  const orgTypeTags = applyRules(ORG_TYPE_RULES, src);
  const trace: TagTrace[] = [...animalTags.trace, ...needTags.trace, ...orgTypeTags.trace];

  const animals = new Set<Animal>(spec.baseAnimals);
  for (const sa of SECTION_ANIMALS) {
    if (sa.pattern.test(section)) {
      for (const t of sa.tags) {
        animals.add(t);
        trace.push({ tag: t, field: 'section', matched: section.slice(0, 60) });
      }
    }
  }
  for (const t of animalTags.tags) animals.add(t);

  // --- geography ----------------------------------------------------------
  const boroughs = new Set<Borough>();
  const geoText = [areas, section, notesRaw, name].join(' • ');
  for (const bp of BOROUGH_PATTERNS) {
    if (bp.pattern.test(geoText)) boroughs.add(bp.tag);
  }
  for (const np of NEIGHBORHOOD_BOROUGH) {
    if (np.pattern.test(geoText)) boroughs.add(np.tag);
  }
  for (const z of zipInfo.zips) {
    const b = zipToBorough(z);
    if (b) boroughs.add(b);
  }

  const scopeText = `${areas} ${section} ${typeRaw}`;
  // Snapshot before the citywide expansion below fills in all five boroughs,
  // so "is this group based outside NYC?" is judged on real evidence.
  const nycBoroughsDetected = boroughs.size;

  // "New York City" on its own, a national hotline, and an explicit
  // five-borough claim all mean the same thing to someone using the filters:
  // this resource is available to them wherever in the city they are.
  let citywide =
    zipInfo.citywide ||
    /citywide|all (5|five) boroughs|all boroughs|five boroughs|^\s*new york city\s*$|\bnew york city\b|national hotline|use from anywhere|new york state|statewide/i.test(
      scopeText,
    );
  if (citywide) for (const b of ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'] as Borough[]) boroughs.add(b);

  // Based outside the city. A regional group that explicitly serves NYC is
  // both `outside_nyc` (so we can label it honestly) and reachable citywide.
  const outsideNyc =
    nycBoroughsDetected === 0 &&
    /NYC-ADJACENT|not NYC-based|out-of-city|\bregional\b|Westchester|Long Island|New Jersey|\bNJ\b|Connecticut|\bCT\b|Suffolk|Nassau|Hudson|Orange County|Rochester|Monroe County|Salisbury Mills|East Greenbush|Northeastern US|greater NY area|upstate|Pennsylvania|\bPA\b/i.test(
      scopeText,
    );

  // A regional group that says it serves NYC is reachable from any borough.
  if (outsideNyc && /incl\.? NYC|includ(es|ing) NYC|serves? .{0,25}\bNYC\b|greater NY area|NYC adopters|pull(s)? from NYC|serve NYC/i.test(scopeText)) {
    for (const b of ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'] as Borough[]) boroughs.add(b);
    citywide = true;
  }

  // --- status -------------------------------------------------------------
  const { status, note: statusNote } = detectStatus([rawName, typeRaw, notesRaw]);

  // --- untagged report ----------------------------------------------------
  const untagged: string[] = [];
  if (animals.size === 0) untagged.push('animals');
  if (needTags.tags.length === 0) untagged.push('needs');
  if (boroughs.size === 0 && !outsideNyc) untagged.push('boroughs');
  if (orgTypeTags.tags.length === 0) untagged.push('org_types');

  const notesParts = [notesRaw, ...residueNotes].filter(Boolean);

  return {
    id: slugify(name),
    name,
    aka: rawName !== name ? [rawName] : [],
    parent_org: null,
    org_types: orgTypeTags.tags,
    animals: [...animals],
    needs: needTags.tags,
    boroughs: [...boroughs],
    citywide,
    outside_nyc: outsideNyc,
    neighborhoods: areas || null,
    zips: zipInfo.zips,
    region_note: section || null,
    phones: phones.values,
    emails: emails.values,
    website: websites.values[0] ?? null,
    intake_urls: intake.values,
    social: social.values,
    address: null,
    hours: null,
    notes: notesParts.length ? notesParts.join(' ') : null,
    type_raw: typeRaw || null,
    confidence: confidenceOf(get(row, 'confidence')),
    status,
    status_note: statusNote,
    source_urls: sourceUrls.values,
    last_verified: parseDate(get(row, 'last_verified')),
    section: section || null,
    source_files: [spec.file],
    last_checked: null,
    check_status: 'unchecked',
    consecutive_failures: 0,
    change_log: [],
    privacy_hold: false,
    _trace: trace,
    _untagged: untagged,
    _origin: `${spec.file}#${tab}:${rowNumber}`,
  };
}
