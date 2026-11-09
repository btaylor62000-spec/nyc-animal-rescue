import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPage } from '../scripts/agent/fetch.ts';
import { AGENT } from '../scripts/agent/config.ts';

/*
 * A site that sends its headers and then never finishes the page. On
 * 2026-11-09 one of these held the weekly job open until GitHub cancelled it
 * at 45 minutes, before anything was saved. The deadline has to cover the
 * body as well as the headers, and has to really stop the request.
 */
test('a page that never finishes arriving is given up on, not waited for', async () => {
  const was = AGENT.timeoutMs;
  (AGENT as { timeoutMs: number }).timeoutMs = 300;
  let aborted = false;
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).endsWith('/robots.txt')) return new Response('', { status: 404 });
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('<html><body>Call us at'));
        init?.signal?.addEventListener('abort', () => {
          aborted = true;
          controller.error(init.signal!.reason);
        });
      },
    });
    return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
  }) as typeof fetch;
  try {
    const started = Date.now();
    const page = await fetchPage('https://slow-drip.example/contact', fetcher);
    assert.ok(Date.now() - started < 3000, 'it waited far past its deadline');
    assert.ok(aborted, 'the request was left running');
    assert.match(page.error ?? '', /timed out/);
    assert.equal(page.ok, false);
  } finally {
    (AGENT as { timeoutMs: number }).timeoutMs = was;
  }
});
