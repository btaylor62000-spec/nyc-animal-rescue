/**
 * Values that depend on where this is deployed.
 *
 * All of them are read from the environment at build time with a working
 * fallback, so the site builds and runs before any of it exists. Set them in
 * Cloudflare Pages under Settings -> Environment variables, or in a local
 * `.env` file; see docs/DEPLOY.md.
 */

/** owner/repo on GitHub. Used for the "report a problem" links. */
export const GITHUB_REPO = import.meta.env.PUBLIC_GITHUB_REPO ?? 'your-github-username/nyc-animal-rescue';

export const REPORT_ISSUE_BASE = `https://github.com/${GITHUB_REPO}/issues/new`;

export const SITE_NAME = 'NYC Animal Rescue';

/**
 * True once the repository has actually been created. Until then the site
 * says so rather than pointing people at a link that 404s.
 */
export const HAS_REPO = !GITHUB_REPO.startsWith('your-github-username/');
