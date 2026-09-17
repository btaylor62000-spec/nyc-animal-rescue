/**
 * Site-wide constants that depend on where the project is hosted.
 *
 * `REPORT_ISSUE_BASE` is filled in during Phase 5 once the GitHub repository
 * exists. Until then it points at the repository placeholder, so the flow can
 * be seen and tested without pretending a real URL exists.
 */
export const GITHUB_REPO = 'your-github-username/nyc-animal-rescue';
export const REPORT_ISSUE_BASE = `https://github.com/${GITHUB_REPO}/issues/new`;
export const SITE_NAME = 'NYC Animal Rescue';
