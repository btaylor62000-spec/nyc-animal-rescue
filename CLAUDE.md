# Working on this project

Notes for whoever picks this up next, human or otherwise. `README.md` says what
the project is; this says how to change it without breaking the parts that
matter.

---

## Where things stand

**The site is live and deployed.** Everything below already works in
production; nothing here is aspirational. Figures last refreshed 2026-11-05
from the data itself (`data/orgs/`, `content/guides/`, the workbooks) -- when
you change them, recount rather than adjust.

| | |
| --- | --- |
| Live site | <https://nyc-animal-rescue.pages.dev> |
| Repository | `btaylor62000-spec/nyc-animal-rescue` (public) |
| Hosting | Cloudflare Pages, auto-deploys on every push to `main` |
| Assistant | Working, with Workers AI and Turnstile both switched on |
| Scheduled checks | Both active. Weekly ran for the first time 2026-09-21 and **pushed five wrong changes to production** — see below. Since 2026-09-22 it opens a pull request for anything a reader could see; only bookkeeping goes to `main`. Discovery has run once, 2026-09-17, and still pushes to `main` |
| Sources | Three reference workbooks, the wildlife document, the city's pet food pantry list, and `research/NYC_Reviewer_Additions.xlsx` for what reviewers found missing:  85 rows as of 2026-11-05, each checked on the organization's own site or marked as supplied by a reviewer where the site turns robots away. It carries optional **Hours** and **Address** columns |
| Guides | 26 (*When a pet dies* and the legality guide removed by the owner 2026-11-15; four added 2026-11-15: found kittens, when a pet dies, an animal left alone, an animal trapped; *Leaving an abusive home with your pet* added 2026-11-05, out of the housing guide; the separate Animal Help Now page removed 2026-11-06, its answers woven into the guides where each belongs, `AHNOW_WEAVE` in `guide-pages.ts`, tested). Since 2026-11-15 every guide is on the home page as a numbered line, most urgent first (`GUIDE_TIERS`, tested; before that, since 2026-11-05, by situation in `GUIDE_GROUPS`, which is still tested and now supplies the "just need a phone number?" links), every listed organization a guide names links to its listing with a per-section contacts box built from the records (`src/data/guide-mentions.ts`), and every question on ahnow.org/resources.php is linked from the guide it belongs in. One written 2026-11-04 from NYC Emergency Management's own guidance (pets in a disaster); three from reviewers' material: reporting abuse, the shelter's urgent ("at-risk") list -- renamed 2026-11-04 because nobody outside rescue knows "New Hope" -- and keeping your pet when facing homelessness (checked line by line against the city's 311 and DHS pages on 2026-11-04) |
| Directory | Recounted 2026-11-15: 428 listed of 445 records (closed, moved-away and two guidance-only reporting lines are not listed; their pages still exist). 424 listed entries carry a date they were last confirmed; 4 never have. 46 emergency vets, every one with hours, 33 of them open 24/7, including four just outside the city added 2026-11-15 (Garden State Woodbridge, Oradell, VEG Greenwich, Long Island Veterinary Specialists) and the New Jersey, Long Island, Westchester and Rockland VEG hospitals. Hours that only *say* 24 hours somewhere, unconfirmed, never show "Open now" -- see `DOUBTFUL` in `src/data/hours.ts`. CompleteCare turned out to be a daytime vet and Elmhurst has closed (reviewer's calls, 2026-11-04); Urgent Vets Queens was confirmed 24/7 on the same calls. No hospital in the Bronx is confirmed 24 hours. Ordered open now, then nearest (device location, a typed zip, or a zip in the question), then evidence -- see *Nearest, open now, best evidenced* |
| Discovery | **Finished 2026-11-05.** 230 candidates from ACC's New Hope partner roster (every one is an ACC rescue partner). 29 published, each read and placed in the city; the rest are outside the city, closed, or unreadable, and each is named with the reason in `docs/discovery-review-2026-11-05.md`. Breed- and population-specific rescues outside the city are in the breed guide and the special-needs sections instead, and partners outside the city whose own sites say they take animals from ACC are in the at-risk guide |
| Design | **Redesigned 2026-11-15** as a sign: a red emergency band first on the home page, a red E button in the header of every other page, every guide a numbered line in four urgency tiers, guide pages drawn as a route. See *Changed 2026-11-15* just below, and *How the site looks* for the rules |
| Self-reporting | `/status` publishes what is checked, what is not, and what is waiting on a person |
| Privacy holds | All three people agreed to be listed on 2026-09-22. On 2026-11-05 the reviewer asked for Divya's mobile to come off the bird guide anyway (it now routes to organizations), and a volunteer's personal Gmail NYTTS does not publish was removed from the turtle line; the Horvaths' and Robert Spragg's numbers stay, because NYC Bird Alliance publishes them for exactly this. The mechanism stays for the next one. Tests use `tests/fixtures/privacy-holds.json`, not the live file |
| Visitor submissions | Live since 2026-09-22: `/contribute` adds a resource, every card and entry page has "Report a problem". First real correction went through the whole chain the same day (form → commit → publish workflow → deploy → labelled entry) |

### Changed 2026-11-15 (later the same day): every guide opens "at a glance"

The owner found the guides too long to read in a hurry, chose a layout from
three prototypes, and asked for the tier names to change. What changed:

- **Every guide page opens with an at-a-glance card** (`GLANCE` in
  `src/data/guide-glance.ts`, drawn by `src/components/GuideGlance.astro`):
  a one-line headline, who to contact first, three or four numbered steps, a
  black "Never do this" box and a "Remember" box. Written so a 12-year-old
  can follow it. The full guide is unchanged, folded underneath in a
  `<details>` ("Read the full guide · N words · about M min").
- **Some guides also get situation tiles** ("What's happening?"), where the
  right advice depends on what happened: at first the injured bird, wildlife
  and help-paying guides; since the third round below, also the emergency
  guide and both "Help keeping your..." guides. Each answer links to the heading in the full guide
  it came from. They work without JavaScript (`:target`). The lost-and-found
  dog and cat guides show "I lost one" and "I found one" side by side.
- **The card cannot drift from the data** (`tests/guide-glance.test.ts`):
  every guide has a card; contacts are record ids and their numbers come from
  the records; no phone number or price in the card's own words; every web
  or email address is already in the guide; `never` and `remember` lines are
  copied word for word from the guide (rule 4); a situation's `section`, when
  it has one, is a real heading. **Adding a guide now also needs its `GLANCE` entry.** When a
  guide's wording changes at the workbook, a copied safety line can stop
  matching: the test names it, and the fix is to copy the new wording.
- **The tiers are renamed**: Emergency, Urgent, Keeping your pet, Rehoming,
  rescue and planning. The old "When you have time" told someone rehoming
  their rabbit that their problem could wait. The keys (`now`, `today`,
  `week`, `later`) and colours are unchanged.

### Three guides added 2026-11-15, from the first audit's gaps

*Found kittens outside*, *When a pet dies* and *An animal left alone in a
home*, each from the city's own pages (311's articles on stray animals and on
a dead animal on private property, the Sanitation Department's dead-animals
page, the Office of Animal Welfare's evictions page), with the source URLs in
each guide's first lines and quotations in their words. Workbooks:
`research/NYC_Found_Kittens.xlsx`, `research/NYC_When_A_Pet_Dies.xlsx`,
`research/NYC_Animal_Left_Alone.xlsx`.

A fourth, *An animal is trapped* (`research/NYC_Animal_Trapped.xlsx`), was
added the same day at the owner's request. No city agency publishes a
procedure for it, so the guide uses what 311 and NYC Health do say (911 for
immediate danger, 311 and ACC for strays 10am to 6pm, NYC Parks for parks, a
licensed nuisance wildlife control operator for wildlife in a building), and
cites the NYPD Emergency Service Unit rescues as news reports, labelled as
such. The monthly audit checks whether the city has published a procedure.
28 guides now.

### Also changed 2026-11-15 (third round)

- **Guide headings are no longer in capitals.** `headingCase` in
  `scripts/import/guide-pages.ts` lower-cases shouting words when the page is
  written, keeping acronyms (`KEEP_CAPS`) and names (`PROPER`). The
  workbooks are unchanged, so `sectionOrder` and `omitSections` still match
  the source text. A new acronym or name that comes out wrong goes in one of
  those two lists.
- **Cat behaviour advice is in *Help keeping your cat*,** borrowed from the
  lost-and-found tab with the new `addSections`; the lost-cat page leaves it
  out. The "Prevention beats everything" paragraph was moved within that tab
  so it stays with lost cats.
- **The Animal Medical Center's ER takes critically ill birds**: the owner
  rang AMC and confirmed it on 2026-11-15. The bird card and the bird guide's
  step 4 send a badly hurt bird there at night. NYC Bird Alliance's list names
  AMC for raptors and waterfowl and asks callers to mention it, which both say.
- **Who handles a sick raccoon, skunk, bat or deer:** 311, which passes it to
  ACC in business hours or to NYC Parks in a park (311's own article). The
  wildlife guide and card used to say the Urban Park Rangers handle these
  everywhere; the Rangers are Parks staff, so they are named only for parks.
- **The disaster guide** quotes 311's two evacuation conditions (a pet too big
  for a carrier must be muzzled and on a sturdy leash; only legal pets at
  evacuation centres), which the card also says.
- **Four 24-hour hospitals just outside the city** were added from AmbuVet's
  after-hours list, each checked on its own site and labelled outside NYC:
  Garden State Veterinary Services Woodbridge (Medium: its page would not open
  for us, read through search results), Oradell Animal Hospital, VEG
  Greenwich and Long Island Veterinary Specialists. Far ones (Riverhead, Red
  Bank, Stamford and the like) were left out on purpose. Note that the
  importer reads borough names anywhere in a row: "near Staten Island" in a
  note tagged a New Jersey hospital as being in Staten Island.
- **Situation tiles** on the emergency card (poison, another dog attacked my
  dog, no way to get there, the Bronx, paying, exotic pets, trapped) and on
  both "Help keeping your..." cards (food, vet bills, behaviour, a crisis,
  the landlord, giving up your pet). Those two home-page lines now say "or
  giving it up". A situation no longer needs a `section`: it answers on the
  card, and a `section` only adds "Read why".
- **Google Translate:** the owner's decision is that readers translate the
  site themselves; no translated copies of the guides are planned.

### Also changed 2026-11-15 (fourth round)

- **"Emergency vet" for an emergency, "24-hour vet" for after hours**
  (owner, revised the same day): every 24-hour vet is an emergency vet, but
  not every emergency vet is open 24 hours. Telling someone where to go in an
  emergency says "emergency vet"; a place's own hours, and where to go after
  hours, say "24-hour vet" or "Open 24 hours". There is no 24-hour vet in the
  Bronx: Urgent Vets there is an emergency vet, 10am to 10pm. "Within 24
  hours" stays where it is a deadline (reporting a bite).
- **Never delay leaving to make a call.** "Go now; if you can, call while you
  travel" (owner's question, 2026-11-15: does "call on the way" delay care?).
  The call is worth making, because an ER can be full or not treat birds,
  rabbits or reptiles, but it is never a step before setting off.
- **The trapped-animal guide does not tell people what not to do themselves**
  (owner: "not your place to say"). It says who to call; the "don't go in
  after it" step and the subway/drain line were removed.
- **The Bronx tile says why it is there:** "I'm in the Bronx: there's no
  24-hour vet", then where to go by neighbourhood, from the
  driving times.
- **Guide feedback goes to the owner's Google Form** (`FEEDBACK_FORM` in
  `src/data/site.ts`): "Something wrong or missing in this guide? Tell us" on
  every guide, with the guide's name filled in. A form the owner holds,
  because the site has nowhere private for free text (rule 7; its own forms
  commit to the public repository). Answers reach only the owner.

### Also changed 2026-11-15 (fifth round)

- **Card steps link to the nearest places.** A step that sends someone
  somewhere carries a link into the directory, filtered and asking for a
  place: "Get it scanned for a chip" opens the nearest vets and shelters.
  `near=1` on a directory link highlights "Nearest to me" and the zip box
  (the location is still asked for only when tapped). `anyneed=` (repeatable)
  matches any of several needs, for links only; the filter panel's needs must
  all match. New cards: give such steps a `link`.
- **The directory asks first, then shows 20 at a time.** With nothing asked,
  it shows "What do you need?" (`PICKS` in `src/pages/directory.astro`) and
  no list; "Show more" adds 20. About 8,000px on a phone instead of 132,000.
  Without JavaScript every listing is still on the page.
- **The phone header is one line**, down to 320px (the red pill drops its
  disc there).
- **The assistant says when there are more.** Six cards plus "These are 6 of
  13 places that match. See all 13 in the directory", filtered by the
  question's primary need (`primaryNeed`), animal and borough. Not for
  emergencies. 24-hour hospitals on its cards now say "Open 24 hours"; they
  used to say nothing, which looked like unknown hours.
- **Urgent Vets Bronx is confirmed twice:** the reviewer's call on 2026-11-04
  and its own site on 2026-11-15, both Mon-Sun 10am-10pm. High confidence.
  It is not a 24-hour vet. Do not list it for re-checking as if it were in
  doubt.
- **Getting there without a car** (emergency guide and card): 311's rule that
  a cab or car service may refuse an animal not in a carrier; Uber Pet and
  Lyft's Pet rides, with Uber's "availability may vary" and Lyft drivers'
  opt-out; AmbuVet for an animal too hurt or too big to carry. Pet taxis
  (Pet Chauffeur and others) are not listed: none could be read on its own
  site.
- **"Not sure it's an emergency?"**: VEG's own pages say a vet answers the
  phone 24 hours; AMC's 24/7 urgent care line, (212) 329-8608, from its own
  page (added to the AMC record); AmbuVet's 24/7 video call with a vet
  technician, who in its words "cannot diagnose or prescribe". National video
  services (VetTriage, Vetster, Airvet) are not listed: VetTriage's site never
  names New York, Vetster's terms say it is not for emergencies, Airvet could
  not be read.
- **Paramus hospitals** are placed from the coordinates on their own pages
  (the Census geocoder cannot read Route 17 addresses); drive times re-run.
  **GSVS Woodbridge** is High: the owner opened its page and confirmed it.

### Changed 2026-11-17: one topic, one set of places

The owner found "borrow a trap" giving different places on the guide, in Find
help and from the assistant (once Advocat, once Anjellicle). Each used its own
rule. Now:

- **One rule** (`src/data/topics.ts`, `matchesTopic`): a place belongs to a
  need-and-animal topic if it has the need and serves one of the animals, and
  a place that names no animal serves them all. The guides' lists
  (`listingsFor`), the directory's animal filter (it used to leave out places
  naming no animal, and needed every ticked animal) and the assistant use it.
- **Every list at the foot of a guide has a name**, `<guide>.<n>` (`TOPICS`
  in `guide-listings.ts`). The directory page carries every list's places;
  `?list=` (one or several) shows exactly those, headed with the list's name.
  A plain need with one animal still links as `?need=&animal=`.
- **Find help opens one of its guide's own lists** (`FIND_HELP` now holds a
  list number), so the two can never differ.
- **The assistant answers a guide topic from that guide's list**: the routed
  guide's list for the question's main need (plus the emergency vets in an
  emergency or a poisoning), never free search; "These are 6 of N" and "See
  all" are that list's count and link. The lists are in the chat corpus
  (`topics`), built at import from the same records.
- **Later the same day (owner: "make 1000% sure"):** every one of the 26 Ask
  buttons answers from the list its Find help button opens (a question that
  is a guide's own name uses that guide's Find help list; situation guides
  such as found kittens always use their own lists). Lists can name places
  that lead them, in order (`lead`): the bird list opens with the Wild Bird
  Fund, the Animal Medical Center and Animal Help Now, the wildlife list with
  Animal Help Now and the Wild Bird Fund, in the guide, the directory (which
  keeps a list's order until there is a place to measure from) and the
  assistant. A question about something hurt or ill puts the emergency vets
  before poison control; the emergency card's contacts do the same. The cat
  and dog keeping guides gained "Rescues that take a cat/dog from its owner".
  A borough or zip in a question narrows the list exactly as the directory's
  filter does (`servesBoroughs` / `servesZip` in `src/data/area.ts`; the
  corpus carries each place's `areas`): "free cat food in the Bronx" is 6 of
  13 (the Bronx plus help covering the whole city), and "see all" opens
  those 13. The assistant's line names the area.
  **Since later on 2026-11-17, a typed question about one kind of help is
  the directory's own filter**: that need, only the animals the question
  actually names (`namedAnimals`; "pet" alone means every animal), and its
  borough or zip. "See all" opens the directory with those boxes ticked, so
  it can be compared with the filter panel: "free pet food in the Bronx" is
  15 = Pet food help + The Bronx; "free cat food in the Bronx" is 13 = the
  same with Cat ticked (the two dog-only pantries drop out). Guide names (the
  Ask buttons), situations, an emergency with two lists, and lists with places
  that lead keep their guide list. Tested against the filter panel.
- **`tests/topics.test.ts`** compares, for every list, the guide, the directory
  link, Find help, card links and the assistant. Add a guide list and it is
  covered.
- Tags fixed on the way: the two poison hotlines are not spay/neuter clinics
  or exotic vets; the dogfighting tip line is dogs and farm animals (roosters),
  not every animal (`set.animals` is now allowed in overrides).
- **The ASPCA Rescuer Services Scheduler** (spay/neuter, transport, trap
  rental for rescuers) is linked in the TNR and clinics guides and on the
  ASPCA spay/neuter and trap bank listings (owner supplied the link).
- **The monthly audit watches NYC Council Int. 1029** (low-cost vet clinics in
  every borough) **and Int. 1098** (vets posting prices), and checks the
  one-topic rule with the assistant harness.

### Changed 2026-11-18: listings checked against their own sites

The consistency check of 2026-11-17 proved every door shows the *same*
places, not that each listing is *right*. The owner then found Pets of the
Homeless listed twice (cats, dogs) and Strong Paws marked dogs only with a
stale note. Cause: a group in both the cat and dog workbooks, or a service
for both, came out as one or the other. Five duplicates merged, three
headings dropped, 21 listings' animals corrected from their own sites
(`set.animals` overrides, each with the quote), Strong Paws' note updated.
Everything checked, with evidence and what could not be read, is in
`docs/listing-check-2026-11-18.md`. `tests/no-duplicates.test.ts` fails the
build on two listings sharing a website (unless listed in `SHARED_SITE_OK`
as branches or programmes) and on names that look like headings.
"Rescue NYC" reduces to an empty merge key, so its alias points the other
way, at the longer name.

### Changed 2026-11-17 (evening): every door gives Find help's answer

Owner, the fifth time of asking: the same places and the same count, however
someone asks. **Find help's tick-boxes are the source of truth.**

- **One reader for questions**, `src/data/understand.ts`: a question becomes
  a kind of help, the animals it names ("pet" names none, which means every
  animal) and a place. Find help's search box and the assistant both use it,
  then show exactly what those boxes show. The search box says what it read
  ("Showing Borrow a trap: 4 places"). A whole organization name is still a
  name search; words that name no kind of help are still a word search.
  A wording it gets wrong is fixed in that file's table, with a case in
  `tests/one-answer.test.ts`.
- **Every list at the foot of a guide is one set of boxes** (no hand-picked
  lists left). New kinds of help so they could be: *Report cruelty or
  neglect* (`report-cruelty`) and *Leaving abuse with your pet*
  (`domestic-violence`). The city's pantries lead the one food list
  (`pantriesFirst`) instead of being a list of their own.
- **Poison control brings the emergency vets** (owner): ticking it shows the
  two hotlines and every emergency vet, open now first (`NEED_ALSO` in
  `topics.ts`), on the guide, in Find help and from the assistant.
- **One order with no location**: places that lead (the card's own order,
  `lead`), then in the city, then best confirmed, then name
  (`compareListing`). A location or an emergency reorders by nearest and
  open now. Leads now also on the abuse lists (311 first) and the
  survivors' list. A lead for one animal set falls back to a list covering
  those animals, then to the need's list for every animal.
- **AMC is tagged for wild birds**, so it is on the bird list by rule, not by
  hand. **10 Lives Rescue NY** is confirmed (the owner added it).
- **The chip-scan step** links Find help's Emergency vet box, nearest first
  (any vet scans; these are open).
- **Checks:** `tests/one-answer.test.ts` asks 7,008 questions (every kind of
  help × animal × 16 places) through the search box and the assistant and
  compares each with the boxes; `scripts/dev/consistency-audit.ts` (after a
  build) also reads every Find help link on the built site. Both at zero.
  Three evals now expect a card *among* the answers rather than first
  (puppy scam, online cruelty, pet shop), because 311 leads every report list.

### Changed 2026-11-16 (ninth round)

- **Breed rescues are directory listings.** The breed tab of the dog
  workbook is a `GUIDE_ORG_SOURCES` source with the new `regional` flag: 68
  rescues became listings (Medium, from the research), 63 of them marked
  outside the city because their rows name no borough. 496 listed now. Two
  emails that read as individuals' own (Safe Hounds Beagle Rescue,
  Pekingese Rescue Network) were removed from the listings, the change logs
  and the guide rows; their websites stay. Recount the directory figures in
  the table at the top when you next touch them.
- **Bird card:** a big bird now says call the Animal Medical Center, and the
  big-bird tile carries Urban Wildlife Alliance's helpline and the NYC
  Emergency Animal Rescue group for when no one can come. Step 3 links
  Animal Help Now (ahnow.org) for a rehabber open now.
- **Ear tips** say only that the cat has been spayed or neutered, everywhere.
- **"Fledgling"** is explained where the bird guide first uses it, and its
  heading is now "Is it hurt, or a young bird learning to fly?".
- Kitten card links Kitten Lady's guides; at-risk card links the ready-made
  messages; the dog guide is "Low-cost dog vet care, spay/neuter and
  licensing"; the breed card has an "Every breed rescue" button.
- **One map of help across the site** (owner, 2026-11-16): the home page,
  Find help's "What do you need?" and the assistant's starting points all
  show the same 26 numbered guide lines in the same four tiers, built from
  `LINES_BY_TIER`. A Find help button opens that guide's own list in the
  directory with the guide shown above it (`FIND_HELP` / `findHelpHref` in
  `src/data/guide-listings.ts`), or the guide itself where the answer is
  steps. **A new guide needs a `FIND_HELP` entry** (tested).
  Both pages draw the list with one component, `src/components/GuideLines.astro`
  (drop-downs per tier, Emergency open): links on Find help, questions on
  the assistant's page.
  `tests/directory-picks.test.ts` checks every list has listings.
- **The assistant answers each guide's own name from that guide** (tested in
  `tests/chat.test.ts`). It used to send 13 of the 26 elsewhere; new routes
  in `routeGuide` cover disasters, trapped animals, leaving an abusive home,
  kittens found outside, pet rabbits/birds/reptiles (not wildlife, though
  they say "bird"), cat clinics and breed rescues.
- **The guide feedback form needs no Google account**: checked 2026-11-16,
  it opens signed out; "Sign in to save your progress" is optional.

### Also changed 2026-11-15 (eighth round): the expert decides, not the card

- **No triage by us.** The wildlife card no longer asks "Is it really
  alone?" or says a baby on its own is usually not abandoned: it says call a
  rehabber before you touch or move it, and they decide. Found kittens says
  the same: call a kitten rescue or ACC first (Itty Bitty City Kitties, Cat
  Castle, Kittens and Barbells, every kitten nursery), and do what they say.
  The guide gained a first section, "First, call someone who knows kittens",
  with Kitten Lady's guides as reference, not instead of a rescue.
- **Ear tips:** nothing says "leave it be" or that someone looks after the
  cat; an ear tip means spayed or neutered through TNR, and the cat can still
  be someone's lost pet or need help. "Don't re-trap ear-tipped cats" is gone
  from the TNR card and guide: an ear-tipped cat may need trapping again for
  vet care or in an emergency (owner).
- **TNR card:** three steps (certify, with Neighborhood Cats' workshop
  linked; register; trap and fix), then "Help for your colony", a link list
  (the new `more` field): food and shelter giveaways, Bideawee's and Alley
  Cat Allies' shelter guides, vet care, trapping help, grants, neighbours.
- **Breed rescues:** situation tiles (adopt, can't keep my dog, building
  rules) and then a tile per breed group, each opening that breed's rescues
  in the full guide. Links and tiles can point at `#heading-id` in the full
  guide; tests check every one is a real heading.
- **At-risk step 4** links ACC's own list of approved rescue partners, and
  "Who to contact" opens that section of the full guide.
- **"Low-cost cat clinics and trap banks"** is the clinics guide's name; the
  cat tile left the dog card.
- **Words:** no "behaviour problem" ("I need help training my dog", "Litter
  box, scratching or other habits"); "a trainer who rewards good behaviour
  rather than punishing"; exotic boarding is "I need boarding or a pet
  sitter".
- **The emergency box is compact on guide pages and the assistant page**
  (`<EmergencySigns compact />`): two lines, the bitten-or-caught warning
  still in bold. The home page keeps the full band.

### Also changed 2026-11-15 (seventh round): steps or situations, never both kinds mixed

- **The rule for cards** (owner: "you are listing steps that are not
  sequential"): numbered `steps` only when the order is the advice (rescue a
  bird, TNR, found kittens, the at-risk list, leaving an abusive home). Where
  the right advice depends on what happened, the card is "What's happening?"
  tiles (`situations`) and has no steps. Converted: disaster, both "Help
  keeping your..." cards, help paying, low-cost dog care, cats with special
  needs, dog behaviour, exotic planning, an animal left alone, a trapped
  animal. A step that only repeated a tile is gone (the emergency card's
  poison and paying steps).
- **A safety line says it once per card** (tested): card-wide lines at the
  bottom, situation lines in their tile, never both.
- **Removed at the owner's request:** "Do not go back alone to fetch it"
  (leaving abuse), "Scratched or bitten by a feral? Contact a doctor" (TNR),
  the Code Blue tip (it is about people; city shelters do not take pets), the
  duplicate dog-licence reminder.
- **Giving up a pet** leads with the rescue you got it from, then rehoming it
  yourself (ACC's Rehoming Your Pet tools keep it out of the shelter), then
  rescues that take surrenders; ACC intake last.
- **Help paying** opens with "Go anyway", then funds; the Animal Medical
  Center's own funds are one tile, not the first step.
- **Low-cost dog care**: vaccines from Petco Vetco, VIP Petcare, Sean Casey
  and ACC's events (the card used to say ACC ran "free pop-ups in the Bronx
  and Queens", which the guide does not say). Cats point to the clinics guide.
- **Found kittens** links the kitten nurseries (contacts, step 3, and the list
  at the foot, renamed "Kitten nurseries: newborn kittens and pregnant cats").
- **At-risk guide** is "Save a shelter animal from euthanasia: ACC's New Hope
  list" on the home page; "New Hope partner" on the card links to the listing.
- **Tags corrected** with the new `removeNeeds` override: the New Hope list is
  not "behaviour and training"; the Humane Society of New York and a pet
  reptile rescue are not wildlife rehabbers. Volunteers for Wildlife is in
  Nassau, not Queens (`set.boroughs` now allowed).
- **Feedback is one small line in the shared layout**, on every page:
  report a problem · add a resource · tell us about this page (the form, with
  the page's name).
- Ear-tipped cat: "spayed or neutered and put back where it lives", not "has
  someone who looks after it". Turtle: "Not sure if it is a pet or wild? Send
  NYTTS a photo and ask, before you move it."

### Also changed 2026-11-15 (sixth round)

- **Two guides removed by the owner:** *When a pet dies* ("awful and
  insensitive") and *What you can legally keep in New York City* (reference,
  not help in a crisis; its one urgent point, that a wild animal goes to a
  licensed rehabber, is in the wildlife guide). 26 guides. Old links redirect
  to `/guides/` (`public/_redirects`); the pet-death workbook is deleted. Do
  not bring either back, and the monthly audit is told not to propose them.
- **Every organization a card names links to its listing**
  (`src/data/card-links.ts`, drawn by `GlanceSteps` and `GuideGlance`): the
  guides' own name matching plus `CARD_ALIASES` for short names ("ACC") and
  roles ("City Council member"), and `CARD_URLS` for other guides named in a
  card's words. A card that names an organization which does not link needs
  an alias there; a test checks every alias names a record.
- **Card bottoms carry safety lines, not repeats.** Tips and reminders that
  repeated a step or the red E button are gone; the lilies line is in the
  poison tile, the Bronx tip is gone (the Bronx tile says it).
- (Superseded in the seventh round: the feedback box became one line on every page.)
- **Lost or found a rabbit, bird or reptile** is five situations: lost a pet;
  found a pet bird (saying it is a pet, and sending a hurt wild bird to the
  injured-bird guide); found a tame or white pigeon; found a rabbit; found a
  turtle.
- **Bird and wildlife cards** have "Can't get it there?": Urban Wildlife
  Alliance's helpline email and the NYC Emergency Animal Rescue group.
- **Evals for today's failures**: the Bronx at 11pm must not lead with Urgent
  Vets Bronx; its hours question must mention 10; free cat food in the Bronx.
  The live evals (`--live`) need a Cloudflare API token with Workers AI
  access, which this project does not have yet.

### A guide audit runs every month (since 2026-11-15)

A scheduled task ("Monthly guide audit", owner's claude.ai account) runs on
the 1st of each month at 12:42pm New York time, in the `nyc-animal-rescue`
cloud environment, whose network allows the official sites it checks. It
re-checks the emergency contacts and the at-a-glance cards against the
organizations' own sites, compares AmbuVet's after-hours vet list with the
directory, lists situations no guide covers, and opens a pull request on a
`guide-audit-YYYY-MM` branch with `docs/guide-audit-YYYY-MM.md`. It never
merges: the owner does. The first audit's findings (2026-11-15) are in that
session's report; the open gaps it found are written into the task's prompt.

**Personal contacts are settled; do not reopen them.** People whose consent
is recorded under `cleared` in `data/privacy-holds.json` stay listed as
they are; nobody else's personal details are added, ever. Organizations only.

### Changed 2026-11-15: the redesign is live

Read this first if you were in the middle of something. One commit on `main`
(`6c417d3`) changed how every page looks and rebuilt the home page. No data,
guide content, listing, importer, assistant or scheduled job was touched.

**Before you carry on:** start from the current `main`. Branch
`claude/festive-ramanujan-w3qytx` was level with `main` before this commit and
merges with it cleanly (checked 2026-11-15), so there is nothing to untangle.

What changed, and where:

| File | What |
| --- | --- |
| `src/pages/index.astro` | Rebuilt. The emergency band, then all 24 guides as numbered lines in four tiers, then the phone-number shortcuts, search and the two panels. The headline, skyline and four statistics are gone |
| `src/data/guides.ts` | New: `GUIDE_TIERS`, `LINES_BY_TIER`, `LINE_BY_SLUG`. `GUIDE_GROUPS` is unchanged |
| `src/layouts/Base.astro` | The header is one black row that stays in view: name, links (a menu below 900px), and the red E button on every page except the home page |
| `src/pages/guides/index.astro` | The same numbered lines, each with its summary |
| `src/pages/guides/[slug].astro` | Shows the guide's line number and tier, and draws the page as a route |
| `src/styles/global.css` | New colour tokens at the top; new header, footer, bullets, band, lines and route styles at the bottom |
| `tests/guides-structure.test.ts` | New test: every guide is in exactly one tier, numbered from 1 with no gaps |

**The emergency wording in the band was rewritten by the owner's decision on
2026-11-15** (`src/components/EmergencySigns.astro`), because the reviewer's
single 60-word sentence was too hard to read in a hurry, and a bulleted list
of signs that replaced it was still too much. It is now four short sentences
that lead with what to do; "If another animal bit it or caught it, go now,
even if you can't see a wound" stays in bold. The same component is used on the home
page, the emergency guides and the assistant page, so the three cannot drift.
Do not shorten it to make the page prettier.

Adding a guide now needs one more step: put its slug in a tier in
`GUIDE_TIERS`, or the new test fails. It still needs its `GUIDE_GROUPS` entry,
and (since the at-a-glance change above) its `GLANCE` entry.

Left behind on purpose, safe to remove when someone is tidying:

- `src/components/Skyline.astro` is no longer used by any page. The owner
  was asked whether to bring the skyline back and said not to (2026-11-15).
- These styles in `global.css` have no markup using them any more: `.hero`,
  `.hero__banner`, `.stats`, `.emergency`, `.emergency__actions`, `.tiles`,
  `.tile`, `.situations`, `.situation`. `.hero__actions` is still used by the
  two panels on the home page, so keep that one.
- Branch `lines-redesign` is the preview the owner looked at. It is identical
  to `main` at `6c417d3` and can be deleted.

Not checked, because a script cannot do either: the assistant answering a
real question since the change (the bot check refuses automated browsers),
and the add-a-resource form submitting (a test would publish a listing).
Both pages load. Try each once on a real phone.

What the redesign did **not** fix, all measured on a phone on 2026-11-13 and
still true:

- (Fixed in the fifth round, 2026-11-15: the 132,000px directory, its
  arbitrary first results, and the header wrapping on a phone.)
- The typeface is still Inter. A face made for signage would suit the design
  better, but it is another file to download on a weak connection, and the
  owner has not been asked to approve one.

The other five designs the owner chose between, and the measurements behind
the choice, are not in the repository; the reasons are in *How the site
looks: a sign, not a brochure*, further down.

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

0. **Discovery is finished** (2026-11-05). Every candidate was read, by a
   browser and then by the reviewer; the decisions and reasons are in
   `docs/discovery-review-2026-11-05.md`. Nothing is waiting.

1. **The weekly check of 2026-11-05 flagged 17; all were settled the same
   day** (`docs/discovery-review-2026-11-05.md`, last section). Eleven were
   false: numbers written in letters (1-800-799-SAFE, 914-771-PETS) and the
   three-digit lines 311 and 988, which the checker now reads, plus a fax,
   DEC's head office and ACC's main line. Read the next run's report to see
   that they do not come back.

   Earlier: **the weekly check ran properly on 2026-11-04** (by hand, after the fix
   below) and opened PR #8: 175 listings re-confirmed, 43 flagged. Its branch
   was merged into the 2026-11-04 work rather than merged alone, because it
   would have marked 14 rescues "may no longer be active": two were sites
   whose robots.txt asks robots to stay away (now "blocked", a person checks,
   never a failure), eight really are gone, two are parked. Every flag a
   person must resolve is in `docs/manual-checks-2026-11-04.md`.

   Earlier: **the weekly check had not saved anything since 2026-09-21.** Every run
   from 2026-09-28 to 2026-11-02 tripped its safety valve (over 15% flagged)
   and exited before committing, discarding about a hundred re-confirmations
   a week. On 2026-11-04, 233 of 395 listings were last confirmed 31-90 days
   earlier, 125 within the week, 37 never. Fixed the same day (the valve now
   also needs low re-confirmations; harmless redirects and Facebook pages
   are not flags). **After merging, run "Weekly data check" by hand from the
   Actions tab** and read its report: it is the first run that can save.
   `.github/workflows/site-check.yml` now also drives the live site weekly
   (zip and borough searches, location on/blocked/far/vague); a failure
   emails the owner.

1b. **The weekly check can open its pull request.** The repository setting
   *Allow GitHub Actions to create and approve pull requests* (Settings →
   Actions → General → Workflow permissions) **is on**: the reviewer turned
   it on and sent screenshots. Do not ask about it again. As of 2026-09-22
   the check verifies and flags only; the one reader-visible change it can
   make (a `verify` status after three dead weeks, and lifting it) goes to
   the `weekly-check` branch as a PR, and bookkeeping-only weeks commit to
   `main`. Discovery still pushes straight to `main`, and only adds
   unpublished candidates.

2. **Keep marking discovery candidates by hand.** Decided 2026-09-22:
   discovery finds mostly out-of-city rescues, so nothing it finds is
   published until a person sets `"publish": true` on the candidate in
   `data/discovered.json` (with `boroughs` or `citywide`, and `checkedBy`
   saying what was read). On 2026-11-04 every waiting candidate (219) was
   opened in a browser and 9 more were published, each because its own site
   places it in the city or says it serves the city (`animals` and `needs`
   can now be set on a candidate too, since the name alone rarely says).
   All of them have since been decided (item 0). A future discovery run
   will bring new candidates; the same rule applies.

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
   - *Rung by the reviewer on 2026-11-04* (results in
     `docs/manual-checks-2026-11-04.md`, section 1): CompleteCare and Fifth
     Avenue are daytime vets, not 24-hour; Elmhurst Animal Emergency has
     closed; Urgent Vets Queens is 24/7 on (718) 507-5600; the Humane World
     (877) number is not a tip line; The Pet Fund is now (916) 503-0550.
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
   - *Surrender lines* (corrected the same day): **Bideawee does take
     surrenders**, by online application (one form for dogs, one for cats),
     at its Manhattan Adoption Center, 152 W 24th St; it had no listing at
     all and now does. The first answer here said it had none, from its
     home page alone; the Mayor's Alliance surrender page showed otherwise.
     The ASPCA's own pages give no surrender line and its NYC FAQ sends
     owners to ACC; the "(212) 876-7700 ext. 5" on the Mayor's Alliance page
     is not confirmed by the ASPCA and is not listed.
   - *DEC's general email*: r2info@dec.ny.gov, from DEC's own "Guide to
     DEC" (revised 2023). Added to the Region 2 entry.
   - *NYSAVE yearly cap*: its guidelines set none per household. The
     "~$2,000/yr" in the research had no source and is gone.
   - *Vet-I-Care*: added 2026-11-04 with the phone, email and PO box a
     reviewer read on its contact page (its site still has a self-signed
     certificate, so our checks cannot open it). Medium, labelled as
     reviewer-supplied, tagged as a fund, not an emergency vet.
   - *Still out*: an ASPCA temporary-boarding offer (never confirmed). The
     abuse guide's referrals@aspca.org for ASPCA Community Engagement could
     not be confirmed on the ASPCA's page either; it stays in the guide,
     unlisted. Individual volunteers' personal contacts (Save
     Kitty) stay off.
   - *No 24-hour hospital in the Bronx*: the Mayor's Alliance lists only
     Urgent Vets there (limited hours). Directories that call four Bronx
     clinics "24/7" are auto-generated and give every clinic a duplicate
     "Emergency" row. From the Bronx the nearest 24/7 options are Animal
     Specialty Center (Yonkers) and the Manhattan and Astoria hospitals.

5. **Wildlife rehabilitators: the state register and AHNow, compared
   2026-11-04.** DEC's register (appfactory.dec.ny.gov/SpecialLicensesSearchSystem/rehab)
   is the authority on who is *licensed*; AHNow says it draws its rehabber
   data from the same state lists. Searched for the five boroughs plus Nassau
   and Westchester: 127 licence holders, 73 in the five boroughs, **every one
   an individual** (personal name, phone, email), none under an
   organization's name. AHNow itself hides those names and shows only
   "Wildlife Rehabilitator", the animals and a zip. Rule 3 applies: they are
   not republished here; the guides link the DEC search and AHNow instead,
   and each listed organization can be checked against the register.
   Every *organization or hotline* AHNow names for the five boroughs is
   already listed (Animal General, Island Wildlife, NYTTS, the marine
   stranding lines, DEC Region 2, USDA, US Fish & Wildlife) except two that
   need a phone call first: The Broken Antler (deer search and rescue,
   Calverton, Suffolk, run by two named people) and Staten Island Animal
   Hospital (VCA; AHNow lists it for wildlife, its own pages say dogs and
   cats). Whether to list individual rehabbers who agree to it is the
   reviewer's decision, not made yet.

6. **Links are checked weekly** (`npm run agent:links`, results on
   `/status`): every listing's website and forms and every address in every
   guide. It reports and never edits. Read the report before acting: from a
   cloud session plain `http://` addresses and bare domains such as
   `aspca.org` fail to resolve and 502s come from the proxy, so only HTTP
   answers (404, a parked or taken-over domain) are evidence there. Known
   corrections live in `src/data/url-fixes.ts`, applied to every listing and
   guide at import, each with where the right address was read.

7. **Bond Vet stays one entry, deliberately.** Twenty-one daytime branches,
   whose pages show only today's hours and whose own page description gives
   different ones, would be 21 "hours not confirmed" cards in every emergency
   search. One Love and Bronx Veterinary Center were split by branch on
   2026-11-04 because their hours and addresses could be confirmed.

8. **Two regional records still carry no location, on purpose.** Of the six
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
| robots.txt asks robots not to fetch it (added 2026-11-04) | The site is up; we obey its wish | Same as 401/403: `manual-only`, never a failure. Counting it as down nearly marked Stray from the Heart and NYC Second Chance as closed |

Urban Wildlife Alliance, Petco Love Lost and United Spay Alliance are why: all
three are live and all three show automated browsers a bot check. Under the old
rule they would have been marked "may no longer be active" after three weeks.

**A real browser reads what a plain request cannot** (added 2026-11-04,
`scripts/agent/browser.ts`). A page that answers 401/403/429 or comes back
almost empty gets a second look in headless Chromium, which the workflow
installs for the run. It sends the checker's own user agent, never visits a
page robots.txt excludes, and a bot-check page is still "blocked". Tried on
the 18 sites a reviewer had been opening by hand: 8 now read themselves (the
Thrive hospital pages, Catstoria, AWI, DEC); Lost Cat/Dog, Petco Love Lost,
Vetco, Urban Wildlife Alliance and Korean K9 still refuse an identified
robot, and Stray from the Heart, NYC Second Chance and Halfway Cats ask
robots not to come. Locally, set `AGENT_PLAYWRIGHT_MODULE` to an installed
Playwright's `index.js`; without one the check behaves as before.

**The city's pantry list counts as confirmation.** `listCheckedOn` in
`data/pet-food-pantries.json` is the date every row was last compared with
the city's published PDF; each pantry's `last_verified` follows it, so no one
rings 22 pantries to confirm what the city itself published.

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
- A bird or small mammal caught or bitten by any animal is an emergency even
  with no visible wound. (Worded this way since 2026-11-04, at the reviewer's
  request: the original named the germ in cat saliva and called it deadly,
  which someone could use against cats. The instruction is unchanged; see
  `WILDLIFE_DOC_EDITS`. Never name germs or call an animal dangerous.)
- Most fledglings on the ground should be left alone.
- Never release a domestic animal outdoors.

Paraphrasing risks softening exactly the instruction that matters.

### 5. No prices anywhere a reader can see

Decided by the reviewer 2026-11-04. Prices go stale first, and a fee printed
beside the poison control number can stop someone ringing it.
`src/data/prices.ts` removes them at import from every listing and guide
(income limits are kept: they say who qualifies), and a test fails if one
reappears. Write "free" or "low-cost" if it matters; never a figure.

### 6. Configuration has exactly one home for each kind of thing

Because `wrangler.toml` exists, Cloudflare treats it as the source of truth and
the dashboard only manages encrypted secrets. So:

- **Bindings** (Workers AI) — `wrangler.toml`
- **Public values** (repo slug, Turnstile site key) — `src/data/site.ts`
- **Secrets** (Turnstile secret key, pass signing key) — Cloudflare dashboard

Do not add a build-time public value as a Pages environment variable. It will
appear to work in the dashboard and silently not reach the build.

### 7. It must not be able to cost money

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

**A guide is the know-how the directory cannot give, not a second copy of
it** (reviewer, 2026-11-04). Every guide already ends with every matching
listing, kept current. Where a workbook tab's rows are needed for the
directory but would only repeat that list, hide them from the guide with
`omitSections` in `GUIDE_PAGES`; the rows still become records. Workbook
shorthand (s/n, IG, Bklyn, [Medium], "Verified ... 2026-08-27", "ACC New
Hope partner") is spelt out at import by `src/data/plain-words.ts`; a
reference to a spreadsheet "tab" must be rewritten at the row as a link to
the guide it means. Note that adding a URL to a guide row inside a
`GUIDE_ORG_SOURCES` tab can create a record: check `ls data/orgs` before and
after, and use that tab's `skip`.

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

**A guide names an organization; the page supplies its contacts**
(2026-11-05). `src/data/guide-mentions.ts` links the first mention of each
listed organization in every section and ends the section with a box of
their current phone and website, from the records at build time. Names that
are a borough, or that several listings share ("ASPCA", "Urgent Vets"), are
deliberately not linked. An organization a guide names that has no listing
must carry its web address in the line (tested). The bird guide's section
order is `BIRD_SECTIONS` and the wildlife guide's is `sectionOrder`; a
renamed heading throws.

**Closed is not final, and a guide never names what is not listed**
(reviewer, 2026-11-05). Rescues close, pause, move and reopen. The weekly
check reads every record, closed and moved ones included; when a closed
one's own site is up again with the contacts we hold and no closing wording,
it is flagged for a person to list again (it never changes a status
itself). `DO_NOT_LIST` in `src/data/listing.ts` holds the few taken off for
reasons a website does not undo (Cats of Meow York: its founder's arrest
over neglected cats, reported June 2023); those are never re-checked or
listed. `REMOVED` in `scripts/import/overrides.ts` goes further and takes a group off the site entirely, page and all (MeowSquad, at the reviewer's request, 2026-11-05/06; a test checks its name appears nowhere). And the site build stops, so Cloudflare keeps the last good version,
if any guide still names a group the directory does not list
(`src/data/guide-integrity.ts`): the message gives the guide, the line and
the workbook to change.

**Guides and listings must not disagree.** Guide prose is copied research;
listings are kept current. Five guides (`GUIDE_LISTINGS` in
`src/data/guide-listings.ts`) end with every matching listing, built from the
records at each build, so a new fund or pantry appears there without anyone
editing the guide. A line in a guide that names an organization with an entry
should use that entry's contacts; on 2026-11-04 several did not (numbers not
on the organization's own site), and were corrected at the workbook row. A
guide line carrying a link inside a `GUIDE_ORG_SOURCES` tab becomes a record:
use that tab's `skip` for pointers like "NYC's free pet food pantries".
The directory's search also shows the matching guide above the results
(`src/data/guide-match.ts`), from each guide's `topics`.

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

**Without a location, places in the city come first; with one, the nearest
places come first, wherever they are** (owner, 2026-11-15). Outside places
must never lead a list for someone whose location is unknown: in the
directory (`rank.ts`, the in-browser default sort in `src/client/directory.ts`,
which runs on page load and used to put a Long Island hospital checked that
morning at the top, and the server-rendered order), the assistant
(`retrieve.ts`, a heavy penalty when distance is unknown) and the lists at
the foot of each guide (`guide-listings.ts`). With a location or zip, the
owner wants the nearest open places, so a Yonkers hospital can lead for
someone in the north Bronx at night.

**Emergencies are ordered by driving time, not miles** (owner, 2026-11-15:
"lives depend on this"). Straight-line distance is wrong where a river is in
the way: from Fordham, Astoria is nearest as the crow flies and Yonkers is
four minutes faster by road. `npm run drive-times` (`scripts/geo/drive-times.ts`)
measures minutes by car, no traffic, from the centre of every NYC zip code
(209) to every emergency vet (42) with the free public OSRM route planner,
and writes `data/drive-times.json` (about 31 KB), served as
`/drive-times.json` and copied into the assistant's corpus at import. In an
emergency with a known place, the directory and the assistant look up the
reader's zip (typed, or the zip whose centre is nearest their location,
within two miles) and order by those minutes after open-now; cards show
"about N min by car · X mi". Run it again whenever an emergency vet is added
or moves: `tests/drive-times.test.ts` fails until you do. In a cloud session
it needs `router.project-osrm.org` and `geocoding.geo.census.gov` allowed
and the proxy variables above. Two hospitals on Route 17 in Paramus could
not be geocoded and are measured from their zip's centre.

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
- **A zip shows its whole borough.** Stored zips say where an organization
  *is* (often just its street address), not who it helps, so the directory's
  zip filter shows everything serving that zip's borough plus everything
  citywide, ordered from the zip (`src/data/area.ts`). Reading stored zips as
  a service area once hid BluePearl Brooklyn and about sixty other Brooklyn
  resources from someone typing 11203.
- Workbook rows can carry **Hours** and **Address** columns. Use them: a row
  without hours cannot say it is open, and one without an address cannot be
  sorted by distance.

## How the site looks: a sign, not a brochure

Chosen 2026-11-13 from six candidate designs, after measuring the old home
page on a phone: the emergency box started 830px down, below the whole first
screen; the header took 149px; the search box was on the fifth screen.

The look borrows from city wayfinding, because that is the thing New Yorkers
already read fastest under stress: black bands, heavy type, one colour and one
number per route.

- **The emergency band is the first thing under the header on the home page**,
  at every width, and it is one link from edge to edge. On every other page
  the red E button in the header does the same job, which is why the header is
  one row and stays in view. Nothing may be placed above the band.
- **Every guide is a numbered line**, most urgent first: `GUIDE_TIERS` in
  `src/data/guides.ts`: Emergency, Urgent, Keeping your pet, Rehoming, rescue
  and planning. The titles name the kind of help, never how long someone can
  wait (owner, 2026-11-15: "When you have time" told a person rehoming their
  rabbit that it could wait). The
  tier is a judgement about urgency and is the place to argue about it; a test
  fails if a guide is in no tier or in two, so a new guide cannot be left off
  the home page. `GUIDE_GROUPS` is still there, and now only supplies the
  "just need a phone number?" links.
- **A guide is drawn as a route.** The coloured line down the page and the
  stop at each heading are CSS on the generated Markdown (`.guide-line` in
  `global.css`); nothing in `content/guides/` changed or needs to.
- **Red means "right now" and nothing else.** `--tier-now` and `--sign-red`
  are not decoration. A red badge on something that is not urgent teaches
  people to ignore red.
- **The bands keep their colours in dark mode** (`--sign`, `--sign-text`), the
  way a street sign does at night, so text on them never uses `--text`.

Everything else (the directory, listings, the assistant, the forms) takes the
look from the colour tokens at the top of `global.css` and was not restyled
by hand. The type is still the self-hosted Inter: a face made for signage
would suit it better, but that is another font file on a page someone may be
loading with one bar.

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
