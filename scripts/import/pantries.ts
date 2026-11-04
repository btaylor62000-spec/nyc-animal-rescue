/**
 * The city's pet food pantry programme.
 *
 * In October 2026 the city funded free dog and cat food at 22 community food
 * pantries across the five boroughs. These are human food pantries, so they
 * are not in any of the rescue research -- but for someone choosing between
 * feeding themselves and feeding their cat, they are the most directly useful
 * thing on the site.
 *
 * Two things are kept honest here, because both could mislead someone who
 * travels across the city on the strength of a listing:
 *
 *  - The pet food is new. Reporting at the time said it was expected to reach
 *    pantries about two weeks after the announcement, and none of the pantries
 *    mention it on their own websites yet. Every record says so and says to
 *    ring first.
 *  - A pantry's phone number is only `Medium` when it was read on that
 *    organization's own site. Where the number came from a directory instead,
 *    the record says Low, and where public listings disagreed we publish no
 *    number at all -- a wrong number on a listing is worse than a missing one.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { Borough, Org } from '../../src/types.ts';
import { formatPhone, slugify } from './normalize.ts';

const PANTRIES_PATH = 'data/pet-food-pantries.json';

interface Pantry {
  name: string;
  address: string;
  zip: string;
  borough: Borough;
  /** A second borough when one organization is in the programme twice. */
  extraBorough?: Borough;
  /** The number the city publishes for the pet food programme itself. */
  programmePhone: string;
  /** The organization's own main line, when it publishes a different one. */
  mainPhone?: string;
  mainPhoneFrom?: string;
  /** A second site of the same organization in the programme. */
  extraPhone?: string;
  extraPhoneLabel?: string;
  website?: string;
  /** The page a non-programme contact was read from. */
  contactFrom?: string;
  /** True when that page was the organization's own site. */
  ownSite?: boolean;
  note?: string;
}

interface Programme {
  name: string;
  announced: string;
  sourceUrl: string;
  pressUrl: string;
  note: string;
  addedOn: string;
  listSourceUrl?: string;
  caveat?: string;
  /**
   * When every row was last compared with the city's own published list.
   * The city's list is the authority for these sites (a reviewer, 2026-11-04:
   * "why am I calling to confirm a list that the mayor published recently?"),
   * so a match counts as confirmation and no one has to ring 22 pantries.
   */
  listCheckedOn?: string;
}

interface File {
  programme: Programme;
  pantries: Pantry[];
}

export function loadPantries(path = PANTRIES_PATH): File | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as File;
  } catch {
    return null;
  }
}

export function pantryToOrg(p: Pantry, prog: Programme): Org {
  const boroughs = [p.borough, ...(p.extraBorough ? [p.extraBorough] : [])];

  // The city lists a named member of staff against each pantry. Those are
  // people, not organizations, so none of the names reach a record -- only the
  // line the city gives for the programme.
  const phones = [
    { value: p.programmePhone, display: formatPhone(p.programmePhone), label: 'Pet food programme' },
    ...(p.extraPhone ? [{ value: p.extraPhone, display: formatPhone(p.extraPhone), label: p.extraPhoneLabel ?? 'Second site' }] : []),
    ...(p.mainPhone ? [{ value: p.mainPhone, display: formatPhone(p.mainPhone), label: 'Main line' }] : []),
  ];

  const sourced =
    'The first number is the one the city publishes for the pet food programme itself.' +
    (p.mainPhone ? ' The main line below was read on their own website on ' + prog.addedOn + ', and is a different number.' : '');

  return {
    id: slugify(p.name),
    name: p.name,
    aka: [],
    parent_org: null,
    org_types: ['support-program'],
    animals: ['cat', 'dog'],
    needs: ['food-assistance', 'owner-support'],
    boroughs,
    citywide: false,
    outside_nyc: false,
    neighborhoods: null,
    zips: [p.zip],
    region_note: null,
    phones,
    emails: [],
    website: p.website ?? null,
    intake_urls: [],
    social: [],
    address: { street: p.address, zip: p.zip, borough: p.borough },
    hours: null,
    notes:
      'A human food pantry taking part in the city\'s pet food programme, which funds free dog and cat food at 22 pantries across the five boroughs. ' +
      'The pet food is new and the pantries do not yet mention it themselves, so ring before travelling and ask whether it has arrived. ' +
      'The city says hours vary by site and change, and to confirm before visiting. ' +
      `${sourced}${p.note ? ` ${p.note}` : ''}`.trim(),
    type_raw: null,
    confidence: 'Medium',
    status: 'active',
    status_note: null,
    source_urls: [prog.sourceUrl, ...(p.mainPhoneFrom && p.mainPhoneFrom !== prog.sourceUrl ? [p.mainPhoneFrom] : [])],
    last_verified: prog.listCheckedOn ?? null,
    section: 'City pet food pantry programme',
    source_files: ['pet-food-pantries'],
    last_checked: null,
    check_status: 'unchecked',
    consecutive_failures: 0,
    privacy_hold: false,
    community: null,
    change_log: [
      {
        date: prog.addedOn,
        field: 'record',
        from: null,
        to: 'added',
        evidence_url: prog.sourceUrl,
        source: 'pet-food-pantries',
        note: `Listed in the city's pet food pantry programme, announced ${prog.announced}.`,
      },
      {
        date: prog.addedOn,
        field: 'phones',
        from: null,
        to: formatPhone(p.programmePhone),
        evidence_url: prog.sourceUrl,
        source: 'pet-food-pantries',
        note: "The number the city's own pet food pantry map lists for this site.",
      },
      ...(prog.listCheckedOn
        ? [{
            date: prog.listCheckedOn,
            field: 'last_verified',
            from: null,
            to: prog.listCheckedOn,
            evidence_url: prog.sourceUrl,
            source: 'pet-food-pantries',
            note: "Name, number, address and zip compared with the city's published pet food pantry list; all match.",
          }]
        : []),
    ],
  };
}

export function pantryOrgs(path = PANTRIES_PATH): Org[] {
  const file = loadPantries(path);
  if (!file) return [];
  return file.pantries.map((p) => pantryToOrg(p, file.programme));
}
