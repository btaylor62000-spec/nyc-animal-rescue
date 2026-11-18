import test from 'node:test';
import assert from 'node:assert/strict';
import { alertOutOfAllowance, nyDate } from '../src/chat/limit-alert.ts';

function fakeCache() {
  const m = new Map<string, Response>();
  return { match: async (k: string) => m.get(k), put: async (k: string, r: Response) => void m.set(k, r), size: () => m.size };
}

test('the limit alert asks GitHub once a day, with the New York date', async () => {
  const calls: Array<{ url: string; body: unknown }> = [];
  const fetchStub = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) });
    return new Response(null, { status: 204 });
  }) as unknown as typeof fetch;
  const cache = fakeCache();
  // 1:30am UTC on the 19th is still the 18th in New York.
  const now = new Date('2026-11-19T01:30:00Z');
  const deps = { token: 't', repo: 'o/r', now, fetch: fetchStub, cache };
  assert.equal(await alertOutOfAllowance(deps), 'sent');
  assert.equal(await alertOutOfAllowance(deps), 'already-sent');
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, 'https://api.github.com/repos/o/r/dispatches');
  assert.deepEqual(calls[0]!.body, { event_type: 'assistant-out-of-allowance', client_payload: { date: '2026-11-18' } });
  assert.equal(nyDate(now), '2026-11-18');
});

test('the limit alert never throws and does nothing without a token', async () => {
  const boom = (async () => { throw new Error('network'); }) as unknown as typeof fetch;
  assert.equal(await alertOutOfAllowance({ token: 't', repo: 'o/r', now: new Date(), fetch: boom }), 'failed');
  assert.equal(await alertOutOfAllowance({ repo: 'o/r', now: new Date(), fetch: boom }), 'not-configured');
});
