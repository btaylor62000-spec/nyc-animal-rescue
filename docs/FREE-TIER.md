# What this costs, and what happens when a limit is reached

The only thing you will ever be billed for is the domain name. Everything else
runs inside free allowances that were chosen for one property above all others:
**when they run out, things stop working rather than start charging.**

That is the whole design. A directory people rely on in a crisis should never
be able to surprise its maintainer with a bill.

Limits change. The figures below were checked in September 2026; the "where to
look" column is the thing to trust.

---

## The services

### Cloudflare Pages — hosting

| | |
| --- | --- |
| **Free allowance** | Unlimited requests and bandwidth. 500 builds a month. 20,000 files per site, 25 MiB per file. |
| **What we use** | About 320 files. Roughly 5–10 builds a month: one per weekly check, a preview build for any week that opens a pull request, one for the monthly discovery, plus whatever you push. |
| **When it runs out** | Builds stop until the next month. The site stays up and keeps serving — an exhausted build allowance freezes the site, it does not take it down. |
| **Where to look** | Workers & Pages → your project → Deployments. |

Nowhere near the limit. You would have to push forty times a month to get close.

### Workers AI — the assistant's model

| | |
| --- | --- |
| **Free allowance** | 10,000 Neurons a day, on both Free and Paid plans. |
| **What we use** | About 40 Neurons a message with `@cf/meta/llama-3.1-8b-instruct-fp8`, so roughly **240 conversations a day**. |
| **When it runs out** | **On the Workers Free plan, requests fail with an error.** The site catches it, says "the assistant is resting", and offers search with the question already filled in. The directory is unaffected. |
| **Where to look** | Workers & Pages → your project → Workers AI. |

**This is the one that matters.** On the Workers **Paid** plan the same
overflow is billed at $0.011 per 1,000 Neurons instead of failing. So:

> **Stay on the Workers Free plan, and do not add a payment method.** That
> single choice is what makes an unexpected bill impossible rather than merely
> unlikely.

If 240 conversations a day ever becomes too few, the honest options are to
shorten the prompt, show fewer resource cards, or accept the assistant being
unavailable in the evening. Upgrading trades a hard stop for a soft one.

### Cloudflare Turnstile — telling people from bots

| | |
| --- | --- |
| **Free allowance** | 1,000,000 verifications a month. 20 widgets per account. |
| **What we use** | One verification per conversation, not per message. A busy month might be a few thousand. |
| **When it runs out** | Verification starts failing, so the assistant stops accepting new conversations. The directory is unaffected. |
| **Where to look** | Cloudflare dashboard → Turnstile → your widget. |

Not a realistic concern at this scale.

### GitHub Actions — the weekly and monthly checks

| | |
| --- | --- |
| **Free allowance** | Unlimited minutes on standard runners, **for public repositories**. |
| **What we use** | About 15 minutes a week and 3 minutes a month. |
| **When it runs out** | Does not apply while the repository is public. If you ever make it private, you get 2,000 minutes a month and this would use roughly 70. |
| **Where to look** | Repository → Actions, or Settings → Billing. |

The real risk here is not cost. **GitHub disables scheduled workflows in
repositories with no activity for 60 days.** The weekly check commits its
report and bookkeeping every week specifically to prevent that; anything a
reader could see goes to a pull request instead, which is also a push. If you
ever find the schedule switched off, one manual run turns it back on.

### GitHub Issues — problem reports

| | |
| --- | --- |
| **Free allowance** | Unlimited on public repositories. |
| **What we use** | One issue kept updated by the weekly check, one by the monthly run, plus whatever people report. |
| **When it runs out** | Does not. |

### Cloudflare Registrar — the domain

| | |
| --- | --- |
| **Cost** | At wholesale, typically £8–12 a year depending on the ending. The only recurring cost in the project. |
| **When it runs out** | The domain expires and the site becomes unreachable at that address. It stays up on `.pages.dev`. |
| **Where to look** | Cloudflare dashboard → Domain Registration. |

Turn on auto-renew. A lapsed domain on a directory people have bookmarked is
the worst failure mode here, and it is entirely avoidable.

### The websites we check

Not a service we pay for, but an allowance of a different kind: other people's
patience and bandwidth. These are small volunteer organizations on cheap
hosting. The checker identifies itself with a URL, obeys `robots.txt`, waits
between requests to the same host, reads at most four pages per organization,
and gives up after fifteen seconds. Roughly 1,000 polite requests a week,
spread out.

If anyone asks us to stop, add their domain to a skip list and honour it.

---

## Things that would start costing money

Listed so they are a decision rather than an accident:

- **Upgrading to Workers Paid.** Turns the assistant's hard daily stop into a
  bill. This is the single change most likely to produce an unexpected charge.
- **Adding a database** — D1, KV beyond the free tier, Durable Objects. The
  project deliberately has no server-side state: rate limiting uses the cache,
  the assistant's pass is signed rather than stored, and nothing about any
  conversation is kept.
- **A paid search API** for discovery. The monthly run uses only free,
  structured, open-data sources.
- **Making the repository private.** Costs Actions minutes and removes free
  unlimited CI.
- **An email service** for problem reports. This is why reporting goes to
  GitHub Issues; see the trade-off below.

---

## The reporting trade-off

Problem reports open a pre-filled GitHub issue. That has two real costs:

1. **A report is public.** Anyone can read it. The About page says so.
2. **It needs a free GitHub account.** For someone who has just found a wrong
   phone number on a rescue listing, that is a genuine obstacle.

The alternatives and why they were not chosen:

- **An email address** — needs a mailbox somebody actually reads, and attracts
  spam immediately.
- **A form service** (Formspree, Tally) — free tiers exist but are small, and
  they can change or disappear without warning.
- **A Worker that posts to the GitHub API on the reporter's behalf** — would
  remove the account requirement, and is genuinely possible for free. It needs
  a stored GitHub token with issue-write permission, which becomes something
  worth stealing, plus its own abuse protection. Worth doing if reports start
  arriving; over-engineered before anyone has sent one.

If the account requirement turns out to stop people reporting problems, that
last option is the one to build.
