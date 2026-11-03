# Start here

A step-by-step setup guide, written for someone who does not spend their day
in a terminal. It takes about half an hour, most of which is waiting for
things to install.

You do not need to understand the code. You will be working with Claude Code,
which does understand it — your job is to tell it what you want and to check
that what comes out is right.

**If you get stuck at any point, say so to Claude Code in plain words.** Paste
whatever the screen says, including the error. That is not a last resort; it
is the normal way to use it.

---

## What you are setting up

Four things, in this order:

1. Your **GitHub** invitation accepted — where the project's files live
2. **Claude Code** — where you will do the work
3. **Node** — the engine that runs the site on your computer
4. **GitHub Desktop** — moves files between your computer and GitHub

Then you open the project and check it works.

---

# Part 1 — GitHub (2 minutes)

GitHub stores the project. Every change goes through it, and the website
rebuilds itself whenever something changes there.

You already have a GitHub account — it is the one you were invited with. You
do not need a new one.

### 1.1 Accept the invitation

Check your email for a message from GitHub saying you have been invited to
`btaylor62000-spec/nyc-animal-rescue`, and click **Accept invitation**.

It may be in spam. If you cannot find it at all, you can accept it directly at
**<https://github.com/btaylor62000-spec/nyc-animal-rescue/invitations>** while
signed in.

### 1.2 Check it worked

Go to **<https://github.com/btaylor62000-spec/nyc-animal-rescue>**, click on
`README.md` in the file list, then click the **pencil** icon near the top
right.

- If an editor opens and the button says **Commit changes**, you are in.
  Leave without saving.
- If it instead offers to **fork** the project, the invitation has not been
  accepted yet. Go back to 1.1.

That is the real test: forking is what GitHub offers people who can read but
not write.

> **Starting fresh rather than taking over?** If you have landed here without
> an invitation, make an account at <https://github.com/signup> — free, any
> email — and ask whoever runs the project to add you, giving them your
> username.

---

# Part 2 — Claude Code (5 minutes)

### 2.1 Install it

Go to **<https://claude.com/download>** and download the Claude desktop app
for your computer. Install it the way you would any other app, and sign in.

### 2.2 Find the Code part

In the app there is a **Code** section. That is the one that can open a folder
of files and work on them. You will come back to this in Part 4.

---

# Part 3 — Node and GitHub Desktop (10 minutes)

### 3.1 Install Node

Go to **<https://nodejs.org>** and download the version labelled **LTS**. Run
the installer and accept the defaults.

Node is what runs the website on your own computer so you can look at changes
before anyone else sees them. You will never type the word "node" yourself.

### 3.2 Install GitHub Desktop

Go to **<https://desktop.github.com>**, download it, install it, and sign in
with the GitHub account you made in Part 1.

This is what saves you from typing commands to move files around. It gives you
two buttons you will actually use: one to send your changes to GitHub, and one
to pull down changes other people (or the site's own automatic jobs) have made.

### 3.3 Download the project

In GitHub Desktop:

1. **File → Clone repository**
2. Choose the **GitHub.com** tab
3. Find **btaylor62000-spec/nyc-animal-rescue** in the list and select it
4. Note the **Local path** — that is where the files will live on your
   computer. The default is fine. Remember roughly where it is.
5. Click **Clone**

It will take a minute. When it finishes, you have the whole project.

---

# Part 4 — Open it and check it works

### 4.1 Open the folder in Claude Code

In the Claude app, go to the **Code** section and open the folder GitHub
Desktop just created. It will be called `nyc-animal-rescue`.

Claude automatically reads the project's own notes when you open it, so it
already knows what this is and how it works. You do not need to explain
anything.

### 4.2 Ask it to set up and check

Type this, exactly:

> Please install the dependencies and run the full check to make sure
> everything works. Then tell me in plain language whether it passed.

It will take a few minutes the first time. It is downloading the pieces the
project depends on and then running every test.

**What you want to see:** it tells you everything passed. If anything fails,
paste what it says back to it and ask it to fix it.

### 4.3 Look at the site on your own computer

Ask:

> Please start the site so I can look at it, and give me the link.

It will give you an address starting `http://localhost`. Open it. That is the
whole website, running on your computer. Nobody else can see it.

Have a click around. It should look exactly like the live site.

---

# Part 5 — Make your first change

Do this once with something harmless, so that the first time you change
something that matters, the process is already familiar.

### 5.1 Change something small

Ask Claude Code:

> Find the sentence on the About page that starts "A free, non-commercial
> directory" and change the word "directory" to "guide". Then show me the
> page so I can check it.

Look at it. Confirm it changed.

### 5.2 Put it back

> Actually, change it back to "directory" please.

This matters more than it sounds: knowing you can undo something is what makes
it safe to try things.

### 5.3 Send a real change to the live site

When you have made a change you actually want, ask:

> Please run the full check, and if it passes, commit and push this.

Then open **<https://nyc-animal-rescue.pages.dev>** and wait two or three
minutes. Your change will be there.

That is the whole loop. Everything else is detail.

---

## The handful of things worth knowing

You do not need to remember these. Claude Code knows them. But they explain
why it sometimes pushes back.

**People use this site in an emergency.** An injured bird, a hurt cat, a dog
someone cannot keep. That is why the project is fussy about being accurate and
about admitting when something has not been checked. A wrong phone number is
worse than no phone number.

**Never edit the files in `data/orgs` by hand.** They are rebuilt from other
files, so your edit would vanish. If you want to correct an organization, ask
Claude Code to do it — it knows the right place.

**Always run the check before pushing.** Just ask: *"run the full check."* It
is the reason the live site has not broken.

**It cannot cost money.** Everything runs on free allowances that stop working
rather than start charging. The one thing to never do is add a payment method
to the Cloudflare account.

---

## When things go wrong

**Almost everything is fixable, and nothing you do is permanent.** Every
change is recorded and can be undone.

| What you see | What to do |
| --- | --- |
| Something failed and you do not understand it | Paste the whole message to Claude Code and ask what it means |
| You changed something and want it back | Ask: *"undo my last change"* |
| The live site looks wrong | Ask: *"check the live site and tell me what is broken"* |
| You are not sure whether something is safe | Ask before doing it. It will tell you |

**You cannot break the live website by mistake.** A broken change fails its
checks and never reaches the site. The worst case is that your change does not
appear and you ask Claude Code why.

---

## Where to look next

When you want more detail, in increasing order of depth:

- **`docs/HANDOFF.md`** — what access you need and how the project fits
  together
- **`README.md`** — what the project is, for anyone
- **`CLAUDE.md`** — every rule and decision, with the reasons. Claude Code
  reads this automatically. Worth skimming once you are comfortable, especially
  the part called *"What this is for"*

And the most useful habit: when you decide something, ask Claude Code to write
it into `CLAUDE.md`. That file is the reason you could pick this up at all.
