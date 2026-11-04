/*
 * No prices anywhere a reader can see. Decided 2026-11-04 by the reviewer.
 *
 * Two reasons. A price is the detail that goes stale fastest, and nobody here
 * re-checks a rescue's adoption fee every week. And a figure can stop someone
 * using the thing that would help: the reviewer's example was the poison
 * control line, whose consultation fee was printed beside a number someone
 * with a poisoned dog should ring without hesitating.
 *
 * So the importer takes them out of every listing's text and every guide, at
 * the last step, whichever source they come from. What goes is the smallest
 * piece that carries the figure: a bracket if the figure is inside one, else
 * the clause, else the sentence. Words such as "free" and "low-cost" stay:
 * they say what kind of help it is, not what it costs today.
 */

/** A dollar figure, or a fee/deposit/reward mentioned as a charge. */
const PRICE = /\$\s?\d|\b\d[\d,.]*\s?(dollars|usd)\b|(?<!no[- ])\b(consult(ation)? fee|per-incident fee|fee applies|fee may apply|surrender fee|listing fee|adoption fees?|fees?:|deposit)\b|\bfees? (from|of|is|are)\b|\(fee\)/i;

// An income limit is not a price: it is how someone tells whether they
// qualify for help, and taking it out turned "for owners with a household
// income under $50,000" into a sentence with no subject.
const ELIGIBILITY = /(income|poverty|earn\w*|salary)[^.;]{0,40}$/i;

export function hasPrice(text: string): boolean {
  const re = new RegExp(PRICE.source, 'gi');
  for (const m of text.matchAll(re)) {
    if (m[0].startsWith('$') && ELIGIBILITY.test(text.slice(Math.max(0, m.index! - 60), m.index!))) continue;
    return true;
  }
  return false;
}

/** Removes a bracket, a clause or a sentence when it is there to state a price. */
export function withoutPrices(text: string): string {
  if (!hasPrice(text)) return text;
  return text
    .split('\n')
    .map((line) => (hasPrice(line) ? lineWithoutPrices(line) : line))
    .filter((line): line is string => line !== null)
    .join('\n');
}

/** The line without its prices, or null when nothing is left of it. */
function lineWithoutPrices(line: string): string | null {
  // A bullet marker or heading prefix is kept so the structure survives.
  const prefix = line.match(/^(\s*(?:[-*]|\d+\.)\s+|#+\s+)?/)![0];
  let body = line.slice(prefix.length);

  // 1. Brackets that carry a figure, or that explain the figure just before
  //    them: "Adoption ($75 fee)", "Adoption fee $650 (spay/neuter, vaccines)".
  body = body.replace(/(\$\s?\d[\d,.]*\+?)\s*\([^()]*\)/g, '$1');
  body = body.replace(/\s*\([^()]*\)/g, (m) => (hasPrice(m) ? '' : m));

  // Brackets are set aside so a comma inside one is not read as a clause.
  const held: string[] = [];
  body = body.replace(/\([^()]*\)/g, (m) => `\u0000${held.push(m) - 1}\u0000`);
  const restore = (t: string) => t.replace(/\u0000(\d+)\u0000/g, (_, i) => held[+i]!);

  // 2. Sentences, then the clauses inside them.
  const sentences = body.split(/(?<=[.!?])\s+(?=[A-Z"'$\d\u0000])/);
  const kept = sentences
    .map((s) => {
      if (!hasPrice(restore(s))) return s;
      const left = clausesWithoutPrices(s, restore);
      // A remnant that now opens the sentence gets a capital, unless it is an
      // address ("homeagain.com", "info@...") whose case means something.
      return /^[a-z]+(?![\w.@])/.test(left) && left !== s ? left.charAt(0).toUpperCase() + left.slice(1) : left;
    })
    .filter((s) => s.trim() !== '');
  body = restore(kept.join(' ')).replace(/\s{2,}/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();

  if (body === '' || /^[\W_]*$/.test(body)) return null;
  return prefix + body;
}

function clausesWithoutPrices(sentence: string, restore: (t: string) => string): string {
  // Clauses as the research writes them: "; ", " - ", " — ", ", ", " / ".
  const parts = sentence.split(/(;\s+|\s+[-–—]\s+|,\s+|\s+\/\s+)/);
  const out: string[] = [];
  let dropped = false;
  for (let i = 0; i < parts.length; i += 2) {
    const clause = parts[i]!;
    const joiner = parts[i - 1] ?? '';
    // A clause tacked on with a comma after a price leans on it ("$50 per
    // trap, cash or check"); so does one that starts in lower case when the
    // sentence's opening clause was the price ("Fees: $550; includes ...").
    const leans = dropped && (/^,/.test(joiner) || (out.length === 0 && /^[a-z]/.test(clause)));
    if (hasPrice(restore(clause)) || leans) { dropped = true; continue; }
    dropped = false;
    if (out.length > 0) out.push(joiner || ' ');
    out.push(clause);
  }
  let s = out.join('').trim();
  // A sentence that has lost its subject to the cut reads as nonsense; drop it.
  if (s.length < 12) return '';
  s = s.replace(/^[,;:\-–—/\s]+|[,;:\-–—/\s]+$/g, '');
  if (!/[.!?]$/.test(s) && /[.!?]$/.test(sentence.trim())) s += '.';
  return s;
}
