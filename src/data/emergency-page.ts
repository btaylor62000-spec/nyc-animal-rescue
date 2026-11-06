/*
 * What every version of the emergency page needs, from the records, so the
 * three design options (src/pages/preview/) show the same facts and none of
 * them can drop a number the current guide gives. Built 2026-11-06 for the
 * reviewer to choose a design; whichever is chosen replaces the guide's top.
 */
import { LISTED_ORGS, BOROUGH_LABELS } from './orgs.ts';
import { isOpen24h } from './hours.ts';
import type { Org, Borough } from '../types.ts';

export const POISON = [
  { name: 'ASPCA Animal Poison Control', phone: '(888) 426-4435', tel: 'tel:+18884264435', note: '24/7, vet toxicologists' },
  { name: 'Pet Poison Helpline', phone: '(855) 764-7661', tel: 'tel:+18557647661', note: '24/7, backup line' },
];
export const AMBULANCE = { name: 'AmbuVet pet ambulance', phone: '(800) 262-8838', tel: 'tel:+18002628838', note: 'runs 24 hours; ring the hospital you are going to before the pickup' };
export const TOXIC = 'Lilies are deadly to cats even in tiny amounts (a lick of pollen). Also dangerous: antifreeze, rat and mouse poison, ibuprofen and acetaminophen, xylitol, onion and garlic.';
export const BRONX = {
  day: { name: 'Urgent Vets (Bronx)', where: '3800 E Tremont Ave', phone: '(347) 281-9700', tel: 'tel:+13472819700', hours: 'every day, 10am-10pm' },
  night: 'No animal hospital in the Bronx is confirmed open 24 hours. At night: Urgent Vets Queens, 32-33 Junction Blvd, (718) 507-5600; Animal Specialty Center, Yonkers, 9 Odell Plaza, (914) 457-4000; or the Manhattan hospitals.',
};

export interface Hospital { id: string; name: string; phone: string; tel: string; street: string; area: string }

const tel = (digits: string) => `tel:+1${digits}`;

/** Hospitals confirmed open 24 hours, by borough, then outside the city. */
export function hospitals24(): Array<{ area: string; key: string; list: Hospital[] }> {
  const all = LISTED_ORGS.filter((o) => o.needs.includes('emergency-vet') && isOpen24h(o.hours) && o.phones[0]);
  const toH = (o: Org, area: string): Hospital => ({
    id: o.id,
    name: o.name,
    phone: o.phones[0]!.display,
    tel: tel(o.phones[0]!.value),
    street: o.address?.street ?? '',
    area,
  });
  const order: Borough[] = ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'];
  const groups = order.map((b) => ({
    area: BOROUGH_LABELS[b],
    key: b,
    list: all.filter((o) => !o.outside_nyc && (o.address?.borough ?? o.boroughs[0]) === b).map((o) => toH(o, BOROUGH_LABELS[b])),
  }));
  groups.push({ area: 'Just outside the city', key: 'outside', list: all.filter((o) => o.outside_nyc).map((o) => toH(o, 'Outside the city')) });
  return groups;
}
