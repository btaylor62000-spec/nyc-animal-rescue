import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { StreamRedactor, allowedFrom, redact } from '../src/chat/redact.ts';
import { extractSignals, Retriever, type Corpus } from '../src/chat/retrieve.ts';
import { buildContext } from '../src/chat/system-prompt.ts';

const ORGS = [
  { phones: ['(646) 306-2862'], emails: ['help@wildbirdfund.org'], website: 'https://www.wildbirdfund.org', intake: null },
];
const allowed = allowedFrom(ORGS);

// --- the contact guarantee -------------------------------------------------

test('a retrieved phone number survives', () => {
  const text = 'Call the Wild Bird Fund on (646) 306-2862.';
  assert.equal(redact(text, allowed), text);
});

test('an invented phone number is removed', () => {
  const out = redact('Call them on (555) 123-4567.', allowed);
  assert.doesNotMatch(out, /555/);
  assert.match(out, /not listed here/);
});

/*
 * A replacement only ever fires for a contact that is NOT in the retrieved
 * set, and the cards are built from that same set -- so no replaced contact
 * can ever appear on a card. Pointing the reader at one sent them looking for
 * something that did not exist, which a reader in a hurry reads as "the number
 * is here somewhere".
 */
test('a removed contact never claims it can be found on a card', () => {
  const cases = [
    'Call the cruelty hotline at (555) 123-4567, ext. 4450.',
    'Email them at someone@invented.org.',
    'See invented-rescue.org for details.',
  ];
  for (const text of cases) {
    const out = redact(text, allowed);
    assert.doesNotMatch(out, /card/i, `must not promise a card: ${out}`);
    assert.match(out, /not listed here/, `must say what happened: ${out}`);
  }
});

test('the same number written differently is still allowed', () => {
  assert.match(redact('Call 646-306-2862 now.', allowed), /646-306-2862/);
  assert.match(redact('Call 6463062862 now.', allowed), /6463062862/);
});

test('an invented email is removed and a real one is kept', () => {
  assert.doesNotMatch(redact('Email rescue@example.org', allowed), /example\.org/);
  assert.match(redact('Email help@wildbirdfund.org', allowed), /help@wildbirdfund\.org/);
});

test('an invented web address is removed', () => {
  assert.doesNotMatch(redact('See nycbirdrescue.org for details.', allowed), /nycbirdrescue/);
  assert.match(redact('See wildbirdfund.org for details.', allowed), /wildbirdfund\.org/);
});

test('311 is always allowed', () => {
  assert.match(redact('You can also call 311.', allowed), /311/);
});

test('ordinary prose is left alone', () => {
  const text = 'Put the bird in a cardboard box with small air holes and keep it dark and quiet.';
  assert.equal(redact(text, allowed), text);
});

// --- streaming -------------------------------------------------------------

test('streaming produces the same result as redacting the whole text', () => {
  const full =
    'Take the bird to the Wild Bird Fund on (646) 306-2862. Do not call (555) 000-1111, that is not a real line. Their site is wildbirdfund.org.';
  const expected = redact(full, allowed);

  // Feed it in awkward chunks, splitting inside a phone number on purpose.
  const redactor = new StreamRedactor(allowed);
  let out = '';
  for (let i = 0; i < full.length; i += 7) out += redactor.push(full.slice(i, i + 7));
  out += redactor.flush();

  assert.equal(out, expected);
});

test('a number split across chunks is never emitted in pieces', () => {
  const redactor = new StreamRedactor(allowed);
  let out = '';
  for (const chunk of ['Please call ', '(555) ', '123', '-4567 right ', 'away for help with your bird today.']) {
    out += redactor.push(chunk);
  }
  out += redactor.flush();
  assert.doesNotMatch(out, /555/, 'a fabricated number must not slip through a chunk boundary');
});

// --- signals ---------------------------------------------------------------

test('a cat carrying a wild bird is an emergency even when it looks fine', () => {
  const s = extractSignals('my cat brought in a sparrow, it looks ok');
  assert.equal(s.emergency, true);
  assert.ok(s.needs.includes('wildlife-rehab'));
});

test('a rabbit that has stopped eating is an emergency', () => {
  const s = extractSignals("my rabbit isn't eating");
  assert.equal(s.emergency, true);
  assert.ok(s.needs.includes('exotic-vet'));
});

test('a neighbourhood implies its borough', () => {
  assert.deepEqual(extractSignals('a pigeon in park slope').boroughs, ['brooklyn']);
  assert.deepEqual(extractSignals('I am in astoria').boroughs, ['queens']);
});

test('an accented Spanish question is understood', () => {
  const s = extractSignals('encontré un pájaro herido en Queens');
  assert.ok(s.animals.includes('bird-wild') || s.animals.includes('bird-companion'));
  assert.deepEqual(s.boroughs, ['queens']);
});

test('a question with no location says so', () => {
  assert.equal(extractSignals('I found a cat').needsLocation, true);
  assert.equal(extractSignals('I found a cat in Harlem').needsLocation, false);
});

// --- the corpus the assistant can see --------------------------------------

const corpus = JSON.parse(readFileSync('data/chat-corpus.json', 'utf8')) as Corpus;

test('closed and relocated organizations are not in the corpus', () => {
  const bad = corpus.orgs.filter((o) => o.status === 'retired' || o.status === 'relocated');
  assert.deepEqual(bad, [], 'the assistant must not be able to recommend a closed organization');
});

test('every corpus record has a name and an id', () => {
  for (const o of corpus.orgs) {
    assert.ok(o.id && o.name, `bad record: ${JSON.stringify(o).slice(0, 80)}`);
  }
});

test('the prompt context stays small enough to be affordable', () => {
  const retriever = new Retriever(corpus);
  const worst = [
    'my cat was hit by a car in queens and is bleeding badly what do I do right now',
    'I found three newborn kittens with their eyes closed under a car in bushwick',
  ]
    .map((q) => {
      const r = retriever.retrieve(q, 10);
      return buildContext(r.orgs, r.guide).length;
    })
    .reduce((a, b) => Math.max(a, b));

  // Roughly four characters to a token; the whole prompt needs to stay near
  // 2,500 tokens for the free daily allocation to stretch across a day.
  assert.ok(worst < 9000, `context was ${worst} characters (about ${Math.round(worst / 4)} tokens)`);
});
