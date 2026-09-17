import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeKey, parseDate, parseEmails, parseLabeledUrls, parsePhones, parseSocial, parseUrls, parseZips, slugify,
} from '../scripts/import/normalize.ts';

test('phone: formats a plain number', () => {
  const r = parsePhones('(718) 436-5163');
  assert.deepEqual(r.values, [{ value: '7184365163', display: '(718) 436-5163' }]);
  assert.deepEqual(r.residue, []);
});

test('phone: prose is kept as residue, not stored as a number', () => {
  const r = parsePhones('(no public phone; contact via site)');
  assert.deepEqual(r.values, []);
  assert.deepEqual(r.residue, ['(no public phone; contact via site)']);
});

test('phone: vanity numbers are dialled', () => {
  const r = parsePhones('1-800-321-PETS');
  assert.equal(r.values[0]?.value, '8003217387');
});

test('phone: 311 is a real number', () => {
  assert.equal(parsePhones('311').values[0]?.display, '311');
});

test('phone: multiple numbers keep their labels', () => {
  const r = parsePhones('(718) 436-5163 (Windsor Terrace); (347) 599-1500 (Sunset Park)');
  assert.equal(r.values.length, 2);
  assert.equal(r.values[0]?.label, 'Windsor Terrace');
  assert.equal(r.values[1]?.label, 'Sunset Park');
});

test('email: a semicolon inside a parenthetical does not split the value', () => {
  const r = parseEmails('(via site forms; surrender questionnaire online)');
  assert.deepEqual(r.values, []);
  assert.deepEqual(r.residue, ['(via site forms; surrender questionnaire online)']);
});

test('email: several addresses with roles', () => {
  const r = parseEmails('help@neighborhoodcats.org (certified caretakers); headcat@neighborhoodcats.org (general)');
  assert.equal(r.values.length, 2);
  assert.equal(r.values[0]?.label, 'certified caretakers');
});

test('url: a bare domain with a path becomes a URL', () => {
  const r = parseUrls('reserve at neighborhoodcats.org/tnr-in-nyc/trap-banks');
  assert.deepEqual(r.values, ['https://neighborhoodcats.org/tnr-in-nyc/trap-banks']);
});

test('url: a domain wrapped in parentheses is found', () => {
  assert.deepEqual(parseUrls('rents humane cat traps (muffins.org).').values, ['https://muffins.org']);
});

test('url: labelled intake links keep their role', () => {
  const r = parseLabeledUrls('Adopt: nycacc.app  |  Surrender (by appt): https://www.nycacc.org/services/surrender/');
  assert.equal(r.values.length, 2);
  assert.equal(r.values[0]?.label, 'Adopt');
  assert.equal(r.values[1]?.label, 'Surrender (by appt)');
});

test('social: a page name with spaces yields no link', () => {
  const r = parseSocial('FB /WINORR - Wildlife In Need of Rescue and Rehabilitation');
  assert.equal(r.values[0]?.platform, 'facebook');
  assert.equal(r.values[0]?.url, undefined, 'must not build a URL that 404s');
});

test('social: handles are extracted for IG and FB', () => {
  const r = parseSocial('IG @bushwickcats; FB /bushwickstreetcats');
  assert.deepEqual(r.values.map((s) => s.platform).sort(), ['facebook', 'instagram']);
});

test('zips: a list, and the citywide flag', () => {
  const r = parseZips('11206, 11207, 11221, 11237');
  assert.deepEqual(r.zips, ['11206', '11207', '11221', '11237']);
  assert.equal(r.citywide, false);
  assert.equal(parseZips('Citywide').citywide, true);
});

test('dates are normalised to ISO', () => {
  assert.equal(parseDate('2026-08-26'), '2026-08-26');
  assert.equal(parseDate('8/26/2026'), '2026-08-26');
  assert.equal(parseDate('unknown'), null);
});

test('slugs are stable and URL-safe', () => {
  assert.equal(slugify("Mayor's Alliance for NYC's Animals"), 'mayors-alliance-for-nycs-animals');
  assert.equal(slugify('Sean Casey Animal Rescue (SCAR)'), 'sean-casey-animal-rescue');
});

test('merge keys collapse corporate boilerplate', () => {
  assert.equal(mergeKey('Animal Haven'), mergeKey('Animal Haven, Inc.'));
  assert.equal(
    mergeKey("Mayor's Alliance for NYC's Animals"),
    mergeKey("Mayor's Alliance for NYC's Animals (citywide referral hub)"),
  );
});
