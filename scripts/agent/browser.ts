/*
 * A real browser, for the pages a plain request cannot read.
 *
 * Added 2026-11-04. Until then every site that drew its contacts with
 * JavaScript, or answered a plain request with 403, went on a list for a
 * person to open by hand every 90 days: about thirty sites, read one by one
 * by the reviewer, who asked whether this would be an ongoing exercise. An
 * ordinary headless browser read most of them first time (Thrive's hospital
 * pages, Catstoria, Lost Cat and Lost Dog, Petco Love Lost, Vetco, AWI).
 *
 * What it does not do, deliberately:
 *   - It never visits a page whose robots.txt asks robots to stay away; the
 *     caller checks that first, and those stay with a person.
 *   - It does not pretend to be a person. It sends the checker's own user
 *     agent, so a site that turns robots away still can, and a bot-check page
 *     it is shown is reported as "blocked", exactly as before.
 *   - Facebook and Instagram are never fetched (see isCheckable).
 *
 * Playwright is not a dependency of the site. The weekly workflow installs it
 * for the run, as the site check does; run locally without it and this
 * quietly does nothing, so the check behaves as it always has.
 */
import { AGENT } from './config.ts';

export interface RenderedPage {
  url: string;
  finalUrl: string;
  status: number;
  ok: boolean;
  html: string;
}

type Browser = { newContext(o: object): Promise<Context>; close(): Promise<void> };
type Context = { newPage(): Promise<Page>; close(): Promise<void> };
type Page = {
  goto(u: string, o: object): Promise<{ status(): number } | null>;
  waitForTimeout(ms: number): Promise<void>;
  content(): Promise<string>;
  url(): string;
};

let browserPromise: Promise<Browser | null> | null = null;

async function getBrowser(): Promise<Browser | null> {
  if (process.env.AGENT_NO_BROWSER === '1') return null;
  browserPromise ??= (async () => {
    try {
      // A variable, so neither TypeScript nor a bundler goes looking for a
      // package the site does not depend on.
      // AGENT_PLAYWRIGHT_MODULE points at an installed copy elsewhere, for
      // trying this from a machine where Playwright is global.
      const name = process.env.AGENT_PLAYWRIGHT_MODULE ?? 'playwright';
      type PW = { chromium: { launch(o?: object): Promise<Browser> } };
      const mod = (await import(name)) as PW & { default?: PW };
      const pw = mod.chromium ? mod : mod.default!;
      const exe = process.env.AGENT_CHROMIUM_PATH;
      return await pw.chromium.launch(exe ? { executablePath: exe } : {});
    } catch {
      return null;
    }
  })();
  return browserPromise;
}

/** True once a browser could be started; for the report. */
export async function browserAvailable(): Promise<boolean> {
  return (await getBrowser()) !== null;
}

// One page at a time: the browser is for the few pages that need it, and
// politeness matters more than speed for a weekly run.
let queue: Promise<unknown> = Promise.resolve();

export function renderPage(url: string): Promise<RenderedPage | null> {
  const run = queue.then(() => render(url));
  queue = run.catch(() => undefined);
  return run;
}

async function render(url: string): Promise<RenderedPage | null> {
  const browser = await getBrowser();
  if (!browser) return null;
  const context = await browser.newContext({ userAgent: AGENT.userAgent });
  try {
    const page = await context.newPage();
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: AGENT.timeoutMs * 2 });
    // Numbers and addresses drawn by scripts arrive a moment after the page.
    await page.waitForTimeout(3000);
    const status = res?.status() ?? 0;
    const html = (await page.content()).slice(0, AGENT.maxBytes);
    return { url, finalUrl: page.url(), status, ok: status >= 200 && status < 400, html };
  } catch {
    return null;
  } finally {
    await context.close().catch(() => undefined);
  }
}

export async function closeBrowser(): Promise<void> {
  const b = browserPromise ? await browserPromise : null;
  browserPromise = null;
  if (b) await b.close().catch(() => undefined);
}
