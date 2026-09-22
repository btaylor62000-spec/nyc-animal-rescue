/**
 * Test helpers for the update agent: building a record, and turning a saved
 * HTML fixture into the evidence shape the rules engine expects.
 */
import type { Org } from '../../src/types.ts';
import { detectClosure, extractContacts, htmlToText } from '../../scripts/agent/extract.ts';
import type { Evidence, PageEvidence } from '../../scripts/agent/rules.ts';

export function org(over: Partial<Org> = {}): Org {
  return {
    id: 'bushwick-street-cats',
    name: 'Bushwick Street Cats',
    aka: [],
    parent_org: null,
    org_types: ['tnr-group'],
    animals: ['cat'],
    needs: ['tnr'],
    boroughs: ['brooklyn'],
    citywide: false,
    outside_nyc: false,
    neighborhoods: 'Bushwick',
    zips: ['11237'],
    region_note: null,
    phones: [],
    emails: [{ value: 'bushwickstreetcats@gmail.com' }],
    website: 'https://bushwickstreetcats.org',
    intake_urls: [],
    social: [],
    address: null,
    hours: null,
    notes: null,
    type_raw: 'TNR / rescue+adoption',
    confidence: 'High',
    status: 'active',
    status_note: null,
    source_urls: [],
    last_verified: '2026-08-26',
    section: null,
    source_files: ['test'],
    last_checked: null,
    check_status: 'unchecked',
    consecutive_failures: 0,
    change_log: [],
    privacy_hold: false,
    community: null,
    ...over,
  };
}

export function detectContacts(html: string): { phones: string[]; emails: string[] } {
  const { phones, emails } = extractContacts(htmlToText(html));
  return { phones, emails };
}

/** One successfully fetched page on the organization's own domain. */
export function evidenceFromHtml(record: Org, html: string, date: string): Evidence {
  const text = htmlToText(html);
  const { phones, emails } = extractContacts(text);
  const url = record.website ?? 'https://example.org';
  const page: PageEvidence = {
    url,
    finalUrl: url,
    status: 200,
    ok: true,
    offDomain: false,
    ownDomain: true,
    text,
    phones,
    emails,
    closure: detectClosure(text),
  };
  return { orgId: record.id, date, pages: [page] };
}
