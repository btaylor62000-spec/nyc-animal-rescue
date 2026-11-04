# Taking this project over

For a new maintainer, on a new machine. It assumes you have not seen the
project before and that someone has just handed it to you.

> **Not comfortable in a terminal?** Read
> [START-HERE.md](START-HERE.md) instead. It covers the same ground one click
> at a time, assumes nothing, and installs nothing — it works in a browser, so
> it is also the only route that works on a Chromebook.
> [LOCAL-SETUP.md](LOCAL-SETUP.md) is the click-by-click version of the setup
> below. Come back to this when you want the shape of the project rather than
> the setup.

Read `CLAUDE.md` after this. It is the real reference — every decision, every
rule, and every trap that has already caught someone. Claude Code reads it
automatically when you open this folder, so you do not have to paste it
anywhere.

---

## What you are taking on

A free public directory of animal help in New York City: around 300
organizations, 21 guides, a search page, an assistant that answers questions in
plain language, and two scheduled jobs that re-check the data and look for new
resources.

It is live at <https://nyc-animal-rescue.pages.dev> and it maintains itself
reasonably well. People use it in a crisis — an injured bird on the pavement, a
litter of kittens in a yard — which is the reason behind most of the decisions
that will otherwise look over-careful.

It costs nothing to run. That is a design constraint, not an accident: see
`docs/FREE-TIER.md`, and the one line that matters most is *stay on the
Cloudflare Workers Free plan and do not add a payment method*.

---

## What you need access to

**For everyday work: just GitHub.** Cloudflare rebuilds and deploys the site on
every push to `main`. You can change anything a reader sees without ever
logging in to Cloudflare.

| Thing | Needed for | Ask for |
| --- | --- | --- |
| **GitHub** — write access to `btaylor62000-spec/nyc-animal-rescue` | Everything you will normally do | A collaborator invitation |
| **Cloudflare** | Rotating secrets, changing bindings, build logs, usage, a custom domain | Only when you hit one of those |
| **Turnstile** | Only if the bot-check keys change | Rarely |

If you do end up needing Cloudflare, adding you as an account member may or may
not be available on the free plan — try it, and if it is gated, the fallback is
that the current owner makes the change while you watch, or the project moves
to your own Cloudflare account (the repository stays where it is; you connect a
new Pages project to it and the site gets a new `.pages.dev` address).

**Secrets you do not need.** `TURNSTILE_SECRET_KEY` and `CHAT_PASS_SECRET` are
already set in Cloudflare and never appear in the repository. Nothing you do
locally needs them.

---

## Your first hour

### 1. Get it running

```bash
git clone git@github.com:btaylor62000-spec/nyc-animal-rescue.git
cd nyc-animal-rescue
npm install
npm run dev
```

That gives you the site at <http://localhost:4321>. Everything works except the
assistant, which needs Cloudflare's runtime and a model it can only reach once
deployed.

If `git clone` over SSH does not work, you have not added an SSH key to your
GitHub account yet — <https://github.com/settings/keys>. Or clone over HTTPS
instead; both are fine.

### 2. Prove the whole thing is healthy

```bash
npm run typecheck && npm test && npm run evals && npm run build
```

Everything should pass. Run this before every push — it is the gate, and it is
the reason the live site has not broken.

`npm run evals` is worth understanding: it checks what the assistant *retrieves*
for 40 real questions, offline and free. It catches more than you would expect.

### 3. Look at the live site and the status page

<https://nyc-animal-rescue.pages.dev/status> publishes what has been checked,
what has not, and what is waiting for a person. It is generated from the data,
so it cannot drift from the truth.

### 4. Make a tiny change and watch it deploy

Change a word somewhere visible, run the gate, commit, push. Cloudflare picks it
up within a couple of minutes. Do this once with something trivial so the loop
is familiar before you need it.

---

## Working with Claude Code on this

Open the folder and start a session. `CLAUDE.md` loads automatically, so it
already knows the rules, the traps and what is outstanding. You do not need to
explain the project.

A good first message is simply what you want to do. If you want orientation
first, ask it to read `CLAUDE.md` and tell you what is waiting for a person.

Two habits worth keeping:

- **Ask it to check production, not just the build.** Several defects have
  existed only in the deployed page. A passing build proves less than fetching
  the real URL.
- **Ask it to update `CLAUDE.md` when a decision gets made.** That file is why
  this handover is short. It stays useful only if it keeps being written to.

---

## The shape of the thing

```
research/              The source workbooks — the original research
   │  npm run import
   ▼
data/orgs/*.json       One file per organization. Generated: never hand-edit
content/guides/*.md    The guide pages. Also generated
   │  npm run build
   ▼
dist/                  A static site, plus two functions: the assistant and
                       the contribution form
```

The thing that surprises people: **`data/orgs/` is regenerated**, so editing a
record by hand is pointless — the next import destroys it. Corrections go in
`data/agent-overlay.json`, which the import applies last. `CLAUDE.md` explains
why.

| Where | What |
| --- | --- |
| `src/types.ts` | What a record is. Start here |
| `scripts/import/taxonomy.ts` | Why an organization gets each tag |
| `scripts/agent/rules.ts` | What the weekly check may and may not do |
| `src/chat/` | The assistant: retrieval, prompt, contact filter |
| `evals/chat.jsonl` | 40 questions the assistant has to handle |

---

## What is waiting for you

`CLAUDE.md` has the current list under **What to do next**, and it is kept up to
date — trust it over this section if they disagree. At the time of writing:

1. Confirm the weekly check can open its pull request. It needs a repository
   setting turned on, and it has never been watched through a full run.
2. Keep marking discovery candidates by hand. The roster it reads is mostly
   out-of-city rescues, so nothing is published until a person says so.
3. Two regional records deliberately carry no borough.

---

## The five things that will save you most pain

1. **A wrong contact is worse than a stale one.** This is the whole philosophy.
   When in doubt, publish the doubt rather than the guess.
2. **`data/orgs/` is generated.** Hand edits die at the next import.
3. **The automation flags, it does not edit.** It once rewrote five contacts
   unattended and four were wrong, including a New Jersey number on a 24-hour
   emergency listing. `CLAUDE.md` tells that story properly; it is worth
   reading before you loosen anything.
4. **Not finding a contact on a website means unconfirmed, never wrong.** Most
   sites render numbers in the browser. This has caused the same bug twice, in
   two different places.
5. **Test the bot check in a real browser.** Turnstile refuses automated ones by
   design, so a failure in automation proves nothing.

---

## If something breaks

- **The site is down or stale** — Cloudflare dashboard → Workers & Pages →
  `nyc-animal-rescue` → Deployments. A failed build leaves the previous version
  serving, so the site stays up.
- **A scheduled job failed** — repository → Actions. Both jobs are built so
  that failing changes nothing.
- **A record is wrong** — fix it in `data/agent-overlay.json`, run
  `npm run import`, push. Or use the site's own "Report a problem" button, which
  goes through the same pipeline.
- **The assistant says it is resting** — the free daily allowance is spent. It
  comes back tomorrow, and the directory is unaffected.

Everything here is recoverable: it is a static site in git. Nothing is stored
anywhere else, and no deploy is irreversible.
