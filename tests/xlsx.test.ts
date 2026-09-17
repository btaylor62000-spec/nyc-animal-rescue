import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readWorkbook } from '../scripts/lib/xlsx-lite.ts';
import { readDocxParagraphs } from '../scripts/lib/docx-lite.ts';

const CAT = 'research/NYC_Cat_Rescue_TNR_Reference.xlsx';

test('every sheet is read, in workbook order', () => {
  const sheets = readWorkbook(CAT);
  assert.equal(sheets.length, 9);
  assert.equal(sheets[0]?.name, 'NYC Cat Rescues');
});

test('known cells read back exactly', () => {
  const sheet = readWorkbook(CAT)[0]!;
  assert.equal(sheet.rows[3]?.[0], 'Name');
  assert.equal(sheet.rows[3]?.[12], 'Last verified');
  assert.equal(sheet.rows[5]?.[0], 'Bushwick Street Cats');
  assert.equal(sheet.rows[5]?.[5], 'bushwickstreetcats@gmail.com');
});

test('a section heading row has only its first column filled', () => {
  const sheet = readWorkbook(CAT)[0]!;
  const row = sheet.rows[4]!;
  assert.match(row[0]!, /^NORTH BROOKLYN/);
  assert.equal(row.slice(1).join(''), '');
});

test('the wildlife document reads as paragraphs', () => {
  const ps = readDocxParagraphs('research/injured-birds-wildlife-guide.docx');
  assert.ok(ps.length > 40);
  assert.match(ps[0]!.text, /Injured birds/i);
  assert.ok(ps.some((p) => /Pasteurella/.test(p.text)), 'the cat-bite warning must survive');
});
