/**
 * Minimal .docx text reader, reusing the zip reader from xlsx-lite.
 *
 * The wildlife guide is a plain prose document: paragraphs, hyperlinks and a
 * few bold runs. We need the paragraph text and the hyperlink targets, nothing
 * more, so a full OOXML library would be overkill.
 */
import { readFileSync } from 'node:fs';
import { readZipEntries } from './zip.ts';

export interface DocxParagraph {
  text: string;
  /** Heading level if Word marked one, else null. */
  heading: number | null;
  /** True when the paragraph is a list item. */
  listItem: boolean;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeXml(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (whole, ent: string) => {
    if (ent.startsWith('#x') || ent.startsWith('#X')) return String.fromCodePoint(parseInt(ent.slice(2), 16));
    if (ent.startsWith('#')) return String.fromCodePoint(parseInt(ent.slice(1), 10));
    return ENTITIES[ent] ?? whole;
  });
}

export function readDocxParagraphs(path: string): DocxParagraph[] {
  const files = readZipEntries(readFileSync(path));
  const xml = files.get('word/document.xml')?.toString('utf8');
  if (!xml) throw new Error(`${path}: missing word/document.xml`);

  const out: DocxParagraph[] = [];
  for (const m of xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>|<w:p\b[^>]*\/>/g)) {
    const body = m[1] ?? '';
    const parts: string[] = [];
    for (const t of body.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/g)) {
      parts.push(t[1] === undefined ? ' ' : decodeXml(t[1]));
    }
    const text = parts.join('').replace(/\s+/g, ' ').trim();
    if (!text) continue;

    const styleVal = /<w:pStyle\b[^>]*w:val="([^"]+)"/.exec(body)?.[1] ?? '';
    const headingLevel = /^Heading(\d)$/i.exec(styleVal)?.[1];
    out.push({
      text,
      heading: headingLevel ? Number(headingLevel) : null,
      listItem: /<w:numPr\b/.test(body),
    });
  }
  return out;
}
