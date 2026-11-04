import fs from 'node:fs';
import { isListed } from '../../src/data/listing.ts';
import { zipToBorough } from '../../src/data/geo.ts';
const orgs = fs.readdirSync('data/orgs').map((f) => JSON.parse(fs.readFileSync('data/orgs/' + f, 'utf8'))).filter((o) => isListed(o));
console.log('11203 ->', zipToBorough('11203'));
const shown = (o: any, b: string) => o.citywide || o.boroughs.includes(b);
const zipShown = (o: any, z: string) => { const zb = zipToBorough(z); return o.zips.includes(z) || o.citywide || (zb !== null && o.zips.length === 0 && o.boroughs.includes(zb)); };
const hidden = orgs.filter((o) => !shown(o, 'brooklyn'));
const groups: Record<string, string[]> = {};
for (const o of hidden) {
  const k = o.boroughs.length === 0 ? (o.outside_nyc ? 'no-borough, outside' : 'no-borough') : o.boroughs.length >= 3 ? 'multi(3+) not bk' : 'other boroughs';
  (groups[k] ||= []).push(o.id);
}
for (const [k, v] of Object.entries(groups)) console.log(k, v.length, v.slice(0, 40).join(', '));
const multi = orgs.filter((o) => !o.citywide && o.boroughs.length === 5);
console.log('all five but not citywide:', multi.length, multi.slice(0, 10).map((o) => o.id).join(', '));
const zipHid = orgs.filter((o) => shown(o, 'brooklyn') && !zipShown(o, '11203'));
console.log('in Brooklyn but hidden for 11203:', zipHid.length, zipHid.map((o) => o.id + '[' + o.zips.slice(0, 3).join(' ') + ']').slice(0, 40).join(', '));
