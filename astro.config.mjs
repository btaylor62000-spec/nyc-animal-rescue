// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Static output, deployed to Cloudflare Pages.
 *
 * No UI framework integration on purpose: the only interactive part of the
 * site is the directory's search and filters, and a few kilobytes of vanilla
 * JavaScript loads faster on a phone with one bar than any framework runtime.
 */
export default defineConfig({
  site: 'https://nycanimalrescue.org',
  output: 'static',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
