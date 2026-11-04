/**
 * Runs the real /api/chat handler locally, without Cloudflare, Turnstile or
 * the AI model, to see the cards it returns -- the part built from our data.
 *
 *   npx tsx scripts/dev/chat-harness.ts "question" [lat,lon] [ISO time]
 *
 * The bot check refuses automated browsers by design, so the deployed
 * assistant cannot be tested end to end from a script; this tests everything
 * on our side of it. With no AI binding the handler sends the cards and then
 * its "fall back to search" notice, which is expected here.
 */
const [question, where, when] = process.argv.slice(2);
if (when) {
  const fixed = new Date(when).getTime();
  const Real = Date;
  class Fixed extends Real {
    constructor(...a: unknown[]) {
      if (a.length) super(...(a as [string]));
      else super(fixed);
    }
    static override now() { return fixed; }
  }
  globalThis.Date = Fixed as DateConstructor;
}
(globalThis as Record<string, unknown>).caches = { default: { match: async () => undefined, put: async () => undefined } };

const { onRequestPost } = await import('../../functions/api/chat.ts');
const origin = where ? { lat: Number(where.split(',')[0]), lon: Number(where.split(',')[1]) } : undefined;
const request = new Request('https://example.org/api/chat', {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'cf-connecting-ip': '127.0.0.1' },
  body: JSON.stringify({ message: question, ...(origin ? { origin } : {}) }),
});
const res = await (onRequestPost as (c: unknown) => Promise<Response>)({ request, env: {} });
const text = await res.text();
for (const line of text.split('\n')) {
  if (!line.startsWith('data: ')) continue;
  const ev = JSON.parse(line.slice(6));
  if (ev.cards) {
    for (const c of ev.cards) console.log(`${c.name} | ${[c.openNow, c.distance].filter(Boolean).join(' · ') || '-'}`);
  }
}
