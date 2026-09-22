/**
 * The add-a-resource and correct-an-entry forms.
 *
 * Collects the fields, passes the bot check, posts to the endpoint, and shows
 * the outcome in plain words. Works the same for both forms: the kind and the
 * record id come from data attributes on the form.
 */
import type { ContributeRequest, ContributeResponse, SubmittedFields } from '../contribute/protocol.ts';

interface Turnstile {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      size?: string;
      callback: (token: string) => void;
      'error-callback': () => void;
      'timeout-callback': () => void;
    },
  ) => void;
}

const form = document.getElementById('contribute-form') as HTMLFormElement | null;

if (form) {
  const status = document.getElementById('contribute-status');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const siteKey = form.dataset.turnstileSiteKey ?? '';
  const kind = (form.dataset.kind === 'correct' ? 'correct' : 'add') as ContributeRequest['kind'];
  const orgId = form.dataset.orgId || undefined;

  function say(text: string, tone: 'muted' | 'ok' | 'error' = 'muted'): void {
    if (!status) return;
    status.textContent = text;
    status.dataset.tone = tone;
    status.hidden = false;
  }

  async function solveTurnstile(): Promise<string | null> {
    if (!siteKey) return null;
    const turnstile = (window as unknown as { turnstile?: Turnstile }).turnstile;
    if (!turnstile) return null;
    const host = document.getElementById('turnstile-host');
    const wrap = document.getElementById('turnstile-wrap');
    if (!host) return null;
    // The widget must be visible while it runs: a Managed challenge may ask
    // the person to click something.
    wrap?.removeAttribute('hidden');
    return new Promise<string | null>((resolve) => {
      let settled = false;
      const finish = (token: string | null) => {
        if (settled) return;
        settled = true;
        wrap?.setAttribute('hidden', '');
        resolve(token);
      };
      try {
        host.innerHTML = '';
        turnstile.render(host, {
          sitekey: siteKey,
          size: 'flexible',
          callback: finish,
          'error-callback': () => finish(null),
          'timeout-callback': () => finish(null),
        });
      } catch {
        finish(null);
      }
      window.setTimeout(() => finish(null), 30_000);
    });
  }

  function collect(): { fields: SubmittedFields; reason: string; email: string } {
    const data = new FormData(form!);
    const text = (k: string) => String(data.get(k) ?? '').trim();
    const fields: SubmittedFields = {
      name: text('name') || undefined,
      website: text('website') || undefined,
      phone: text('phone') || undefined,
      email: text('email') || undefined,
      what: text('what') || undefined,
      zip: text('zip') || undefined,
      address: text('address') || undefined,
      hours: text('hours') || undefined,
      boroughs: data.getAll('boroughs').map(String) as SubmittedFields['boroughs'],
      animals: data.getAll('animals').map(String) as SubmittedFields['animals'],
    };
    return { fields, reason: text('reason'), email: text('submitter_email') };
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submit) submit.disabled = true;
    say('Checking the details against their website…');

    const { fields, reason, email } = collect();
    const body: ContributeRequest = { kind, orgId, fields };
    if (reason) body.reason = reason;
    if (email) body.submitterEmail = email;

    if (siteKey) {
      const token = await solveTurnstile();
      if (!token) {
        say('The bot check did not complete. Please try again.', 'error');
        if (submit) submit.disabled = false;
        return;
      }
      body.turnstileToken = token;
    }

    let result: ContributeResponse;
    try {
      const res = await fetch('/api/contribute', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      result = (await res.json()) as ContributeResponse;
    } catch {
      result = { ok: false, message: 'Something went wrong sending that. Please try again.' };
    }

    if (result.ok) {
      say(result.message, 'ok');
      form.hidden = true;
      const done = document.getElementById('contribute-done');
      if (done) {
        done.hidden = false;
        const link = done.querySelector<HTMLAnchorElement>('a[data-record-link]');
        if (link && result.url) link.href = result.url;
      }
      return;
    }

    let text = result.message;
    if (result.existing) {
      text += ` Correct it here: /org/${result.existing.id}/correct`;
      say(text, 'error');
      const s = status as HTMLElement | null;
      if (s) {
        s.textContent = `${result.message} `;
        const a = document.createElement('a');
        a.href = `/org/${result.existing.id}/correct`;
        a.textContent = `Correct the ${result.existing.name} entry instead`;
        s.appendChild(a);
      }
    } else {
      say(text, 'error');
    }
    if (submit) submit.disabled = false;
  });
}
