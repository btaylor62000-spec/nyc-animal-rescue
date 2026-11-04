# Working on this project

Notes for whoever picks this up next, human or otherwise. `README.md` says what
the project is; this says how to change it without breaking the parts that
matter.

---

## Where things stand

**The site is live and deployed.** Everything below already works in
production; nothing here is aspirational. Figures last refreshed 2026-11-04
from the data itself (`data/orgs/`, `content/guides/`, the workbooks) -- when
you change them, recount rather than adjust.

| | |
| --- | --- |
| Live site | <https://nyc-animal-rescue.pages.dev> |
| Repository | `btaylor62000-spec/nyc-animal-rescue` (public) |
| Hosting | Cloudflare Pages, auto-deploys on every push to `main` |
| Assistant | Working, with Workers AI and Turnstile both switched on |
| Scheduled checks | Both active. Weekly ran for the first time 2026-09-21 and **pushed five wrong changes to production** — see below. Since 2026-09-22 it opens a pull request for anything a reader could see; only bookkeeping goes to `main`. Discovery has run once, 2026-09-17, and still pushes to `main` |
| Sources | Three reference workbooks, the wildlife document, the city's pet food pantry list, and `research/NYC_Reviewer_Additions.xlsx` for what reviewers found missing: 68 rows as of 2026-11-04, each checked on the organization's own site or marked as supplied by a reviewer where the site turns robots away. It carries optional **Hours** and **Address** columns |
| Guides | 22. Three written from reviewers' material: reporting abuse, the shelter's at-risk list, and keeping your pet when facing homelessness (checked line by line against the city's 311 and DHS pages on 2026-11-04) |
| Directory | 393 listed of 399 records (closed, moved-away and two guidance-only reporting lines are not listed; their pages still exist). 357 carry a date they were last confirmed; 36 have never been, and each of those is in *What to do next* item 3 with the reason. 35 emergency vets, 21 of them confirmed open 24/7, every one with hours. Three more *say* 24 hours somewhere but could not be confirmed on 2026-11-04 (CompleteCare, Elmhurst, Urgent Vets Queens); their hours say so and they never show "Open now" -- see `DOUBTFUL` in `src/data/hours.ts`. Ordered open now, then nearest (device location, a typed zip, or a zip in the question), then evidence -- see *Nearest, open now, best evidenced* |
| Discovery | 230 candidates from ACC's New Hope partner roster. 20 published, every one read by a person and placed in the city; 210 held back. All 219 that were waiting were read in a browser on 2026-11-04: `docs/discovery-review-2026-11-04.md` says what was found for each |
| Self-reporting | `/status` publishes what is checked, what is not, and what is waiting on a person |
| Privacy holds | All three people agreed to be listed on 2026-09-22; their contacts are published. The mechanism stays for the next one. Tests use `tests/fixtures/privacy-holds.json`, not the live file |
| Visitor submissions | Live since 2026-09-22: `/contribute` adds a resource, every card and entry page has "Report a problem". First real correction went through the whole chain the same day (form → commit → publish workflow → deploy → labelled entry) |

**New here?** Read `docs/START-HERE.md` if you want to be walked through
setup one step at a time — it uses Claude Code in the browser
(<https://claude.ai/code>), which needs nothing installed and so works on a
Chromebook; `docs/LOCAL-SETUP.md` is the same thing on your own machine, which
buys you a localhost preview and needs Windows or a Mac. Read
`docs/HANDOFF.md` if you are at home in a terminal — what access you need, how
to get it running, and the five things that save the most pain. Then come back
to this file, which is the reference.

Everyday work needs **GitHub write access only**. Cloudflare rebuilds and
deploys on every push to `main`, so anything a reader sees can be changed
without logging in to Cloudflare at all. Cloudflare is needed only for
secrets, bindings, build logs, usage and a custom domain.

Two things about local setup that are per-machine, so they may not be true of
yours:

- **The push remote may be an SSH host alias.** On the machine this was built
  on it is `github-btaylor:btaylor62000-spec/...`, because that machine's
  default GitHub key belongs to a different account and GitHub will not accept
  one key on two accounts. `git remote -v` tells you what yours is; a plain
  `git@github.com:btaylor62000-spec/nyc-animal-rescue.git` is fine if your own
  key is on an account with access.
- **Setting a Cloudflare secret needs `npx wrangler login` first**, once per
  machine. Then:
  `wrangler pages secret put NAME --project-name=nyc-animal-rescue`.
  Piping the value in avoids an interactive prompt that does not work from
  every terminal.

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
   2 decides whether those should be published at all. (As of 2026-11-04 the
   setting was still off: it is under Settings → Actions → **General** →
   Workflow permissions, not under Secrets and variables.)

2. **Keep marking discovery candidates by hand.** Decided 2026-09-22:
   discovery finds mostly out-of-city rescues, so nothing it finds is
   published until a person sets `"publish": true` on the candidate in
   `data/discovered.json` (with `boroughs` or `citywide`, and `checkedBy`
   saying what was read). On 2026-11-04 every waiting candidate (219) was
   opened in a browser and 9 more were published, each because its own site
   places it in the city or says it serves the city (`animals` and `needs`
   can now be set on a candidate too, since the name alone rarely says).
   What is left, in `docs/discovery-review-2026-11-04.md`: 63 give an
   address outside the city, 90 say nothing about where they are, 41 could
   not be read, 11 are not organisations to list or are already listed (the
   roster scrape picked up "Careers", "Register to vote", the Bronx Zoo).
   The 90 are the work for a person: a contact page or a phone call.

3. **Check the sites only a person can read, monthly.** `/status` lists them
   under "Checked by a person only" (Urban Wildlife Alliance, Petco Love
   Lost, United Spay Alliance as of 2026-11-04; DEC Region 2 will join them
   on the next weekly run). Open each in a normal browser and record the date
   as described in *Sites the weekly check cannot read*. The first weekly run
   under the blocked / gone / down rules, and with the address notes, has not
   happened yet: read that report closely.

   **The never-confirmed listings were re-checked on 2026-11-04**, every one
   read in a browser on its own site (72 then; 28 still have no check date).
   What is left needs a phone call or a normal browser, not a robot:
   - *Ring them* (hours or number in doubt): Urgent Vets Queens (its site
     says 24 hours and gives (718) 305-4791; the Mayor's Alliance gives
     limited hours and (718) 507-5600 -- both published), CompleteCare
     (Staten Island), Elmhurst Animal Emergency, Fifth Avenue Veterinary
     Hospital, St. Mina, the HSUS dogfighting line (its own 2025 poster
     gives only an email), The Pet Fund's (916) number (its site says email).
   - *Marked "confirm before relying"*: Animal Relief Fund (its old domain is
     now a Maryland rescue), SICAW's certificates (no longer on its site),
     ACC's pet food pantry (no longer on ACC's pages).
   - *Sites that refuse robots*: nyc.gov (four entries), Brown Dog, Prince
     Chunk, MAMA, Vetco, Safe Havens Mapping, Safe Place for Pets, plus Kiso's
     and Island Wildlife (Facebook only).
   - The five pet food pantries with no website stay as the city listed them
     in October: that list is the source, and ringing is the only check.

4. **Things a reviewer raised, followed up 2026-11-04.**
   - *NYC 211*: there is no separate one. The city's own 311 page says
     211's help-and-referral service is provided through 311 in New York
     City, so the guides now say "call 311", not "dial 211 (nyc.gov/211)".
   - *Surrender lines*: neither Bideawee nor the ASPCA has one. The ASPCA's
     NYC FAQ sends owners to rehoming sites and ACC's surrender service
     (appointment only, 212-788-4000, which is already listed). Bideawee
     publishes a surrender-prevention packet instead.
   - *DEC's general email*: r2info@dec.ny.gov, from DEC's own "Guide to
     DEC" (revised 2023). Added to the Region 2 entry.
   - *NYSAVE yearly cap*: its guidelines set none per household. The
     "~$2,000/yr" in the research had no source and is gone.
   - *Still out*: Vet-I-Care (vet-i-care.org still has a self-signed
     certificate and does not load), and an ASPCA temporary-boarding offer
     (never confirmed). Individual volunteers' personal contacts (Save
     Kitty) stay off.
   - *No 24-hour hospital in the Bronx*: the Mayor's Alliance lists only
     Urgent Vets there (limited hours). Directories that call four Bronx
     clinics "24/7" are auto-generated and give every clinic a duplicate
     "Emergency" row. From the Bronx the nearest 24/7 options are Animal
     Specialty Center (Yonkers) and the Manhattan and Astoria hospitals.

5. **Bond Vet stays one entry, deliberately.** Twenty-one daytime branches,
   whose pages show only today's hours and whose own page description gives
   different ones, would be 21 "hours not confirmed" cards in every emergency
   search. One Love and Bronx Veterinary Center were split by branch on
   2026-11-04 because their hours and addresses could be confirmed.

6. **Two regional records still carry no location, on purpose.** Of the six
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
- **Every branch gets its own copy of the live site**, which is the cheapest way
  to satisfy the rule above before a change is public. Pushing a branch makes
  Cloudflare build it at `<branch-name>.nyc-animal-rescue.pages.dev` — verified
  2026-11-03, live about a minute after the push, the whole site including
  `/status/`. Note the trailing slash: `/status` answers 308 to `/status/`.
  Preview builds run `astro build` only, not the tests, so a preview proves the
  page, not the project. Cloudflare cuts the name to its first 28 characters,
  with `/` turned into `-`: branch `claude/festive-ramanujan-w3qytx` is at
  `claude-festive-ramanujan-w3q`. The full name answers "Deployment Not Found".
- **The overlay is the only way to correct a record.** `data/orgs/` is
  regenerated, so hand edits there are destroyed by the next import.
  `OverlayEntry` now covers `phones`, `emails`, `website`, `intake_urls`,
  `source_urls`, `notes`, `status`, confidence and `hours` -- enough to fix
  anything a reader can see. (It is applied by spreading the entry onto the
  record, so `address`, `social` and `needs` work too; a name or alias change
  belongs in `scripts/import/overrides.ts`.)
- **When a record's id goes away, add a redirect.** Merging two entries or
  folding a duplicate changes which id survives, and the old `/org/<id>` page
  stops being built. `public/_redirects` sends each retired id to its
  successor (Cloudflare Pages reads it), so shared and bookmarked links keep
  working. Compare `git ls-tree` of `data/orgs/` before and after to find them.
- **A record's `status_note` is only rendered when the record is not active.**
  A caveat about an operating organization belongs in `notes`.

### Sites the weekly check cannot read

Added 2026-11-03. A site that cannot be read is one of three things, and the
check now tells them apart (`pageProblem` in `scripts/agent/rules.ts`):

| What it sees | What it means | What happens |
| --- | --- | --- |
| The domain does not exist (`ENOTFOUND`) | Moved or closed | Flagged for a person **the same week**. The reader-visible status still waits three weeks |
| 401/403/429, or a bot-check page ("Performing security verification") | The site is up but refuses robots | **Not a failure.** `check_status: manual-only`, listed in the weekly report and on `/status`, flagged again when no person has confirmed it for 90 days |
| Timeout or server error | Could be a bad afternoon | Three weeks' grace, then "needs confirming", as before |

Urban Wildlife Alliance, Petco Love Lost and United Spay Alliance are why: all
three are live and all three show automated browsers a bot check. Under the old
rule they would have been marked "may no longer be active" after three weeks.

**The check never looks for a replacement site.** A dead domain is exactly when
guessing is most tempting and most dangerous: the old domain may now belong to
someone else. A person finds the new site and records it in the overlay
(`website`, with a `manual` change-log entry), as was done for Greater Staten
Island Veterinary Services and the ASPCA clinics.

**To record a check made by hand** on a `manual-only` site: open it in a normal
browser, confirm the contacts, and set `last_verified` on its overlay entry with
a `manual` change-log entry saying what was seen. That resets the 90 days.

**Testing the checker from a cloud session:** Node's own `fetch` does not use
the session's proxy, so every domain looks dead and the safety valve trips.
Run it with `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
GitHub Actions has ordinary DNS and needs neither.

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
publication.

**The quick check stopped being a gate on 2026-10-28.** It was refusing real
contributors. Measured against 30 organizations whose numbers are known to be
correct, requiring the contact to appear on the page given refused **63% of
them** — the city's own shelter, the ASPCA and BluePearl among them — because
sites render numbers in the browser, keep them on a contact page, or answer
403 to anything automated. It is the same failure the weekly check had, for
the same reason, and it has the same answer: not finding a contact means
*unconfirmed*, never *wrong*.

It never protected much either. As the old note here said, it proved the
contact appeared on the page given — not that the page was the
organization's. Anyone acting in bad faith controls the page they cite, so it
turned away two thirds of honest people and nobody determined.

So the check now records instead of refusing. `check.phone_seen` /
`check.email_seen` say whether it found anything; `check.site_read` and
`check.note` say why not. An unconfirmed addition is published at Low
confidence, excluded from the assistant, labelled, with the reason in its
change log. An unconfirmed **correction** is applied — someone reporting a
wrong number has usually just rung it — but the record drops to Low
confidence and `needs-review`, so it stops claiming to be well evidenced.

What still refuses: a held personal number, a placeholder number, a duplicate
(which points at the correction form instead), a missing required field, the
bot check and the rate limit.

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

## The city's pet food pantry programme

Added 2026-11-03. `data/pet-food-pantries.json` holds the 22 community food
pantries the city funded in October 2026 to hand out free dog and cat food;
`scripts/import/pantries.ts` turns them into records, merged like any other
source.

These are **human** food pantries, which is why they are in none of the rescue
research. They earn their place because the person choosing between feeding
themselves and feeding their cat is exactly who this site is for.

The contacts come from the city's own map, which is a table of
programme / contact / phone / address / zip / borough. Its text is drawn as
outlined glyphs, so a plain fetch reads nothing; `scripts/` has no PDF reader
and does not need one, but if you ever have to read it again, decode the
font's `ToUnicode` CMap rather than trusting the raw stream.

Four things are deliberate, and all four exist because someone might cross the
city on the strength of one of these listings:

- **Every record says the pet food is new and to ring first.** The programme
  was announced in October 2026, reporting said the food would reach pantries
  about two weeks later, and not one of the pantries mentions it on its own
  website yet. The records do not claim pet food is there today. The city's own
  map says hours vary by site and to confirm before visiting, and so do we.
- **The number the city lists for the programme comes first**, labelled *Pet
  food programme*. This matters: six of the twenty-one differ from the number
  the organization publishes as its main line, because the city lists a direct
  line into the pet food scheme. Ringing the switchboard instead is how someone
  gets told nobody has heard of it.
- **Where the organization's own site gives a different number, both are
  published**, the second labelled *Main line*. The River Fund is the reason:
  the city says (718) 442-1125 and their own site says (718) 441-1125, one
  digit apart, and there is no way to tell from here which is the typo. Publish
  both and let the reader try the other one, rather than silently picking.
- **The staff names in the source are not published.** The city lists a named
  member of staff against every pantry. Those are individuals, and rule 3
  applies to them as much as to a rehabber's mobile number. There is a test
  that no record and no stored row contains one.

Addresses matter here more than anywhere else on the site, because a pantry is
a place you walk to. Note that `directory.ts` sets `address: null` — the
workbook route cannot carry a street address — which is why this source builds
records directly rather than going through a workbook.

Three addresses in the programme's own list disagree with the organization's
own listings (Kingsbridge Heights, The Campaign Against Hunger, Yeshua
Worldwide). The programme's address is used, because that is where the pet
food was sent, and the record notes the other one.

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

## Nearest, open now, best evidenced

Added 2026-11-04. One ordering, `src/data/rank.ts`, used by the directory in
the browser and by the assistant on the server, so they cannot disagree: in an
emergency, open now before unknown before closed; then distance in rough bands
(under 1.5, 3, 6, 12 miles); then evidence; then exact distance. Search wording
only breaks ties.

- **Where things are.** `npm run geocode` looks each street address up once with
  the Census Bureau's free geocoder and caches it in `data/geo.json` with the
  exact query; the import attaches it only while the address still gives the
  same query, so a corrected address never keeps the old point. One zip and no
  street means the zip's centre (`data/zip-centroids.json`, `npm run geo:zips`),
  shown as "about". Citywide services have no place. The import never touches
  the network. After adding addresses: `npm run import && npm run geocode &&
  npm run import` (in a cloud session, with the proxy variables above).
- **Open now.** `src/data/schedule.ts` reads hours into a timetable in New York
  time. Hours it cannot read with certainty are *unknown*, never open: a wrong
  "Open now" sends someone to a locked door.
- **The reader's location** is asked for only when they tap "Nearest to me" or
  tick "Use my location". The directory keeps it on the device; the assistant
  receives it rounded to two decimal places (about a kilometre), uses it to
  order results, and never logs or stores it.
- **A phone can report the wrong place.** `src/data/position.ts` checks every
  position before it is used, in the directory and the assistant alike: more
  than 30 miles from the city (a VPN, a stale fix) is not used and the reader
  is told so; a fix vaguer than about 2 miles is used but flagged; blocked or
  failed location says so and points to the zip box. Location only ever
  orders results -- nothing is hidden by it -- so a bad position costs order,
  never information. Tested 2026-11-04 with location ON on emulated iPhone and
  Android, five boroughs, 11pm and 3pm, plus blocked, Chicago and vague fixes.
- **Testing the assistant's server code.** The bot check refuses automated
  browsers, so the deployed assistant cannot be driven from a script.
  `npx tsx scripts/dev/chat-harness.ts "question" "lat,lon" "ISO time"` runs
  the real `/api/chat` handler locally without Turnstile or the model and
  prints the cards it would send, with distance and open-now.
- **No location services needed.** Many people never turn them on. A zip typed
  into "or nearest to zip" in the directory, or written in a question to the
  assistant ("I'm in 11215"), is measured from that zip's centre
  (`src/data/zip-centres.ts`, served as `/zip-centres.json`). When both ends
  have a place on the map, distance replaces the assistant's old "is it in
  your exact zip" bonus, which had put a closed clinic above an open hospital
  half a mile away.
- Workbook rows can carry **Hours** and **Address** columns. Use them: a row
  without hours cannot say it is open, and one without an address cannot be
  sorted by distance.

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

For anything a reader can see, push a branch first and look at
`<branch-name>.nyc-animal-rescue.pages.dev` rather than merging and checking
afterwards. It costs a minute and it is the only check that has ever caught the
defects that live only in the deployed page.
