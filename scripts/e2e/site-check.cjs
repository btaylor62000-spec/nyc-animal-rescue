/**
 * The live site, driven like a phone, every week.
 *
 *   node scripts/e2e/site-check.cjs https://nyc-animal-rescue.pages.dev
 *
 * Exits non-zero if any check fails, which fails the scheduled workflow and
 * emails the repository owner. Logic tests pass in the build; these exist
 * because the bugs a reviewer found lived in the page wiring:
 * a zip typed into the search box found one record, while the zip filter --
 * the only path that had been tested -- worked. Location is checked with
 * location services ON (emulated phones), blocked, far away and vague.
 *
 * Needs Playwright, which is not a project dependency: the workflow installs it
 * for this run only (rule: no dependency without a stated reason, and this one
 * runs only here).
 */
const { chromium, devices } = require('playwright');

const BASE = (process.argv[2] || 'https://nyc-animal-rescue.pages.dev').replace(/\/$/, '');
const failures = [];
const passes = [];
const check = (name, ok, detail = '') => (ok ? passes : failures).push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` -- ${detail}` : ''}`);

// A citywide service every place search must include.
const CITYWIDE = /NYC 311|Animal Care Centers of NYC \(ACC\)$|ASPCA Animal Poison Control/;
const PLACES = [
  ['10026', 'Harlem'], ['10128', 'Upper East Side'], ['11203', 'East Flatbush'],
  ['10451', 'South Bronx'], ['11375', 'Forest Hills'], ['10314', 'Staten Island'],
];
const SPOTS = [
  ['Park Slope', 40.6681, -73.9806], ['Upper West Side', 40.787, -73.9754], ['Astoria', 40.7644, -73.9235],
  ['Fordham, Bronx', 40.8615, -73.8905], ['New Dorp, SI', 40.5732, -74.1171],
];

async function results(page) {
  await page.waitForTimeout(1200);
  const summary = ((await page.textContent('#results-summary')) || '').trim();
  const shown = Number((/^(\d+)/.exec(summary) || [])[1] || 0);
  const names = await page.locator('li.card:not([hidden]) .card__title').allInnerTexts();
  const order = ((await page.textContent('#results-order')) || '').trim();
  return { summary, shown, names, order };
}

(async () => {
  const browser = await chromium.launch();

  // 1. A zip, typed where people type it and in the filter panel.
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    for (const [zip, where] of PLACES) {
      await page.goto(`${BASE}/directory/`, { waitUntil: 'networkidle' });
      await page.fill('input[name=q]', zip);
      await page.keyboard.press('Enter');
      const box = await results(page);
      check(`search box "${zip}" (${where}) shows the borough and citywide help`, box.shown >= 100 && box.names.some((n) => CITYWIDE.test(n)), box.summary);
      check(`search box "${zip}" orders from the zip`, box.order.includes(`nearest to ${zip}`), box.order);
      await page.goto(`${BASE}/directory/?zip=${zip}`, { waitUntil: 'networkidle' });
      const filt = await results(page);
      check(`zip filter ${zip} matches the search box`, filt.shown === box.shown, `${filt.shown} vs ${box.shown}`);
    }
    // A borough word, a name, and words with a zip.
    for (const [q, test, why] of [
      ['brooklyn', (r) => r.shown >= 100 && r.names.some((n) => CITYWIDE.test(n)), 'a borough name includes citywide help'],
      ['harlem cats', (r) => /^Harlem Cats/.test(r.names[0] || ''), "an organization's name finds it first"],
      ['bluepearl', (r) => /BluePearl/.test(r.names[0] || ''), 'a name finds it first'],
      ['cat rescue 10026', (r) => !/Bunnies|Muddy Paws|Turtle/.test(r.names[0] || '') && r.order.includes('nearest to 10026'), 'words plus a zip: matching help first, then nearest'],
    ]) {
      await page.goto(`${BASE}/directory/?q=${encodeURIComponent(q)}`, { waitUntil: 'networkidle' });
      const r = await results(page);
      check(`search "${q}": ${why}`, test(r), `${r.summary}; first: ${r.names.slice(0, 2).join(' / ')}`);
    }
    await ctx.close();
  }

  // 2. Location services ON, on two kinds of phone, at night and by day.
  for (const [device, when] of [['iPhone 13', '2026-11-05T04:00:00Z'], ['Pixel 7', '2026-11-04T20:00:00Z']]) {
    for (const [name, lat, lon] of SPOTS) {
      const ctx = await browser.newContext({ ...devices[device], geolocation: { latitude: lat, longitude: lon, accuracy: 25 }, permissions: ['geolocation'] });
      const page = await ctx.newPage();
      await page.clock.setFixedTime(new Date(Date.now()));
      await page.goto(`${BASE}/directory/?need=emergency-vet`, { waitUntil: 'networkidle' });
      await page.click('#near-me');
      const r = await results(page);
      const note = ((await page.textContent('#near-me-note')) || '').trim();
      const firstDistance = await page.locator('li.card:not([hidden]) .card__distance').first().innerText().catch(() => '');
      check(`[${device}] location on, ${name}: sorted nearest with a distance`, /nearest to you/.test(r.order) && /mi/.test(firstDistance) && /Sorted from your phone/.test(note), `${r.names[0]} ${firstDistance}`);
      await ctx.close();
    }
  }

  // 3. Location that cannot be used must say so and still show everything.
  for (const [label, opts, expect] of [
    ['blocked', { permissions: [] }, /switched off or blocked/],
    ['phone says Chicago', { geolocation: { latitude: 41.8781, longitude: -87.6298, accuracy: 25 }, permissions: ['geolocation'] }, /miles from New York City/],
    ['vague 8 km fix', { geolocation: { latitude: 40.7, longitude: -73.95, accuracy: 8000 }, permissions: ['geolocation'] }, /only accurate to about/],
  ]) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], ...opts });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/directory/?need=emergency-vet`, { waitUntil: 'networkidle' });
    await page.click('#near-me');
    await page.waitForTimeout(1500);
    const note = ((await page.textContent('#near-me-note')) || '').trim();
    const r = await results(page);
    check(`location ${label}: says so and hides nothing`, expect.test(note) && r.shown >= 20, `${note.slice(0, 80)} | ${r.summary}`);
    await ctx.close();
  }

  await browser.close();
  console.log([...passes, ...failures].join('\n'));
  console.log(`\n${passes.length} passed, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
