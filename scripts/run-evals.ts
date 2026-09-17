/**
 * Eval runner.
 *
 *   npm run evals            retrieval only -- free, offline, deterministic
 *   npm run evals -- --live  also calls the model and checks what it says
 *
 * The split is deliberate. Retrieval is where most failures actually happen,
 * and checking it costs nothing, so it can run on every change. The live pass
 * spends real budget from a daily allocation that is also what serves the
 * public, so it is opt-in.
 */
import { readFileSync } from 'node:fs';
import { Retriever, type Corpus } from '../src/chat/retrieve.ts';
import { SYSTEM_PROMPT, buildContext } from '../src/chat/system-prompt.ts';
import { allowedFrom, redact } from '../src/chat/redact.ts';
import { LIMITS } from '../src/chat/protocol.ts';

interface EvalCase {
  id: string;
  q: string;
  expect_orgs?: string[];
  expect_any_org?: string[];
  expect_needs?: string[];
  expect_signals?: { animals?: string[]; needs?: string[]; boroughs?: string[]; zips?: string[] };
  expect_emergency?: boolean;
  expect_guide_any?: string[];
  expect_no_answer?: boolean;
  expect_clarifying_question?: boolean;
  must_include?: string[];
  must_not_include?: string[];
  notes?: string;
}

interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

const ESC = String.fromCharCode(27);
const RESET = `${ESC}[0m`;
const RED = `${ESC}[31m`;
const GREEN = `${ESC}[32m`;
const YELLOW = `${ESC}[33m`;
const DIM = `${ESC}[2m`;

function loadCases(path = 'evals/chat.jsonl'): EvalCase[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      try {
        return JSON.parse(l) as EvalCase;
      } catch (err) {
        throw new Error(`evals/chat.jsonl line ${i + 1} is not valid JSON: ${(err as Error).message}`);
      }
    });
}

const corpus = JSON.parse(readFileSync('data/chat-corpus.json', 'utf8')) as Corpus;
const retriever = new Retriever(corpus);

function retrievalChecks(c: EvalCase): { checks: Check[]; retrieved: ReturnType<Retriever['retrieve']> } {
  const retrieved = retriever.retrieve(c.q, LIMITS.retrieveCount);
  const ids = retrieved.orgs.map((o) => o.id);
  const checks: Check[] = [];

  if (c.expect_orgs) {
    const missing = c.expect_orgs.filter((id) => !ids.includes(id));
    checks.push({
      name: `retrieves ${c.expect_orgs.join(', ')}`,
      pass: missing.length === 0,
      detail: missing.length ? `missing: ${missing.join(', ')}` : undefined,
    });
  }

  if (c.expect_any_org) {
    const hit = c.expect_any_org.some((id) => ids.includes(id));
    checks.push({
      name: `retrieves one of ${c.expect_any_org.join(' / ')}`,
      pass: hit,
      detail: hit ? undefined : `got: ${ids.slice(0, 5).join(', ')}`,
    });
  }

  if (c.expect_needs) {
    for (const need of c.expect_needs) {
      const hit = retrieved.orgs.some((o) => o.needs.includes(need));
      checks.push({
        name: `a result offers "${need}"`,
        pass: hit,
        detail: hit ? undefined : `top: ${retrieved.orgs.slice(0, 3).map((o) => o.name).join(' | ')}`,
      });
    }
  }

  if (c.expect_signals) {
    for (const [field, expected] of Object.entries(c.expect_signals)) {
      const actual = (retrieved.signals as unknown as Record<string, string[]>)[field] ?? [];
      const missing = (expected as string[]).filter((v) => !actual.includes(v));
      checks.push({
        name: `reads ${field}: ${(expected as string[]).join(', ')}`,
        pass: missing.length === 0,
        detail: missing.length ? `got [${actual.join(', ')}]` : undefined,
      });
    }
  }

  if (c.expect_emergency !== undefined) {
    checks.push({
      name: c.expect_emergency ? 'treated as an emergency' : 'not treated as an emergency',
      pass: retrieved.signals.emergency === c.expect_emergency,
    });
  }

  if (c.expect_guide_any) {
    const slug = retrieved.guide?.slug ?? '(none)';
    const hit = c.expect_guide_any.includes(slug);
    checks.push({
      name: `guide is one of ${c.expect_guide_any.join(' / ')}`,
      pass: hit,
      detail: hit ? undefined : `got: ${slug}`,
    });
  }

  // Never route a closed organization to someone who needs help now.
  const closed = retrieved.orgs.filter((o) => o.status === 'retired' || o.status === 'relocated');
  checks.push({
    name: 'no closed organizations retrieved',
    pass: closed.length === 0,
    detail: closed.length ? closed.map((o) => o.name).join(', ') : undefined,
  });

  return { checks, retrieved };
}

// --- live pass -------------------------------------------------------------

interface LiveConfig {
  accountId: string;
  apiToken: string;
  model: string;
}

async function askModel(cfg: LiveConfig, system: string, user: string): Promise<string> {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/ai/run/${cfg.model}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${cfg.apiToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 400,
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`Workers AI returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { result?: { response?: string } };
  const text = data.result?.response;
  if (typeof text !== 'string') throw new Error(`Unexpected response: ${JSON.stringify(data).slice(0, 200)}`);
  return text;
}

function liveChecks(c: EvalCase, answer: string, retrieved: ReturnType<Retriever['retrieve']>): Check[] {
  const checks: Check[] = [];
  const lower = answer.toLowerCase();

  for (const phrase of c.must_include ?? []) {
    checks.push({ name: `says "${phrase}"`, pass: lower.includes(phrase.toLowerCase()) });
  }
  for (const phrase of c.must_not_include ?? []) {
    checks.push({ name: `does not say "${phrase}"`, pass: !lower.includes(phrase.toLowerCase()) });
  }

  // The hard guarantee: no contact detail that is not in the retrieved set.
  const allowed = allowedFrom(retrieved.orgs);
  const cleaned = redact(answer, allowed);
  checks.push({
    name: 'invents no phone, email or web address',
    pass: cleaned === answer,
    detail: cleaned === answer ? undefined : 'the redactor had to remove something',
  });

  if (c.expect_no_answer) {
    const admits = /(don'?t have|do not have|not in|cannot find|can'?t find|no listing|not something|unable to|outside what)/i.test(
      answer,
    );
    checks.push({ name: 'admits it does not know', pass: admits });
  }

  const questions = (answer.match(/\?/g) ?? []).length;
  if (c.expect_clarifying_question) {
    checks.push({
      name: 'asks exactly one clarifying question',
      pass: questions === 1,
      detail: `${questions} question marks`,
    });
  } else {
    checks.push({ name: 'asks at most one question', pass: questions <= 1, detail: `${questions} question marks` });
  }

  checks.push({
    name: 'is short enough to read in a hurry',
    pass: answer.length <= 1400,
    detail: `${answer.length} characters`,
  });

  return checks;
}

// --- main ------------------------------------------------------------------

async function main(): Promise<void> {
  const live = process.argv.includes('--live');
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);

  let cases = loadCases();
  if (only) cases = cases.filter((c) => c.id === only || c.id.includes(only));

  let cfg: LiveConfig | null = null;
  if (live) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) {
      console.error(
        `${RED}--live needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in the environment.${RESET}\n` +
          'Create a token with the "Workers AI" permission. Running the retrieval pass only.\n',
      );
    } else {
      cfg = { accountId, apiToken, model: process.env.CHAT_MODEL ?? '@cf/meta/llama-3.1-8b-instruct-fp8' };
    }
  }

  console.log(`\nRunning ${cases.length} cases${cfg ? ' (retrieval + live model)' : ' (retrieval only)'}\n`);

  let passed = 0;
  let failed = 0;

  for (const c of cases) {
    const { checks, retrieved } = retrievalChecks(c);

    if (cfg) {
      try {
        const user = `${buildContext(retrieved.orgs, retrieved.guide)}\n\nQUESTION\n${c.q}`;
        const answer = await askModel(cfg, SYSTEM_PROMPT, user);
        checks.push(...liveChecks(c, answer, retrieved));
      } catch (err) {
        checks.push({ name: 'model responded', pass: false, detail: (err as Error).message });
      }
    }

    const bad = checks.filter((ch) => !ch.pass);
    passed += checks.length - bad.length;
    failed += bad.length;

    const mark = bad.length === 0 ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
    console.log(`${mark}  ${c.id}${DIM} - "${c.q.slice(0, 62)}"${RESET}`);
    for (const ch of bad) {
      console.log(`        ${RED}x${RESET} ${ch.name}${ch.detail ? `${DIM} - ${ch.detail}${RESET}` : ''}`);
    }
  }

  const total = passed + failed;
  console.log(
    `\n${failed === 0 ? GREEN : YELLOW}${passed}/${total} checks passed${RESET} across ${cases.length} cases` +
      `${cfg ? '' : `${DIM} (run with --live to check what the assistant actually says)${RESET}`}\n`,
  );

  if (failed > 0) process.exitCode = 1;
}

void main();
