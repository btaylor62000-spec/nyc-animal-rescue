# Working on this project

Notes for whoever picks this up next, human or otherwise. `README.md` says what
the project is; this says how to change it without breaking the parts that
matter.

---

## Where things stand

**The site is live and deployed.** Everything below already works in
production; nothing here is aspirational.

| | |
| --- | --- |
| Live site | <https://nyc-animal-rescue.pages.dev> |
| Repository | `btaylor62000-spec/nyc-animal-rescue` (public) |
| Hosting | Cloudflare Pages, auto-deploys on every push to `main` |
| Assistant | Working, with Workers AI and Turnstile both switched on |
| Scheduled checks | Both active. Weekly ran for the first time 2026-09-21 and **pushed five wrong changes to production** — see below. Since 2026-09-22 it opens a pull request for anything a reader could see; only bookkeeping goes to `main`. Discovery has run once, 2026-09-17, and still pushes to `main` |
| Sources | Three reference workbooks, the wildlife document, and `research/NYC_Reviewer_Additions.xlsx` for organizations a reviewer found missing (7 rows: two rescues, a Bronx rehabber, and four wildlife reporting lines that the injured-bird guide cites by record id) |
| Guides | 21, of which two are new and written from a reviewer's mockups: reporting abuse, and the shelter's at-risk list |
| Self-reporting | `/status` publishes what is checked, what is not, and what is waiting on a person |
| Privacy holds | All three people agreed to be listed on 2026-09-22; their contacts are published. The mechanism stays for the next one. Tests use `tests/fixtures/privacy-holds.json`, not the live file |
| Visitor submissions | Live since 2026-09-22: `/contribute` adds a resource, every card and entry page has "Fix this entry". First real correction went through the whole chain the same day (form → commit → publish workflow → deploy → labelled entry) |

Two things about the local git setup, because they are not obvious:

- The push remote is `github-btaylor:btaylor62000-spec/...`, an SSH host alias
  in `~/.ssh/config`. The machine's default GitHub key belongs to a *different*
  account (`VerityHealth`), and GitHub will not accept one key on two accounts,
  so this project has its own key at `~/.ssh/id_ed25519_btaylor`.
- `npx wrangler` is logged in, so secrets can be set from the command line:
  `wrangler pages secret put NAME --project-name=nyc-animal-rescue`.

### What to do next

Ordered by how much harm it prevents, not by size.

1. **Confirm the weekly check can open its pull request.** As of 2026-09-22
   the check verifies and flags only; the one reader-visible change it can
   still make (a `verify` status after three dead weeks, and lifting it) goes
   to the `weekly-check` branch as a PR; bookkeeping-only weeks still
   commit to `main` as the heartbeat. The split is decided by `proposed` in
   `build/reports/weekly-summary.json`, which the run writes, and there is a
   test that the change log is written exactly when a reader could see the
   difference. What has *not* been verified: the repository setting **Allow
   GitHub Actions to create and approve pull requests** (Settings → Actions →
   General) must be on, or the PR step fails — the branch is still pushed, so
   nothing is lost. Turn it on, then run the workflow by hand without dry-run
   to see it through once. Discovery still pushes straight to `main`; it only
   adds records labelled unverified and excluded from the assistant, and item
   2 decides whether those should be published at all.

2. **Keep marking discovery candidates by hand.** Decided 2026-09-22:
   discovery finds mostly out-of-city rescues, so nothing it finds is
   published until a person sets `"publish": true` on the candidate in
   `data/discovered.json` (with `boroughs` and `checkedBy` when they confirmed
   where it is). Discovery re-ran that day, read 200 sites, and 11 were
   published: 7 with a city number or name, 4 confirmed by reading the site.
   67 are outside the city and stay unpublished. About 120 gave no phone and
   nothing in the name places them; the site can now read them again only
   for new candidates, so those wait for a person. Three that looked local
   had dead or broken sites that day: Fosterlings, Urban Wildlife Alliance,
   Zani's Furry Friends.

3. **Two regional records still carry no location, on purpose.** Of the six
   regional exotic-animal rescues with no borough, four are now reachable
   citywide because their rows call them "NYC-adjacent" or "tri-state"
   (`directory.ts` reads those as serving the city, unless the row also says
   "far from NYC"). Equine Rescue, Inc. (Hudson Valley, "regional") and
   Luv-N-Bunns (Philadelphia, "far from NYC") stay outside-only: search finds
   them, filters do not, which matches what the research says about them.

### What the automated run got wrong

The weekly check ran for the first time on 2026-09-21 and pushed to production.
A reviewer caught the damage. Worth reading before trusting a future run.

- **Both VEG emergency hospitals were given a New Jersey number**, at High
  confidence, citing VEG's own page as evidence. That number is not on that
  page as a reader sees it: VEG renders each hospital's number in the browser,
  so a plain fetch reads markup nobody is shown. Every clause of the rule was
  satisfied and the result was a wrong number on a 24-hour emergency listing,
  live for about seven hours. Note that re-fetching the same page later showed
  the number present — the failure is intermittent, so sampling a page once
  does not prove it is safe.
- **A rescue was given (212) 222-1234**, the unedited placeholder from its
  website's theme, present only as a hidden `tel:` link.
- **The city's open-admission shelter was marked as not accepting intakes**, on
  the strength of "if we are currently at capacity, adopters will be directed
  to sign up for a waitlist" — a conditional, about visitors, on an adoption
  page. ACC cannot refuse intake.
- **A rescue was marked on hiatus** for saying its foster homes were at
  capacity, which limits what it can take and says nothing about it stopping.

The guards added in `scripts/agent/rules.ts` afterwards stopped each of these,
and on 2026-09-22 the decision was made to go further: the check no longer
rewrites anything. Every changed contact and every closure sentence is a flag
with the evidence attached. Two of the eight changes that run made were correct
and were kept.

### Discovery finds mostly out-of-city organizations

The roster discovery reads is ACC's New Hope partner list: rescues approved to
pull animals *out of* NYC shelters, which is a different thing from resources a
New Yorker can call. Of the ten candidates whose phone numbers a dry run could
read, two were New York City numbers; the rest were Pennsylvania, Connecticut,
New Jersey and the Hudson Valley, and one was Californian. `inferRegion` in
`scripts/import/taxonomy.ts` now sets `outside_nyc` from the area code and the
name, but only 13 of the 160 stored candidates are tagged so far, because none
of them have phone numbers yet — discovery has not re-run since it learned to
read them.

### Things that will waste your time if you do not know them

- **`npm run import` is safe again.** It used to materialise 159 discovery
  candidates on every run — and the weekly workflow runs it, so the next
  Monday would have published them. Candidates are now held back unless the
  import is run with `--publish-discovered`. The message "160 discovery
  candidates held back" in the import output is expected.
- **Check production, not just the build.** Three defects this week existed
  only in the deployed page: a `tel:+1311` that could not dial, a dead link
  that survived in `source_urls` after the website and intake links were fixed,
  and a caveat written to `status_note`, which an *active* record never
  displays. A passing build proves less than a cache-busted fetch of the real
  URL.
- **The overlay is the only way to correct a record.** `data/orgs/` is
  regenerated, so hand edits there are destroyed by the next import.
  `OverlayEntry` now covers `phones`, `emails`, `website`, `intake_urls`,
  `source_urls`, `notes`, `status` and confidence — enough to fix anything a
  reader can see.
- **A record's `status_note` is only rendered when the record is not active.**
  A caveat about an operating organization belongs in `notes`.

### Two bugs already fixed, so they are not re-introduced

- **The Turnstile widget must be visible while it runs.** It was originally
  rendered into a container marked `aria-hidden` with no layout. The widget
  loaded but never produced a token, which made the assistant unreachable for
  everyone once verification was switched on. A Managed challenge decides for
  itself whether to ask the reader for something, so it needs to be seen.
- **Turnstile cannot be tested from an automated browser.** It refuses them by
  design — that is the entire point of it. A failing check in automation is not
  evidence of a bug. Test in a real browser.

---

## What this is for

People arrive here mid-crisis. An injured bird on the pavement, kittens in a
yard, a dog someone can no longer afford. They are upset, often on a phone,
sometimes outside in the cold.

Every judgement call in this codebase resolves the same way: **be right, be
fast, and be honest about what is not known.** A wrong phone number on an
emergency listing does more harm than a missing one, and a confident answer
that turns out to be wrong is worse than an admission of ignorance.

---

## Rules that are not negotiable

Breaking any of these would hurt someone. If a change requires it, that is a
sign the change is wrong, not that the rule needs an exception.

### 1. Never publish a contact detail that is not in the data

The assistant chooses organizations by retrieval, not by generation. Cards are
built from the real records. `src/chat/redact.ts` filters every phone number,
email and web address in the model's output against the contacts that were
actually retrieved, and removes anything else — including mid-stream, so a
fabricated number cannot slip through a chunk boundary.

If you add a new way for the assistant to produce text, it goes through the
redactor. There is a test that feeds a fake number split across five chunks and
asserts nothing leaks.

### 2. Automation never deletes, and never *changes* a contact or a status

`scripts/agent/rules.ts` is pure — no network, no clock, no file access. That
is what makes it testable, and being testable is what makes it safe to let it
run against an emergency directory unattended.

It **verifies and flags. It does not edit.** Its first unattended run, on
2026-09-21, could still rewrite a contact when the old one had gone from the
organization's own site and exactly one replacement was there; it met that
rule five times and was wrong four of them. It is good at noticing that
something changed and bad at deciding what the change means, so as of
2026-09-22 a changed number, a changed email, or closure wording on a page all
become a flag that names what was found and the page it was found on, and a
person decides. The one status it may set on its own is `verify` after three
consecutive unreachable weeks — a statement of ignorance, not a conclusion —
and it lifts that again when the site answers, only when it was this code
that set it (recognised by the exact note text). Confidence is downgraded
**once** at that point, not every week after. If a run would flag more than
15% of the directory it records nothing but the check date and reports itself
broken.

Add a decision path and you add a test for it, including that it cannot change
a contact and cannot produce a deletion.

**Filling an empty record is a different question, and the answer is yes.**
This used to be forbidden too, and the cost was hidden: an organization found
on a roster arrived with a name and a link and nothing else, could not be
contacted, and could never become verified either — the weekly check confirms
stored contacts rather than finding them, so a record with none stayed
unverifiable for ever. A hundred and sixty organizations sat in that state,
invisible to everyone.

So discovery now reads each new organization's own website once and keeps the
phones and emails it publishes. That *is* a guess, and it is handled by being
honest rather than by being withheld: Low confidence, a note on the record
saying nobody has confirmed it, the source page in the change log, and last
place in every ranking. A page listing more than three numbers is treated as a
directory of other people rather than one organization's details, and nothing
is taken from it.

The line is between **adding** and **overwriting**. An unconfirmed number where
there was none helps someone; an unconfirmed number replacing a checked one
does not. The first is allowed, the second is still forbidden.

### 3. Personal contacts stay withheld until the person agrees

`data/privacy-holds.json` lists them. The importer scrubs every held value from
every output, and removes the whole surrounding passage from guide prose —
cutting only the digits left "contact Divya at [withheld]", which still names
her and still reads as an invitation.

Before adding any new source of records, ask whether it contains individuals
rather than organizations. The state wildlife-rehabilitator register does: it
is read for coverage counts only, and none of it is published.

### 4. Safety guidance is copied, never summarised

Several warnings are counter-intuitive and people act on them under stress:

- A window-strike bird must **not** be given supplemental heat, even though a
  cold nestling should be warmed.
- Injured wildlife must **never** be offered food or water.
- A cat's bite or claws are an emergency for a bird or small mammal even with
  no visible wound.
- Most fledglings on the ground should be left alone.
- Never release a domestic animal outdoors.

Paraphrasing risks softening exactly the instruction that matters.

### 5. Configuration has exactly one home for each kind of thing

Because `wrangler.toml` exists, Cloudflare treats it as the source of truth and
the dashboard only manages encrypted secrets. So:

- **Bindings** (Workers AI) — `wrangler.toml`
- **Public values** (repo slug, Turnstile site key) — `src/data/site.ts`
- **Secrets** (Turnstile secret key, pass signing key) — Cloudflare dashboard

Do not add a build-time public value as a Pages environment variable. It will
appear to work in the dashboard and silently not reach the build.

### 6. It must not be able to cost money

Stay on the Workers Free plan. No database, no paid API, no stored state. See
`docs/FREE-TIER.md` for what each service allows and what happens at the limit.

---

## The shape of the data

One record per organization in `data/orgs/<id>.json`, generated by
`npm run import`. `src/types.ts` is the definition; read it before changing
anything about records.

Two fields are routinely confused:

- **`confidence`** — how firmly the contact details are *evidenced*. High means
  confirmed on the organization's own site on `last_verified`.
- **`status`** — whether the organization is *operating*. `active`, `verify`,
  `hiatus`, `relocated`, `retired`.

They are separate because they are different problems. A well-verified group
that has shut down is more dangerous to someone in a hurry than a
thinly-verified group that is thriving. Do not collapse them.

`check_status` is owned by the weekly agent. `new-unverified` means discovery
found it and nothing has checked it; those are labelled on the site and
excluded from the assistant entirely.

**`/status` publishes all of this.** How many entries are checked, how many
have never been, what is flagged for a person, what is withheld pending
consent, and when each scheduled job last ran — generated from the data at
build time, so it cannot drift from what the entries say. It exists because
none of it used to be visible anywhere except by reading the repository.

### Regenerating

`npm run import` rewrites `data/orgs/`, `content/guides/`,
`data/chat-corpus.json` and the reports from `research/`. It is idempotent:
running it twice on unchanged sources produces byte-identical output, so
`git status` after an import is a real signal.

It applies two overlays last, which is what lets the automation and the
importer coexist:

- `data/agent-overlay.json` — what the weekly checks learned
- `data/discovered.json` — candidates from monthly discovery

**Never have the agent write into `data/orgs/` directly.** The next import
would destroy it.

---

### Adding a guide

Two of the guides come from a reviewer's mockups rather than from the original
research, and the pattern is worth repeating: write the source as a workbook in
`research/`, register it in `GUIDE_PAGES` in `scripts/import/guide-pages.ts`,
and let the importer generate the page. Nothing is hand-written into
`content/guides/`, which is regenerated.

The parser reads **column A only** and trims leading whitespace, so structure
comes from `- ` bullets and from headings in capitals, not from indentation.
A line carrying a contact detail becomes a listing. Register the tab in
`GUIDE_ORG_SOURCES` as well and its contacts become organization records; leave
it out and they stay as text on the page, which is the right choice when the
organizations already have entries whose contacts are maintained.

Write URLs in full, with `https://`, when they are the point of the page. The
renderer autolinks those and leaves bare domains as text — fine for a
reference, wrong for something someone has to act on.

## Visitor submissions

Decided 2026-09-22, with the risk stated and accepted: additions auto-publish,
labelled; corrections overwrite, labelled. No person is in the loop before
publication. The only gate is the quick check, and it is worth being clear
what it proves: that the phone or email given appears on the website given.
Not that the website is the organization's, not that the organization exists.

How it moves:

1. `/contribute` or `/org/<id>/correct` posts to `functions/api/contribute.ts`.
   Turnstile, then a cache-based rate limit, then `validate` in
   `src/contribute/protocol.ts` (shared with the form and the tests).
2. The Function fetches the organization's site and checks the contact is on
   it. For a correction, the site checked is the **record's** website unless a
   new one was submitted — a visitor does not get to name the page that
   vouches for them. Held personal numbers and template placeholders are
   refused. An addition whose name or website host matches an existing record
   is refused with a link to correct that record instead.
3. It commits one JSON file to `data/community/` through the GitHub API with
   `GITHUB_CONTRIB_TOKEN`. `.github/workflows/community.yml` runs the import,
   the tests and the build, and commits the regenerated records. Cloudflare
   deploys. Nothing else stores anything: there is no database, and the
   submitter's optional email is in that public file, which the form says.
4. `scripts/import/community.ts` turns additions into records
   (`check_status: new-unverified`, Low confidence, excluded from the
   assistant like discoveries) and applies corrections **after** the agent
   overlay, so the latest word wins. Both set `community` on the record, which
   is what the card and the page label.

A submission that breaks the schema or the build is not published: the
workflow commits nothing and the file waits in `data/community/` for a person.
To undo any submission, delete its file and re-run the import.

## Tagging

`scripts/import/taxonomy.ts` is the single place that decides why an
organization carries a tag. Rules are readable tables; `build/reports/tagging-trace.json`
records which rule fired for each tag.

If something is tagged wrong, fix the rule rather than the data. The only
exception is `scripts/import/overrides.ts`, for facts the source genuinely does
not state — and a stale override throws rather than silently doing nothing.

Two traps that have already caused bugs:

- **Need vocabularies must not contain animal words.** "community cat" split
  into words put `cat` into the TNR vocabulary, and every question mentioning a
  cat was read as a question about trap-neuter-return. `NEED_WORDS` is built
  with animal words removed.
- **Merge keys compare words, not squashed strings.** An early version compared
  concatenated keys and let `brooklyn` swallow six unrelated Brooklyn groups.

---

## Search and retrieval

`src/data/search.ts` is shared by the site's search box, the tests and the
assistant's server-side retrieval. A word that finds a record in one must find
it in all of them, or the assistant and the site will disagree about what
exists.

Things that matter and are easy to undo by accident:

- **Stemming** is applied to both index and query. Without it "spayed" never
  finds a clinic listed as doing "spay".
- **Fuzzy and prefix matching only on longer terms.** On short words they turn
  "baby" into "bay" and "lost" into "cost".
- **Accents are folded.** "pájaro" would otherwise become "pjaro" and match
  nothing, so a question asked in Spanish would retrieve cat rescues for an
  injured bird.
- **Synonyms in `src/data/synonyms.ts`** map what people type to what records
  are tagged. "squirrel" reaches `wildlife`; "hit by a car" reaches
  `emergency-vet`. Spanish is layered on with `withTranslations`, which
  concatenates — a plain object spread would have Spanish *replace* English.

The assistant ranks on a single **primary need** (`NEED_PRIORITY`), because
pure text relevance kept putting a general vet ahead of the city's bird
hospital.

---

## Changing the assistant

- The prompt is `src/chat/system-prompt.ts`, versioned in the repository so a
  behaviour change is a reviewable diff.
- Keep it short. Every token is spent on every message, and the free daily
  allocation is what limits how many people it can help — about 240
  conversations a day at roughly 2,500 prompt tokens.
- **Run `npm run evals` after any change** to the prompt, retrieval, synonyms
  or the corpus. It is free and offline. `--live` also checks what it says, and
  spends from the same allowance that serves the public.
- Add an eval case for anything you fix. Going from 93 to 113 passing checks is
  what surfaced the "every cat question is a TNR question" bug.

---

## House style

- Comments explain **why**, not what. If a line needs explaining, the reason it
  exists is the useful part — especially where it looks wrong until you know
  the case it handles.
- British spelling in prose the reader sees; American in the data, because the
  sources are American.
- Plain language everywhere. "Confirm this contact is still active before
  relying on it", not "Verification status: stale".
- No dependency without a stated reason. The project has four: Astro,
  MiniSearch, marked, and Ajv at build time. The `.xlsx` and `.docx` readers
  and the ZIP container are hand-written because the alternatives carried
  permanent advisories or large transitive trees for a build-time task.
- Small commits with messages that say why.

---

## Before you push

```bash
npm run typecheck && npm test && npm run evals && npm run build
```

If you touched the importer, also check it is still idempotent: run
`npm run import` twice and confirm the second produces no diff.
