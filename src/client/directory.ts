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
import { zipToBorough } from '../data/geo.ts';

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

    let shown = 0;
    const visible: Array<{ id: string; m: NonNullable<ReturnType<typeof meta.get>> }> = [];

    for (const [id, m] of meta) {
      let ok = true;
      if (matched && !matched.has(id)) ok = false;
      if (ok && state.animal.size && !hasAll(m.animals, state.animal)) ok = false;
      if (ok && state.need.size && !hasAll(m.needs, state.need)) ok = false;
      if (ok && state.borough.size) {
        // Boroughs are an OR: someone in Queens wants anything serving Queens.
        ok = m.citywide || [...state.borough].some((b) => m.boroughs.includes(b));
      }
      if (ok && state.confidence.size && !state.confidence.has(m.confidence)) ok = false;
      if (ok && state.zip) {
        // A group that names zips is specific to them. One that names only a
        // borough serves the whole borough, so it answers a zip in it too.
        const zipBorough = zipToBorough(state.zip);
        ok =
          m.zips.includes(state.zip) ||
          m.citywide ||
          (zipBorough !== null && m.zips.length === 0 && m.boroughs.includes(zipBorough));
      }
      if (ok && state.phone && !m.hasPhone) ok = false;
      if (ok && state.activeOnly && m.status !== 'active') ok = false;

      m.el.hidden = !ok;
      if (ok) {
        shown++;
        visible.push({ id, m });
      }
    }

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

  applyUrlToForm();
  void run(false);
}
