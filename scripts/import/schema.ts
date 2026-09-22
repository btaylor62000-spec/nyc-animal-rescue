/**
 * JSON Schema for an organization record.
 *
 * Generated from the same constants the TypeScript types use, so the schema and
 * the types cannot drift apart. Written to disk on every import and used to
 * validate every record before anything is published.
 */
import { ANIMALS, BOROUGHS, CHECK_STATUSES, NEEDS, ORG_TYPES, STATUSES } from '../../src/types.ts';

const nullableString = { type: ['string', 'null'] } as const;

export const ORG_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://nycanimalrescue.org/schema/org.schema.json',
  title: 'Organization',
  type: 'object',
  additionalProperties: false,
  required: [
    'id', 'name', 'aka', 'parent_org', 'org_types', 'animals', 'needs',
    'boroughs', 'citywide', 'outside_nyc', 'neighborhoods', 'zips', 'region_note',
    'phones', 'emails', 'website', 'intake_urls', 'social', 'address', 'hours',
    'notes', 'type_raw', 'confidence', 'status', 'status_note', 'source_urls',
    'last_verified', 'section', 'source_files', 'last_checked', 'check_status',
    'consecutive_failures', 'change_log', 'privacy_hold', 'community',
  ],
  properties: {
    id: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
    name: { type: 'string', minLength: 2 },
    aka: { type: 'array', items: { type: 'string' } },
    parent_org: nullableString,

    org_types: { type: 'array', items: { enum: [...ORG_TYPES] } },
    animals: { type: 'array', items: { enum: [...ANIMALS] } },
    needs: { type: 'array', items: { enum: [...NEEDS] } },

    boroughs: { type: 'array', items: { enum: [...BOROUGHS] }, uniqueItems: true },
    citywide: { type: 'boolean' },
    outside_nyc: { type: 'boolean' },
    neighborhoods: nullableString,
    zips: { type: 'array', items: { type: 'string', pattern: '^\\d{5}$' }, uniqueItems: true },
    region_note: nullableString,

    phones: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['value', 'display'],
        properties: {
          // 10 digits, or a short municipal code such as 311.
          value: { type: 'string', pattern: '^(\\d{10}|\\d{3})$' },
          display: { type: 'string' },
          label: { type: 'string' },
        },
      },
    },
    emails: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['value'],
        properties: {
          value: { type: 'string', format: 'email' },
          label: { type: 'string' },
        },
      },
    },
    website: { type: ['string', 'null'], format: 'uri' },
    intake_urls: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['url'],
        properties: { url: { type: 'string', format: 'uri' }, label: { type: 'string' } },
      },
    },
    social: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['platform', 'handle'],
        properties: {
          platform: { enum: ['instagram', 'facebook', 'x', 'tiktok', 'youtube', 'linktree', 'petfinder', 'other'] },
          handle: { type: 'string' },
          url: { type: 'string', format: 'uri' },
        },
      },
    },
    address: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        street: { type: 'string' },
        city: { type: 'string' },
        borough: { enum: [...BOROUGHS] },
        zip: { type: 'string', pattern: '^\\d{5}$' },
      },
    },
    hours: nullableString,

    notes: nullableString,
    type_raw: nullableString,

    confidence: { enum: ['High', 'Medium', 'Low'] },
    status: { enum: [...STATUSES] },
    status_note: nullableString,

    source_urls: { type: 'array', items: { type: 'string' } },
    last_verified: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    section: nullableString,
    source_files: { type: 'array', items: { type: 'string' }, minItems: 1 },

    last_checked: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    check_status: { enum: [...CHECK_STATUSES] },
    consecutive_failures: { type: 'integer', minimum: 0 },
    change_log: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'field', 'from', 'to', 'source'],
        properties: {
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          field: { type: 'string' },
          from: nullableString,
          to: nullableString,
          evidence_url: { type: 'string' },
          source: { type: 'string' },
          note: { type: 'string' },
        },
      },
    },
    privacy_hold: { type: 'boolean' },
    community: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['added_on', 'corrected_on'],
      properties: {
        added_on: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        corrected_on: { type: ['string', 'null'], pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
      },
    },
  },
} as const;
