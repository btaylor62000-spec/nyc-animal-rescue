/**
 * Build-time configuration, supplied by Cloudflare Pages or a local .env file.
 * All of it is optional: the site builds and runs with none of it set.
 */
interface ImportMetaEnv {
  /** owner/repo on GitHub, for the "report a problem" links. */
  readonly PUBLIC_GITHUB_REPO?: string;
  /** Turnstile site key. Public by design; the secret key lives server-side. */
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
