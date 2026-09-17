# Putting this online

Start to finish, roughly half an hour. Nothing here costs money, and no step
asks for a card except registering the domain, which is optional and the only
thing you will ever be billed for.

Work through it in order. After each part there is something you can look at to
confirm it worked, so you are never more than one step from knowing.

---

## Before you start

You need:

- A **GitHub** account (free).
- A **Cloudflare** account (free). Signing up does not ask for a card.
- About £8–12 a year if you want your own domain name. Skip it and the site
  still works on a `.pages.dev` address.

---

## 1. Put the code on GitHub

The repository has to be **public**. That is what makes GitHub Actions free and
unlimited, and it is what lets people report problems.

```bash
cd "/Users/verityhealth/NYC Animal Rescue"
git remote add origin https://github.com/YOUR-USERNAME/nyc-animal-rescue.git
git branch -M main
git push -u origin main
```

If you do not have the repository yet, create it first at
<https://github.com/new> — public, and **do not** let it add a README,
`.gitignore` or licence, because this project already has its own.

**Check it worked:** the repository page lists `data/`, `src/`, `scripts/` and
`.github/workflows/`, and the Actions tab shows two workflows.

> **One thing to know before you push.** The `research/` folder contains the
> original workbooks, and they include the personal phone numbers listed in
> `data/privacy-holds.json`. The published site never shows them, but a public
> repository publishes the source files too. If that is not what you want, move
> `research/` out of the repository and add it to `.gitignore` before pushing.
> The import only needs those files when you re-run it from the workbooks.

---

## 2. Connect Cloudflare Pages

1. Go to <https://dash.cloudflare.com> → **Workers & Pages** → **Create** →
   **Pages** → **Connect to Git**.
2. Authorise GitHub and pick the repository.
3. Set the build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | Astro |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | *(leave blank)* |

4. Under **Environment variables**, add:

   | Name | Value |
   | --- | --- |
   | `NODE_VERSION` | `20` |
   | `PUBLIC_GITHUB_REPO` | `YOUR-USERNAME/nyc-animal-rescue` |

5. **Save and Deploy.**

**Check it worked:** in a minute or two you get a `https://….pages.dev`
address. Open it. The home page, the directory, search, filters and the guides
should all work. The assistant will say it is not switched on yet — that is
next.

---

## 3. Switch on the assistant

The assistant needs two things: a model to talk to, and a way to tell people
from bots.

### 3a. Workers AI

1. In your Pages project → **Settings** → **Bindings** → **Add** →
   **Workers AI**.
2. Variable name: **`AI`** (exactly that — the code looks for `env.AI`).
3. Save.

There is nothing to pay for and no key to copy. The free allocation is 10,000
Neurons a day, which is roughly 240 conversations. **Stay on the Workers Free
plan.** On the free plan, requests past the allocation fail with an error and
the site quietly falls back to search. On the paid plan they would be billed
instead.

### 3b. Turnstile

This stops bots from spending the daily allocation.

1. Go to **Turnstile** in the Cloudflare dashboard → **Add widget**.
2. Name it anything. Add your `.pages.dev` hostname, and your own domain if you
   have one.
3. Widget mode: **Managed**.
4. You get a **Site Key** and a **Secret Key**.

### 3c. Tell the site about them

Back in your Pages project → **Settings** → **Environment variables**:

| Name | Value | Type |
| --- | --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | the Site Key | Plaintext |
| `TURNSTILE_SECRET_KEY` | the Secret Key | **Encrypt** |
| `CHAT_PASS_SECRET` | a long random string | **Encrypt** |

For the last one, generate something nobody can guess:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

It signs the short-lived pass that saves people from solving a challenge on
every message. Nothing breaks if you change it later; anyone mid-conversation
simply solves one more challenge.

Then **redeploy** (Deployments → the latest one → **Retry deployment**),
because build-time variables only take effect on a fresh build.

**Check it worked:** open `/ask` and type *"a pigeon hit my window in park
slope"*. You should get resource cards immediately, then a written answer. If
it says the assistant is not switched on, the `AI` binding is missing or
misnamed.

---

## 4. Switch on the weekly checks

Nothing to configure. The workflows use the token GitHub provides
automatically.

1. Repository → **Actions** tab → enable workflows if prompted.
2. Open **Weekly data check** → **Run workflow** → tick **dry run** → run it.

**Check it worked:** the run finishes green and the log ends with something
like `250 unchanged (180 re-verified), 2 updated, 9 flagged`. Nothing was
committed, because it was a dry run.

Then let it run for real on its own on Monday morning, or run it again without
the dry-run tick.

> GitHub switches off scheduled workflows in repositories that have had no
> activity for 60 days. This one commits its report every week, which keeps it
> awake. If you ever see the schedule disabled, one manual run re-enables it.

---

## 5. Your own domain (optional)

1. **Cloudflare Registrar** → **Register domain**. Registrar sells at cost —
   no markup, no first-year discount that triples later.
2. Once registered: Pages project → **Custom domains** → **Set up a custom
   domain** → enter it. DNS is configured for you because the domain is already
   at Cloudflare.
3. Update `site` in `astro.config.mjs` to the real domain, and add your domain
   to the Turnstile widget's hostname list.

**Check it worked:** your domain loads the site over HTTPS, and
`/sitemap.xml` shows your domain rather than the placeholder.

---

## 6. Run the assistant's evals against the real model

Worth doing once, to see what it actually says rather than only what it
retrieves.

1. Cloudflare dashboard → **My Profile** → **API Tokens** → **Create Token** →
   **Custom token**. Give it **Workers AI → Read**. Copy it.
2. Your Account ID is in the dashboard sidebar.

```bash
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_API_TOKEN=...
npm run evals -- --live
```

This spends about 30 messages from the same daily allocation that serves the
public, so do not run it in a loop.

---

## If something goes wrong

**The site builds but the assistant says it is not switched on.** The `AI`
binding is missing or not called exactly `AI`. Check Settings → Bindings, then
redeploy.

**The assistant says the allowance is spent, early in the day.** Check Workers
& Pages → your project → **Workers AI** usage. If it really is spent, something
is hammering it — check that Turnstile is configured, since without
`TURNSTILE_SECRET_KEY` the endpoint skips verification entirely.

**The weekly check fails with "the safety valve tripped".** Working as
intended: it wanted to change more than 15% of the directory, which means the
checker broke rather than the world changing. Nothing was applied. Read
`build/reports/weekly-check.md` to see what it wanted to do.

**A build fails after a weekly commit.** The data no longer validates. Run
`npm run import` locally to see the error, then remove the offending entry from
`data/agent-overlay.json` and re-run.

**Report links point at `your-github-username`.** `PUBLIC_GITHUB_REPO` is not
set in Pages, or the deployment predates setting it.

---

## What this costs

Nothing, unless you buy a domain. See [FREE-TIER.md](FREE-TIER.md) for each
service's limit, what happens when it is reached, and where to look.
