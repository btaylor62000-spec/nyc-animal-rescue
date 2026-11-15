import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';

/**
 * Driving times from every NYC zip code to every emergency vet
 * (scripts/geo/drive-times.ts). Fetched only when someone orders the
 * directory by distance, so nobody else downloads it.
 */
export const GET: APIRoute = () =>
  new Response(readFileSync('data/drive-times.json', 'utf8'), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  });
