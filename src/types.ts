/**
 * Canonical data model for the NYC Animal Rescue directory.
 *
 * One record per organization. Everything the site, the search index and the
 * chat assistant read comes from here; `schema/org.schema.json` is generated
 * from these types by hand and validated on every import.
 */

/** Kinds of animal a resource can help with. */
export const ANIMALS = [
  'cat',
  'dog',
  'rabbit',
  'small-mammal',
  'bird-companion',
  'bird-wild',
  'pigeon',
  'reptile',
  'amphibian',
  'fish',
  'farm',
  'equine',
  'wildlife',
  'marine',
  'invertebrate',
] as const;
export type Animal = (typeof ANIMALS)[number];

/** What a person actually needs when they arrive. Drives the filter panel. */
export const NEEDS = [
  'emergency-vet',
  'poison-control',
  'wildlife-rehab',
  'adoption',
  'surrender',
  'foster',
  'tnr',
  'colony-care',
  'trap-bank',
  'spay-neuter',
  'low-cost-vet',
  'exotic-vet',
  'neonatal',
  'medical-special-needs',
  'senior',
  'retrovirus',
  'lost-found',
  'microchip',
  'behavior-training',
  'financial-aid',
  'food-assistance',
  'owner-support',
  'boarding',
  'sanctuary',
  'working-cat',
  'transport',
  'legal',
  'breed-specific',
  'education',
  'advocacy',
  'licensing',
  'pet-loss',
  'referral',
] as const;
export type Need = (typeof NEEDS)[number];

/** What kind of organization this is, structurally. */
export const ORG_TYPES = [
  'shelter-open-admission',
  'shelter-no-kill',
  'rescue-foster',
  'tnr-group',
  'solo-rescuer',
  'clinic',
  'emergency-vet',
  'exotic-vet',
  'wildlife-rehabber',
  'sanctuary',
  'referral-hub',
  'advocacy',
  'hotline',
  'government',
  'club-society',
  'directory',
  'support-program',
] as const;
export type OrgType = (typeof ORG_TYPES)[number];

export const BOROUGHS = ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'] as const;
export type Borough = (typeof BOROUGHS)[number];

/**
 * How firmly the entry is verified, carried over from the source workbooks.
 * High   = confirmed on the organization's own site on `last_verified`.
 * Medium = confirmed via an authoritative third-party listing, or a caveat
 *          such as being outside the city.
 * Low    = a real group reachable mainly through a directory or social channel.
 */
export type Confidence = 'High' | 'Medium' | 'Low';

/**
 * Whether the organization is currently operating. Deliberately separate from
 * `confidence`: a well-verified group that has shut down and a thinly-verified
 * group that is thriving are different problems for someone in a crisis.
 */
export const STATUSES = ['active', 'verify', 'hiatus', 'relocated', 'retired'] as const;
export type Status = (typeof STATUSES)[number];

/** Result of the most recent automated check (Phase 4). */
export const CHECK_STATUSES = ['ok', 'changed', 'unreachable', 'needs-review', 'new-unverified', 'unchecked'] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

/** A phone number, kept alongside the role it serves ("intake", "TNR"). */
export interface Phone {
  /** Digits only, as dialled from the US: "7184365163" or "8884264435". */
  value: string;
  /** Human-facing form: "(718) 436-5163". */
  display: string;
  /** What this line is for, when the source distinguished it. */
  label?: string;
}

export interface Email {
  value: string;
  label?: string;
}

/** A URL that carries the role it serves: "Adopt", "Surrender (by appt)". */
export interface LabeledUrl {
  url: string;
  label?: string;
}

export interface SocialLink {
  platform: 'instagram' | 'facebook' | 'x' | 'tiktok' | 'youtube' | 'linktree' | 'petfinder' | 'other';
  /** "@bushwickcats" or a page path. */
  handle: string;
  url?: string;
}

export interface Address {
  street?: string;
  city?: string;
  borough?: Borough;
  zip?: string;
}

/** One automated or manual change to a record, for the public changes feed. */
export interface ChangeLogEntry {
  /** ISO date. */
  date: string;
  field: string;
  from: string | null;
  to: string | null;
  /** URL on the organization's own domain that evidenced the change. */
  evidence_url?: string;
  /** "import", "weekly-check", "manual". */
  source: string;
  note?: string;
}

export interface Org {
  /** Stable slug. Never regenerated once published. */
  id: string;
  name: string;
  /** Alternative names and former names, used by search and de-duplication. */
  aka: string[];
  /** Set when this record is a programme of a larger organization (ACC's
   *  Working Cats programme, for example) rather than an independent group. */
  parent_org: string | null;

  org_types: OrgType[];
  animals: Animal[];
  needs: Need[];

  boroughs: Borough[];
  /** True when the group explicitly serves all five boroughs. */
  citywide: boolean;
  /** True for regional groups that serve NYC but sit outside it. */
  outside_nyc: boolean;
  /** Free text exactly as the source gave it. */
  neighborhoods: string | null;
  zips: string[];
  /** The section heading this row sat under, carried down. */
  region_note: string | null;

  phones: Phone[];
  emails: Email[];
  website: string | null;
  /** Intake / help forms. Kept as a list because a single organization often
   *  has separate adoption, surrender and help-request entry points. */
  intake_urls: LabeledUrl[];
  social: SocialLink[];
  address: Address | null;
  hours: string | null;

  notes: string | null;
  /** The source's own `Type` string, kept verbatim so tagging stays auditable. */
  type_raw: string | null;

  confidence: Confidence;
  status: Status;
  /** Why the status is not `active`, in plain language. */
  status_note: string | null;

  source_urls: string[];
  /** ISO date. */
  last_verified: string | null;
  /** Which workbook + tab this came from. */
  section: string | null;
  source_files: string[];

  // --- fields owned by the Phase 4 update agent ---
  last_checked: string | null;
  check_status: CheckStatus;
  consecutive_failures: number;
  change_log: ChangeLogEntry[];

  /** Set when contact details were withheld pending permission. */
  privacy_hold: boolean;

  /**
   * Set when a visitor to the site added or corrected this record through
   * the contribute form. Shown on the card, because a visitor's word has
   * passed one automated check and nothing else.
   */
  community: { added_on: string | null; corrected_on: string | null } | null;
}
