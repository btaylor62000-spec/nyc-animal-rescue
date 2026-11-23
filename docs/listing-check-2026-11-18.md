# Listing check, 2026-11-18

The owner found Pets of the Homeless listed twice (once "cats", once "dogs")
and Strong Paws listed for dogs only with an out-of-date note. The cause: the
research came as a cat workbook and a dog workbook, and a group in both, or a
service for both, came out as one or the other. Every listing that shared a
website with another, and every listing marked cats only or dogs only for a
kind of help usually given to both (75), was checked. Sites were read in a
browser on 2026-11-18.

## Merged: one group, listed twice

| Kept | Folded in | Evidence |
| --- | --- | --- |
| Feeding Pets of the Homeless (also "Pets of the Homeless") | Pets of the Homeless | petsofthehomeless.org: "Feeding Pets of the Homeless® – Pets of the Homeless®" |
| NYC Health Dept - Low-Cost Spay/Neuter | NYC DOHMH low-cost s/n index | same city page |
| RescueNYC | Rescue NYC | rescuenyc.org |
| Friends of Animals - Spay/Neuter Certificates | Friends of Animals | same programme, same number |
| ECHO East Coast Herding Dog Organization | "Herding breeds" (a heading) | echorescue.com |

## Removed: headings, not groups

"Condition-specific (cats)" (Live Like Roo and The Pet Fund have their own
listings), "Microchip registration" (24Petwatch and HomeAgain do), and
"Invertebrates - routing" (a note carrying Sean Casey's number under other
groups' names). Old links go to the right listing (`public/_redirects`).

## Who each one helps, corrected from its own site

| Listing | Was | Now | Its site says |
| --- | --- | --- | --- |
| Feeding Pets of the Homeless | cats / dogs (two listings) | every animal | "pets that belong to people experiencing homelessness" |
| Strong Paws pet pantry | dogs | cats and dogs | "dog & cat food" |
| NYC Health Dept spay/neuter | cats / dogs | cats and dogs | "for dogs and cats" |
| Friends of Animals certificates | cats | cats and dogs | "cats and dogs" |
| RescueNYC | dogs / cats | cats | only its Community Cat Program and cats |
| AKC Reunite | dogs | every animal | "your pet's microchip" |
| Animal General | cats | cats and dogs | "Animals We See: Dogs, Cats" |
| Banfield | dogs | cats and dogs | cat vaccines, puppy care |
| Brown Dog Foundation | dogs | every animal | "saving the family pet" |
| Island Bird Cat & Dog Vet Group | cats | pet birds, cats, dogs | its name |
| Paws of War | dogs | cats and dogs | "dogs and cats rescued by U.S. troops" |
| Queens Low Cost Vet | cats | cats and dogs | "Dog & Cat spay" |
| Scratchpay | dogs | every animal | "pet care" |
| St. Mina Animal Clinic | cats | cats and dogs | "care for dogs and cats" |
| VIP Petcare | dogs | cats and dogs | "dogs and cats" |
| Animal Lighthouse Rescue | dogs | cats and dogs | "Our Dogs", "Our Cats" |
| ASPCA pet care guides | dogs | every animal | general pet care |
| Free housing legal help | dogs | every animal | tenants' help |
| Office of Animal Welfare (evictions) | dogs | every animal | every pet |
| ACC admissions / surrender | dogs | every animal ACC takes | ACC's surrender page |
| ACC Brooklyn | cats | every animal ACC takes | the city shelter |

Strong Paws' note now says: no monthly deliveries; pantry events two to four
times a year in the Bronx and Westchester; dog and cat food and supplies.

## Checked and right as they were

Cat rescues (Bronx Community Cats, Bronx Tails, BBAWC, Cat Republic, Flatbush
Cats, Gotham City Kitties, Heidi Wrangles Cats, Itty Bitty City Kitties,
KittyKind, Neighborhood Cats, North Brooklyn Cats, NYC Feral Cat Initiative,
SaveKitty, Tavi & Friends, For Animals Inc) and dog rescues (Badass, Foster
Dogs, Hearts & Bones, Mr. Bones, Pound Hounds, Red Hook Dog Rescue, Rescue City,
Rescue Dogs Rock, The Good Life, The Sato Project, ECHO). Flatbush Cats' clinic
sees dogs too; it has its own listing (Flatbush Vet), already cats and dogs.

## Read by the owner, where robots are refused

| Listing | Was | Now | The owner read |
| --- | --- | --- | --- |
| AAHA microchip lookup | dogs | cats and dogs | the lookup is for cats and dogs |
| Animal Clinic of Bay Ridge | dogs | cats and dogs | "Types of Pets Seen: Dogs and Cats" |
| Vetco vaccine clinics | dogs | cats and dogs | "puppy, dog, kitten and cat vaccination clinic" |

Confirmed as they were: Cat Castle, United Spay Alliance's Feline Fix by Five,
Mama Chris, Ocean Hill Cats and The Animal Project (cats); Guardian Angel and
Rebound Hounds (dogs); The Toby Project (its main listing is cats and dogs, its
feral clinic cats). Happy Homes' page says "animals" without saying which;
it stays cats, as its listing describes. Bully Baby Rescue's contact page now
gives an address in Saint Croix, US Virgin Islands: waiting on the owner.

## Could not be read by a robot (before the owner read them)

AAHA microchip lookup and Animal Clinic of Bay Ridge (bot check), Vetco (bot
check), Happy Homes (bot check), Cat Castle and United Spay Alliance (bot
check), Mama Chris (blank), Guardian Angel, Bully Baby, Ocean Hill Cats,
Rebound Hounds, The Toby Project and The Animal Project (would not load from
here). Their names say which animal they help, so they were left as they are.
Seven listings have no website at all (800 Kitties, Boomers Feline Friends,
Brooklyn Lost Cat Finder, Brooklyn Neighborhood Cats, Harman Cat Rescue, The 5
Kittens, The Brooklyn Rescues): all cat groups by name.

## So it cannot come back unnoticed

`tests/no-duplicates.test.ts`: the build fails if two listings share a website
without being named branches or programmes of one group, or if a listing's
name looks like a workbook heading.

## The seven with no website, read by the owner on Instagram and Facebook

All seven help cats, as listed. Updated from what the owner read:
Boomers Feline Friends (group email, Facebook, TNR, Bensonhurst / Dyker
Heights / Bay Ridge), The Brooklyn Rescues (group email, links page), Brooklyn
Lost Cat Finder (links page; how to post), Brooklyn Neighborhood Cats (**not
taking in cats at the moment**), Harman Cat Rescue (TNR, fostering), The 5
Kittens Rescue (links page; TNR), 800 Kitties Rescue (Brooklyn since 2014).
Personal payment handles on those pages (Venmo, Zelle) are not published.

## North Brooklyn Cats' resource list, compared

Every group on https://northbrooklyncats.org/resources/ is listed except five
in Queens, each linked there to an Instagram page only. They are added at Low
confidence, saying we could not read them: Adoptable Kitties Queens NYC, House
of Boop, Intimutt Inc., Sasha's Dream, Ridgewood Rescue. Three have no kind of
help tagged, because nothing we could read says what they do.

The owner then read all five on Instagram (2026-11-18), and each now says
what it does: Adoptable Kitties Queens NYC (adoption), House of Boop (a foster
home with Whiskers-A-GoGo; its form), Intimutt Inc. (rescue, TNR, fostering,
adoption), Sasha's Dream (community cat care), Ridgewood Rescue (TNR,
adoption, education). Medium, read by a person.

## Bully Baby Rescue and The Animal Project

Bully Baby Rescue is based in St Croix, US Virgin Islands. It brings dogs to
New York through a partner, and its spay/neuter clinics are on Native American
reservations. It is now marked outside the city, its spay/neuter and low-cost
vet tags are gone, and the breed guide's line says so. The low-cost dog care
guide no longer sends people to its clinics.

The Animal Project had no phone or email; its Facebook page's (212) 567-5206
and animalprojectnyc@gmail.com are added, with the owner's agreement.

## Pet Rescue added

Pet Rescue (Harrison, NY), Bully Baby Rescue's New York partner, read by the
owner on https://ny-petrescue.org on 2026-11-18: a no-kill cat and dog rescue
since 1982, foster-based, with a kennel at 7 Harrison Ave, Harrison, NY 10528;
(914) 835-3332 for dogs, (914) 835-4133 for cats, nypetrescue@gmail.com.
Listed outside the city, High.

## Weekly check of 2026-11-23: every flag settled

20 flagged (32 the week before). Fixed in the check itself, so they do not
come back: VEG's tracking number (pages are now re-read in a browser before
a flag), The Toby Project (slow but confirmed by people), Urban Utopia
(already listed as paused), and listings whose "website" is a Petfinder,
Adopt-a-Pet, links page or form (House of Boop, New York Meow Sanctuary,
Dalmatian Adoption, Pekingese Rescue Network): those are not the group's own
site and are no longer checked as if they were.

Changed, from each group's own site read in a browser:
- Shiba Rescue of New England: email now admin@shibarescueofnewengland.org.
- Bullmastiff Rescuers: email now bri.socialmedia1@gmail.com (the rescue's).
- PMAR: website now https (the http address could not be read).
- 2000 Spays and Neuters: (917) 371-2751, now on its page, added beside the
  recorded number until someone confirms which is current.
- Save-A-Pet: its spay/neuter clinic is closed until January 2027 (note).

False alarms, settled with the reason in each listing's change log: AAHA (the
notice is about a different registry), FBI tips, DEC Region 2 (Albany head
office number), New York Common Pantry (capacity is about partners), Muddy
Paws (full for surrenders, still adopting), Flatbush Cats (contact page
missing; addresses kept), Mama Chris (owner read its Facebook), MetroMalts
(site lists only coordinators' own contacts, not published), Pit of Our
Souls, Doberman Pinscher Rescue of PA and Get A Bull (sites show nothing to
a robot; nothing suggests they closed).

### Corrections from the owner's reading, 2026-11-23

- Metropolitan Maltese Rescue has closed after 29 years. It is no longer
  listed; American Maltese Association Rescue, which took its dogs, is listed
  instead (website only: its contact page gives coordinators' own addresses,
  which are not published). The old page redirects there.
- Shiba Rescue of New England: one group. Both its website address and the
  Gmail on its Facebook page are listed.
- 2000 Spays and Neuters: its current site is 2000spaysandneuters.weebly.com;
  the (917) number came from its old blogspot page and is removed.
- PMAR: its contact form is linked.
- DEC Region 2: the owner rang and confirmed the number.
- Added from Bullmastiff Rescuers' resources list, each read on its own
  site: The Mosby Foundation, Miranda's People, STARelief, Pet Help Finder;
  the Joshua Lewis Animal Cancer Fund is noted on Frankie's Friends. Already
  listed: CareCredit, RedRover, The Pet Fund, Frankie's Friends, Live Like
  Roo, Pets of the Homeless, Best Friends. Not added: Banfield Foundation
  (grants go to organizations, not to pet owners); the "Pet Lifeline Project"
  link is a news article, not an organization; Friends & Vets Helping Pets
  and Bow Wow Buddies could not be read from here.

### From the Rhode Island Pet Network's list, 2026-11-23

Added: Friends & Vets Helping Pets (contacts from Minnesota's official
resource directory) and Bow Wow Buddies Foundation (from its Facebook page),
both national. Frankie's Friends' Bond's Fund (eye care) and its grants for
rescues are noted on its listing. Not added: the Rhode Island and
Massachusetts clinics, pantries and rescues (not for New York); Shakespeare
Animal Fund (Northern Nevada and North Central Florida only); Magic Bullet
Fund (closed); FVEAP (its domain now belongs to a gambling site, and nothing
on this site links to it); Pet Assistance Inc (its site does not say where it
helps); Onyx and Breezy, Paws 4 a Cure and Voice for the Animals (would not
load or refuse robots).

The weekly check no longer asks a person to open, by hand, a site outside
the city that refuses robots.
