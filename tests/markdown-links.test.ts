import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/data/markdown.ts';

test('guide links: bare web addresses and emails become links', () => {
  const html = renderMarkdown('- PAWS NY - pawsny.org - info@pawsny.org.');
  assert.match(html, /<a href="https:\/\/pawsny\.org" rel="noopener">pawsny\.org<\/a>/);
  assert.match(html, /<a href="mailto:info@pawsny\.org">/);
});

test('guide links: a bare ACC address links to the form ACC serves', () => {
  assert.match(renderMarkdown('nycacc.org/services/lost-and-found'), /href="https:\/\/www\.nycacc\.org\/services\/lost-and-found\/"/);
});

test('guide links: ordinary words with dots are left alone', () => {
  const html = renderMarkdown('e.g. N.Y. version 2.0 and Mr. Bones & Co');
  assert.doesNotMatch(html, /<a /);
});
