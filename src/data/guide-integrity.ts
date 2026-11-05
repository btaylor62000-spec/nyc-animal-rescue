/*
 * The check that runs before a guide can be published.
 *
 * Rescues close, move, pause and reopen all the time. The weekly check keeps
 * re-reading every one of them, closed ones included; what must never happen
 * is a guide still sending someone to a group the directory itself no longer
 * lists. Cats of Meow York was the case: its listing was in doubt, and a guide
 * still recommended it for newborn kittens when a reviewer found its founder
 * had been arrested over neglected cats (2026-11-05).
 *
 * The site build calls this for every guide and stops if it finds one, so
 * Cloudflare keeps the last good version live until the guide line is fixed.
 * The message says which line and which file.
 */
import type { Org } from '../types.ts';
import { isListed } from './listing.ts';

const shortName = (o: Org) => o.name.replace(/\s*\[[^\]]*\]|\s*\([^)]*\)/g, '').replace(/,?\s+Inc\.?$/, '').trim();

/** Each organization a guide names that the directory does not list because it has closed, moved or been taken off. */
export function unlistedNamedIn(body: string, orgs: Org[]): Array<{ org: Org; line: string }> {
  const found: Array<{ org: Org; line: string }> = [];
  const listedNames = new Set(orgs.filter(isListed).map(shortName));
  for (const o of orgs) {
    if (isListed(o)) continue;
    if (o.status !== 'retired' && o.status !== 'relocated') continue;
    const name = shortName(o);
    // Short names, and names a listed organization also uses, would match
    // the wrong thing.
    if (name.length < 8 || listedNames.has(name)) continue;
    const line = body.split('\n').find((l) => l.includes(name));
    if (line) found.push({ org: o, line: line.trim() });
  }
  return found;
}

export function assertGuideNamesOnlyListed(guide: { slug: string; source: string; body: string }, orgs: Org[]): void {
  const found = unlistedNamedIn(guide.body, orgs);
  if (found.length === 0) return;
  throw new Error(
    `The guide "${guide.slug}" still names ${found.length === 1 ? 'an organization' : 'organizations'} the directory no longer lists:\n` +
      found.map((f) => `  - ${f.org.name} (${f.org.status}${f.org.status_note ? `: ${f.org.status_note}` : ''})\n    in the line: ${f.line.slice(0, 160)}`).join('\n') +
      `\nChange that line in ${guide.source}, or, if the organization is operating again, mark it active in data/agent-overlay.json. Then run npm run import.`,
  );
}
