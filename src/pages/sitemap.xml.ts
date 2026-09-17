import type { APIRoute } from 'astro';
import { ORGS } from '../data/orgs.ts';
import { GUIDES } from '../data/guides.ts';

/**
 * Hand-rolled rather than pulling in an integration: the page set is entirely
 * known at build time and this is a dozen lines.
 */
export const GET: APIRoute = ({ site }) => {
  const url = (path: string) => new URL(path, site).href;
  const today = new Date().toISOString().slice(0, 10);

  const entries: Array<{ loc: string; priority: string; lastmod?: string }> = [
    { loc: url('/'), priority: '1.0' },
    { loc: url('/directory'), priority: '0.9' },
    { loc: url('/guides'), priority: '0.8' },
    { loc: url('/about'), priority: '0.4' },
    ...GUIDES.map((g) => ({ loc: url(`/guides/${g.slug}`), priority: '0.8' })),
    ...ORGS.map((o) => ({
      loc: url(`/org/${o.id}`),
      priority: o.confidence === 'High' ? '0.6' : '0.4',
      lastmod: o.last_checked ?? o.last_verified ?? undefined,
    })),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((e) =>
      `  <url><loc>${e.loc}</loc><lastmod>${e.lastmod ?? today}</lastmod><priority>${e.priority}</priority></url>`,
    ),
    '</urlset>',
    '',
  ].join('\n');

  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
