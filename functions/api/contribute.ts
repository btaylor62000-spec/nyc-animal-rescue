/**
 * Visitors adding a resource or correcting one.
 *
 * Runs as a Cloudflare Pages Function on the free plan, with no database:
 * an accepted submission is committed to the repository as a JSON file
 * through the GitHub API, the community workflow rebuilds the data, and
 * Cloudflare deploys it. A few minutes from submit to live, and every
 * submission is a visible commit that can be reverted.
 *
 * The quick check is the whole gate, so it is worth being clear about what it
 * proves: that the phone or email the visitor gave appears on the website the
 * visitor gave. It does not prove the website belongs to the organization, or
 * that the organization is real. Additions therefore publish into a labelled,
 * low-confidence tier that the assistant never cites. Corrections overwrite
 * the record -- a decision taken on 2026-09-22 with that limit understood.
 */
import { LIMITS, validate, type ContributeRequest, type ContributeResponse, type Submission } from '../../src/contribute/protocol.ts';
import { containsEmail, containsPhone, htmlToText } from '../../scripts/agent/extract.ts';
import { isPlaceholderPhone } from '../../scripts/agent/rules.ts';
import holds from '../../data/privacy-holds.json';
import { mergeKey, slugify } from '../../scripts/import/normalize.ts';

interface Env {
  TURNSTILE_SECRET_KEY?: string;
  /** Fine-grained token with Contents: read and write on the repository. */
  GITHUB_CONTRIB_TOKEN?: string;
  /** owner/repo. Defaults to the public site's repository. */
  GITHUB_REPO?: string;
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

const DEFAULT_REPO = 'btaylor62000-spec/nyc-animal-rescue';
const FETCH_TIMEOUT_MS = 12_000;
const MAX_BYTES = 1_500_000;

function reply(status: number, body: ContributeResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function turnstileOk(secret: string, token: string, ip: string): Promise<boolean> {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/** Same cache-based limiter as the assistant: free, stateless, good enough to blunt a script. */
async function overRateLimit(ip: string, now: number): Promise<boolean> {
  const cache = (caches as unknown as { default: Cache }).default;
  const bucket = Math.floor(now / 3_600_000);
  const url = `https://ratelimit.invalid/contribute/${ip}/${bucket}`;
  const hit = await cache.match(url);
  const count = hit ? Number(await hit.text()) || 0 : 0;
  if (count >= LIMITS.perHour) return true;
  await cache.put(url, new Response(String(count + 1), { headers: { 'cache-control': 'max-age=7200' } }));
  return false;
}

/** Numbers withheld pending the person's consent. A visitor cannot publish them either. */
const HELD_DIGITS = new Set<string>(
  (holds as { held?: Array<{ value: string | string[] }> }).held?.flatMap((h) => (Array.isArray(h.value) ? h.value : [h.value])).map((v) => v.replace(/\D/g, '')) ?? [],
);

async function readSite(url: string): Promise<{ text: string; finalUrl: string } | { error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; NYCAnimalRescueBot/1.0; +https://nyc-animal-rescue.pages.dev/about)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return { error: `Their website answered with an error (${res.status}).` };
    const reader = res.body?.getReader();
    if (!reader) return { error: 'Their website sent nothing back.' };
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.byteLength;
    }
    await reader.cancel().catch(() => undefined);
    const html = new TextDecoder().decode(concat(chunks));
    return { text: htmlToText(html), finalUrl: res.url || url };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return { error: aborted ? 'Their website took too long to answer.' : 'Their website could not be reached.' };
  } finally {
    clearTimeout(timer);
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

interface Listed {
  id: string;
  name: string;
  website: string | null;
}

/** The current directory, as the site publishes it. Same origin, so no token and no drift. */
async function listedRecords(env: Env, request: Request): Promise<Listed[]> {
  try {
    const res = await env.ASSETS.fetch(new Request(new URL('/contribute/records.json', request.url).toString()));
    if (!res.ok) return [];
    return (await res.json()) as Listed[];
  } catch {
    return [];
  }
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

async function commitSubmission(env: Env, submission: Submission): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = env.GITHUB_CONTRIB_TOKEN;
  if (!token) return { ok: false, error: 'not-configured' };
  const repo = env.GITHUB_REPO ?? DEFAULT_REPO;
  const stamp = submission.submitted_at.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const path = `data/community/${stamp}-${submission.kind}-${submission.org_id}.json`;
  const content = `${JSON.stringify(submission, null, 2)}\n`;
  const message =
    submission.kind === 'add'
      ? `Visitor added ${submission.fields.name ?? submission.org_id}`
      : `Visitor corrected ${submission.org_id}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': 'nyc-animal-rescue-contribute',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({
        message: `${message}\n\nSubmitted through the site's contribute form. Checked against ${submission.check.page}.`,
        content: btoa(unescape(encodeURIComponent(content))),
        committer: { name: 'nyc-animal-rescue-visitors', email: 'noreply@users.noreply.github.com' },
      }),
    });
    if (res.status === 201 || res.status === 200) return { ok: true };
    return { ok: false, error: `github-${res.status}` };
  } catch {
    return { ok: false, error: 'github-unreachable' };
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: ContributeRequest;
  try {
    body = (await request.json()) as ContributeRequest;
  } catch {
    return reply(400, { ok: false, message: 'That request did not make sense.' });
  }

  const ip = request.headers.get('cf-connecting-ip') ?? '';
  if (await overRateLimit(ip || 'unknown', Date.now())) {
    return reply(429, { ok: false, message: 'That is a lot of submissions for one hour. Please try again later.' });
  }

  if (env.TURNSTILE_SECRET_KEY) {
    if (!body.turnstileToken || !(await turnstileOk(env.TURNSTILE_SECRET_KEY, body.turnstileToken, ip))) {
      return reply(403, { ok: false, message: 'The bot check did not go through. Please try again.' });
    }
  }

  const checked = validate(body);
  if (!checked.ok) return reply(400, { ok: false, message: checked.message });
  const fields = checked.fields;

  if (fields.phone && HELD_DIGITS.has(fields.phone)) {
    return reply(400, { ok: false, message: 'That number belongs to an individual who has not agreed to be listed. Please give the organization’s own line.' });
  }
  if (fields.phone && isPlaceholderPhone(fields.phone)) {
    return reply(400, { ok: false, message: 'That looks like a placeholder number rather than a real one.' });
  }

  const listed = await listedRecords(env, request);

  // --- which record ---------------------------------------------------------
  let orgId: string;
  let websiteToCheck: string | null;
  if (body.kind === 'add') {
    orgId = slugify(fields.name!);
    const key = mergeKey(fields.name!);
    const newHost = hostOf(fields.website ?? null);
    const dup = listed.find((r) => r.id === orgId || mergeKey(r.name) === key || (newHost && hostOf(r.website) === newHost));
    if (dup) {
      return reply(409, {
        ok: false,
        message: `${dup.name} is already listed. If its details are wrong, correct that entry instead.`,
        existing: { id: dup.id, name: dup.name },
      });
    }
    websiteToCheck = fields.website!;
  } else {
    const target = listed.find((r) => r.id === body.orgId);
    if (!target) return reply(404, { ok: false, message: 'That entry does not exist.' });
    orgId = target.id;
    // A new website is checked itself; otherwise the record's own site is
    // where the new number has to appear. The visitor does not get to name
    // the page that vouches for them.
    websiteToCheck = fields.website ?? target.website;
    if (!websiteToCheck) {
      return reply(400, { ok: false, message: 'This entry has no website on record, so a new contact cannot be checked. Give their website as well.' });
    }
  }

  // --- the quick check ------------------------------------------------------
  const contactGiven = Boolean(fields.phone || fields.email);
  let phoneSeen = false;
  let emailSeen = false;
  let page = websiteToCheck;
  if (contactGiven || fields.website) {
    const site = await readSite(websiteToCheck);
    if ('error' in site) {
      return reply(422, { ok: false, message: `${site.error} The details are checked against the organization’s own website, so it has to be readable.` });
    }
    page = site.finalUrl;
    if (site.text.length < 200) {
      return reply(422, { ok: false, message: 'Their website shows almost no text to a plain reader, so the contact cannot be checked against it.' });
    }
    phoneSeen = fields.phone ? containsPhone(site.text, fields.phone) : false;
    emailSeen = fields.email ? containsEmail(site.text, fields.email) : false;
    if (contactGiven && !phoneSeen && !emailSeen) {
      return reply(422, {
        ok: false,
        message: 'That contact does not appear on the website given. Check it against their site and try again, or give the page it is on as the website.',
      });
    }
  }

  const submission: Submission = {
    version: 1,
    kind: body.kind,
    org_id: orgId,
    submitted_at: new Date().toISOString(),
    submitter_email: body.submitterEmail ? String(body.submitterEmail).trim().slice(0, 120) || null : null,
    reason: body.reason ? String(body.reason).replace(/\s+/g, ' ').trim().slice(0, LIMITS.reasonMax) || null : null,
    fields,
    check: { page, phone_seen: phoneSeen, email_seen: emailSeen, checked_at: new Date().toISOString() },
  };

  const committed = await commitSubmission(env, submission);
  if (!committed.ok) {
    return reply(503, {
      ok: false,
      message:
        committed.error === 'not-configured'
          ? 'Submissions are not switched on yet. Please report it instead.'
          : 'The submission passed its checks but could not be saved just now. Please try again in a few minutes.',
    });
  }

  return reply(200, {
    ok: true,
    message:
      body.kind === 'add'
        ? 'Thank you. It passed the check and will appear in the directory in a few minutes, labelled as added by a visitor.'
        : 'Thank you. It passed the check and the entry will update in a few minutes.',
    url: `/org/${orgId}`,
  });
};
