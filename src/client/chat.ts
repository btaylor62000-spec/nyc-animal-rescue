/**
 * The assistant's front end.
 *
 * Three things it must get right:
 *   - Contacts come from the cards, which are built from the real records and
 *     arrive before any generated text. If the model says nothing useful, the
 *     reader still has real phone numbers.
 *   - When the assistant is unavailable -- daily allocation spent, network
 *     gone, rate limited -- the page falls back to the directory search with
 *     the question already filled in, rather than showing a failure.
 *   - Nothing is stored. The conversation lives in this tab and is gone when
 *     it closes.
 */
import type { ChatCard, ChatEvent } from '../data/chat-types.ts';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

const form = document.getElementById('chat-form') as HTMLFormElement | null;
const input = document.getElementById('chat-input') as HTMLTextAreaElement | null;
const log = document.getElementById('chat-log') as HTMLElement | null;
const status = document.getElementById('chat-status') as HTMLElement | null;
const degraded = document.getElementById('chat-degraded') as HTMLElement | null;
const degradedSearch = document.getElementById('chat-degraded-search') as HTMLAnchorElement | null;
const examples = document.getElementById('chat-examples');
const sendButton = document.getElementById('chat-send') as HTMLButtonElement | null;

if (form && input && log) {
  const history: Turn[] = [];
  let pass: string | null = null;
  let busy = false;

  const siteKey = form.dataset.turnstileSiteKey ?? '';

  function setStatus(text: string): void {
    if (status) status.textContent = text;
  }

  /**
   * Messages for the ways the assistant can be away. They are different
   * problems for whoever is running the site, so they say different things.
   */
  const DEGRADED_REASONS: Record<string, { title: string; body: string }> = {
    'assistant-out-of-allowance': {
      title: 'The assistant is resting',
      body: 'It runs on a free daily allowance, and that is used up for today. It will be back tomorrow. The directory is unaffected.',
    },
    'assistant-not-configured': {
      title: 'The assistant is not switched on yet',
      body: 'This site is running without its language model connected. The directory, search and guides all work normally.',
    },
    'assistant-unavailable': {
      title: 'The assistant is unreachable',
      body: 'Something went wrong on the way to the assistant. The directory is unaffected, and search will get you there.',
    },
    'verification-failed': {
      title: 'The check could not be completed',
      body: 'The bot check did not finish — it may have been blocked by a browser extension or a strict privacy setting. Search works without it.',
    },
    'needs-verification': {
      title: 'The check could not be completed',
      body: 'The bot check did not finish. Search works without it.',
    },
    'rate-limited': {
      title: 'That is a lot of questions',
      body: 'You have sent several messages in a short time. Please use search for now.',
    },
  };

  /** Fall back to the directory, carrying the question across. */
  function showDegraded(question: string, reason = 'assistant-unavailable'): void {
    if (!degraded) return;
    const copy = DEGRADED_REASONS[reason] ?? DEGRADED_REASONS['assistant-unavailable']!;
    const heading = degraded.querySelector('h3');
    const para = degraded.querySelector('p');
    if (heading) heading.textContent = copy.title;
    if (para) para.textContent = copy.body;

    degraded.hidden = false;
    if (degradedSearch) {
      degradedSearch.href = `/directory?q=${encodeURIComponent(question)}`;
    }
    setStatus('');
  }

  function addMessage(who: 'you' | 'assistant', text: string): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `msg msg--${who}`;

    const label = document.createElement('p');
    label.className = 'msg__who';
    label.textContent = who === 'you' ? 'You' : 'Assistant';

    const body = document.createElement('div');
    body.className = 'msg__body';
    body.textContent = text;

    wrapper.append(label, body);
    log!.append(wrapper);
    wrapper.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return body;
  }

  function boroughLabel(card: ChatCard): string {
    if (card.citywide) return 'All five boroughs';
    if (!card.boroughs.length) return '';
    const names: Record<string, string> = {
      manhattan: 'Manhattan',
      brooklyn: 'Brooklyn',
      queens: 'Queens',
      bronx: 'The Bronx',
      'staten-island': 'Staten Island',
    };
    return card.boroughs.map((b) => names[b] ?? b).join(', ');
  }

  function renderCards(cards: ChatCard[]): void {
    if (!cards.length) return;
    const list = document.createElement('ul');
    list.className = 'chat__cards';
    list.setAttribute('aria-label', 'Suggested resources');

    for (const card of cards) {
      const li = document.createElement('li');
      li.className = 'chat-card';

      const name = document.createElement('a');
      name.className = 'chat-card__name';
      name.href = card.url;
      name.textContent = card.name;

      const where = document.createElement('span');
      where.className = 'chat-card__where';
      where.textContent = boroughLabel(card);

      const actions = document.createElement('div');
      actions.className = 'chat-card__actions';

      // Real contacts, from the record -- never from the model's text.
      for (const phone of card.phones.slice(0, 2)) {
        const a = document.createElement('a');
        a.className = 'btn btn--primary';
        a.href = `tel:+1${phone.replace(/\D/g, '')}`;
        a.textContent = `Call ${phone}`;
        actions.append(a);
      }
      const details = document.createElement('a');
      details.className = 'btn';
      details.href = card.url;
      details.textContent = 'Details';
      actions.append(details);

      li.append(name, where, actions);

      if (card.needsConfirmation) {
        const warn = document.createElement('span');
        warn.className = 'chat-card__warn';
        warn.textContent =
          card.status !== 'active' && card.statusNote
            ? card.statusNote
            : 'Confirm this contact is still active before relying on it.';
        li.append(warn);
      }

      list.append(li);
    }
    log!.append(list);
    list.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  /**
   * Turnstile runs invisibly and only when the endpoint asks for it. The
   * widget is created on demand so a visitor who never uses the assistant
   * never loads it.
   */
  async function solveTurnstile(): Promise<string | null> {
    if (!siteKey) return null;
    const turnstile = (window as unknown as { turnstile?: Turnstile }).turnstile;
    if (!turnstile) return null;

    const host = document.getElementById('turnstile-host');
    const wrap = document.getElementById('turnstile-wrap');
    if (!host) return null;

    // Show it. A Managed challenge decides for itself whether to ask the
    // reader for anything, and if it does they need to be able to see it.
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
      // Never leave someone waiting on a challenge that will not resolve.
      window.setTimeout(() => finish(null), 20_000);
    });
  }

  async function ask(question: string): Promise<void> {
    if (busy) return;
    busy = true;
    if (sendButton) sendButton.disabled = true;
    if (degraded) degraded.hidden = true;

    addMessage('you', question);
    history.push({ role: 'user', content: question });
    setStatus('Looking…');

    const body: Record<string, unknown> = { message: question, history: history.slice(0, -1) };
    if (pass) body.pass = pass;

    let res: Response;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      // The endpoint asks for verification the first time only.
      if (res.status === 401) {
        setStatus('Just checking you are a person…');
        const token = await solveTurnstile();
        if (!token) {
          showDegraded(question, 'verification-failed');
          return;
        }
        body.turnstileToken = token;
        res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
    } catch {
      showDegraded(question);
      return;
    } finally {
      busy = false;
      if (sendButton) sendButton.disabled = false;
    }

    const newPass = res.headers.get('x-chat-pass');
    if (newPass) pass = newPass;

    if (res.status === 429) {
      showDegraded(question, 'rate-limited');
      return;
    }
    if (res.status === 404) {
      // The endpoint is not deployed -- running the static site on its own.
      showDegraded(question, 'assistant-not-configured');
      return;
    }
    if (!res.ok && res.status !== 503) {
      const detail = await res.text();
      const message = /"error":"([^"]+)"/.exec(detail)?.[1] ?? '';
      if (message && !message.includes('-')) {
        setStatus(message);
        return;
      }
      showDegraded(question);
      return;
    }

    if (!res.body) {
      showDegraded(question);
      return;
    }

    setStatus('');
    let bodyEl: HTMLElement | null = null;
    let answer = '';

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const line = frame.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          let event: ChatEvent;
          try {
            event = JSON.parse(line.slice(5).trim()) as ChatEvent;
          } catch {
            continue;
          }

          if ('cards' in event) {
            renderCards(event.cards);
            continue;
          }
          if ('t' in event) {
            bodyEl ??= addMessage('assistant', '');
            bodyEl.dataset.streaming = 'true';
            answer += event.t;
            bodyEl.textContent = answer;
            continue;
          }
          if ('error' in event) {
            if (event.degraded) showDegraded(question, event.error);
            else setStatus(event.error);
            continue;
          }
          if ('done' in event) {
            if (bodyEl) delete bodyEl.dataset.streaming;
          }
        }
      }
    } catch {
      if (!answer) showDegraded(question);
    }

    if (bodyEl) delete bodyEl.dataset.streaming;
    if (answer) history.push({ role: 'assistant', content: answer });
    setStatus('');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    void ask(question);
  });

  // Enter sends; Shift+Enter makes a new line.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  examples?.addEventListener('click', (e) => {
    const button = (e.target as HTMLElement).closest('button');
    if (!button) return;
    const question = button.dataset.q ?? button.textContent ?? '';
    void ask(question.trim());
  });
}

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
