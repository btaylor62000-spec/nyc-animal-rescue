/**
 * Markdown rendering for the guide pages.
 *
 * The guides are generated from files this project writes itself, so the
 * content is trusted; even so, raw HTML is disabled, because the source
 * workbooks are edited by hand and a stray angle bracket should render as text
 * rather than as markup.
 */
import { Marked } from 'marked';

const marked = new Marked({ gfm: true, breaks: false });

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}
