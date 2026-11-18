/**
 * Tells the owner when the assistant has used its free daily allowance
 * (owner, 2026-11-18: "can I be notified if it does?").
 *
 * The moment Workers AI refuses for quota, the chat function calls this. It
 * asks GitHub to run the "Assistant daily limit" workflow, which fails on
 * purpose with a plain message, and GitHub emails the owner about a failed
 * run, exactly as the weekly site check does. No new account, inbox or
 * stored state: the GitHub token the contribute form already uses, and the
 * Workers cache to send it once a day rather than once per refused message.
 * The cache is per data centre, so on a busy day two or three may get
 * through; the workflow itself stays quiet after the first of the day.
 */
export interface AlertDeps {
  token?: string;
  repo: string;
  now: Date;
  fetch: typeof fetch;
  cache?: { match(key: string): Promise<unknown>; put(key: string, res: Response): Promise<void> };
}

/** The New York date, so the day the owner reads about is the day it happened. */
export function nyDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export async function alertOutOfAllowance(d: AlertDeps): Promise<'sent' | 'already-sent' | 'not-configured' | 'failed'> {
  if (!d.token) return 'not-configured';
  const day = nyDate(d.now);
  const key = `https://nyc-animal-rescue.internal/assistant-limit/${day}`;
  try {
    if (d.cache && (await d.cache.match(key))) return 'already-sent';
    const res = await d.fetch(`https://api.github.com/repos/${d.repo}/dispatches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${d.token}`,
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        'user-agent': 'nyc-animal-rescue-assistant',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({ event_type: 'assistant-out-of-allowance', client_payload: { date: day } }),
    });
    if (res.status !== 204 && res.status !== 200) return 'failed';
    await d.cache?.put(key, new Response('sent', { headers: { 'cache-control': 'max-age=86400' } }));
    return 'sent';
  } catch {
    // An alert that cannot be sent must never break the reader's answer.
    return 'failed';
  }
}
