# NYC Animal Rescue

A free directory of animal help in New York City — rescues, shelters, TNR
groups, 24-hour emergency vets, low-cost clinics, wildlife rehabilitators,
trap banks and owner-support programmes, for cats, dogs, rabbits, birds,
reptiles, small mammals, farm animals and wildlife.

Most people who land here are mid-crisis: an injured bird on the pavement, a
litter of kittens in a yard, a dog they can no longer keep. Everything about
the project follows from that. Speed, clarity and honesty about what is
verified matter more than anything else.

**No ads, no tracking, no accounts, no cost.** The whole thing runs inside free
allowances that fail closed — when one runs out, a feature stops working rather
than starting to charge.

---

## What is here

| | |
| --- | --- |
| **287 organizations** | Across all five boroughs, each with confidence, the date it was last verified, and whether it is still operating |
| **19 guides** | What to do, in the order it needs doing |
| **Search and filters** | Client-side, works on a phone on a weak connection, no JavaScript required to browse |
| **An assistant** | Describe what is happening in plain words, in English or Spanish, and get the right organizations |
| **Weekly checks** | Every organization re-checked against its own website, automatically |

---

## Running it

Needs Node 20.

```bash
npm install
npm run dev
```

Then <http://localhost:4321>.

The assistant needs Cloudflare's runtime, so it will say it is not switched on.
To run the whole thing including the chat endpoint:

```bash
npm run build
npx wrangler pages dev dist --port 8788 --compatibility-date=2026-05-01
```

Workers AI has no local emulator, so the assistant only talks to a real model
once deployed. Everything else — retrieval, the resource cards, rate limiting,
the fallback behaviour — works locally.

### The commands

| Command | What it does |
| --- | --- |
| `npm run dev` | The site, with live reload |
| `npm run build` | Build to `dist/` |
| `npm test` | 105 tests |
| `npm run typecheck` | TypeScript, browser and Workers separately |
| `npm run import` | Rebuild all data from the source workbooks |
| `npm run evals` | Check what the assistant retrieves (free, offline) |
| `npm run evals -- --live` | Also check what it says (spends the daily allowance) |
| `npm run agent:weekly -- --dry` | Run the weekly check without writing anything |
| `npm run agent:discover -- --dry` | Run monthly discovery without writing anything |

---

## How it fits together

```
research/              The original workbooks and the wildlife document
   │
   │  npm run import          scripts/import/
   ▼
data/orgs/*.json       One file per organization — the source of truth
data/chat-corpus.json  What the assistant is allowed to see
content/guides/*.md    The guide pages
   │
   │  npm run build           src/
   ▼
dist/                  A static site, plus one function at /api/chat
```

Two files sit alongside the records and are applied by the import:

- **`data/agent-overlay.json`** — what the weekly checks have learned. The
  import applies it last, so re-running the import never discards it.
- **`data/discovered.json`** — organizations found by monthly discovery,
  awaiting verification.

### Where things live

| Path | What |
| --- | --- |
| `src/types.ts` | The record shape. Start here. |
| `scripts/import/taxonomy.ts` | Why an organization gets each tag |
| `scripts/agent/rules.ts` | What the weekly check is allowed to change |
| `src/chat/` | Retrieval, the prompt, the contact filter |
| `src/data/search.ts` | Search behaviour, shared by the site and the assistant |
| `evals/chat.jsonl` | 30 questions the assistant must handle |
| `docs/DEPLOY.md` | Putting it online |
| `docs/FREE-TIER.md` | What each service allows, and what happens at the limit |

---

## The rules this project keeps

These are not style preferences. Each exists because breaking it would hurt
someone holding an injured animal.

**A wrong contact is worse than a stale one.** The weekly check changes a phone
number only when the old one has gone from the organization's own site *and*
exactly one replacement is there. Two candidates is a question, and questions
go to a person. Nothing is ever deleted automatically.

**The assistant cannot invent a contact.** Organizations are chosen by
retrieval, not by the model, and reach the reader as cards built from the real
records. Every phone number, email and web address the model writes is checked
against what was actually retrieved, and anything else is removed before it is
shown.

**Say what is not known.** Every entry carries how firmly it is verified and
when it was last checked. Anything low-confidence, inactive, or unchecked for
90 days says "confirm this is still active before relying on it".

**Personal contacts are withheld until the person agrees.** The research
contained volunteers' mobile numbers and a home line for a rehabilitator
working out of their house. They are listed in `data/privacy-holds.json` and
scrubbed from every output. See [Outstanding](#outstanding).

**Safety guidance is copied, not summarised.** Several warnings in the guides
are counter-intuitive and people act on them under stress — a window-strike
bird must **not** be given supplemental heat, even though a cold nestling
should be warmed. Paraphrasing risks softening exactly the instruction that
matters.

**It must not be able to cost money.** See `docs/FREE-TIER.md`.

---

## Outstanding

Things a maintainer should decide, not things that are broken.

**Three personal phone numbers are withheld** pending permission. Two of them
leave an organization with no direct contact — including WINORR, which is where
NYC raptor cases go. `data/privacy-holds.json` has the exact wording for each
ask.

**Two emergency rooms disagree with themselves across the source workbooks.**
`VERG` is listed at 196 4th Ave in one and 318 Warren St in another, with the
same phone number; `VEG Ralph Ave` and `VERG South` share a number at different
addresses. These are emergency listings, so they are worth ten minutes on the
phone. The weekly check will also reach them.

**The wildlife guide is written in the first person** by whoever wrote the
original document. It needs a byline, or rewriting in the site's voice.

**Discovery starts empty.** The monthly run adds at most 40 organizations a
month, marked "newly found, not yet verified" and excluded from the assistant
until a weekly check finds a working contact. That pace is deliberate: the
first pass over the city shelter's partner roster found 226 organizations, and
adding them all at once would bury the 287 that have actually been checked.

---

## Corrections

If an entry is wrong, out of date, or should not be here, open an issue. Every
organization page has a link that pre-fills one. If you run one of these
organizations and want your entry changed or removed, say so and it will be
done.

---

## Credit

Built from research compiled by the project's maintainer: three reference
workbooks covering cat, dog and exotic/wildlife rescue across the five
boroughs, and a guide to helping injured birds. The directory is only as good
as that research, which is considerable.
