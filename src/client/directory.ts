/**
 * Directory search and filtering.
 *
 * Every card is already in the page, so filtering is a DOM pass with no
 * network and no rendering. Only free-text search needs the index, and that is
 * fetched the first time someone types -- a visitor who only taps "Brooklyn"
 * and "Emergency vet" never downloads it.
 *
 * Filter state lives in the URL so a result list can be shared or bookmarked.
 *
 * The search behaviour itself lives in ../data/search.ts, shared with the
 * tests and with the chat assistant's server-side retrieval.
 */
import type MiniSearch from 'minisearch';
import { buildIndex, runSearch, type SearchRecordLike } from '../data/search.ts';
import { servesBoroughs, servesZip } from '../data/area.ts';
import { guidesFor, type GuideTopics } from '../data/guide-match.ts';
import { EMERGENCY_QUERY, compareKeys, distanceMiles, rankKey, type Origin } from '../data/rank.ts';
import { openLabel, openState } from '../data/schedule.ts';
import { checkPosition } from '../data/position.ts';

interface FilterState {
  q: string;
  animal: Set<string>;
  borough: Set<string>;
  need: Set<string>;
  confidence: Set<string>;
  zip: string;
  phone: boolean;
  activeOnly: boolean;
}

const form = document.getElementById('filters') as HTMLFormElement | null;
const list = document.getElementById('results') as HTMLElement | null;
const searchInput = document.getElementById('q') as HTMLInputElement | null;
const summary = document.getElementById('results-summary');
const emptyState = document.getElementById('no-results');
const searchForm = searchInput?.closest('form') as HTMLFormElement | null;

if (form && list) {
  const cards = Array.from(list.querySelectorAll<HTMLLIElement>('li.card'));

  // Read each card's facets once; the DOM is not queried again while typing.
  const meta = new Map<string, {
    el: HTMLLIElement;
    animals: string[];
    needs: string[];
    boroughs: string[];
    zips: string[];
    citywide: boolean;
    confidence: string;
    status: string;
    hasPhone: boolean;
    verified: number;
    order: number;
    hours: string | null;
    outside: boolean;
    geo: { lat: number; lon: number; precision: 'address' | 'zip' } | null;
  }>();

  const split = (v: string | undefined) => (v ? v.split(',').filter(Boolean) : []);

  cards.forEach((el, order) => {
    const id = el.dataset.orgId!;
    meta.set(id, {
      el,
      animals: split(el.dataset.animals),
      needs: split(el.dataset.needs),
      boroughs: split(el.dataset.boroughs),
      zips: split(el.dataset.zips),
      citywide: el.dataset.citywide === '1',
      confidence: el.dataset.confidence ?? 'Low',
      status: el.dataset.status ?? 'active',
      hasPhone: el.dataset.hasPhone === '1',
      verified: el.dataset.verified ? Date.parse(el.dataset.verified) : 0,
      order,
      hours: el.dataset.hours ?? null,
      outside: el.dataset.outside === '1',
      geo: el.dataset.lat && el.dataset.lon
        ? { lat: Number(el.dataset.lat), lon: Number(el.dataset.lon), precision: el.dataset.geo === 'zip' ? 'zip' : 'address' }
        : null,
    });
  });

  let index: MiniSearch<SearchRecordLike> | null = null;
  let indexLoading: Promise<void> | null = null;

  async function loadIndex(): Promise<void> {
    if (index) return;
    if (indexLoading) return indexLoading;
    indexLoading = (async () => {
      const url = list!.dataset.indexUrl ?? '/search-index.json';
      const records: SearchRecordLike[] = await (await fetch(url)).json();
      index = buildIndex(records);
    })();
    return indexLoading;
  }

  function readState(): FilterState {
    const data = new FormData(form!);
    return {
      q: searchInput?.value.trim() ?? '',
      animal: new Set(data.getAll('animal') as string[]),
      borough: new Set(data.getAll('borough') as string[]),
      need: new Set(data.getAll('need') as string[]),
      confidence: new Set(data.getAll('confidence') as string[]),
      zip: (data.get('zip') as string | null)?.trim() ?? '',
      phone: data.get('phone') === '1',
      activeOnly: data.get('active') === '1',
    };
  }

  function writeUrl(state: FilterState): void {
    const params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    for (const [key, set] of [
      ['animal', state.animal], ['borough', state.borough],
      ['need', state.need], ['confidence', state.confidence],
    ] as const) {
      for (const v of set) params.append(key, v);
    }
    if (state.zip) params.set('zip', state.zip);
    if (state.phone) params.set('phone', '1');
    if (state.activeOnly) params.set('active', '1');
    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  function applyUrlToForm(): void {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q && searchInput) searchInput.value = q;
    const zip = params.get('zip');
    if (zip) (form!.elements.namedItem('zip') as HTMLInputElement).value = zip;

    for (const name of ['animal', 'borough', 'need', 'confidence'] as const) {
      const wanted = new Set(params.getAll(name));
      if (!wanted.size) continue;
      form!.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`).forEach((el) => {
        el.checked = wanted.has(el.value);
      });
    }
    for (const name of ['phone', 'active'] as const) {
      if (params.get(name) === '1') {
        const el = form!.querySelector<HTMLInputElement>(`input[name="${name}"]`);
        if (el) el.checked = true;
      }
    }
  }

  const hasAll = (have: string[], want: Set<string>) => {
    for (const w of want) if (!have.includes(w)) return false;
    return true;
  };

  async function run(updateUrl = true): Promise<void> {
    const state = readState();

    // Text search narrows first, and also supplies the relevance order.
    let matched: Set<string> | null = null;
    let rank: Map<string, number> | null = null;
    if (state.q) {
      await loadIndex();
      // People type whole situations -- "injured pigeon brooklyn" -- not
      // keywords. Requiring every term is precise when it works and useless
      // when it does not, so we try AND first and widen to OR when that leaves
      // too little to choose from. MiniSearch still ranks documents matching
      // more terms higher, so the best answers stay on top either way.
      const hits = runSearch(index!, state.q);
      matched = new Set(hits.map((h) => h.id));
      rank = new Map(hits.map((h, i) => [h.id, i]));
      // A query that matches nothing fuzzily still deserves a substring pass,
      // so "bluepearl" finds "BluePearl" and a partial zip still works.
      if (matched.size === 0) {
        const needle = state.q.toLowerCase();
        for (const [id, m] of meta) {
          if (m.el.dataset.name?.toLowerCase().includes(needle)) matched.add(id);
        }
      }
    }

    showGuideHints(state.q);

    let shown = 0;
    const visible: Array<{ id: string; m: NonNullable<ReturnType<typeof meta.get>> }> = [];

    for (const [id, m] of meta) {
      let ok = true;
      if (matched && !matched.has(id)) ok = false;
      if (ok && state.animal.size && !hasAll(m.animals, state.animal)) ok = false;
      if (ok && state.need.size && !hasAll(m.needs, state.need)) ok = false;
      // Boroughs are an OR: someone in Queens wants anything serving Queens.
      if (ok && state.borough.size) ok = servesBoroughs(m, state.borough);
      if (ok && state.confidence.size && !state.confidence.has(m.confidence)) ok = false;
      // A zip shows its whole borough plus everything citywide; the ordering
      // below puts what is near the zip first. See src/data/area.ts for why
      // stored zips must not hide anything.
      if (ok && state.zip) ok = servesZip(m, state.zip);
      if (ok && state.phone && !m.hasPhone) ok = false;
      if (ok && state.activeOnly && m.status !== 'active') ok = false;

      m.el.hidden = !ok;
      if (ok) {
        shown++;
        visible.push({ id, m });
      }
    }

    // With a location, or when the reader needs a vet now, the shared ranking
    // (src/data/rank.ts, also the assistant's) decides: open now, then nearest,
    // then firmest evidence. Search relevance comes last, so the nearest
    // relevant place wins rather than the best-worded far one.
    const emergency = state.need.has('emergency-vet') || EMERGENCY_QUERY.test(state.q);
    const now = new Date();
    // A zip typed into the filters orders from that zip too, unless the
    // reader has already given a closer origin (their location, or the
    // "nearest to zip" box). Showing the whole borough is only useful if what
    // is around the corner comes first.
    filterZipOrigin = null;
    if (!origin && /^\d{5}$/.test(state.zip)) {
      const c = (await centres())[state.zip];
      if (c) filterZipOrigin = { lat: c[0], lon: c[1] };
    }
    showDistances();
    const from = origin ?? filterZipOrigin;
    if (from || emergency) {
      const keyOf = (id: string, m: (typeof visible)[number]['m']) => {
        const k = rankKey({ needs: m.needs, hours: m.hours, status: m.status, confidence: m.confidence, geo: m.geo, outside: m.outside }, { origin: from, now, emergency });
        // Search wording only breaks ties: the query has already narrowed the
        // list, and among what is left, open, near and well evidenced matter.
        return [...k, rank?.get(id) ?? 0, m.order];
      };
      const keys = new Map(visible.map(({ id, m }) => [id, keyOf(id, m)]));
      visible.sort((a, b) => compareKeys(keys.get(a.id)!, keys.get(b.id)!));
      for (const { m } of visible) list!.appendChild(m.el);
      describeOrder(emergency);
      finish(shown, updateUrl, state);
      return;
    }
    describeOrder(false);

    // Best match first when there is a query; then firmest evidence; then the
    // most recently verified. Someone in a hurry should meet the surest entry.
    const CONF: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    visible.sort((a, b) => {
      if (rank) {
        const ra = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const rb = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        if (ra !== rb) return ra - rb;
      }
      const ca = CONF[a.m.confidence] ?? 3;
      const cb = CONF[b.m.confidence] ?? 3;
      if (ca !== cb) return ca - cb;
      if (a.m.verified !== b.m.verified) return b.m.verified - a.m.verified;
      return a.m.order - b.m.order;
    });
    for (const { m } of visible) list!.appendChild(m.el);
    finish(shown, updateUrl, state);
  }

  // A search that names a situation gets the guide for it above the
  // organizations: the steps first, then who to call.
  const hintBox = document.getElementById('guide-hints');
  let guideTopics: GuideTopics[] = [];
  try {
    guideTopics = JSON.parse(document.getElementById('guide-topics')?.textContent ?? '[]');
  } catch {
    guideTopics = [];
  }
  function showGuideHints(q: string): void {
    if (!hintBox) return;
    const found = q ? guidesFor(q, guideTopics) : [];
    hintBox.replaceChildren();
    hintBox.hidden = found.length === 0;
    for (const g of found) {
      const a = document.createElement('a');
      a.className = 'guide-hint';
      a.href = `/guides/${g.slug}`;
      const label = document.createElement('span');
      label.className = 'guide-hint__label';
      label.textContent = 'Guide: what to do';
      const title = document.createElement('strong');
      title.textContent = g.title;
      const summary = document.createElement('span');
      summary.className = 'guide-hint__summary';
      summary.textContent = g.summary;
      a.append(label, title, summary);
      hintBox.append(a);
    }
  }

  function finish(shown: number, updateUrl: boolean, state: FilterState): void {
    if (summary) {
      summary.textContent =
        shown === meta.size
          ? `Showing all ${shown} resources`
          : shown === 1
            ? `1 of ${meta.size} resources matches`
            : `${shown} of ${meta.size} resources match`;
    }
    if (emptyState) emptyState.hidden = shown !== 0;
    if (updateUrl) writeUrl(state);
  }

  // JS takes over submission; without it the form still works as a GET.
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void run();
  });
  searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    void run();
  });
  form.addEventListener('change', () => void run());

  let typingTimer: number | undefined;
  searchInput?.addEventListener('input', () => {
    window.clearTimeout(typingTimer);
    typingTimer = window.setTimeout(() => void run(), 160);
  });

  document.getElementById('clear-filters')?.addEventListener('click', () => {
    form.reset();
    if (searchInput) searchInput.value = '';
    void run();
  });

  const toggle = document.getElementById('filters-toggle');
  const narrow = window.matchMedia('(max-width: 899px)');

  function setFiltersOpen(open: boolean): void {
    if (open) form!.removeAttribute('hidden');
    else form!.setAttribute('hidden', '');
    toggle?.setAttribute('aria-expanded', String(open));
    if (toggle) toggle.textContent = open ? 'Hide filters' : 'Show filters';
  }

  toggle?.addEventListener('click', () => setFiltersOpen(form.hasAttribute('hidden')));

  // On a phone the filter panel would push the results off the screen, so it
  // starts collapsed -- but only once JavaScript can reopen it. Without JS the
  // server-rendered panel stays visible and usable.
  if (narrow.matches) {
    const params = new URLSearchParams(location.search);
    const arrivedFiltered = ['animal', 'borough', 'need', 'confidence', 'zip', 'phone', 'active']
      .some((k) => params.has(k));
    setFiltersOpen(arrivedFiltered);
  }
  narrow.addEventListener('change', (e) => {
    if (!e.matches) form.removeAttribute('hidden');
  });

  // --- nearest to me ---------------------------------------------------------
  // The location is asked for only when the button is tapped, kept in memory,
  // and never written to the address bar or sent anywhere: the sorting happens
  // here, on the reader's own device.
  let origin: Origin | null = null;
  const nearZip = document.getElementById('near-zip') as HTMLInputElement | null;
  let zipCentres: Record<string, [number, number]> | null = null;
  let originFromZip = false;
  let filterZipOrigin: Origin | null = null;
  async function centres(): Promise<Record<string, [number, number]>> {
    if (!zipCentres) {
      try {
        zipCentres = await (await fetch('/zip-centres.json')).json();
      } catch {
        // Ordering by distance is a nicety; filtering still works without it.
        return {};
      }
    }
    return zipCentres!;
  }
  const nearBtn = document.getElementById('near-me') as HTMLButtonElement | null;
  const nearNote = document.getElementById('near-me-note');
  const orderLabel = document.getElementById('results-order');

  function describeOrder(emergency: boolean): void {
    if (!orderLabel) return;
    const typedZip = (form!.elements.namedItem('zip') as HTMLInputElement | null)?.value.trim();
    const where = origin
      ? originFromZip && nearZip ? `nearest to ${nearZip.value.trim()}` : 'nearest to you'
      : `nearest to ${typedZip}`;
    const parts = [emergency ? 'Open now first' : null, origin || filterZipOrigin ? where : null].filter(Boolean) as string[];
    orderLabel.textContent = parts.length
      ? `${parts.join(', then ')}, then strongest evidence`
      : searchInput?.value.trim() ? 'Best match first' : 'Strongest evidence first';
  }

  function showDistances(): void {
    const from = origin ?? filterZipOrigin;
    for (const m of meta.values()) {
      const span = m.el.querySelector<HTMLElement>('.card__distance');
      if (!span) continue;
      if (!from || !m.geo) {
        span.hidden = true;
        continue;
      }
      const miles = distanceMiles(from, m.geo);
      const shown = miles < 10 ? miles.toFixed(1) : String(Math.round(miles));
      // A zip code's centre is not the door; say so.
      span.textContent = `${m.geo.precision === 'zip' ? 'about ' : ''}${shown} mi`;
      span.title = m.geo.precision === 'zip' ? 'Measured to the centre of its zip code' : 'Measured to its street address, as the crow flies';
      span.hidden = false;
    }
  }

  // --- nearest to a zip code ---------------------------------------------------
  // For everyone who keeps location services off: type a zip, and results are
  // ordered from the middle of it. Not a filter -- the nearest hospital may be
  // over a borough line -- and nothing about it leaves the page.
  nearZip?.addEventListener('input', async () => {
    const zip = nearZip.value.trim();
    if (!/^\d{5}$/.test(zip)) {
      if (originFromZip) {
        origin = null;
        originFromZip = false;
        if (nearNote) nearNote.hidden = true;
        showDistances();
        void run(false);
      }
      return;
    }
    const c = (await centres())[zip];
    if (nearNote) nearNote.hidden = false;
    if (!c) {
      if (nearNote) nearNote.textContent = `${zip} is not a New York City zip code we know.`;
      return;
    }
    origin = { lat: c[0], lon: c[1] };
    originFromZip = true;
    if (nearBtn) nearBtn.textContent = 'Nearest to me';
    if (nearNote) nearNote.textContent = `Distances are from the middle of ${zip}, straight-line and approximate.`;
    showDistances();
    void run(false);
  });

  if (nearBtn && 'geolocation' in navigator) {
    nearBtn.hidden = false;
    nearBtn.addEventListener('click', () => {
      if (origin) {
        origin = null;
        nearBtn.textContent = 'Nearest to me';
        if (nearNote) nearNote.hidden = true;
        showDistances();
        void run(false);
        return;
      }
      nearBtn.disabled = true;
      nearBtn.textContent = 'Finding you…';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          nearBtn.disabled = false;
          // A phone can report the wrong place: a cell tower miles off, a VPN
          // abroad, yesterday's fix. Check before trusting it, and say why.
          const check = checkPosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
          if (nearNote) {
            nearNote.hidden = false;
            nearNote.textContent = `${check.note} Your location stays on this device.`;
          }
          if (!check.use) {
            nearBtn.textContent = 'Nearest to me';
            nearZip?.focus();
            return;
          }
          origin = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          originFromZip = false;
          if (nearZip) nearZip.value = '';
          nearBtn.textContent = 'Stop sorting by distance';
          showDistances();
          void run(false);
        },
        (err) => {
          nearBtn.disabled = false;
          nearBtn.textContent = 'Nearest to me';
          if (nearNote) {
            nearNote.hidden = false;
            nearNote.textContent =
              err.code === err.PERMISSION_DENIED
                ? 'Location is switched off or blocked for this site. Type your zip code in the box instead.'
                : 'Your phone could not find your location just now. Type your zip code in the box instead.';
          }
          nearZip?.focus();
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
      );
    });
  }

  // --- open now ----------------------------------------------------------------
  // Built pages cannot know the time, so a daytime vet's "Not open overnight"
  // becomes "Open now · until 7pm" or "Closed now · opens 9am" here. Hours this
  // cannot read with certainty keep the plain tag.
  function refreshOpenTags(): void {
    const now = new Date();
    for (const m of meta.values()) {
      const tag = m.el.querySelector<HTMLElement>('[data-open-tag]');
      if (!tag) continue;
      const label = openLabel(openState(m.hours, now), now);
      if (label) tag.textContent = label;
    }
  }
  refreshOpenTags();
  window.setInterval(refreshOpenTags, 60_000);

  applyUrlToForm();
  void run(false);
}
