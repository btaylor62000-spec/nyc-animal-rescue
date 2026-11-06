import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDES, GUIDE_GROUPS } from '../src/data/guides.ts';
import { LISTED_ORGS, ORGS } from '../src/data/orgs.ts';
import { renderMarkdown, addressesIn } from '../src/data/markdown.ts';
import { annotateMentions, buildMatchers, nameVariants } from '../src/data/guide-mentions.ts';
import type { Org } from '../src/types.ts';

/*
 * What a reviewer found wrong with the guides on 2026-11-05, each kept from
 * coming back.
 */

test('every guide is in a group, so every guide is on the home page', () => {
  const grouped = GUIDE_GROUPS.flatMap((g) => g.slugs);
  assert.deepEqual(GUIDES.map((g) => g.slug).filter((s) => !grouped.includes(s)), []);
  assert.deepEqual(grouped.filter((s) => !GUIDES.some((g) => g.slug === s)), [], 'a group names a guide that does not exist');
  assert.equal(new Set(grouped).size, grouped.length, 'a guide is in two groups');
});

const fake = (o: Partial<Org> & { id: string; name: string }): Org =>
  ({ aka: [], phones: [], emails: [], website: null, status: 'active', ...o }) as unknown as Org;

test('mentions: the first mention in a section links to the listing, and the section lists its contacts', () => {
  const wbf = fake({ id: 'wbf', name: 'The Wild Bird Fund', phones: [{ value: '6463062862', display: '(646) 306-2862' }] as Org['phones'], website: 'https://www.wildbirdfund.org' });
  const html = '<h2>Where</h2><p>Take it to the Wild Bird Fund. The Wild Bird Fund is open daily.</p><h2>Next</h2><p>Nothing here.</p>';
  const { html: out, named } = annotateMentions(html, [wbf]);
  assert.equal((out.match(/<a href="\/org\/wbf">Wild Bird Fund<\/a>/g) ?? []).length, 1, 'linked once, at the first mention');
  assert.match(out, /Contacts for this section<\/p><ul><li><a href="\/org\/wbf">The Wild Bird Fund<\/a> · <a href="tel:[^"]+"[^>]*>\(646\) 306-2862<\/a>/);
  assert.equal(out.split('<h2>Next</h2>')[1]!.includes('guide-contacts'), false, 'a section that names nobody has no box');
  assert.deepEqual(named.map((o) => o.id), ['wbf']);
});

test('mentions: never inside a link or a heading, and "&" written as "&amp;" still matches', () => {
  const hb = fake({ id: 'hb', name: 'Hearts & Bones Rescue' });
  const { html } = annotateMentions('<h2>Hearts &amp; Bones Rescue</h2><p><a href="https://x.org">Hearts &amp; Bones Rescue</a> and Hearts &amp; Bones Rescue.</p>', [hb]);
  assert.equal((html.match(/href="\/org\/hb">/g) ?? []).length, 2, 'one link in the prose, one in the box');
  assert.match(html, /<h2>Hearts &amp; Bones Rescue<\/h2>/);
});

test('mentions: a borough, or a name two branches share, is never linked to one of them', () => {
  const bronx = fake({ id: 'uv-bronx', name: 'Urgent Vets (Bronx)', aka: ['Urgent Vets', 'Urgent Vets - Bronx'] });
  const queens = fake({ id: 'uv-queens', name: 'Urgent Vets (Queens)', aka: ['Urgent Vets'] });
  assert.equal(nameVariants(bronx).includes('Bronx'), false);
  const { html } = annotateMentions('<h2>x</h2><p>In the Bronx, Urgent Vets is open late.</p>', [bronx, queens]);
  assert.equal(html.includes('/org/'), false);
});

test('mentions: the parent organizations with many listings, and boroughs, are never a name', () => {
  const all = new Set(LISTED_ORGS.flatMap(nameVariants));
  for (const word of ['ASPCA', 'Humane World for Animals', 'Queens', 'Bronx', 'South Bronx', 'NYS DEC', 'ACC']) assert.equal(all.has(word), false, word);
});

test('every guide line that leads with an organization it does not list gives a way to reach it', () => {
  const matchers = buildMatchers(LISTED_ORGS);
  const problems: string[] = [];
  for (const g of GUIDES) {
    for (const line of g.body.split('\n')) {
      if (!/^\s*- /.test(line)) continue;
      const body = line.replace(/^\s*- /, '').replace(/\*\*/g, '');
      const lead = body.split(/ - | – |: | \(|, /)[0]!.trim();
      // A name: two or more capitalised words, and not a heading-like phrase in capitals.
      if (!/^[A-Z0-9][\w'’&.]*(\s+([A-Z0-9&][\w'’&.-]*|of|for|and|the|de|in|on|a)){1,8}$/.test(lead) || lead === lead.toUpperCase()) continue;
      if (/^(During|An|A|The|If|When|For|Call|Email|Text|Ask)\b/.test(lead) && !/\b(Foundation|Fund|Rescue|Society)\b/.test(lead)) continue;
      if (matchers.some((m) => m.re.test(lead.replace(/&/g, '&amp;'))) || /\]\(\/org\//.test(line)) continue;
      const reachable = addressesIn(body).length > 0 || /@/.test(body) || /\d{3}\)?[-. ]\d{3}[-. ]\d{4}/.test(body) || /\]\(/.test(body);
      if (!reachable) problems.push(`${g.slug}: ${lead}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the bird and wildlife guides: no personal contacts, no out-of-date route, no contradiction on food', () => {
  const bird = GUIDES.find((g) => g.slug === 'found-an-injured-bird')!.body;
  const wild = GUIDES.find((g) => g.slug === 'found-wildlife')!.body;
  for (const [what, re] of [
    ["Divya's personal mobile (reviewer, 2026-11-05)", /Divya|344-4424/],
    ['a volunteer’s personal email, not published by NYTTS', /lorric750|Lorri Cramer/],
    ["NYC Bird Alliance's old injured-bird address, no longer on its page (2026-11-05)", /injuredbird@/],
    ['"unless a rehabber tells you to": injured wildlife is never given food or water', /unless a rehabber tells you/i],
  ] as const) {
    assert.doesNotMatch(bird, re, `bird guide: ${what}`);
    assert.doesNotMatch(wild, re, `wildlife guide: ${what}`);
  }
  // The safety guidance survives the reordering, word for word.
  assert.match(bird, /Window strike victims should NOT be given additional heat/);
  assert.match(bird, /Giving any injured or sick bird \(or any wildlife\) food or water is never ok/);
  assert.match(bird, /If the bird can stand and hop, leave it alone/);
  // In the order someone holding a bird needs it: the steps first.
  const headings = [...bird.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.equal(headings[0], 'What to do now, step by step');
  // The euthanasia section was removed at the reviewer's request (2026-11-05).
  assert.doesNotMatch(bird, /could not be saved|Why is some wildlife euthanized|heartbreaking to go through/i);
  assert.doesNotMatch(bird, /^## Found a squirrel/m, 'squirrels belong in the wildlife guide');
  assert.match(wild, /^## Found a baby squirrel/m);
  assert.match(wild, /^## What to do now, step by step/m);
});

test('every Animal Help Now topic is linked to its answer from some guide', () => {
  const page = GUIDES.map((g) => g.body).join('\n');
  const anchors = new Set([...page.matchAll(/ahnow\.org\/resources\.php#(\w+)/g)].map((m) => m[1]));
  // Each question in the table of contents of https://ahnow.org/resources.php,
  // read 2026-11-05. "maintocgeneral" stands for its questions about itself.
  const AHNOW_TOPICS = (
    'babybird babygroundbird babyowl babymammal babysquirrel turtle reptile findbat orphan reunite catdogattack birdhitwindow ' +
    'gluetrap deerneedshelp animalmange rehab habituate transportwild transporthelp nonUSA wildlifeconflict wildlifeconflict1 ' +
    'wildlifeconflict2 wildlifeconflict3 wildlifeconflict4 wildlifeconflict5 nonUSAconflict preventbirdhitwindow feedingwildlife ' +
    'reportBandedBird planahead newhome vetexpenses 1 2 transport overnight canttransport poison abuse abuseinternet road wander ' +
    'catpole catio outsidecolo evac evaclostfound evacprep evacwild rescuekit emergencykit vetguide otherorgs careers promote maintocgeneral'
  ).split(' ');
  assert.deepEqual(AHNOW_TOPICS.filter((a) => !anchors.has(a)), []);
});

test('the contacts boxes render on the built page for a guide that names listings', () => {
  const g = GUIDES.find((x) => x.slug === 'found-an-injured-bird')!;
  const { html, named } = annotateMentions(renderMarkdown(g.body), LISTED_ORGS);
  assert.ok(named.some((o) => o.id === 'the-wild-bird-fund'));
  assert.ok((html.match(/guide-contacts/g) ?? []).length >= 3);
  // No box ever shows a number the listing does not have: it is built from it.
  const wbf = LISTED_ORGS.find((o) => o.id === 'the-wild-bird-fund')!;
  assert.ok(html.includes(wbf.phones[0]!.display));
  assert.ok(readFileSync('src/pages/guides/[slug].astro', 'utf8').includes('annotateMentions'));
});

test('the at-risk guide: ACC\'s foster/adopt form, before the list of groups, and New Hope in the title', () => {
  const g = GUIDES.find((x) => x.slug === 'save-an-at-risk-animal')!;
  assert.match(g.title, /New Hope Program/);
  const form = g.body.indexOf('https://forms.gle/ozHex3uqvNkQt2dq9');
  const who = g.body.indexOf('## WHO TO CONTACT');
  assert.ok(form > 0 && who > form, 'the form comes before the groups to contact');
  assert.match(g.body.slice(who), /Why only these groups/);
});

test('every alias used to link a guide name points at a listing that exists', async () => {
  const { MENTION_ALIASES, GUIDE_ALIASES } = await import('../src/data/guide-mentions.ts');
  const ids = new Set(LISTED_ORGS.map((o) => o.id));
  const used = [...Object.values(MENTION_ALIASES), ...Object.values(GUIDE_ALIASES).flatMap((m) => Object.values(m))];
  assert.deepEqual(used.filter((id) => !ids.has(id)), []);
});

test('mentions: a name inside a longer name does not hide its own later mention', () => {
  const wood = fake({ id: 'wood', name: 'Woodstock Farm Sanctuary' });
  const farm = fake({ id: 'farm', name: 'Farm Sanctuary' });
  const { html } = annotateMentions('<h2>x</h2><p>Woodstock Farm Sanctuary, or further away Farm Sanctuary.</p>', [wood, farm]);
  assert.match(html, /<a href="\/org\/wood">Woodstock Farm Sanctuary<\/a>, or further away <a href="\/org\/farm">Farm Sanctuary<\/a>/);
});

test('no guide recommends an organization that is closed, moved away or not listed (the build stops on this too)', async () => {
  const { unlistedNamedIn, assertGuideNamesOnlyListed } = await import('../src/data/guide-integrity.ts');
  assert.deepEqual(GUIDES.flatMap((g) => unlistedNamedIn(g.body, ORGS).map((f) => `${g.slug}: ${f.org.name}`)), []);
  // And it does stop: a guide naming a closed group throws, with the line.
  const closed = { ...ORGS[0]!, id: 'x-closed', name: 'Example Closed Rescue', status: 'retired' as const };
  assert.throws(() => assertGuideNamesOnlyListed({ slug: 's', source: 'research/x.xlsx', body: '- Example Closed Rescue - call us' }, [...ORGS, closed]), /Example Closed Rescue.*\n.*in the line/s);
});

test('an organization removed from the site appears nowhere a reader or the assistant can see', async () => {
  const { REMOVED } = await import('../scripts/import/overrides.ts');
  const { readdirSync } = await import('node:fs');
  const places = [
    ...readdirSync('content/guides').map((f) => `content/guides/${f}`),
    'data/chat-corpus.json',
    ...readdirSync('data/orgs').map((f) => `data/orgs/${f}`),
  ];
  for (const r of REMOVED) {
    const word = r.id.split('-')[0]!;
    const hits = places.filter((p) => readFileSync(p, 'utf8').toLowerCase().includes(word));
    assert.deepEqual(hits, [], `${r.id} still appears`);
  }
});
