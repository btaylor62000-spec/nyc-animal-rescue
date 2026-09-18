/**
 * De-duplication.
 *
 * Several organizations appear in more than one workbook (Sean Casey is in all
 * three), and the emergency rooms appear in both the cat and dog guide tabs.
 * Merging them gives one record with the union of what each source knew.
 *
 * Two guards matter more than the merging itself:
 *   - A shared domain is NOT evidence of sameness. `nycacc.org` covers five
 *     genuinely distinct ACC programmes, and `facebook.com` is the listed
 *     "website" for seven unrelated groups.
 *   - Records that disagree about a physical location are never merged. Two
 *     "Urgent Vets" rows with different ZIPs are two different clinics, and
 *     silently combining them would publish a wrong number for an urgent case.
 */
import type { Confidence, Org, Status } from '../../src/types.ts';
import { mergeKey, mergeTokens } from './normalize.ts';
import { AGGREGATOR_DOMAINS, DROP_NAMES, NAME_ALIASES, NEVER_MERGE } from './overrides.ts';

export interface MergeConflict {
  ids: string[];
  field: string;
  values: string[];
  note: string;
}

export interface MergeResult {
  orgs: Org[];
  merged: Array<{ into: string; from: string[]; key: string }>;
  conflicts: MergeConflict[];
  /** Pairs that looked alike but were deliberately kept apart. */
  keptApart: Array<{ ids: string[]; reason: string }>;
}

const STATUS_SEVERITY: Record<Status, number> = {
  retired: 4, relocated: 3, hiatus: 2, verify: 1, active: 0,
};
const CONFIDENCE_RANK: Record<Confidence, number> = { High: 3, Medium: 2, Low: 1 };

function uniq<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of items) {
    const k = key(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

const STREET_ABBREV: Array<[RegExp, string]> = [
  // Spelled-out ordinals: "190 Third Ave" is "190 3rd Ave".
  [/\bfirst\b/g, '1st'],
  [/\bsecond\b/g, '2nd'],
  [/\bthird\b/g, '3rd'],
  [/\bfourth\b/g, '4th'],
  [/\bfifth\b/g, '5th'],
  [/\bsixth\b/g, '6th'],
  [/\bseventh\b/g, '7th'],
  [/\beighth\b/g, '8th'],
  [/\bninth\b/g, '9th'],
  [/\btenth\b/g, '10th'],
  [/\b(street|st)\b/g, 'st'],
  [/\b(avenue|ave)\b/g, 'ave'],
  [/\b(road|rd)\b/g, 'rd'],
  [/\b(boulevard|blvd)\b/g, 'blvd'],
  [/\b(place|pl)\b/g, 'pl'],
  [/\b(drive|dr)\b/g, 'dr'],
  [/\b(parkway|pkwy)\b/g, 'pkwy'],
  [/\b(east|e)\b/g, 'e'],
  [/\b(west|w)\b/g, 'w'],
  [/\b(north|n)\b/g, 'n'],
  [/\b(south|s)\b/g, 's'],
];

/** "1293 Clove Rd" and "1293 Clove Road" are the same address. */
function normalizeStreet(s: string): string {
  let out = s.toLowerCase().replace(/[.,]/g, ' ');
  for (const [re, to] of STREET_ABBREV) out = out.replace(re, to);
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Does this pair describe two different physical places?
 *
 * Only a record's own `address` counts. The `zips` array on a directory row is
 * the area a group *serves*, not where it sits -- K9Kastle serves six southern
 * Brooklyn ZIPs and is incorporated in 10003, and treating that as a conflict
 * would wrongly split one organization in two.
 */
function locationConflict(a: Org, b: Org): string | null {
  const aStreet = a.address?.street;
  const bStreet = b.address?.street;
  if (aStreet && bStreet && normalizeStreet(aStreet) !== normalizeStreet(bStreet)) {
    return `different street addresses ("${aStreet}" vs "${bStreet}")`;
  }

  const az = a.address?.zip;
  const bz = b.address?.zip;
  if (az && bz && az !== bz) return `different address ZIPs (${az} vs ${bz})`;

  // Many records extracted from guide prose name a borough but no street, so
  // the checks above cannot see them. A chain that runs one clinic per borough
  // -- the ASPCA community clinics, for instance -- would otherwise collapse
  // into a single record and lose two of the three locations.
  if (!a.citywide && !b.citywide && a.boroughs.length && b.boroughs.length) {
    const shared = a.boroughs.some((x) => b.boroughs.includes(x));
    if (!shared) {
      return `different boroughs (${a.boroughs.join('/')} vs ${b.boroughs.join('/')})`;
    }
  }

  return null;
}

const neverMergeSet = new Set(NEVER_MERGE.flatMap(([x, y]) => [`${x}|${y}`, `${y}|${x}`]));

/**
 * Records that share a phone line but give different street addresses.
 *
 * These never merge -- their names differ -- so nothing here is auto-corrected.
 * But one of the two addresses is likely stale, and for an emergency room that
 * matters, so it is surfaced for a human to check.
 */
function detectAddressConflicts(all: Org[]): MergeConflict[] {
  const byPhone = new Map<string, Org[]>();
  for (const org of all) {
    if (!org.address?.street) continue;
    for (const p of org.phones) {
      const bucket = byPhone.get(p.value);
      if (bucket) bucket.push(org);
      else byPhone.set(p.value, [org]);
    }
  }

  const out: MergeConflict[] = [];
  const reported = new Set<string>();
  for (const [phone, bucket] of byPhone) {
    const streets = new Map<string, Org>();
    for (const o of bucket) streets.set(normalizeStreet(o.address!.street!), o);
    if (streets.size < 2) continue;
    const ids = [...streets.values()].map((o) => o.id).sort();
    const key = ids.join('|');
    if (reported.has(key)) continue;
    reported.add(key);
    out.push({
      ids,
      field: 'address',
      values: [...streets.values()].map((o) => `${o.name}: ${o.address!.street}`),
      note: `Same phone line (${phone}) listed at different addresses. One source is probably out of date -- verify before relying on either.`,
    });
  }
  return out;
}

/** The merge key, after resolving a curated shorthand to its full name. */
function keyFor(name: string): string {
  const alias = NAME_ALIASES.find((a) => a.pattern.test(name.trim()));
  return mergeKey(alias ? alias.canonicalName : name);
}

/**
 * Is `short` a leading run of words in `long`, substantial enough that the two
 * are plausibly the same organization under a longer descriptive name?
 *
 * Guide prose repeats organizations this way -- "Pet Poison Helpline" and
 * "Pet Poison Helpline - 24/7 HOTLINE". But "Second Chance" opens two
 * unrelated rescues, and "Brooklyn" opens a dozen, so a short lead is not
 * enough on its own.
 */
function isNamePrefix(short: string[], long: string[]): boolean {
  if (short.length === 0 || short.length >= long.length) return false;
  for (let i = 0; i < short.length; i++) if (short[i] !== long[i]) return false;

  const chars = short.join('').length;
  if (short.length >= 3) return true;
  if (short.length === 2 && chars >= 14) return true;
  if (short.length === 1 && chars >= 10) return true;
  return false;
}

function domainsOf(orgs: Org[]): Set<string> {
  const out = new Set<string>();
  for (const o of orgs) {
    const h = hostOf(o.website);
    if (h && !AGGREGATOR_DOMAINS.has(h)) out.add(h);
  }
  return out;
}

/**
 * Two groups disagree about who they are when each names a different domain.
 * That is the strongest available evidence that a promising-looking name
 * prefix is a coincidence.
 */
function domainsIncompatible(a: Org[], b: Org[]): boolean {
  const da = domainsOf(a);
  const db = domainsOf(b);
  if (da.size === 0 || db.size === 0) return false;
  for (const d of da) if (db.has(d)) return false;
  return true;
}

/**
 * Fold groups whose name is a leading run of another group's name.
 *
 * Guarded three ways: the lead has to be substantial, the two must not name
 * different domains, and neither may claim a different physical location.
 */
function foldPrefixGroups(groups: Map<string, Org[]>): void {
  const entries = [...groups.entries()]
    .filter(([k]) => !k.startsWith('__unique:'))
    .map(([key, orgs]) => ({ key, orgs, tokens: mergeTokens(orgs[0]!.name) }))
    .sort((a, b) => a.tokens.length - b.tokens.length);

  for (const shortEntry of entries) {
    const shortGroup = groups.get(shortEntry.key);
    if (!shortGroup) continue;

    for (const longEntry of entries) {
      if (longEntry.key === shortEntry.key) continue;
      const longGroup = groups.get(longEntry.key);
      if (!longGroup) continue;
      if (!isNamePrefix(shortEntry.tokens, longEntry.tokens)) continue;
      if (domainsIncompatible(shortGroup, longGroup)) continue;
      if (shortGroup.some((a) => longGroup.some((b) => locationConflict(a, b)))) continue;

      shortGroup.push(...longGroup);
      groups.delete(longEntry.key);
    }
  }
}

export function mergeOrgs(all: Org[]): MergeResult {
  const dropped = all.filter((o) => DROP_NAMES.some((p) => p.test(o.name.trim())));
  const kept = all.filter((o) => !dropped.includes(o));

  const groups = new Map<string, Org[]>();
  for (const org of kept) {
    const key = keyFor(org.name);
    if (!key) {
      /*
       * A name made entirely of words the merge key discards -- "Rescue NYC"
       * is `rescue` and `nyc`, both stripped -- reduces to an empty key, so it
       * cannot be grouped by name and falls back to its own id.
       *
       * This must accumulate like any other bucket. It used to `set`, which
       * meant two records that reduced to an empty key *and* shared a slug
       * silently overwrote one another: the real "Rescue NYC" from the dog
       * workbook was replaced wholesale by a bare discovery candidate of the
       * same name, losing its animals, needs, boroughs and area. Nothing
       * reported it, because no cluster had been merged -- one record simply
       * stopped existing.
       */
      const own = `__unique:${org.id}`;
      const existing = groups.get(own);
      if (existing) existing.push(org);
      else groups.set(own, [org]);
      continue;
    }
    const bucket = groups.get(key);
    if (bucket) bucket.push(org);
    else groups.set(key, [org]);
  }

  foldPrefixGroups(groups);

  const orgs: Org[] = [];
  const merged: MergeResult['merged'] = [];
  const conflicts: MergeConflict[] = [];
  const keptApart: MergeResult['keptApart'] = [];

  for (const [key, bucket] of groups) {
    if (bucket.length === 1) {
      orgs.push(bucket[0]!);
      continue;
    }

    // Split the bucket into clusters that are safe to combine.
    const clusters: Org[][] = [];
    for (const org of bucket) {
      let placed = false;
      for (const cluster of clusters) {
        const blocker = cluster
          .map((c) => {
            if (neverMergeSet.has(`${c.id}|${org.id}`)) return 'listed in NEVER_MERGE';
            return locationConflict(c, org);
          })
          .find(Boolean);
        if (blocker) continue;
        cluster.push(org);
        placed = true;
        break;
      }
      if (!placed) clusters.push([org]);
    }

    if (clusters.length > 1) {
      keptApart.push({
        ids: bucket.map((o) => o.id),
        reason: `"${bucket[0]!.name}" resolved to ${clusters.length} distinct locations; kept separate rather than merged`,
      });
    }

    clusters.forEach((cluster, ci) => {
      if (cluster.length === 1) {
        const only = cluster[0]!;
        // Give a disambiguating id when a name resolved to several places.
        if (clusters.length > 1 && ci > 0) {
          only.id = `${only.id}-${only.zips[0] ?? only.boroughs[0] ?? String(ci + 1)}`;
        }
        orgs.push(only);
        return;
      }
      const combined = combine(cluster, conflicts);
      orgs.push(combined);
      merged.push({
        into: combined.id,
        from: cluster.map((o) => o.id),
        key,
      });
    });
  }

  ensureUniqueIds(orgs);
  conflicts.push(...detectAddressConflicts(orgs));

  return { orgs, merged, conflicts, keptApart };
}

/**
 * Make every id unique.
 *
 * Disambiguating a split cluster by appending its borough can land on an id a
 * different record already owns -- "aspca-community-veterinary-clinic" plus
 * "-brooklyn" is exactly the slug of the record actually called "ASPCA
 * Community Veterinary Clinic - Brooklyn". Ids are file names and URLs, so a
 * collision silently loses a record.
 */
function ensureUniqueIds(orgs: Org[]): void {
  const taken = new Set<string>();
  for (const org of orgs) {
    if (!taken.has(org.id)) {
      taken.add(org.id);
      continue;
    }
    const suffixes = [org.zips[0], org.boroughs[0], org.address?.zip].filter(Boolean) as string[];
    let next = '';
    for (const s of suffixes) {
      const candidate = `${org.id}-${s}`;
      if (!taken.has(candidate)) {
        next = candidate;
        break;
      }
    }
    if (!next) {
      let n = 2;
      while (taken.has(`${org.id}-${n}`)) n++;
      next = `${org.id}-${n}`;
    }
    org.id = next;
    taken.add(next);
  }
}

/** Rank records so the most authoritative one supplies the name and id. */
function primaryOf(cluster: Org[]): Org {
  const score = (o: Org) =>
    (o.type_raw ? 100 : 0) + // came from a main directory row
    (o.last_verified ? 50 : 0) +
    CONFIDENCE_RANK[o.confidence] * 10 +
    (o.website ? 5 : 0) +
    (o.notes ? 1 : 0) +
    o.phones.length +
    o.emails.length;
  return [...cluster].sort((a, b) => score(b) - score(a))[0]!;
}

function combine(cluster: Org[], conflicts: MergeConflict[]): Org {
  const primary = primaryOf(cluster);
  const others = cluster.filter((o) => o !== primary);
  const ids = cluster.map((o) => o.id);

  // Flag disagreements a human should look at, rather than picking silently.
  const websites = uniq(
    cluster.map((o) => o.website).filter((w): w is string => Boolean(w)),
    (w) => hostOf(w) ?? w,
  );
  const distinctHosts = new Set(
    websites.map((w) => hostOf(w)).filter((h): h is string => Boolean(h) && !AGGREGATOR_DOMAINS.has(h!)),
  );
  if (distinctHosts.size > 1) {
    conflicts.push({
      ids,
      field: 'website',
      values: [...distinctHosts],
      note: 'Sources give different domains for what looks like the same organization.',
    });
  }

  const out: Org = {
    ...primary,
    aka: uniq(
      [...cluster.flatMap((o) => o.aka), ...cluster.map((o) => o.name).filter((n) => n !== primary.name)],
      (s) => s.toLowerCase(),
    ),
    org_types: [...new Set(cluster.flatMap((o) => o.org_types))],
    animals: [...new Set(cluster.flatMap((o) => o.animals))],
    needs: [...new Set(cluster.flatMap((o) => o.needs))],
    boroughs: [...new Set(cluster.flatMap((o) => o.boroughs))],
    citywide: cluster.some((o) => o.citywide),
    outside_nyc: cluster.every((o) => o.outside_nyc),
    zips: [...new Set(cluster.flatMap((o) => o.zips))].sort(),
    phones: uniq(cluster.flatMap((o) => o.phones), (p) => p.value),
    emails: uniq(cluster.flatMap((o) => o.emails), (e) => e.value),
    intake_urls: uniq(cluster.flatMap((o) => o.intake_urls), (u) => u.url),
    social: uniq(cluster.flatMap((o) => o.social), (s) => `${s.platform}:${s.handle}`),
    source_urls: [...new Set(cluster.flatMap((o) => o.source_urls))],
    source_files: [...new Set(cluster.flatMap((o) => o.source_files))],
    website: primary.website ?? others.find((o) => o.website)?.website ?? null,
    address: primary.address ?? others.find((o) => o.address)?.address ?? null,
    hours: primary.hours ?? others.find((o) => o.hours)?.hours ?? null,
    neighborhoods: primary.neighborhoods ?? others.find((o) => o.neighborhoods)?.neighborhoods ?? null,

    // The most confident source wins: High means *some* source confirmed it on
    // the organization's own site, which stays true after merging.
    confidence: cluster.reduce<Confidence>(
      (best, o) => (CONFIDENCE_RANK[o.confidence] > CONFIDENCE_RANK[best] ? o.confidence : best),
      'Low',
    ),
    // Operating status goes the other way: the most cautious signal wins, so a
    // "may be inactive" note in one workbook is never erased by another.
    status: cluster.reduce<Status>(
      (worst, o) => (STATUS_SEVERITY[o.status] > STATUS_SEVERITY[worst] ? o.status : worst),
      'active',
    ),
    status_note:
      cluster
        .slice()
        .sort((a, b) => STATUS_SEVERITY[b.status] - STATUS_SEVERITY[a.status])[0]!.status_note ?? null,
    last_verified: cluster
      .map((o) => o.last_verified)
      .filter((d): d is string => Boolean(d))
      .sort()
      .pop() ?? null,
    notes: uniq(cluster.map((o) => o.notes).filter((n): n is string => Boolean(n)), (n) => n).join('\n\n') || null,
  };

  return out;
}
