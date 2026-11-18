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

## Could not be read by a robot; a person should look

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
