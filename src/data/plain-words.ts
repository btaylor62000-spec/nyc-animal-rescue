/*
 * The research workbooks were written as working notes, and their shorthand
 * reached the guides verbatim: "s/n", "IG @", "Bklyn", "[Medium]". A reviewer
 * read the guides on 2026-11-04 and found them a mess for exactly this
 * reason. These are the substitutions that are safe everywhere, applied at
 * import to every guide and every listing's text. Anything that needs
 * judgement (a reference to a spreadsheet "tab", a sentence that no longer
 * makes sense) is fixed at the workbook row instead.
 */

const SUBSTITUTIONS: Array<[RegExp, string]> = [
  // Confidence tags are the research's bookkeeping. The site shows how well
  // evidenced a listing is on the listing itself.
  [/\s*\[(?:High|Medium|Low|High\/Medium|Medium\/Low)(?: confidence)?\]/g, ''],
  // "Verified against ACC ... on 2026-08-27" was true of the research the
  // day it was written. The site says when each listing was last confirmed;
  // an old date in the prose only contradicts it.
  [/\s*(?:Re-)?[Vv]erified (?:against|vs\.?|with)\b[^.]*?20\d\d-\d\d-\d\d\.?/g, ''],
  [/\s*(?:Re-)?[Vv]erified:? 20\d\d-\d\d-\d\d\.?/g, ''],
  [/\bs\/n\b/g, 'spay/neuter'],
  [/\bS\/N\b/g, 'spay/neuter'],
  [/\bIG\s+@/g, 'Instagram @'],
  [/\bBklyn\b/g, 'Brooklyn'],
  [/(?<![/.\w])w\/\s?(?=\w)/g, 'with '],
  [/\bw\/o\b/g, 'without'],
  [/~\s?(?=\d)/g, 'about '],
  [/\bhrs\b/g, 'hours'],
  [/\byrs\b/g, 'years'],
  [/\bwks\b/g, 'weeks'],
  [/\bappt\b/g, 'appointment'],
  [/\bappts\b/g, 'appointments'],
];

export function plainWords(text: string): string {
  let out = text;
  for (const [re, to] of SUBSTITUTIONS) out = out.replace(re, to);
  return out;
}
