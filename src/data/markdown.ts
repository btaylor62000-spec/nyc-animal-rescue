/**
 * Markdown rendering for the guide pages.
 *
 * The guides are generated from files this project writes itself, so the
 * content is trusted; even so, raw HTML is disabled, because the source
 * workbooks are edited by hand and a stray angle bracket should render as text
 * rather than as markup.
 */
import { Marked } from 'marked';
import { telHref } from './tel.ts';

const marked = new Marked({ gfm: true, breaks: false });

/*
 * A North American number written any of the usual ways. Ten digits with
 * separators, optionally led by a 1; never part of a longer run of digits,
 * so a zip code, an EIN or a Google Forms id is left alone.
 */
const PHONE_RE = /(?<![\d-])(?:1[-. ])?\(?(\d{3})\)?[-. ](\d{3})[-. ](\d{4})(?![\d-])/g;

/**
 * Make phone numbers in guide prose tappable.
 *
 * Most readers are on a phone, often outside, and a number they have to copy
 * out of a paragraph is a number they may mistype. Only text outside tags and
 * outside existing links is touched, so a URL or an anchor is never rewritten.
 */
export function linkPhones(html: string): string {
  const parts = html.split(/(<[^>]+>)/);
  let inAnchor = 0;
  return parts
    .map((part) => {
      if (part.startsWith('<')) {
        if (/^<a[\s>]/i.test(part)) inAnchor++;
        else if (/^<\/a>/i.test(part)) inAnchor = Math.max(0, inAnchor - 1);
        return part;
      }
      if (inAnchor) return part;
      return part.replace(PHONE_RE, (shown, a: string, b: string, c: string) => {
        return `<a href="${telHref(`${a}${b}${c}`)}" translate="no">${shown}</a>`;
      });
    })
    .join('');
}

export function renderMarkdown(md: string): string {
  return linkPhones(marked.parse(md, { async: false }) as string);
}
