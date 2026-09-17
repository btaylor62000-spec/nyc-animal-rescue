import type { APIRoute } from 'astro';
import { ORGS, toSearchRecord } from '../data/orgs.ts';

/**
 * The compact record set used for text search in the browser.
 *
 * Fetched lazily, only once someone actually types. Filtering by borough,
 * animal or need reads data attributes already in the page and needs no
 * network at all. The same file is what the Phase 3 chat worker will retrieve
 * against, so there is one index rather than two that can drift.
 */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(ORGS.map(toSearchRecord)), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
