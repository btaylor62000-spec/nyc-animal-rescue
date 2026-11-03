# Start here

A step-by-step setup guide, written for someone who does not spend their day in
a terminal. It takes about ten minutes.

**There is nothing to install.** You will work in a browser tab. That means it
works the same on a Chromebook, a Mac, a Windows PC or a borrowed laptop, and
there is no moment where an installer fails and stops you.

You do not need to understand the code. You will be working with Claude Code,
which does understand it — your job is to tell it what you want and to check
that what comes out is right.

**If you get stuck at any point, say so to Claude Code in plain words.** Paste
whatever the screen says, including the error. That is not a last resort; it is
the normal way to use it.

---

## What you are setting up

Two things:

1. Your **GitHub** invitation accepted — where the project's files live
2. **Claude Code in your browser** — where you will do the work

That is all. The project is never downloaded onto your computer.

---

# Part 1 — GitHub (2 minutes)

GitHub stores the project. Every change goes through it, and the website
rebuilds itself whenever something changes there.

You already have a GitHub account — it is the one you were invited with. You do
not need a new one.

### 1.1 Accept the invitation

Check your email for a message from GitHub saying you have been invited to
`btaylor62000-spec/nyc-animal-rescue`, and click **Accept invitation**.

It may be in spam. If you cannot find it at all, you can accept it directly at
**<https://github.com/btaylor62000-spec/nyc-animal-rescue/invitations>** while
signed in.

### 1.2 Check it worked

Go to **<https://github.com/btaylor62000-spec/nyc-animal-rescue>**, click on
`README.md` in the file list, then click the **pencil** icon near the top right.

- If an editor opens and there is a green **Commit changes** button, you are in.
  Do not click it — just press the browser's back arrow.
- If it instead offers to **fork** the project, the invitation has not been
  accepted yet. Go back to 1.1.

That is the real test: forking is what GitHub offers people who can read but not
write.

> **Starting fresh rather than taking over?** If you have landed here without an
> invitation, make an account at <https://github.com/signup> — free, any
> email — and ask whoever runs the project to add you, giving them your
> username.

---

# Part 2 — Claude Code in your browser (5 minutes)

This is a one-time setup. After this, getting to work is just opening a tab.

### 2.1 Open it

Go to **<https://claude.ai/code>** and sign in with your Claude account.

This needs a paid Claude plan — Pro is enough. If you see a message saying
Claude Code is not available on your account, that is what it means.

### 2.2 Connect GitHub

It will ask you to connect GitHub. Follow the prompt; it sends you to GitHub's
own page to approve it, and then sends you back.

This project is public, so that is all the access it needs. If you are offered
the chance to install something called the **Claude GitHub App** and you would
rather not think about it now, click **Skip** — you can do it later and nothing
here needs it.

### 2.3 Let it set itself up

On a Pro plan you are given a working setup automatically — it is called
**Default**, and you do not need to change anything about it. If you are shown
a form asking you to create one, leave everything as it is and confirm.

It already has everything this project needs.

### 2.4 Choose the project

Under the box where you type there are two small buttons: **Default** and
**Repo**.

Click **Repo**. A search box opens — start typing `nyc` and
**btaylor62000-spec/nyc-animal-rescue** appears underneath. Click it.

A third button then appears showing **main**. That is the right version of the
project to start from, so leave it as it is.

Leave everything else alone too. **Default** on the left, and the model and
**Auto** over on the right, are all already set correctly.

---

# Part 3 — Check it works

In the message box, type this:

> Please run the full check on this project — typecheck, tests, evals and
> build — and tell me in plain language whether it all passed.

Then press Enter and leave it alone for a few minutes. It is fetching the
project, downloading the pieces it depends on, and running every test.

**What you want to see:** it tells you everything passed. If anything fails,
paste what it says back to it and ask it to fix it.

Claude reads the project's own notes automatically, so it already knows what
this is, how it works and what the rules are. You do not have to explain
anything or paste anything in.

> **You can close the tab.** The work carries on without you and is still there
> when you come back. This is genuinely useful for anything slow — ask for it,
> go and do something else, come back and read what happened.

---

# Part 4 — Make your first change

Do this once with something harmless, so that the first time you change
something that matters, the process is already familiar.

This one is worth making for real: the project's notes should say who is
looking after it.

### 4.1 Ask for the change

> Please add me to CLAUDE.md as the person now maintaining this project — my
> name is [your name] and my GitHub username is [your username]. Then run the
> full check.

### 4.2 Look at what it did

Beside the chat there is a **Changes** card showing how many lines were added
and removed, something like `+4 -1`. Click those numbers to see exactly what
changed, line by line.

Red is removed, green is added. You are looking for one thing: is that the
change you asked for, and nothing else?

If something is wrong, say so in the chat in plain words. You can also hover
over any line in that view and click the **+** beside it to comment on that
exact line, which saves describing where the problem is.

### 4.3 Look at the actual web page

When Claude has finished it puts the change on a **branch** — a draft version
of the site, separate from the real one. Ask:

> What is the preview address for this branch?

It will give you an address like
`your-branch-name.nyc-animal-rescue.pages.dev`. Open it in a new tab, wait
about a minute for it to build the first time, and you are looking at the
entire website with your change in it — **and nobody else can see it.**

This is the step worth never skipping. The live site has had faults that every
test passed and that were only visible on the real page.

### 4.4 Put it live

When the diff looks right and the preview looks right, it goes live through
something called a **pull request** — which is just a page where a change waits
to be approved.

On the **Changes** card, click **Create PR**.

> If that does not work, do it on GitHub instead: go to
> <https://github.com/btaylor62000-spec/nyc-animal-rescue>. A yellow bar near
> the top will say your branch was recently pushed, with a **Compare & pull
> request** button. Click that, then **Create pull request**.

On the pull request page, wait for the checks to finish, then click
**Merge pull request** and confirm.

Open **<https://nyc-animal-rescue.pages.dev>** and wait two or three minutes.
The site rebuilds itself. Your change is live.

> **Worth doing this one while the person handing over is on a call with you.**
> It is the first time your access is properly tested, and if anything is wrong
> it is a two-minute fix with them there.

---

## The whole loop, in short

1. Open **<https://claude.ai/code>**, pick the project, say what you want
2. Read the **Changes** diff — is that what you asked for?
3. Open the **preview address** — does the real page look right?
4. **Create PR**, then **Merge**
5. The live site rebuilds itself within a few minutes

Nothing before step 4 can affect the live site, which is why you can try things
freely.

**There is nothing to remember to do first.** Each session takes a fresh copy of
the project, so you always start from the current state — which matters here,
because this site changes itself: a check runs every Monday, another looks for
new organizations monthly, and visitors can submit corrections.

---

## The handful of things worth knowing

You do not need to remember these. Claude Code knows them. But they explain why
it sometimes pushes back.

**People use this site in an emergency.** An injured bird, a hurt cat, a dog
someone cannot keep. That is why the project is fussy about being accurate and
about admitting when something has not been checked. A wrong phone number is
worse than no phone number.

**Never edit the files in `data/orgs` by hand.** They are rebuilt from other
files, so your edit would vanish. If you want to correct an organization, ask
Claude Code to do it — it knows the right place.

**Always run the check before merging.** Just ask: *"run the full check."* It is
the reason the live site has not broken.

**It cannot cost money.** Everything runs on free allowances that stop working
rather than start charging. The one thing to never do is add a payment method to
the Cloudflare account.

---

## When things go wrong

**Almost everything is fixable, and nothing you do is permanent.** Every change
is recorded and can be undone.

| What you see | What to do |
| --- | --- |
| Something failed and you do not understand it | Paste the whole message to Claude Code and ask what it means |
| You changed something and want it back | Ask: *"undo that change"* |
| The preview page looks wrong | Say what looks wrong, in the same chat. The branch is a draft; fix it and look again |
| You merged something and regret it | Ask: *"revert the last change on main"* |
| The live site looks wrong | Ask: *"check the live site and tell me what is broken"* |
| You are not sure whether something is safe | Ask before doing it. It will tell you |

**You cannot break the live website by mistake.** A change only reaches the site
when you merge it, a broken one fails its checks before that, and even a merged
change can be reverted.

---

## Where to look next

When you want more detail, in increasing order of depth:

- **`docs/HANDOFF.md`** — what access you need and how the project fits together
- **`README.md`** — what the project is, for anyone
- **`CLAUDE.md`** — every rule and decision, with the reasons. Claude Code reads
  this automatically. Worth skimming once you are comfortable, especially the
  part called *"What this is for"*

And if you ever want the project on your own computer rather than in a browser
tab — the one thing that gains you is being able to run the site on your own
machine — that is **`docs/LOCAL-SETUP.md`**. It needs a Windows PC or a Mac; it
will not work on a Chromebook.

The most useful habit, either way: when you decide something, ask Claude Code to
write it into `CLAUDE.md`. That file is the reason you could pick this up at
all.
