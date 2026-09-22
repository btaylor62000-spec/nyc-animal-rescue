import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkPhones, renderMarkdown } from '../src/data/markdown.ts';

test('phone numbers in guide prose become tel links', () => {
  const html = renderMarkdown('Call (646) 306-2862 or 1-866-755-6622, or 917.669.7281.');
  assert.match(html, /<a href="tel:\+16463062862" translate="no">\(646\) 306-2862<\/a>/);
  assert.match(html, /<a href="tel:\+18667556622" translate="no">1-866-755-6622<\/a>/);
  assert.match(html, /<a href="tel:\+19176697281" translate="no">917\.669\.7281<\/a>/);
});

test('numbers inside links, attributes and longer digit runs are left alone', () => {
  const html = linkPhones('<a href="https://x.org/718-555-1234">718-555-1234</a> id 12345-678-9012 zip 11217 EIN 26-1482964');
  assert.equal((html.match(/tel:/g) ?? []).length, 0);
  // A URL in prose is a link already, so its digits are never touched.
  const url = renderMarkdown('https://forms.gle/1FAIpQLSeR245-123-4567');
  assert.equal((url.match(/tel:/g) ?? []).length, 0);
});
