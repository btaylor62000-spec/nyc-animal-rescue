/*
 * What every version of the emergency page needs, from the records, so the
 * design options (src/pages/preview/) show the same facts. Second round,
 * 2026-11-06: the reviewer rejected the first three for asking a frightened
 * person to read. Every option now shows, on the page itself, the hospitals
 * open right now nearest to the reader, ordered by the same rank.ts the
 * directory and the assistant use. That is also why there is no "in the
 * Bronx" section any more: a Bronx zip at 11pm already brings up the nearest
 * hospitals that are open, wherever they are.
 */
import { LISTED_ORGS, BOROUGH_LABELS } from './orgs.ts';
import { takesEmergencies } from './rank.ts';
import type { Geo } from '../types.ts';

export const POISON = [
  { name: 'ASPCA Animal Poison Control', phone: '(888) 426-4435', tel: 'tel:+18884264435', note: '24/7, vet toxicologists' },
  { name: 'Pet Poison Helpline', phone: '(855) 764-7661', tel: 'tel:+18557647661', note: '24/7, backup line' },
];
export const TOXIC = 'Lilies are deadly to cats even in tiny amounts (a lick of pollen). Also dangerous: antifreeze, rat and mouse poison, ibuprofen and acetaminophen, xylitol, onion and garlic.';

/** One hospital, as the browser needs it to work out "open now" and "nearest". */
export interface EmergencyVet {
  id: string;
  name: string;
  phone: string;
  tel: string;
  street: string | null;
  zip: string | null;
  /** "Manhattan", or the town for a hospital outside the city. */
  area: string | null;
  hours: string | null;
  status: string;
  confidence: string;
  needs: string[];
  geo: Geo | null;
  outside: boolean;
  /** A walk-in urgent-care clinic, by its own name ("Urgent Vets", "InstaVet Urgent Care"). */
  urgentCare: boolean;
}

/**
 * Every listed vet that takes emergencies, can be rung, and is somewhere you
 * can go: the page is "where is the nearest one", so a service with no
 * address (the pet ambulance) is not one of its answers.
 */
export function emergencyVets(): EmergencyVet[] {
  return LISTED_ORGS.filter((o) => takesEmergencies(o) && o.phones[0] && o.address?.street).map((o) => ({
    id: o.id,
    name: o.name,
    phone: o.phones[0]!.display,
    tel: `tel:+1${o.phones[0]!.value}`,
    street: o.address?.street ?? null,
    zip: o.address?.zip ?? null,
    area: o.address?.city ?? (o.address?.borough ? BOROUGH_LABELS[o.address.borough] : null),
    hours: o.hours ?? null,
    status: o.status,
    confidence: o.confidence,
    needs: o.needs,
    geo: o.geo ?? null,
    outside: !!o.outside_nyc,
    urgentCare: /\burgent\b/i.test(o.name),
  }));
}
