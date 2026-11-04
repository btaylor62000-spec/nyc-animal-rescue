/**
 * Opening hours as a weekly timetable, and whether a place is open right now.
 *
 * Shared by the directory (in the browser, where "now" is the reader's clock)
 * and the assistant (on the server). Both read New York time, whatever time
 * zone the device is in.
 *
 * The rule that matters: a wrong "Open now" sends someone across the city to
 * a locked door, so anything this cannot read with certainty -- "daytime
 * only", "late hours, call" -- is unknown, never guessed. Unknown sorts after
 * open and before closed, and the card says nothing about now.
 */
import { isOpen24h } from './hours.ts';

/** Minutes after midnight, [open, close); close may be 1440 for midnight. */
export type Interval = [number, number];
/** Sunday = 0 ... Saturday = 6, as Date.getDay(). */
export type Week = Interval[][];
export type Schedule = { always: true } | { always: false; week: Week };

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY = '(sun|mon|tue|wed|thu|fri|sat)[a-z]*\\.?';
const TIME = '(\\d{1,2})(?::(\\d{2}))?\\s*([ap])\\.?m\\.?';

function minutes(h: string, m: string | undefined, ap: string, isEnd: boolean): number {
  let hour = Number(h) % 12;
  if (ap.toLowerCase() === 'p') hour += 12;
  const total = hour * 60 + Number(m ?? 0);
  // "10am-12am" closes at midnight, the end of the day, not its start.
  return isEnd && total === 0 ? 1440 : total;
}

function dayRange(from: string, to: string | undefined): number[] {
  const a = DAYS.indexOf(from.slice(0, 3).toLowerCase());
  const b = to ? DAYS.indexOf(to.slice(0, 3).toLowerCase()) : a;
  const out: number[] = [];
  for (let d = a; ; d = (d + 1) % 7) {
    out.push(d);
    if (d === b) break;
  }
  return out;
}

export function parseSchedule(hours: string | null | undefined): Schedule | null {
  if (!hours) return null;
  if (isOpen24h(hours)) return { always: true };
  // A note for another branch, "(Bay Ridge: Sun 10am-6pm)", is not these hours.
  const text = hours.replace(/\([^)]*\)/g, ' ');
  const week: Week = [[], [], [], [], [], [], []];
  let understood = false;

  const everyDay = new RegExp(`(?:every day|daily|7 days)[^\\d]*${TIME}\\s*[-–]\\s*${TIME}|${TIME}\\s*[-–]\\s*${TIME}[^,;]*(?:every day|daily|7 days)`, 'i');
  const e = text.match(everyDay);
  if (e) {
    const g = e[1] ? e.slice(1, 7) : e.slice(7, 13);
    const iv: Interval = [minutes(g[0]!, g[1], g[2]!, false), minutes(g[3]!, g[4], g[5]!, true)];
    for (let d = 0; d < 7; d++) week[d]!.push(iv);
    return { always: false, week };
  }

  for (const part of text.split(/[,;]/)) {
    const m = part.match(new RegExp(`${DAY}(?:\\s*[-–]\\s*${DAY})?\\s*:?\\s*(?:${TIME}\\s*[-–]\\s*${TIME}|(closed))`, 'i'));
    if (!m) continue;
    understood = true;
    const days = dayRange(m[1]!, m[2]);
    if (m[9]) continue; // closed
    const iv: Interval = [minutes(m[3]!, m[4], m[5]!, false), minutes(m[6]!, m[7], m[8]!, true)];
    for (const d of days) week[d]!.push(iv);
  }
  return understood ? { always: false, week } : null;
}

/** The weekday and minute of the day in New York, for any instant. */
export function newYorkTime(now: Date): { day: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { day: DAYS.indexOf(get('weekday').slice(0, 3).toLowerCase()), minute: Number(get('hour')) * 60 + Number(get('minute')) };
}

export type OpenState =
  | { state: 'open'; until: number | null }
  | { state: 'closed'; opens: { day: number; minute: number } | null }
  | { state: 'unknown' };

export function openState(hours: string | null | undefined, now: Date): OpenState {
  const s = parseSchedule(hours);
  if (!s) return { state: 'unknown' };
  if (s.always) return { state: 'open', until: null };
  const { day, minute } = newYorkTime(now);
  const today = s.week[day]!.find(([a, b]) => minute >= a && minute < b);
  if (today) return { state: 'open', until: today[1] };
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    const next = s.week[d]!.filter(([a]) => i > 0 || a > minute).sort((x, y) => x[0] - y[0])[0];
    if (next) return { state: 'closed', opens: { day: d, minute: next[0] } };
  }
  return { state: 'closed', opens: null };
}

function clock(min: number): string {
  if (min === 1440 || min === 0) return 'midnight';
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Open now · until 7pm", "Closed now · opens 9am", "Closed now · opens Monday 9am". */
export function openLabel(st: OpenState, now: Date): string | null {
  if (st.state === 'open') return st.until === null ? null : `Open now · until ${clock(st.until)}`;
  if (st.state === 'closed') {
    if (!st.opens) return 'Closed now';
    const today = newYorkTime(now).day;
    const when = st.opens.day === today ? '' : st.opens.day === (today + 1) % 7 ? 'tomorrow ' : `${DAY_NAMES[st.opens.day]} `;
    return `Closed now · opens ${when}${clock(st.opens.minute)}`;
  }
  return null;
}
