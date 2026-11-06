/*
 * Every link inside the site goes somewhere real.
 *
 * Runs after `astro build` as part of `npm run build`, so a broken link stops
 * the build and Cloudflare keeps the last good version live. A reviewer
 * followed a guide's link on 2026-11-06 and could not find what it promised;
 * this checks every internal link on every built page, and every #anchor.
 *
 * A link counts as internal when it starts with "/" or with the site's own
 * address. It resolves when dist/ has the page, or public/_redirects sends it
 * somewhere that does. Outside websites are checked weekly instead
 * (npm run agent:links), because they need the network.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const SITE = 'https://nyc-animal-rescue.pages.dev';

function* htmlFiles(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (f.endsWith('.html')) yield p;
  }
}

const redirects = new Map();
if (existsSync('public/_redirects')) {
  for (const line of readFileSync('public/_redirects', 'utf8').split('\n')) {
    const [from, to] = line.trim().split(/\s+/);
    if (from && to && !from.startsWith('#')) redirects.set(from.replace(/\/\*$/, '').replace(/\/$/, ''), to);
  }
}

const idsCache = new Map();
function idsOf(file) {
  if (!idsCache.has(file)) idsCache.set(file, new Set([...readFileSync(file, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idsCache.get(file);
}

function fileFor(path) {
  const clean = decodeURIComponent(path).replace(/\/$/, '');
  for (const c of [join(DIST, clean, 'index.html'), join(DIST, clean), join(DIST, `${clean}.html`)]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  if (clean === '') return join(DIST, 'index.html');
  return null;
}

const problems = [];
let checked = 0;
for (const page of htmlFiles(DIST)) {
  const html = readFileSync(page, 'utf8');
  const here = '/' + page.slice(DIST.length + 1).replace(/index\.html$/, '').replace(/\.html$/, '');
  for (const m of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
    let href = m[1].replace(/&amp;|&#38;/g, '&');
    if (href.startsWith(SITE)) href = href.slice(SITE.length) || '/';
    if (!href.startsWith('/') && !href.startsWith('#')) continue;
    if (href.startsWith('//')) continue;
    checked++;
    const [pathAndQuery, hash] = href.split('#');
    const path = pathAndQuery.split('?')[0] || here;
    let target = fileFor(path);
    if (!target) {
      const via = redirects.get(path.replace(/\/$/, ''));
      if (via) target = fileFor(via.split('#')[0].split('?')[0].replace(':splat', ''));
    }
    if (!target) { problems.push(`${here}: ${m[1]} -> no such page`); continue; }
    if (hash && target.endsWith('.html') && !idsOf(target).has(hash)) problems.push(`${here}: ${m[1]} -> no "#${hash}" on that page`);
  }
}
if (problems.length) {
  console.error(`Broken links inside the site (${problems.length}):\n` + [...new Set(problems)].slice(0, 80).join('\n'));
  process.exit(1);
}
console.log(`Internal links: ${checked} checked, all resolve.`);
