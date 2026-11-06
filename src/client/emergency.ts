/*
 * The emergency page's one job: put the nearest hospital that is open right
 * now under the reader's thumb. Shared by every design option, so they differ
 * in layout only and never in which hospitals they show or in what order.
 *
 * Where the reader is comes from one of three taps: their borough (the
 * middle of it -- rough, but one tap and no typing), a zip code, or the
 * phone's location. The location never leaves the device. Ordering is
 * rank.ts with `emergency: true`, exactly as in Find help, and only places
 * whose hours say they are open at this minute are offered; a place whose
 * hours cannot be read is never shown as open.
 */
import { rankKey, compareKeys, distanceMiles, type Origin } from '../data/rank.ts';
import { openState, openLabel } from '../data/schedule.ts';
import { checkPosition } from '../data/position.ts';
import { isOpen24h } from '../data/hours.ts';
import type { EmergencyVet } from '../data/emergency-page.ts';

const BOROUGH_MIDDLES: Record<string, { label: string; at: Origin }> = {
  manhattan: { label: 'Manhattan', at: { lat: 40.7831, lon: -73.9712 } },
  brooklyn: { label: 'Brooklyn', at: { lat: 40.6501, lon: -73.9496 } },
  queens: { label: 'Queens', at: { lat: 40.7282, lon: -73.7949 } },
  bronx: { label: 'the Bronx', at: { lat: 40.8448, lon: -73.8648 } },
  'staten-island': { label: 'Staten Island', at: { lat: 40.5795, lon: -74.1502 } },
};

const root = document.querySelector<HTMLElement>('[data-em]');
const vets: EmergencyVet[] = JSON.parse(document.getElementById('em-data')?.textContent ?? '[]');
const count = Number(root?.dataset.emCount ?? 3);
const list = document.querySelector<HTMLElement>('[data-em-list]');
const note = document.querySelector<HTMLElement>('[data-em-note]');
const zipBox = document.querySelector<HTMLInputElement>('[data-em-zip]');
const locate = document.querySelector<HTMLButtonElement>('[data-em-locate]');
let origin: Origin | null = null;
let centres: Record<string, [number, number]> | null = null;

function say(text: string): void {
  if (!note) return;
  note.textContent = text;
  note.hidden = !text;
}

function miles(v: EmergencyVet): string | null {
  if (!origin || !v.geo) return null;
  const m = distanceMiles(origin, v.geo);
  return `${m < 10 ? m.toFixed(1) : Math.round(m)} mi`;
}

function directions(v: EmergencyVet): string | null {
  if (!v.street) return null;
  const q = [v.name, v.street, v.area, v.zip].filter(Boolean).join(', ');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

function el(tag: string, cls: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function render(): void {
  if (!list || !origin) return;
  const now = new Date();
  const rank = (v: EmergencyVet) => rankKey(v, { origin: origin!, now, emergency: true });
  const away = (v: EmergencyVet) => (v.geo ? distanceMiles(origin!, v.geo) : Infinity);
  // The page says "go to a 24-hour hospital", so that is what it lists. A
  // daytime clinic is added only when it is open now and nearer than the
  // first of them -- the Bronx in daytime, where the nearest 24-hour
  // hospital is in Queens or Manhattan -- and is labelled for what it is.
  // Only walk-in urgent care counts: an ordinary vet practice open until 7pm
  // may not see an emergency at all, and offering one 0.3 miles away pulled
  // the reader past a 24-hour hospital a mile off. Bird and exotic-animal
  // vets are left out for the same reason.
  const open = vets
    .filter((v) => isOpen24h(v.hours))
    .map((v) => ({ v, st: openState(v.hours, now), day: false }))
    .filter(({ st }) => st.state === 'open')
    .sort((a, b) => compareKeys(rank(a.v), rank(b.v)))
    .slice(0, count);
  const nearest24 = open[0] ? away(open[0].v) : Infinity;
  const day = vets
    .filter((v) => v.urgentCare && !isOpen24h(v.hours) && !v.needs.includes('exotic-vet') && away(v) < nearest24)
    .map((v) => ({ v, st: openState(v.hours, now), day: true }))
    .filter(({ st }) => st.state === 'open')
    .sort((a, b) => away(a.v) - away(b.v))[0];
  if (day) open.push(day);
  list.replaceChildren();
  list.hidden = false;
  if (!open.length) {
    // Has not happened with the records as they are (27 hospitals here are open 24 hours), but
    // if hours ever fail to read, say so rather than show nothing.
    const p = el('p', 'em-none', 'We cannot confirm that any hospital is open at this minute. Ring before you set off: ');
    const a = el('a', '', 'every emergency vet, with their numbers') as HTMLAnchorElement;
    a.href = '/directory?need=emergency-vet';
    p.append(a, '.');
    list.append(p);
    return;
  }
  open.forEach(({ v, st, day }, i) => {
    const card = el('div', `em-vet${i === 0 ? ' em-vet--first' : ''}${day ? ' em-vet--day' : ''}`);
    if (day) card.append(el('p', 'em-vet__kicker', 'Nearer, but not a 24-hour hospital'));
    const top = el('div', 'em-vet__top');
    top.append(el('a', 'em-vet__name', v.name));
    (top.firstChild as HTMLAnchorElement).href = `/org/${v.id}`;
    const d = miles(v);
    if (d) top.append(el('span', 'em-vet__mi', d));
    card.append(top);
    const label = st.state === 'open' && st.until === null ? 'Open 24 hours' : openLabel(st, now) ?? 'Open now';
    card.append(el('p', 'em-vet__meta', [label, [v.street, v.area].filter(Boolean).join(', ')].filter(Boolean).join(' · ')));
    const acts = el('div', 'em-vet__acts');
    const call = el('a', 'em-vet__call', `Call ${v.phone}`) as HTMLAnchorElement;
    call.href = v.tel;
    acts.append(call);
    const dir = directions(v);
    if (dir) {
      const a = el('a', 'em-vet__dir', 'Map') as HTMLAnchorElement;
      a.href = dir;
      a.rel = 'noopener';
      a.target = '_blank';
      acts.append(a);
    }
    card.append(acts);
    list.append(card);
  });
  // A call button kept on screen (option C) rings whichever is first.
  const first = open[0]!.v;
  for (const b of document.querySelectorAll<HTMLAnchorElement>('[data-em-first]')) {
    b.href = first.tel;
    b.classList.remove('is-waiting');
    const small = b.querySelector('small');
    if (small) small.textContent = first.name;
  }
  root?.classList.add('em--placed');
}

function setOrigin(o: Origin, label: string, text: string): void {
  origin = o;
  say(text);
  for (const b of document.querySelectorAll<HTMLElement>('[data-em-borough]')) {
    b.setAttribute('aria-pressed', String(b.dataset.emBorough === label));
  }
  render();
  list?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-em-borough]')) {
  b.addEventListener('click', () => {
    const m = BOROUGH_MIDDLES[b.dataset.emBorough!]!;
    if (zipBox) zipBox.value = '';
    setOrigin(m.at, b.dataset.emBorough!, `Nearest to the middle of ${m.label}. For a closer answer, type your zip code.`);
  });
}

zipBox?.addEventListener('input', async () => {
  const zip = zipBox.value.trim();
  if (!/^\d{5}$/.test(zip)) return;
  if (!centres) {
    try {
      centres = await (await fetch('/zip-centres.json')).json();
    } catch {
      say('Could not look up zip codes just now. Tap your borough instead.');
      return;
    }
  }
  const c = centres![zip];
  if (!c) {
    say(`${zip} is not a New York City zip code we know. Tap your borough instead.`);
    return;
  }
  setOrigin({ lat: c[0], lon: c[1] }, zip, `Nearest to ${zip}, straight-line distance.`);
});

if (locate && 'geolocation' in navigator) {
  locate.hidden = false;
  locate.addEventListener('click', () => {
    locate.disabled = true;
    const was = locate.textContent;
    locate.textContent = 'Finding you…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locate.disabled = false;
        locate.textContent = was;
        const check = checkPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        if (!check.use) {
          say(`${check.note.replace('Type your zip code instead.', '')} Tap your borough or type your zip instead.`);
          return;
        }
        if (zipBox) zipBox.value = '';
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude }, 'me', `${check.note} Your location stays on this phone.`);
      },
      (err) => {
        locate.disabled = false;
        locate.textContent = was;
        say(err.code === err.PERMISSION_DENIED
          ? 'Location is off for this site. Tap your borough or type your zip instead.'
          : 'Your phone could not find you just now. Tap your borough or type your zip instead.');
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  });
}

// "Open now" changes with the clock; keep it true while the page stays open.
setInterval(render, 60_000);
