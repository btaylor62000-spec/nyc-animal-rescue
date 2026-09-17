/**
 * The decision engine.
 *
 * Pure: it takes a record and the evidence gathered about it, and returns what
 * should happen. No network, no clock beyond the date it is handed, no file
 * access. That is what makes it testable, and being testable is what makes it
 * safe to let it edit an emergency directory unattended.
 *
 * The governing principle throughout: a wrong contact is worse than a stale
 * one. When the evidence is anything less than unambiguous, the engine flags
 * rather than changes, and it never deletes anything.
 */
import { AGENT } from './config.ts';
import type { ChangeLogEntry, Confidence, Org } from '../../src/types.ts';
import type { ClosureSignal } from './extract.ts';

/** What was found at one URL belonging to an organization. */
export interface PageEvidence {
  url: string;
  finalUrl: string;
  status: number;
  ok: boolean;
  /** The URL redirected somewhere off the organization's domain. */
  offDomain: boolean;
  /** True when this page is on the organization's own domain. */
  ownDomain: boolean;
  text: string;
  phones: string[];
  emails: string[];
  closure: ClosureSignal[];
  error?: string;
}

export interface Evidence {
  orgId: string;
  /** ISO date of the check. */
  date: string;
  pages: PageEvidence[];
}

export type Decision =
  /** Nothing to do. `verified` means the stored contacts were seen on their own site. */
  | { kind: 'ok'; verified: boolean }
  /** A contact detail changed, with evidence good enough to apply it. */
  | { kind: 'apply'; changes: FieldChange[] }
  /** Something a person should look at. Never applied automatically. */
  | { kind: 'needs-review'; reason: string; evidenceUrl?: string; quote?: string }
  /** The site could not be reached. */
  | { kind: 'unreachable'; failures: number; flagged: boolean }
  /** The organization says it has closed or paused. */
  | { kind: 'closed'; severity: 'closed' | 'paused'; reason: string; evidenceUrl: string; quote: string }
  /** Not checkable by machine. */
  | { kind: 'skipped'; reason: string };

export interface FieldChange {
  field: 'phones' | 'emails' | 'website';
  from: string | null;
  to: string | null;
  evidenceUrl: string;
}

/** Can this organization be checked automatically at all? */
export function isCheckable(org: Org): { checkable: boolean; reason?: string } {
  const hasOwnSite = Boolean(org.website) || org.intake_urls.length > 0;
  if (!hasOwnSite) {
    if (org.social.length > 0) {
      return {
        checkable: false,
        reason:
          'Reachable only through a social media account, which cannot be checked automatically. Verify via their social channel.',
      };
    }
    return { checkable: false, reason: 'No website recorded, so there is nothing to check.' };
  }
  return { checkable: true };
}

function downgrade(confidence: Confidence): Confidence {
  return confidence === 'High' ? 'Medium' : 'Low';
}

/**
 * Decide what a week's evidence means for one organization.
 *
 * `today` is passed in rather than read from the clock so the same evidence
 * always produces the same decision in a test.
 */
export function decide(org: Org, evidence: Evidence): Decision {
  const skip = isCheckable(org);
  if (!skip.checkable) return { kind: 'skipped', reason: skip.reason! };

  const ownPages = evidence.pages.filter((p) => p.ownDomain && p.ok);
  const reachable = evidence.pages.some((p) => p.ok);

  // --- the site is not there -------------------------------------------
  if (!reachable) {
    const failures = org.consecutive_failures + 1;
    return { kind: 'unreachable', failures, flagged: failures >= AGENT.failuresBeforeReview };
  }

  // --- the organization says it has stopped -----------------------------
  // Checked before contacts: if they have closed, their phone number being
  // unchanged is not reassuring.
  for (const page of ownPages) {
    const worst = page.closure.find((c) => c.severity === 'closed') ?? page.closure[0];
    if (!worst) continue;
    return {
      kind: 'closed',
      severity: worst.severity,
      reason: `Their own site ${worst.label}.`,
      evidenceUrl: page.finalUrl,
      quote: worst.quote,
    };
  }

  // --- a redirect that left the domain ----------------------------------
  const wandered = evidence.pages.find((p) => p.offDomain);
  if (wandered) {
    return {
      kind: 'needs-review',
      reason: `${wandered.url} now redirects to ${wandered.finalUrl}, which is a different domain. The organization may have moved, been renamed, or lost the domain.`,
      evidenceUrl: wandered.finalUrl,
    };
  }

  if (ownPages.length === 0) {
    return {
      kind: 'needs-review',
      reason: 'None of the recorded pages on the organization’s own domain could be read.',
    };
  }

  const pageText = ownPages.map((p) => p.text).join('\n');
  const foundPhones = [...new Set(ownPages.flatMap((p) => p.phones))];
  const foundEmails = [...new Set(ownPages.flatMap((p) => p.emails))];

  // --- contacts ----------------------------------------------------------
  const storedPhones = org.phones.map((p) => p.value);
  const storedEmails = org.emails.map((e) => e.value.toLowerCase());

  const phonesStillThere = storedPhones.filter((p) => foundPhones.includes(p));
  const emailsStillThere = storedEmails.filter((e) => foundEmails.includes(e));

  const anyStoredContact = storedPhones.length > 0 || storedEmails.length > 0;
  const allPhonesGone = storedPhones.length > 0 && phonesStillThere.length === 0;
  const allEmailsGone = storedEmails.length > 0 && emailsStillThere.length === 0;

  const changes: FieldChange[] = [];
  const evidenceUrl = ownPages[0]!.finalUrl;

  // Not finding a contact is weak evidence on its own.
  //
  // Plenty of sites put their number in an image, load it with JavaScript, or
  // write it as "info [at] example dot org". If we found no contacts of that
  // kind anywhere on their site, the most likely explanation is that we could
  // not read them -- not that the organization changed them. Saying "this
  // needs a person" every week for that would bury the signals that matter.
  //
  // What *is* meaningful is finding contacts of that kind and not finding
  // theirs among them. That is a real difference between the page and the
  // record.
  const sawAnyPhone = foundPhones.length > 0;
  const sawAnyEmail = foundEmails.length > 0;

  if (allPhonesGone && sawAnyPhone) {
    const candidates = foundPhones.filter((p) => !storedPhones.includes(p));
    if (candidates.length === 1) {
      changes.push({ field: 'phones', from: storedPhones.join(', '), to: candidates[0]!, evidenceUrl });
    } else {
      return {
        kind: 'needs-review',
        reason: `The recorded phone number is no longer on their site, and there are ${candidates.length} other numbers there. Someone needs to pick the right one.`,
        evidenceUrl,
      };
    }
  }

  if (allEmailsGone && sawAnyEmail) {
    const candidates = foundEmails.filter((e) => !storedEmails.includes(e));
    if (candidates.length === 1) {
      changes.push({ field: 'emails', from: storedEmails.join(', '), to: candidates[0]!, evidenceUrl });
    } else {
      return {
        kind: 'needs-review',
        reason: `The recorded email address is no longer on their site, and there are ${candidates.length} other addresses there.`,
        evidenceUrl,
      };
    }
  }

  if (changes.length) return { kind: 'apply', changes };

  // Verified means we saw what we already had, on their own site, today.
  // When we did not, the record simply does not get its date refreshed, and
  // the site's own staleness notice takes over after ninety days. That is the
  // honest outcome: we did not confirm it, and we are not claiming otherwise.
  const verified = anyStoredContact && (phonesStillThere.length > 0 || emailsStillThere.length > 0);

  // A page that renders almost nothing is a broken fetch, not a healthy site.
  if (pageText.length < 200) {
    return { kind: 'needs-review', reason: 'Their site returned a page with almost no readable text.', evidenceUrl };
  }

  return { kind: 'ok', verified };
}

// --- turning a decision into a record change -------------------------------

export interface Applied {
  /** Patch to write into the overlay. */
  patch: Record<string, unknown>;
  log: ChangeLogEntry[];
  /** One line for the weekly issue, when a person should see it. */
  flag?: string;
}

/**
 * Translate a decision into the fields to write. Kept separate from `decide`
 * so the reasoning can be tested without the bookkeeping, and the bookkeeping
 * without the reasoning.
 */
export function toPatch(org: Org, decision: Decision, date: string): Applied {
  const base = { last_checked: date };

  switch (decision.kind) {
    case 'skipped':
      return {
        patch: { ...base, check_status: 'unchecked' },
        log: [],
      };

    case 'ok':
      return {
        patch: {
          ...base,
          check_status: 'ok',
          consecutive_failures: 0,
          ...(decision.verified ? { last_verified: date } : {}),
        },
        log: [],
      };

    case 'apply': {
      const log: ChangeLogEntry[] = decision.changes.map((c) => ({
        date,
        field: c.field,
        from: c.from,
        to: c.to,
        evidence_url: c.evidenceUrl,
        source: 'weekly-check',
        note: 'The previous value was no longer on their site and exactly one replacement was found there.',
      }));

      const patch: Record<string, unknown> = { ...base, check_status: 'changed', consecutive_failures: 0, last_verified: date };
      for (const c of decision.changes) {
        if (c.field === 'phones' && c.to) {
          const digits = c.to;
          patch.phones = [
            { value: digits, display: `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}` },
          ];
        }
        if (c.field === 'emails' && c.to) patch.emails = [{ value: c.to }];
        if (c.field === 'website') patch.website = c.to;
      }
      return {
        patch,
        log,
        flag: `${org.name}: ${decision.changes.map((c) => `${c.field} ${c.from} → ${c.to}`).join('; ')}`,
      };
    }

    case 'unreachable': {
      const patch: Record<string, unknown> = {
        ...base,
        check_status: decision.flagged ? 'needs-review' : 'unreachable',
        consecutive_failures: decision.failures,
      };
      const log: ChangeLogEntry[] = [];
      if (decision.flagged) {
        // Only downgrade once, on the run that crosses the threshold.
        if (decision.failures === AGENT.failuresBeforeReview) {
          patch.confidence = downgrade(org.confidence);
          log.push({
            date,
            field: 'confidence',
            from: org.confidence,
            to: String(patch.confidence),
            source: 'weekly-check',
            note: `Their website has been unreachable for ${decision.failures} weekly checks running.`,
          });
        }
        patch.status_note = 'This organization may no longer be active — their website has not responded for several weeks.';
      }
      return {
        patch,
        log,
        flag: decision.flagged
          ? `${org.name}: website unreachable for ${decision.failures} weeks running`
          : undefined,
      };
    }

    case 'closed':
      return {
        patch: {
          ...base,
          check_status: 'needs-review',
          consecutive_failures: 0,
          status: decision.severity === 'closed' ? 'retired' : 'hiatus',
          status_note: `${decision.reason} Checked ${date}.`,
        },
        log: [
          {
            date,
            field: 'status',
            from: org.status,
            to: decision.severity === 'closed' ? 'retired' : 'hiatus',
            evidence_url: decision.evidenceUrl,
            source: 'weekly-check',
            note: decision.quote.slice(0, 300),
          },
        ],
        flag: `${org.name}: ${decision.reason} (${decision.evidenceUrl})`,
      };

    case 'needs-review':
      return {
        patch: {
          ...base,
          check_status: 'needs-review',
          consecutive_failures: 0,
        },
        log: [],
        flag: `${org.name}: ${decision.reason}${decision.evidenceUrl ? ` (${decision.evidenceUrl})` : ''}`,
      };
  }
}

/**
 * The safety valve.
 *
 * If a run wants to change an implausible share of the directory, the checker
 * has broken -- a parser regression, a captive-portal network, a CDN serving
 * one error page for every request. Report, change nothing.
 */
export function tooManyChanges(changeCount: number, total: number): boolean {
  if (total === 0) return false;
  return changeCount / total > AGENT.maxChangeShare;
}
