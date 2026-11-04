import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixUrl, fixUrlsInText } from '../src/data/url-fixes.ts';

test('url fixes: ACC links become the addresses ACC itself publishes', () => {
  assert.equal(fixUrl('https://nycacc.org/adopt'), 'https://nycacc.app/');
  assert.equal(fixUrl('https://nycacc.org/services/surrender'), 'https://www.nycacc.org/services/surrender/');
  assert.equal(fixUrl('https://nycacc.org/services/surrender-a-pet'), 'https://www.nycacc.org/services/surrender/');
  assert.equal(fixUrl('https://www.nycacc.org/get-involved/new-hope/nhpartners'), 'https://www.nycacc.org/programs/new-hope-partners/');
  assert.equal(fixUrl('https://www.nycacc.org/GuineaPigs'), 'https://nycacc.app/');
});

test('url fixes: other links, and pages ACC does have, are left alone', () => {
  assert.equal(fixUrl('https://www.nycacc.org/adoption/at-risk-outcomes'), 'https://www.nycacc.org/adoption/at-risk-outcomes');
  assert.equal(fixUrl('https://example.org/adopt'), 'https://example.org/adopt');
});

test('url fixes: inside prose, keeping the punctuation after a link', () => {
  assert.equal(fixUrlsInText('Apply at https://nycacc.org/emergency-placement/. Then call.'), 'Apply at https://www.nycacc.org/emergency-placement/. Then call.');
});

test('url fixes: any ACC services or programs page gets the form ACC serves', () => {
  assert.equal(fixUrl('https://nycacc.org/services/lost-and-found'), 'https://www.nycacc.org/services/lost-and-found/');
  assert.equal(fixUrl('https://nycacc.org/programs/community-resources'), 'https://www.nycacc.org/programs/community-resources/');
});
