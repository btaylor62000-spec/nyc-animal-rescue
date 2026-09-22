import type { APIRoute } from 'astro';
import { ORGS } from '../../data/orgs.ts';

/**
 * The list the contribute endpoint checks submissions against: every record's
 * id, name and website. Same origin as the endpoint, so there is no token to
 * manage and nothing that can drift from what the site shows.
 */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(ORGS.map((o) => ({ id: o.id, name: o.name, website: o.website }))), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' },
  });
