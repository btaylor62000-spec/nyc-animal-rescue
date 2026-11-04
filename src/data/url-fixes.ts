/**
 * Known address corrections, applied to every link on every record and in
 * every guide at import.
 *
 * The same bad address reaches the site from several workbooks at once, and a
 * fix made in one row comes back from another on the next import. One table,
 * applied last, keeps a corrected link corrected. Each entry says where the
 * right address was read, so it can be re-checked.
 *
 * ACC (nycacc.org) answers anything but its own canonical form -- "www.",
 * trailing slash -- with an error page, and has no /adopt page at all; its
 * adoption search lives at nycacc.app. A reviewer hit the 404s on 2026-11-04.
 * The right addresses are the links ACC's own home page and pages carry.
 */
export interface UrlFix {
  /** Matched against the whole URL, case-insensitively, ignoring a trailing slash. */
  from: RegExp;
  to: string;
  why: string;
}

const ACC = 'https://www.nycacc.org';
const acc = (path: string): RegExp => new RegExp(`^https?://(www\\.)?nycacc\\.org/${path}/?$`, 'i');

export const URL_FIXES: UrlFix[] = [
  { from: acc('adopt'), to: 'https://nycacc.app/', why: "ACC has no /adopt page; its home page links 'Adoption Search' to nycacc.app" },
  { from: acc('services/surrender(-a-pet)?'), to: `${ACC}/services/surrender/`, why: "ACC's 'Rehome a Pet' page, as linked from its own pages" },
  { from: acc('emergency-placement'), to: `${ACC}/emergency-placement/`, why: 'canonical form, as linked from ACC pages' },
  { from: acc('(programs/|get-involved/new-hope/)?(new-hope-partners|nhpartners)'), to: `${ACC}/programs/new-hope-partners/`, why: 'canonical form, as linked from ACC pages' },
  { from: acc('(programs/)?new-hope'), to: `${ACC}/programs/new-hope/`, why: 'canonical form, as linked from ACC pages' },
  { from: acc('services/behavior-resources'), to: `${ACC}/services/behavior-resources/`, why: 'canonical form, as linked from ACC pages' },
  { from: acc('workingcats'), to: `${ACC}/workingcats/`, why: 'canonical form, as linked from ACC pages' },
  { from: acc('GuineaPigs'), to: 'https://nycacc.app/', why: 'the old small-animals page is gone; small animals are in the adoption search' },
  { from: /^https?:\/\/nycacc\.org\/?$/i, to: `${ACC}/`, why: 'canonical form' },
];

/*
 * Any other ACC page: its canonical form is "www." with a trailing slash
 * (/services/lost-and-found/, /programs/community-resources/). Pages ACC links
 * without a slash -- /adoption/at-risk-outcomes -- are left as ACC writes them.
 */
const ACC_PAGE = /^https?:\/\/(?:www\.)?nycacc\.org\/((?:services|programs)\/[a-z0-9-]+)\/?$/i;

export function fixUrl(url: string): string {
  const u = url.trim();
  for (const f of URL_FIXES) if (f.from.test(u)) return f.to;
  const page = ACC_PAGE.exec(u);
  if (page) return `${ACC}/${page[1]!.toLowerCase()}/`;
  return url;
}

/** The same corrections inside free text (guide prose, notes). */
export function fixUrlsInText(text: string): string {
  return text.replace(/https?:\/\/[^\s)<>"']+/g, (u) => {
    const trail = /[.,;:]+$/.exec(u)?.[0] ?? '';
    const bare = trail ? u.slice(0, -trail.length) : u;
    return fixUrl(bare) + trail;
  });
}
