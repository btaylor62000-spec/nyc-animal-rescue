import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { ORGS } from '../src/data/orgs.ts';
import { mergeKey } from '../scripts/import/normalize.ts';

/*
 * A guide and a listing must not give different contacts for the same
 * organization. On 2026-11-04 a reviewer found guides carrying numbers that
 * were not on the organization's own site while its listing had the right
 * ones. Guide lines come from hand-edited workbooks and listings are kept
 * current, so this checks every guide line that names an organization with a
 * listing: each phone and email in that line must be on the listing.
 *
 * Exceptions, each with its reason. A line naming two organizations is checked
 * against the first; the contacts that belong to the second are listed here.
 */
const ALLOWED: Record<string, string> = {
  '2122478511': 'Animal Haven: the guide quotes the city page’s wrong number on purpose, to say it is wrong',
  '2128767700': 'the ASPCA’s main line, in a line about legal help that names the ASPCA generally',
  '2122034760': 'PAWS NY’s number, in a line that also names Feeding Pets of the Homeless',
  'catstoriarescue@gmail.com': 'Catstoria’s address, in a line that names two groups',
  '7188330700': 'a line naming several Brooklyn groups',
  '7184365163': 'Sean Casey Animal Rescue’s number, in a line naming several Brooklyn groups',
  'tnrtrapbank@aspca.org': 'the ASPCA trap bank, in a TNR line that names Neighborhood Cats first',
  'referrals@aspca.org': 'ASPCA Community Engagement: in the abuse guide, not confirmed on the ASPCA’s page (2026-11-04), so not added to the listing',
};

// Branches share a name ("Urgent Vets" in Queens and the Bronx): a line is
// fine when any listing of that name carries the contact.
const byKey = new Map<string, Array<(typeof ORGS)[number]>>();
for (const o of ORGS) {
  for (const k of [o.name, ...(o.aka ?? [])].map(mergeKey)) (byKey.get(k) ?? byKey.set(k, []).get(k)!).push(o);
}

test('guide contacts: a guide line never gives contacts its listing does not have', () => {
  const problems: string[] = [];
  for (const f of readdirSync('content/guides').filter((x) => x.endsWith('.md'))) {
    for (const line of readFileSync(`content/guides/${f}`, 'utf8').split('\n')) {
      if (!line.startsWith('- ')) continue;
      const name = line.slice(2).split(/ - |, \(| \(|:/)[0]!.trim();
      const orgs = byKey.get(mergeKey(name));
      if (!orgs) continue;
      const phones = [...line.matchAll(/\(?\b(\d{3})\)?[-. ]?(\d{3})[-. ](\d{4})\b/g)].map((m) => m[1]! + m[2]! + m[3]!);
      const emails = [...line.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)].map((m) => m[0].toLowerCase().replace(/\.$/, ''));
      const known = new Set(orgs.flatMap((o) => [...o.phones.map((p) => p.value), ...o.emails.map((e) => e.value.toLowerCase())]));
      for (const c of [...phones, ...emails]) if (!known.has(c) && !ALLOWED[c]) problems.push(`${f}: "${name}" gives ${c}; its listing (${orgs.map((o) => o.id).join(', ')}) does not`);
    }
  }
  assert.deepEqual(problems, []);
});
