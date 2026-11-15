/**
 * Where this particular deployment lives.
 *
 * These are public values -- both appear in the page source of the built site
 * -- so they live here rather than in environment variables. That is not
 * laziness: because the project ships a `wrangler.toml` (which is what gives
 * the chat function its Workers AI binding), Cloudflare treats that file as
 * the source of truth for configuration and the dashboard can only manage
 * encrypted secrets. Keeping public values in the repository means one place
 * to look, and nothing to set up twice.
 *
 * The genuinely secret values -- the Turnstile secret key and the pass signing
 * key -- are set as encrypted secrets in the Cloudflare dashboard and never
 * appear here.
 *
 * Each can still be overridden by an environment variable, which is what makes
 * a fork or a second deployment straightforward.
 */

/** owner/repo on GitHub. Used for the "report a problem" links. */
export const GITHUB_REPO = import.meta.env.PUBLIC_GITHUB_REPO ?? 'btaylor62000-spec/nyc-animal-rescue';

/**
 * Turnstile site key. Public by design -- it is rendered into the page.
 *
 * Leave empty and the assistant works without a bot check, which is fine for
 * local development and reckless in production: the daily model allowance is
 * then open to anyone. Set it as soon as the site is live.
 */
export const TURNSTILE_SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ?? '0x4AAAAAAE68rOGdDanZf1Mw';

export const REPORT_ISSUE_BASE = `https://github.com/${GITHUB_REPO}/issues/new`;

export const SITE_NAME = 'NYC Animal Rescue';

/** True once a real repository is configured, so links are never dead. */
export const HAS_REPO = !GITHUB_REPO.startsWith('your-github-username/');

/**
 * The owner's Google Form for "something wrong or missing in this guide"
 * (2026-11-15). A form the owner holds, because the site has nowhere private
 * to keep free text: its own forms commit to the public repository, and
 * people in a crisis write personal details. Answers go to the owner only.
 */
export const FEEDBACK_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSeCnvCil-xPO58fDMSxAB4DUq638pU1N72JRUycBQFXXccRnQ/viewform';
/** The form's "Which guide or page?" question, filled in for the reader. */
const FEEDBACK_PAGE_ENTRY = 'entry.2083064976';
export function feedbackLink(page: string): string {
  return `${FEEDBACK_FORM}?usp=pp_url&${FEEDBACK_PAGE_ENTRY}=${encodeURIComponent(page)}`;
}
