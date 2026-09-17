/**
 * The rule engine that applies `taxonomy.ts` to a record.
 *
 * Every tag it assigns is recorded with the rule that produced it, so the
 * import report can show exactly why an organization carries a tag and a
 * maintainer can correct the rule rather than hand-editing data.
 */
import type { Field, Rule } from './taxonomy.ts';

/** The text a rule may match against. */
export interface TagSource {
  name: string;
  type: string;
  notes: string;
  section: string;
  animals_served: string;
  areas: string;
}

export interface TagTrace {
  tag: string;
  field: Field;
  /** The matched text, trimmed for display in the report. */
  matched: string;
}

const DEFAULT_FIELDS: Field[] = ['name', 'type', 'notes'];

export function applyRules<T extends string>(
  rules: Rule<T>[],
  src: TagSource,
): { tags: T[]; trace: TagTrace[] } {
  const tags: T[] = [];
  const trace: TagTrace[] = [];

  for (const rule of rules) {
    const fields = rule.fields ?? DEFAULT_FIELDS;
    for (const field of fields) {
      const text = src[field];
      if (!text) continue;
      // Rules are shared module-level objects; reset lastIndex defensively in
      // case a pattern ever carries the global flag.
      rule.pattern.lastIndex = 0;
      const m = rule.pattern.exec(text);
      if (!m) continue;
      if (!tags.includes(rule.tag)) tags.push(rule.tag);
      trace.push({ tag: rule.tag, field, matched: m[0].slice(0, 60) });
      break;
    }
  }
  return { tags, trace };
}
