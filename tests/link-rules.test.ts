import { test } from 'node:test';
import assert from 'node:assert/strict';
import { linkVerdict, type LinkEvidence } from '../scripts/agent/link-rules.ts';

const page = (o: Partial<LinkEvidence>): LinkEvidence => ({ url: 'https://example.org/a', finalUrl: 'https://example.org/a', status: 200, ok: true, offDomain: false, text: 'A rescue group in Queens. '.repeat(100), ...o });

test('link verdict: a working page', () => assert.equal(linkVerdict(page({})), 'ok'));
test('link verdict: 404, a missing domain, and a page that says not found', () => {
  assert.equal(linkVerdict(page({ status: 404, ok: false, text: '' })), 'gone');
  assert.equal(linkVerdict(page({ status: 0, ok: false, text: '', error: 'fetch failed (ENOTFOUND)' })), 'gone');
  assert.equal(linkVerdict(page({ text: 'Oops! It looks like nothing was found at this location.' })), 'gone');
});
test('link verdict: a lapsed domain is not a working site', () => {
  assert.equal(linkVerdict(page({ finalUrl: 'https://example.org/lander', offDomain: false })), 'parked');
  assert.equal(linkVerdict(page({ text: 'Buy this domain. This domain is for sale.' })), 'parked');
});
test('link verdict: a bot wall or 403 is unknown, not dead', () => {
  assert.equal(linkVerdict(page({ status: 403, ok: false, text: '' })), 'blocked');
  assert.equal(linkVerdict(page({ text: 'Performing security verification' })), 'blocked');
});
test('link verdict: a server error is not proof of anything', () => {
  assert.equal(linkVerdict(page({ status: 503, ok: false, text: '' })), 'down');
});
test('link verdict: a redirect to another site is reported', () => {
  assert.equal(linkVerdict(page({ finalUrl: 'https://other.example.com/', offDomain: true })), 'elsewhere');
});
test('link verdict: a rescue domain taken over by a casino is the worst case, not a redirect', () => {
  assert.equal(linkVerdict(page({ finalUrl: 'https://www.sgmigrant.com/bn-covid19', offDomain: true, text: 'HOT GAMES SLOTS LIVE CASINO TOGEL SABUNG AYAM' })), 'taken');
});
test('link verdict: a shortener or form link landing elsewhere is working as intended', () => {
  assert.equal(linkVerdict(page({ url: 'https://forms.gle/abc', finalUrl: 'https://docs.google.com/forms/d/e/x/viewform', offDomain: true })), 'ok');
});
