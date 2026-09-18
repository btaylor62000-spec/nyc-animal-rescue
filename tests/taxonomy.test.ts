import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNycZip, zipToBorough, inferRegion } from '../scripts/import/taxonomy.ts';

test('ZIPs map to the right borough', () => {
  assert.equal(zipToBorough('10024'), 'manhattan');
  assert.equal(zipToBorough('11217'), 'brooklyn');
  assert.equal(zipToBorough('11375'), 'queens');
  assert.equal(zipToBorough('10465'), 'bronx');
  assert.equal(zipToBorough('10314'), 'staten-island');
  assert.equal(zipToBorough('11101'), 'queens');
});

test('out-of-city ZIPs are rejected', () => {
  assert.equal(zipToBorough('11758'), null, 'North Massapequa is Nassau County');
  assert.equal(zipToBorough('06antoni'), null);
  assert.equal(isNycZip('90210'), false);
});

/*
 * The roster discovery reads is the city shelter's New Hope partner list:
 * rescues approved to pull animals *out of* NYC shelters, which is a different
 * thing from resources a New Yorker can call. A dry run found only 2 of 10
 * carried a New York City phone number; the rest were Pennsylvania,
 * Connecticut, New Jersey and upstate. Untagged, they compete with local
 * groups in search for no good reason.
 */
test('a New York City area code means the group is local', () => {
  for (const ac of ['212', '646', '332', '917', '718', '347', '929']) {
    const r = inferRegion({ name: 'Some Rescue', phones: [`${ac}5551234`] });
    assert.equal(r.outsideNyc, false, `${ac} is a city number`);
    assert.equal(r.note, null);
  }
});

test('a nearby area code names the region it is in', () => {
  assert.match(inferRegion({ name: 'X', phones: ['2032063420'] }).note ?? '', /in Connecticut/);
  assert.match(inferRegion({ name: 'X', phones: ['2018858987'] }).note ?? '', /in New Jersey/);
  assert.match(inferRegion({ name: 'X', phones: ['5702099113'] }).note ?? '', /in Pennsylvania/);
  assert.match(inferRegion({ name: 'X', phones: ['8452404862'] }).note ?? '', /in the Hudson Valley/);
  assert.ok(inferRegion({ name: 'X', phones: ['2032063420'] }).outsideNyc);
});

test('an unrecognised area code is outside the city without guessing where', () => {
  const r = inferRegion({ name: 'X', phones: ['8052394004'] }); // a California number seen in the dry run
  assert.equal(r.outsideNyc, true);
  assert.match(r.note ?? '', /outside the New York City area/);
});

test('a place in the name is enough when there is no phone number', () => {
  assert.match(inferRegion({ name: 'Husky House NJ', phones: [] }).note ?? '', /in New Jersey/);
  assert.match(inferRegion({ name: 'Humane Long Island', phones: [] }).note ?? '', /on Long Island/);
  assert.match(inferRegion({ name: 'Mid Atlantic Great Dane Rescue League', phones: [] }).note ?? '', /in the Mid-Atlantic/);
});

/*
 * Asymmetric on purpose. Mislabelling a local group "outside NYC" is visible
 * and correctable; the reverse puts a Connecticut poodle rescue in front of
 * someone in Brooklyn looking for a cat.
 */
test('no evidence means no claim', () => {
  const r = inferRegion({ name: 'Cypress Feline Rescue', phones: [] });
  assert.equal(r.outsideNyc, false, 'silence is not evidence of being elsewhere');
  assert.equal(r.note, null);
});

/* A city number outranks a place in the name: the number is the harder fact. */
test('a city phone number beats a regional-sounding name', () => {
  const r = inferRegion({ name: 'Long Island Bulldog Rescue', phones: ['7185551234'] });
  assert.equal(r.outsideNyc, false);
});
