/**
 * The chat assistant endpoint.
 *
 * Runs as a Cloudflare Pages Function on the free plan. Three properties
 * matter more than anything else here:
 *
 *   1. It cannot cost money. Workers AI has a free daily allocation and, on
 *      the free plan, requests past it fail with an error rather than billing.
 *      Every failure path below degrades to "use the search box" instead of
 *      retrying, so an exhausted allocation is a quiet fallback, not an outage.
 *   2. It cannot invent a contact detail. The organizations are chosen by
 *      retrieval, not by the model, and are sent to the reader as cards built
 *      from the real records. Anything the model writes is filtered against
 *      the contacts that were actually retrieved.
 *   3. It keeps nothing. No transcripts, no identifiers, no logs of what
 *      anyone asked.
 */
import corpusData from '../../data/chat-corpus.json';
import { Retriever, type Corpus } from '../../src/chat/retrieve.ts';
import { SYSTEM_PROMPT, buildContext } from '../../src/chat/system-prompt.ts';
import { StreamRedactor, allowedFrom } from '../../src/chat/redact.ts';
import { LIMITS, type ChatCard, type ChatEvent, type ChatRequest } from '../../src/chat/protocol.ts';
import { clientKeyFor, issuePass, verifyPass } from '../../src/chat/pass.ts';

interface Env {
  AI: { run: (model: string, input: unknown) => Promise<ReadableStream | { response?: string }> };
  TURNSTILE_SECRET_KEY?: string;
  CHAT_PASS_SECRET?: string;
}

/**
 * Small, fast, and good at following instructions. The free allocation is
 * 10,000 Neurons a day; at roughly 40 Neurons a message this model supports
 * around 240 conversations a day, where a larger one would manage about 85.
 */
const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';

const corpus = corpusData as unknown as Corpus;

// Built once per isolate and reused across requests, so the indexing cost is
// paid on the first request rather than on every one.
let retriever: Retriever | null = null;
function getRetriever(): Retriever {
  retriever ??= new Retriever(corpus);
  return retriever;
}

const STALE_DAYS = 90;

function needsConfirmation(org: { confidence: string; status: string; lastVerified: string | null }): boolean {
  if (org.confidence === 'Low' || org.status !== 'active' || !org.lastVerified) return true;
  const age = (Date.now() - Date.parse(org.lastVerified)) / 86_400_000;
  return age > STALE_DAYS;
}

function sse(event: ChatEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function jsonError(status: number, error: string, degraded = false): Response {
  return new Response(sse({ error, degraded }), {
    status,
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store' },
  });
}

/**
 * Per-client rate limiting using the Cache API.
 *
 * Deliberately not a stored counter: Workers KV's free write allowance and
 * Durable Objects both run out or cost money. The cache is free, already
 * present, and good enough to blunt abuse -- Turnstile is the real gate, and
 * the daily AI allocation is the real spending limit.
 */
async function overRateLimit(clientKey: string, now: number): Promise<boolean> {
  const cache = (caches as unknown as { default: Cache }).default;

  const windows: Array<{ name: string; bucket: number; limit: number }> = [
    { name: 'm', bucket: Math.floor(now / 60_000), limit: LIMITS.perMinute },
    { name: 'h', bucket: Math.floor(now / 3_600_000), limit: LIMITS.perHour },
  ];

  for (const w of windows) {
    const url = `https://ratelimit.invalid/${w.name}/${clientKey}/${w.bucket}`;
    const hit = await cache.match(url);
    const count = hit ? Number(await hit.text()) || 0 : 0;
    if (count >= w.limit) return true;
    await cache.put(
      url,
      new Response(String(count + 1), {
        headers: { 'cache-control': `max-age=${w.name === 'm' ? 120 : 7200}` },
      }),
    );
  }
  return false;
}

async function turnstileOk(secret: string, token: string, ip: string): Promise<boolean> {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return jsonError(400, 'That request did not make sense.');
  }

  const message = (body.message ?? '').trim();
  if (!message) return jsonError(400, 'Ask a question and I will try to help.');
  if (message.length > LIMITS.maxMessageChars) {
    return jsonError(
      413,
      `That message is a bit long for me. Could you shorten it to about ${LIMITS.maxMessageChars} characters?`,
    );
  }

  const ip = request.headers.get('cf-connecting-ip') ?? '';
  const ua = request.headers.get('user-agent') ?? '';
  const passSecret = env.CHAT_PASS_SECRET ?? '';
  const clientKey = await clientKeyFor(ip, ua, passSecret || 'unsalted');

  // --- who is asking -------------------------------------------------------
  let pass = body.pass;
  const turnstileSecret = env.TURNSTILE_SECRET_KEY;

  if (turnstileSecret && passSecret) {
    const hasValidPass = pass ? await verifyPass(passSecret, clientKey, pass) : false;
    if (!hasValidPass) {
      if (!body.turnstileToken) return jsonError(401, 'needs-verification');
      if (!(await turnstileOk(turnstileSecret, body.turnstileToken, ip))) {
        return jsonError(403, 'That verification did not go through. Please try again.');
      }
      pass = await issuePass(passSecret, clientKey, LIMITS.passTtlSeconds);
    }
  }

  if (await overRateLimit(clientKey, Date.now())) {
    return jsonError(429, 'You have sent a lot of messages in a short time. Please use the search below for now.', true);
  }

  // --- what to say about -------------------------------------------------
  const retrieved = getRetriever().retrieve(message, LIMITS.retrieveCount);
  const allowed = allowedFrom(retrieved.orgs);

  const cards: ChatCard[] = retrieved.orgs.slice(0, 6).map((o) => ({
    id: o.id,
    name: o.name,
    url: `/org/${o.id}`,
    phones: o.phones,
    website: o.website,
    boroughs: o.boroughs,
    citywide: o.citywide,
    confidence: o.confidence,
    status: o.status,
    statusNote: o.statusNote,
    lastVerified: o.lastVerified,
    needsConfirmation: needsConfirmation(o),
  }));

  const history = (body.history ?? [])
    .slice(-LIMITS.maxHistoryTurns)
    .filter((m) => typeof m.content === 'string' && m.content.length <= LIMITS.maxMessageChars * 2);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: `${buildContext(retrieved.orgs, retrieved.guide)}\n\nQUESTION\n${message}` },
  ];

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const redactor = new StreamRedactor(allowed);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatEvent) => controller.enqueue(encoder.encode(sse(event)));

      // Cards first: real, verified contacts reach the reader before any
      // generated text does, so the useful part does not wait on the model.
      send({ cards, guide: retrieved.guide ? { slug: retrieved.guide.slug, title: retrieved.guide.title } : null });

      // Ask the model only after the cards are out. If the daily allocation is
      // exhausted or the model is unreachable, the reader has already been
      // given real, verified contacts -- which is the part that matters.
      let upstream: ReadableStream | { response?: string };
      try {
        upstream = await env.AI.run(MODEL, { messages, stream: true, max_tokens: 400, temperature: 0.3 });
      } catch {
        send({ error: 'assistant-unavailable', degraded: true });
        controller.close();
        return;
      }

      try {
        if (!(upstream instanceof ReadableStream)) {
          const text = (upstream as { response?: string }).response ?? '';
          const safe = redactor.push(text) + redactor.flush();
          if (safe) send({ t: safe });
          send({ done: true });
          controller.close();
          return;
        }

        const reader = upstream.getReader();
        let partial = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          partial += decoder.decode(value, { stream: true });

          // Workers AI streams server-sent events of its own.
          const lines = partial.split('\n');
          partial = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload) as { response?: string };
              if (!parsed.response) continue;
              const safe = redactor.push(parsed.response);
              if (safe) send({ t: safe });
            } catch {
              // A partial or unexpected frame: skip it rather than fail.
            }
          }
        }

        const tail = redactor.flush();
        if (tail) send({ t: tail });
        send({ done: true });
      } catch {
        const tail = redactor.flush();
        if (tail) send({ t: tail });
        send({ error: 'assistant-unavailable', degraded: true });
      } finally {
        controller.close();
      }
    },
  });

  const headers: Record<string, string> = {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-store',
    'x-accel-buffering': 'no',
  };
  if (pass) headers['x-chat-pass'] = pass;

  return new Response(stream, { headers });
};

/** Anything other than POST gets a clear, cheap answer. */
export const onRequest: PagesFunction<Env> = async (ctx) => {
  if (ctx.request.method === 'POST') return onRequestPost(ctx);
  return new Response('Send a POST request with a JSON body: { "message": "..." }', {
    status: 405,
    headers: { allow: 'POST', 'content-type': 'text/plain; charset=utf-8' },
  });
};
