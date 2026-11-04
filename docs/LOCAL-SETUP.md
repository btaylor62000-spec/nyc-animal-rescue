# Setting the project up on your own computer

**You probably do not need this.** [START-HERE.md](START-HERE.md) gets you
working in a browser tab with nothing to install, and that is the easier route
for almost everyone.

This page is for the case where you want the project on your own machine:
you want to see the site running on your own computer before anyone else sees
it, you want to work without an internet connection, or you simply prefer it.

**It needs a Windows PC or a Mac.** It will not work on a Chromebook — Node and
GitHub Desktop do not install on ChromeOS in the normal way. On a Chromebook,
use the browser route instead.

Do Part 1 of [START-HERE.md](START-HERE.md) first — accepting the GitHub
invitation — then come back here.

---

## 1. Install the Claude desktop app (5 minutes)

Go to **<https://claude.com/download>** and download the Claude app for your
computer. Install it the way you would any other app, and sign in.

In the app there is a **Code** section. That is the one that can open a folder
of files and work on them.

---

## 2. Install Node (10 minutes, plus a restart)

Node is what runs the website on your own computer so you can look at changes
before anyone else sees them. You will never type the word "node" yourself.

**Click the link for your computer. It downloads an installer straight away.**

- **Windows:**
  <https://nodejs.org/dist/v22.23.4/node-v22.23.4-x64.msi>
- **Mac:**
  <https://nodejs.org/dist/v22.23.4/node-v22.23.4.pkg>

Run the file it downloads and click through, accepting every default.

**Then restart your computer.** Node adds itself to your system in a way other
programs only notice after a restart. Skipping this is the most common reason
the next part appears not to work.

> **Why a direct link rather than the website?** nodejs.org's download page
> offers a row of dropdowns and a block of commands aimed at developers, and
> the plain installer is not where you would expect to find it. The links above
> are the installer itself, from nodejs.org, so there is nothing to choose.
>
> Version 22 is deliberate: it is the long-term-support release this project is
> known to work with. If these links are ever out of date, ask Claude Code —
> *"what is the current Node 22 LTS installer link for Windows?"* — rather than
> fighting the website.

---

## 3. Install GitHub Desktop and download the project

Go to **<https://desktop.github.com>**, download it, install it, and sign in
with the same GitHub account you were invited with.

This is what saves you from typing commands to move files around. It gives you
two buttons you will actually use: one to send your changes to GitHub, and one
to pull down changes other people (or the site's own automatic jobs) have made.

Then, in GitHub Desktop:

1. **File → Clone repository**
2. Choose the **GitHub.com** tab
3. Find **btaylor62000-spec/nyc-animal-rescue** in the list and select it
4. Leave **Local path** exactly as it is — the suggested folder is the right
   one
5. Click **Clone**

It takes a minute or two. When the progress bar finishes, every file in the
project is on your computer.

**You do not need to remember where it put them.** GitHub Desktop always knows,
and it will show you whenever you ask:

> **Repository → Show in Finder** (on a Mac)
> **Repository → Show in Explorer** (on Windows)

That opens the folder. Use that menu any time you lose track of it — you never
have to hunt through folders or type a path.

---

## 4. Open it and check it works

### Open the folder

In GitHub Desktop, **Repository → Show in Finder** (or **Show in Explorer**).
A window opens showing the project's files. Leave it open for a moment.

Now, in the Claude app, go to the **Code** section and choose to open a
folder — then pick `nyc-animal-rescue`, the one you were just looking at.

If Claude asks you to confirm you trust the folder, say yes. It is your own
project.

Claude reads the project's own notes automatically when you open it, so it
already knows what this is, how it works, and what the rules are.

### Ask it to set up and check

Type this:

> Please install the dependencies and run the full check to make sure
> everything works. Then tell me in plain language whether it passed.

It will take a few minutes the first time. It is downloading the pieces the
project depends on and then running every test.

If it says something like *"node is not recognised"* or *"command not found"*,
Node was installed but your computer has not noticed yet — restart, and try
again.

### Look at the site on your own computer

Ask:

> Please start the site so I can look at it, and give me the link.

It will give you an address starting `http://localhost`. Open it. That is the
whole website, running on your computer. Nobody else can see it.

**This is the one thing the browser route cannot do**, and the reason some
people prefer working this way.

---

## 5. Every time you sit down to work

**Open GitHub Desktop first and click "Pull origin"** (sometimes labelled
*Fetch origin*, which turns into *Pull origin* when there is something to
collect).

This matters more here than on most projects. The site changes itself: an
automatic check runs every Monday, another looks for new organizations monthly,
and anyone who uses the "Report a problem" button on the website causes a change
too. If you start work without collecting those, your own changes will clash
with them later — which is annoying to untangle and completely avoidable.

Ten seconds, every time. Then open Claude Code and carry on.

> Working in the browser instead? You can skip this entirely. Each browser
> session takes a fresh copy of the project, so there is nothing to collect.

---

Everything else — what the project is for, the rules, what to do when
something goes wrong — is in [START-HERE.md](START-HERE.md) from Part 4
onwards, and it applies the same either way.
