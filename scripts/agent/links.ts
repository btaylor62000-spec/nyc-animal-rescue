/**
 * Check every link a reader can tap: each listing's website and forms, and
 * every address in every guide.
 *
 *   npm run agent:links            (writes build/reports/link-check.json and .md)
 *   npm run agent:links -- --limit=40
 *
 * Reports only. It changes no record and no guide: a person decides what a
 * dead link means and finds the right replacement (CLAUDE.md, "The check never
 * looks for a replacement site"). /status shows the result.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import type { Org } from '../../src/types.ts';
import { addressesIn } from '../../src/data/markdown.ts';
import { fixUrl } from '../../src/data/url-fixes.ts';
import { fetchPage } from './fetch.ts';
import { htmlToText } from './extract.ts';
import { linkVerdict, VERDICT_WORDS, type LinkVerdict } from './link-rules.ts';

interface Place { kind: 'listing' | 'guide'; id: string; name: string; field: string }
export interface LinkResult { url: string; verdict: LinkVerdict; status: number; finalUrl: string; error?: string; places: Place[] }

const today = new Date().toISOString().slice(0, 10);
const limit = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? 0);

const links = new Map<string, Place[]>();
const add = (url: string | null | undefined, place: Place) => {
  if (!url || !/^https?:\/\//i.test(url)) return;
  const u = fixUrl(url.trim());
  (links.get(u) ?? links.set(u, []).get(u)!).push(place);
};

for (const f of readdirSync('data/orgs').filter((x) => x.endsWith('.json'))) {
  const o = JSON.parse(readFileSync(`data/orgs/${f}`, 'utf8')) as Org;
  const p = (field: string): Place => ({ kind: 'listing', id: o.id, name: o.name, field });
  add(o.website, p('website'));
  for (const i of o.intake_urls) add(i.url, p(i.label || 'form'));
}
for (const f of readdirSync('content/guides').filter((x) => x.endsWith('.md'))) {
  const text = readFileSync(`content/guides/${f}`, 'utf8').replace(/^---[\s\S]*?---/, '');
  const slug = f.replace(/\.md$/, '');
  const title = /^# (.+)$/m.exec(text)?.[1] ?? slug;
  for (const u of addressesIn(text)) add(u, { kind: 'guide', id: slug, name: title, field: 'guide text' });
}

let queue = [...links.keys()];
if (limit) queue = queue.slice(0, limit);
const results: LinkResult[] = [];
let done = 0;
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const url = queue.shift()!;
      const page = await fetchPage(url);
      const verdict = linkVerdict({ url, finalUrl: page.finalUrl, status: page.status, ok: page.ok, offDomain: page.offDomain, text: htmlToText(page.html), error: page.error });
      results.push({ url, verdict, status: page.status, finalUrl: page.finalUrl, error: page.error, places: links.get(url)! });
      if (++done % 50 === 0) console.log(`${done} checked`);
    }
  }),
);

results.sort((a, b) => a.verdict.localeCompare(b.verdict) || a.url.localeCompare(b.url));
const counts = Object.fromEntries((Object.keys(VERDICT_WORDS) as LinkVerdict[]).map((v) => [v, results.filter((r) => r.verdict === v).length]));
mkdirSync('build/reports', { recursive: true });
writeFileSync('build/reports/link-check.json', `${JSON.stringify({ date: today, checked: results.length, counts, problems: results.filter((r) => r.verdict !== 'ok') }, null, 2)}\n`);

const lines = [`# Link check, ${today}`, '', `${results.length} links checked: ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}.`, ''];
for (const v of ['taken', 'gone', 'parked', 'elsewhere', 'down', 'blocked'] as LinkVerdict[]) {
  const rs = results.filter((r) => r.verdict === v);
  if (!rs.length) continue;
  lines.push(`## ${VERDICT_WORDS[v]} (${rs.length})`, '');
  for (const r of rs) lines.push(`- ${r.url}${r.finalUrl !== r.url ? ` -> ${r.finalUrl}` : ''} (${r.status || r.error || 'no answer'}) -- ${r.places.map((p) => `${p.kind} ${p.id} (${p.field})`).join('; ')}`);
  lines.push('');
}
writeFileSync('build/reports/link-check.md', lines.join('\n'));
console.log(lines.slice(0, 3).join('\n'));
