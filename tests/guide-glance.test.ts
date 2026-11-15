import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUIDES } from '../src/data/guides.ts';
import { LISTED_ORGS, ORGS_BY_ID } from '../src/data/orgs.ts';
import { hasPrice } from '../src/data/prices.ts';
import { GLANCE, headingId, type Glance, type GlanceContact } from '../src/data/guide-glance.ts';

/*
 * The at-a-glance cards are written by hand, so these tests are what stop them
 * drifting from the guides and the directory. See the header of
 * src/data/guide-glance.ts for why each rule exists.
 */

const LISTED = new Set(LISTED_ORGS.map((o) => o.id));

/** Guide text as a reader sees it: no Markdown emphasis or link syntax, straight quotes, single spaces. */
function plain(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ');
}
const tidy = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');

function contactsOf(g: Glance): GlanceContact[] {
  return [
    ...g.contacts,
    ...(g.sides ?? []).flatMap((s) => s.contacts),
    ...(g.situations ?? []).flatMap((s) => s.contacts ?? []),
  ];
}
function safetyLines(g: Glance): string[] {
  return [
    ...(g.never ?? []),
    ...(g.remember ?? []),
    ...(g.sides ?? []).flatMap((s) => s.never ?? []),
    ...(g.situations ?? []).flatMap((s) => [...(s.never ?? []), ...(s.remember ?? [])]),
  ];
}
/** Everything written for the card, apart from the copied safety lines. */
function prose(g: Glance): string[] {
  const steps = (xs: Glance['steps'] = []) => xs.flatMap((s) => [s.title, s.text, s.warn ?? '', s.link?.label ?? '']);
  return [
    g.headline, g.tip ?? '', g.action?.label ?? '', ...(g.facts ?? []),
    ...(g.check ? [g.check.title, g.check.yesTitle, g.check.noTitle, ...g.check.yes, ...g.check.no] : []),
    ...steps(g.steps),
    ...(g.sides ?? []).flatMap((s) => [s.label, s.headline, s.tip ?? '', ...steps(s.steps)]),
    ...(g.situations ?? []).flatMap((s) => [s.label, s.verdict, ...s.do]),
    ...contactsOf(g).flatMap((c) => [c.name ?? '', c.when, c.note ?? '']),
  ].filter(Boolean);
}
function links(g: Glance): string[] {
  const steps = (xs: Glance['steps'] = []) => xs.flatMap((s) => (s.link ? [s.link.href] : []));
  return [
    ...(g.action ? [g.action.href] : []),
    ...steps(g.steps),
    ...(g.sides ?? []).flatMap((s) => steps(s.steps)),
    ...(g.situations ?? []).flatMap((s) => (s.href ? [s.href] : [])),
  ];
}

test('every guide has an at-a-glance card, and every card has a guide', () => {
  const slugs = GUIDES.map((g) => g.slug);
  assert.deepEqual(slugs.filter((s) => !GLANCE[s]), [], 'a guide has no card: add one to GLANCE');
  assert.deepEqual(Object.keys(GLANCE).filter((s) => !slugs.includes(s)), [], 'a card names a guide that does not exist');
});

test('every card says who to contact, and each contact is a listed record with a way to reach it', () => {
  for (const [slug, g] of Object.entries(GLANCE)) {
    assert.ok(g.contacts.length > 0, `${slug}: no contacts`);
    for (const c of contactsOf(g)) {
      if (c.dial) {
        assert.equal(c.org, undefined, `${slug}: a contact is both a record and a number`);
        continue;
      }
      assert.ok(c.org, `${slug}: a contact names no record`);
      const o = ORGS_BY_ID.get(c.org!);
      assert.ok(o, `${slug}: no record "${c.org}"`);
      assert.ok(LISTED.has(o!.id), `${slug}: "${c.org}" is not listed in the directory`);
      assert.ok(o!.phones.length || o!.emails.length || o!.website, `${slug}: "${c.org}" has no phone, email or website`);
      if (c.phone !== undefined) assert.ok(o!.phones[c.phone], `${slug}: "${c.org}" has no phone number ${c.phone}`);
    }
  }
});

test('safety lines on a card are copied word for word from the guide', () => {
  for (const guide of GUIDES) {
    const body = plain(guide.body);
    for (const line of safetyLines(GLANCE[guide.slug]!)) {
      assert.ok(body.includes(tidy(line)), `${guide.slug}: "${line}" is not in the guide word for word`);
    }
  }
});

test('the prose on a card carries no phone number and no price', () => {
  const phone = /(?<!\d)(?:1[-. ])?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}(?!\d)/;
  for (const [slug, g] of Object.entries(GLANCE)) {
    for (const s of [...prose(g), ...safetyLines(g)]) {
      assert.ok(!phone.test(s), `${slug}: a phone number in "${s}". Name the record in contacts instead`);
      assert.ok(!hasPrice(s), `${slug}: a price in "${s}"`);
    }
  }
});

test('every web and email address on a card is already in its guide', () => {
  for (const guide of GUIDES) {
    const g = GLANCE[guide.slug]!;
    const body = guide.body.toLowerCase();
    for (const s of prose(g)) {
      for (const email of s.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? []) {
        assert.ok(body.includes(email.toLowerCase()), `${guide.slug}: ${email} is not in the guide`);
      }
    }
    for (const href of links(g)) {
      if (href.startsWith('/guides/')) {
        assert.ok(GUIDES.some((x) => `/guides/${x.slug}` === href), `${guide.slug}: ${href} is not a guide`);
      } else if (href.startsWith('/')) {
        assert.match(href, /^\/directory(\?|$)/, `${guide.slug}: ${href} is not a page this card may link to`);
      } else {
        const bare = href.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
        assert.ok(body.includes(bare), `${guide.slug}: ${href} is not in the guide`);
      }
    }
  }
});

test('"Read why" on a situation lands on a heading that exists in the guide', () => {
  for (const guide of GUIDES) {
    const ids = [...guide.body.matchAll(/^## (.+)$/gm)].map((m) => headingId(m[1]!));
    for (const s of GLANCE[guide.slug]!.situations ?? []) {
      if (s.section) assert.ok(ids.includes(headingId(s.section)), `${guide.slug}: no heading "${s.section}"`);
      assert.ok(s.do.length > 0, `${guide.slug}: "${s.label}" says nothing`);
    }
  }
});

test('a card stays short enough to read at a glance', () => {
  for (const [slug, g] of Object.entries(GLANCE)) {
    for (const steps of [g.steps ?? [], ...(g.sides ?? []).map((s) => s.steps)]) {
      assert.ok(steps.length <= 4, `${slug}: more than four steps`);
    }
    assert.ok(g.headline.split(/\s+/).length <= 30, `${slug}: the headline is longer than 30 words`);
    for (const s of prose(g)) assert.ok(s.split(/\s+/).length <= 45, `${slug}: "${s.slice(0, 40)}..." is too long for a card`);
  }
});

/*
 * Facts the owner settled on 2026-11-15, said the same way on the cards, in
 * the full guides and on the listings. Each was a contradiction somewhere on
 * the site before that day; this keeps a later edit from bringing one back.
 */
test('settled facts agree across cards, guides and listings', () => {
  const body = (slug: string) => GUIDES.find((g) => g.slug === slug)!.body;
  const card = (slug: string) => JSON.stringify(GLANCE[slug]);

  // The Animal Medical Center's ER takes critically ill birds (owner's call to AMC).
  assert.match(body('found-an-injured-bird'), /emergency room takes critically ill birds/);
  assert.match(card('found-an-injured-bird'), /critically ill birds/);
  assert.match(ORGS_BY_ID.get('animal-medical-center')!.notes ?? '', /critically ill birds/);
  assert.doesNotMatch(card('found-an-injured-bird'), /(water birds|waterfowl|raptors) only|only (hawks|raptors|birds of prey)/i, 'the bird card must not say AMC takes only some birds');

  // The Urban Park Rangers are Parks staff: named for parks, never as handling wildlife citywide.
  for (const slug of ['found-wildlife', 'found-an-injured-bird']) {
    assert.doesNotMatch(body(slug), /Urban Park Rangers, who handle these in the city|Call 311 for the Urban Park Rangers/);
  }

  // 311's evacuation conditions are in the disaster guide as well as on its card.
  assert.match(body('pets-in-a-disaster'), /muzzled and controlled on a sturdy leash/);
  assert.match(body('pets-in-a-disaster'), /Only legal pets are allowed in evacuation centers/);
  assert.match(card('pets-in-a-disaster'), /muzzled/);

  // Urgent Vets in the Bronx: every day 10am to 10pm, in its hours, its notes and the guide.
  const uv = ORGS_BY_ID.get('urgent-vets-bronx')!;
  assert.match(uv.hours ?? '', /10am-10pm/);
  assert.match(uv.notes ?? '', /10am to 10pm/);
  assert.match(body('animal-emergency'), /10am-10pm/);

  // The Wild Bird Fund: every day, 9am to 7pm, on the listing too.
  assert.match(ORGS_BY_ID.get('the-wild-bird-fund')!.hours ?? '', /9am-7pm/);
});

/*
 * Every organization a card names links to its listing (owner, 2026-11-15,
 * asked three times). The links are made when the card is drawn
 * (src/data/card-links.ts), so these check the machinery, and the case that
 * prompted it.
 */
test('organizations named on a card link to their listings', async () => {
  const { brokenAliases, namedIn, CARD_URLS, linkNames } = await import('../src/data/card-links.ts');
  assert.deepEqual(brokenAliases(), [], 'a card alias names no record');
  const abuse = GLANCE['report-animal-abuse']!.steps!.map((s) => s.text).join(' ');
  for (const id of ['nyc-mayors-office-of-animal-welfare', 'your-city-council-member']) {
    assert.ok(namedIn(abuse).includes(id), `the abuse card does not link ${id}`);
  }
  for (const guide of GUIDES) {
    const card = JSON.stringify(GLANCE[guide.slug]);
    for (const [name, url] of Object.entries(CARD_URLS)) {
      if (!card.includes(name)) continue;
      if (url.startsWith('/guides/')) {
        assert.ok(GUIDES.some((x) => `/guides/${x.slug}` === url), `${url} is not a guide`);
        continue;
      }
      if (url.startsWith('/directory')) continue;
      assert.ok(guide.body.includes(url.replace(/^https?:\/\/(www\.)?/, '')), `${guide.slug}: ${url} is not in the guide`);
    }
  }
  // Escaped, so a card's text cannot become markup.
  assert.equal(linkNames('a <b> & c'), 'a &lt;b&gt; &amp; c');
});

/*
 * A safety line says it once (owner, 2026-11-15: the emergency card said
 * "Do not make the animal vomit" at the bottom and again in the poison tile).
 * A line for the whole card goes at the bottom; one for one situation goes in
 * that tile, not both.
 */
test('no safety line appears twice on a card', () => {
  for (const [slug, g] of Object.entries(GLANCE)) {
    const lines = safetyLines(g).map(tidy);
    const twice = lines.filter((l, i) => lines.indexOf(l) !== i);
    assert.deepEqual(twice, [], `${slug}: said more than once`);
  }
});
