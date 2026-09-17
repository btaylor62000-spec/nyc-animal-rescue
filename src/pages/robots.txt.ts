import type { APIRoute } from 'astro';

/**
 * Open to crawlers on purpose. Someone searching "injured pigeon Brooklyn"
 * should be able to find this from a search engine, which is how most people
 * in a crisis will actually arrive.
 */
export const GET: APIRoute = ({ site }) =>
  new Response(
    ['User-agent: *', 'Allow: /', '', `Sitemap: ${new URL('/sitemap.xml', site).href}`, ''].join('\n'),
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
