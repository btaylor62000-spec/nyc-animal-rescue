import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNycZip, zipToBorough } from '../scripts/import/taxonomy.ts';

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
