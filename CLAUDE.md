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
| Scheduled checks | Both workflows active; weekly runs Mondays, discovery on the 1st |

Two things about the local git setup, because they are not obvious:

- The push remote is `github-btaylor:btaylor62000-spec/...`, an SSH host alias
  in `~/.ssh/config`. The machine's default GitHub key belongs to a *different*
  account (`VerityHealth`), and GitHub will not accept one key on two accounts,
  so this project has its own key at `~/.ssh/id_ed25519_btaylor`.
- `npx wrangler` is logged in, so secrets can be set from the command line:
  `wrangler pages secret put NAME --project-name=nyc-animal-rescue`.

### What to do next

1. **Run the weekly check once.** Repo → Actions → *Weekly data check* → Run
   workflow → tick dry run. It has never run; everything else is proven.
2. **Ask the three people in `data/privacy-holds.json`** whether they want to
   be listed. Two of them — WINORR and Robert Spragg — currently leave an
   organization with no direct contact, and WINORR is where NYC raptor cases
   go. Note that `research/` is public in this repository, so those numbers are
   readable there anyway; asking is now courtesy rather than concealment.
3. **Resolve the two emergency-room conflicts** in
   `build/reports/data-quality.md`: VERG is listed at two addresses with one
   phone number, and VEG Ralph Ave shares a number with VERG South. These are
   emergency listings.
4. **Give the wildlife guide a byline.** It is written in the first person by
   whoever wrote the original document.

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

### 2. Automation never deletes, and never *changes* a contact on a guess

`scripts/agent/rules.ts` is pure — no network, no clock, no file access. That
is what makes it testable, and being testable is what makes it safe to let it
edit an emergency directory unattended.

It may **change** an existing contact only when the old value has gone from the
organization's own domain **and** exactly one replacement is there. Two
candidates is `needs-review`. Anything ambiguous is `needs-review`. Three
consecutive unreachable weeks flags the record and downgrades confidence
**once** — not every week after. If a run would change more than 15% of the
directory it applies nothing and reports itself broken.

Add a decision path and you add a test for it, including that it cannot produce
a deletion.

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
