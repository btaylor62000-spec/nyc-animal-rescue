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
  { from: /^https?:\/\/(www\.)?nycacc\.org\/adoption\/at-risk-outcomes\/?$/i, to: `${ACC}/adoption/at-risk-outcomes`, why: "as ACC's at-risk list page links it" },

  // Found by the link check on 2026-11-04 (404), replacement read on each
  // organization's own site that day.
  { from: /^https?:\/\/(www\.)?badassanimalrescue\.com\/find-a-dog\/?$/i, to: 'https://badassanimalrescue.com/find-a-dog-new', why: "its home page's 'Adopt' link" },
  { from: /^https?:\/\/(www\.)?mrbonesandco\.org\/adoptme\/?$/i, to: 'https://mrbonesandco.org/adopt/', why: "its home page's 'Adopt' link" },
  { from: /^https?:\/\/(www\.)?nybullycrew\.org\/surrender\/?$/i, to: 'https://www.nybullycrew.org/surrender-your-dog', why: "its home page's 'Surrender' link" },
  { from: /^https?:\/\/(www\.)?animalalliancenyc\.org\/apocenter\/?$/i, to: 'https://www.animalalliancenyc.org/need-help/', why: "the old page is gone; the Mayor's Alliance 'Need help?' page lists its resources" },
  { from: /^https?:\/\/(www\.)?frankiesfriends\.org\/apply-for-assistance\/?$/i, to: 'https://www.frankiesfriends.org/apply-for-assistance-3', why: 'the application page read on 2026-11-04' },
  { from: /^https?:\/\/(www\.)?lapoflove\.com\/pet-loss-support\/?$/i, to: 'https://www.lapoflove.com/our-services/pet-loss-support', why: "its home page's 'Pet Loss Support' link" },
  { from: /^https?:\/\/(www\.)?northbrooklyncats\.org\/help\/?$/i, to: 'https://northbrooklyncats.org/#contactus', why: "the help page is gone; its home page's 'Contact us'" },
  { from: /^https?:\/\/clinic\.aspca\.org\/clinics\/new-york-city\/?$/i, to: 'https://clinic.aspca.org/locations/new-york-city', why: "the ASPCA's own page for its New York City clinics" },
  { from: /^https?:\/\/(www\.)?bunniesandbeyond\.org\/surrender\.html$/i, to: 'https://bunniesandbeyond.org/', why: 'the surrender page is gone (404); its site now shows robots a bot check, so the home page' },
  { from: /^https?:\/\/(www\.)?heartsandbonesrescue\.com\/?$/i, to: 'https://heartsandbonesrescue.org/', why: 'the .com now redirects to its .org site' },
  { from: /^https?:\/\/(www\.)?heartsandbonesrescue\.com\/adopt\/?$/i, to: 'https://heartsandbonesrescue.org/adopt', why: 'the .com now redirects to its .org site' },
  { from: /^https?:\/\/(www\.)?volunteersforwildlife\.org\/?$/i, to: 'https://wildlifecenterli.org/', why: 'renamed Wildlife Center of Long Island; the old address redirects there' },
  { from: /^https?:\/\/(www\.)?safeplaceforpets\.org\/?$/i, to: 'https://redrover.org/relief-dv/', why: "the directory site now just opens RedRover's home page; RedRover's domestic-violence page is where its help for survivors' pets is" },
  { from: /^https?:\/\/(www\.)?healthypaws\.com\/?$/i, to: 'https://www.healthypawspetinsurance.com/', why: 'where the old address redirects' },
  { from: /^https?:\/\/(www\.)?agriculture\.ny\.gov\/hpai\/?$/i, to: 'https://agriculture.ny.gov/highly-pathogenic-avian-influenza-hpai', why: "the address the Department's own December 2025 release gives; its site refuses automated browsers" },
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
