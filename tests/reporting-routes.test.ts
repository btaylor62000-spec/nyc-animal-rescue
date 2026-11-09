import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const org = (id: string) => JSON.parse(readFileSync(`data/orgs/${id}.json`, 'utf8'));

/*
 * Dog and cat rescues "rehabilitate" the animals they take in. The bare word
 * once made seven of them wildlife rehabilitators, offered for an injured
 * squirrel, and wild animals go to licensed rehabilitators only.
 */
test('a domestic rescue that "rehabilitates" its dogs is not a wildlife rehabilitator', () => {
  for (const id of ['stray-from-the-heart', 'rescue-dogs-rock-nyc', 'snarr-northeast', 'good-home-pet-adoptions', 'equine-advocates-rescue-and-sanctuary']) {
    const o = org(id);
    assert.ok(!o.needs.includes('wildlife-rehab'), `${id} is tagged as a wildlife rehabilitator`);
    assert.ok(!o.animals.includes('wildlife'), `${id} is tagged as taking wildlife`);
  }
  for (const id of ['winorr-wildlife-in-need-of-rescue-and-rehabilitation', 'urban-utopia-wildlife-rehabilitation', 'ny-marine-mammal-and-sea-turtle-stranding-hotline', 'sean-casey-animal-rescue']) {
    assert.ok(org(id).needs.includes('wildlife-rehab'), `${id} lost its wildlife rehabilitation tag`);
  }
});

test('taking in "cruelty cases" does not make a rescue somewhere to report cruelty', () => {
  assert.ok(!org('rescue-dogs-rock-nyc').needs.includes('legal'));
});

/*
 * The abuse guide's narrower routes, 2026-11-09. The state's own page says
 * cruelty is not its jurisdiction, so its listing must say so, and IC3 is
 * for fraud only.
 */
test('the narrower reporting routes say what they are not for', () => {
  assert.match(org('new-york-state-department-of-agriculture-and-markets').notes, /Not for cruelty/);
  assert.match(org('fbi-internet-crime-complaint-center').notes, /fraud and scams only/);
  assert.match(org('nyc-mayors-office-of-animal-welfare').notes, /said publicly that requests for help should go to this address/);
  for (const id of ['your-city-council-member', 'nyc-council-animal-welfare-caucus', 'nyc-mayors-office-of-animal-welfare', 'better-business-bureau', 'fbi-tips', 'fbi-internet-crime-complaint-center']) {
    assert.ok(org(id).needs.includes('legal'), `${id} is not findable as a way to report`);
  }
});

/*
 * The office's head gave her own work address in the same public reply that
 * asked for requests to go to the shared one. Only the shared one is listed.
 * (privacy-holds.json scrubs phone numbers only, so this is held here.)
 */
test("the Mayor's Office is reached only through its shared address", () => {
  for (const f of ['data/chat-corpus.json', 'content/guides/report-animal-abuse.md', 'data/orgs/nyc-mayors-office-of-animal-welfare.json']) {
    assert.ok(!/aftaylor/i.test(readFileSync(f, 'utf8')), `a personal address reached ${f}`);
  }
});

// "after 311 or 911" in its description once gave the Mayor's Office a phone
// number of 311 in every contacts box: it has no phone line of its own.
test("the Mayor's Office listing carries no phone number it does not have", () => {
  assert.deepEqual(org('nyc-mayors-office-of-animal-welfare').phones, []);
});
