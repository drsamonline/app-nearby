BUILD PROMPT — Nearby   (plan row #22 of 37)

## Inputs

```
APP:        Nearby
SPEC:       QUEUE/app-beacon.md
REPO:       https://github.com/drsamonline/app-nearby   (empty)
            the plan also matches: nearby, app-beacon, beacon
PLAN_ROW:   #22
MERGED:     beacon, cairn, barter
```

This build absorbs 3 specs into one app. Their must-nots still bind, and all of them are quoted below.

Needs before it can ship: LAN transport (room-kit), hardware access

**Note before starting:** Beacon/Cairn/Barter share pairing and store-and-forward; if the swap marketplace grows a reputation system it becomes its own app.

---

## What you are building

One app, from its spec, into that repo. Nothing else. Not a second app, not a kit unless the
spec needs one, not a refactor of a neighbour.

### The house rules (they are not preferences)

- **Offline-first, always.** No server, no account, no telemetry, no network call at runtime.
  If the app needs a model, it ships in the app or the app says what it cannot do.
- **Single-file where possible.** One `docs/play/index.html` with its kits beside it. The
  build kit (`app-builder`) turns that into a Windows EXE and an Android APK — so the same
  bytes must work as a file:// page, an installed PWA and an APK.
- **The spec's "what it must NOT do" are test assertions, not prose.** Each one becomes a
  named test that fails if the app ever does it.
- **The spec's "what it does when things go wrong" is four cases**, and all four ship:
  bad input, no network, storage full or unavailable, corrupt saved state. An app that
  silently treats "no data" as "no matches" is not done.
- **Nothing is fabricated.** No invented data, no placeholder screenshot presented as a live
  capture, no badge nobody measures, no sample corpus passed off as the real thing. If an
  asset must be supplied by the owner, say so and leave the slot visibly empty.
- **India is the default audience**: ₹, lakh/crore, metric, dd/mm/yyyy, IST, and the local
  examples before the international ones.
- **Licence:** PolyForm Noncommercial 1.0.0 unless the spec says otherwise; SPDX headers on
  every source file; `data/SOURCE.md` recording the source, the licence of the **data**, and
  the fetch date for anything not written by us.

### Step 0 — Preflight (before you claim anything is missing)

1. Read the spec. Read its master-list row. Read its `PLAN.json` row, including `members` —
   a merged build's other specs are in `QUEUE/archive/` and their must-nots still apply.
2. **Rule 0: check the estate first.** Search the org for an app that already does this job.
   If one does, stop and report the collision with the repo name. Building the second version
   of a shipped app is the most expensive mistake available here.
3. Ask which credential you are holding. A `gh` 404 is a wrong credential, never proof of
   absence. Any finding of "impossible" must name the credential it was attempted with.
4. **You cannot create repositories.** If the repo does not exist, that is the owner's step —
   say so and stop. An empty repo that exists is yours to fill.

### Step 1 — Scope it in writing, before code

Produce a short block and keep it for the final report:

- the job, in one sentence;
- the mechanic that makes it not-generic, in one sentence;
- every **must-not**, as a test name;
- the four failure cases, as behaviour;
- the kits it needs (from the spec) and whether each already exists;
- what the app will **not** do in v1, explicitly.

If the app needs a capability no kit has: create the kit first, with its own test, and say so.

### Step 2 — Scaffold, do not hand-roll

`python3 scripts/new-app.py <app-id>` writes the shape:

```
docs/index.html          landing page (what it is, honest status, how to run it)
docs/play/index.html     the app itself
docs/play/*.js           the kits it vendors, next to the page that loads them
tests/self-tests.js      assertions, no framework
PAGES.json               the page manifest
README.md                what it does, how to run, what is not built
```

**Then prove the shape before you fill it:** every `<script src>` in the page must resolve to
a file that exists beside it. A scaffold has shipped here before with the kits in the wrong
folder, and the page 404'd its own runtime while the build stayed green.

If the repo is empty and `scripts/` is not available to you, build the same shape by hand —
the file list above is the contract, not the script.

### Step 3 — Build to the spec

Work the spec top to bottom. Where the spec is silent, choose the smaller behaviour and say
so in the report. Where the spec and the master-list one-liner disagree, **the spec body
wins** and the disagreement goes in the report (five such contradictions are already known).

### Step 4 — Tests that could fail

- `node tests/self-tests.js` — every must-not is an assertion; every failure case is a case.
- Print the count. A suite of 0 assertions is a failure, not a pass.
- **Mutation-test it**: break three things on purpose (remove a guard, make a refused input
  succeed, report a failed save as saved) and confirm the suite goes red each time. Restore.
- If the suite cannot go red, it is documentation, not a test.

### Step 5 — Deliver

- Pages on, demo live at `https://drsamonline.github.io/<repo>/`, and the demo **is** the app
  (no separate build of the page).
- A release with the EXE and APK from `app-builder`, built from the same source.
- Topics set (they are the discovery surface), licence headers, `CHANGELOG.md`, `NOTICE`.
- README states the real status: what works, what does not, what is untested.

### Step 6 — Record it

- Append one line to `PROGRESS.log`: what was built, the test counts, the demo URL, what was
  **not** built and why.
- **Do not edit `QUEUE/PLAN.json`.** `tools/queue-sync.py` flips the row to `built` when the
  repo and its Pages answer. Writing `built` by hand is how a plan starts lying.
- Do not edit `ACTIONS.md` — its build order is generated.

### Step 7 — Report in this shape

```
APP      <name>  (plan row #<order>, <n> specs merged)
REPO     <url>   commit <sha>
DEMO     <url>
TESTS    <n>/<n> assertions, mutation-tested <n> ways
BUILT    <the features that exist>
NOT BUILT <the features the spec asks for that do not, and why>
MUST-NOT <each one, and the test that holds it>
NEEDS    <what only the owner can supply: assets, keys, data, a decision>
NEXT     <the smallest honest next step for this app, or "done">
```

Never write "done" for a feature you did not prove. `unverified` with the reason is a better
line than a green claim.

---

## Definition of done (the owner's, not yours)

> A working app, with a working release, a landing page, and a live demo where the app is a
> web app — and the tests that prove the must-nots, run in CI.

Anything less is `partial`, and the report says which of the three is missing.

---

## When you are blocked

Say which of these it is, in one line, and stop:

- **no spec** → the spec is the next step, not the code;
- **the app already exists** → name the repo and the overlapping features;
- **the repo does not exist** → the owner creates it; you cannot;
- **a capability no kit has** → the kit is the next step;
- **an asset only the owner has** (a photo, a UPI ID, a licensed corpus, a key) → build the
  slot, leave it visibly empty, name what is needed;
- **a credential that cannot see the thing** → name the credential, not a verdict.

---

## The five ways this has gone wrong before

1. **Built the second version of a shipped app** — Rule 0 exists because of it.
2. **Shipped a scaffold whose page could not load its own kits** — prove every `src` resolves.
3. **Claimed a badge or a status nobody measures** — a green shield that lies is worse than none.
4. **Logged "done" from an exit code** — the verdict is the artifact on the branch, not git's
   exit status.
5. **Reported the system blocked on the strength of the wrong credential** — a 404 is a
   credential, not a fact.

---

# THE SPEC — Nearby (`app-beacon`)

# Beacon

- **id:** app-beacon
- **category:** LAN / local-network
- **tier:** —
- **source:** the app master list, #55
- **status:** READY - spec written from the idea's own build prompt

## Pitch

find the people you came with, inside a venue

## The spec

**Prompt:**
Build a LAN app called **Beacon** that helps a group **find each other inside a
venue** — a festival, mela, mall, stadium, or a large campus — using only the local
network, no GPS and no internet.

Implement:
- A group creates a **room**; members join by QR. Each device periodically reports
  its presence and a coarse **relative** position (from shared Wi-Fi signal
  strength or a check-in at fixed "anchor" QR codes placed at entrances/stalls).
- A **proximity view**: shows how near each member is (very close / same zone /
  far) rather than exact coordinates, respecting privacy.
- **Meet-point pings:** drop a pin at a stall/gate; everyone's phone points them to
  it.
- **Lost-and-found board** and a "I'm at the main gate" quick broadcast.

LAN architecture: peer-to-peer over the venue's local network or a hotspot;
presence shared directly, no cloud, no persistent location history.

Novelty: **indoor group-finding without GPS or internet** — coarse, private,
proximity-first, designed for crowded Indian venues where GPS and data both fail.

---

## What it must NOT do

- grow a second job. If a request needs "and", it is two apps.

## What it does when things go wrong

- **Bad input** — a group code that matches nothing returns "no one in range" with the code echoed, so a
  typo is visible. It does not join the nearest group instead.
- **No network** — the LAN is the network: with no peers the app opens and says nobody is in range yet.
  It never shows a stale position as current.
- **Storage full or unavailable** — the app keeps working in memory; group membership is not saved and
  the app says it will have to be re-entered.
- **Corrupt saved state** — an unreadable group file is discarded with a notice, because a beacon with
  no valid group has nothing to preserve; the user is told the group must be re-joined.

## The data

- everything on the device; nothing leaves it unless the user exports it.

## Done means

- Two devices in the same room see each other at the **nearest** proximity tier, and a device taken two rooms away drops to **same zone or far** — with no GPS and the internet disconnected. A meet-point pin dropped at the main gate appears on the second device within **five seconds**. No member's exact coordinates appear anywhere in the room.

---

# SPECS THIS BUILD ABSORBS (2)

## `app-cairn` — Cairn

**Pitch**

trail markers that travel between phones, not servers

**What it must NOT do**

- grow a second job. If a request needs "and", it is two apps.

**What it does when things go wrong**

- **Bad input** — a marker with no position fix is refused; the app says the location is unknown and
  offers to place it manually. It never writes a marker at 0,0.
- **No network** — nothing changes. Markers travel phone to phone and need no server.
- **Storage full or unavailable** — the marker is not written and the app says it was not kept; it is
  not shown on the map as if it had been.
- **Corrupt saved state** — an unreadable marker file is reported and quarantined, never merged, because
  a merged trail would place someone's cairn in the wrong place.

**The spec (the prompt it was written from)**

**Prompt:**
Build an offline app called **Cairn** for leaving and finding **route markers**
that propagate **peer-to-peer** — when two devices are near each other, they
exchange the markers each has collected. No server.

Implement:
- Drop a **cairn**: a waypoint with a note, photo, or hazard warning ("loose
  scree," "water here," "wrong turn").
- When two phones with the app are in range (Wi-Fi Direct / Bluetooth), they
  **gossip** their marker sets — so knowledge spreads by people physically meeting.
- A map view showing every cairn your "swarm" has gathered, with freshness/trust
  signals (how many independent sources, how old).
- Export a trail as a file/QR to hand to a friend before a hike.

Offline architecture: no backend; markers live on-device and replicate via
Bluetooth / Wi-Fi Direct / local hotspot; conflicts resolved by source-count and
recency.

Novelty: a **serverless, epidemic route-knowledge network** — trails get smarter
because hikers carry data between each other, working perfectly with no signal.

Stack: mobile front end + local map tiles (cached) + peer-to-peer transport layer.

Deliverable: a prototype where dropping a cairn on one device transfers to a
second device over a local link and appears on its map.

---

## `app-barter` — Barter

**Pitch**

A local, LAN-based swap marketplace with no accounts.

**The job**

- Trade things with people nearby, without a marketplace account.

**The mechanic**

- It matches OFFLINE: both sides scan each other's code, so a trade is agreed device-to-device with no server in the middle.

**What it must NOT do**

- handle money or hold escrow. It matches what two people want to swap.

**What it does when things go wrong**

- **Bad input** — a listing with no photo, no title or a price that is not a number is refused before it
  is published, with the offending field named. A swap offer against your own listing is refused.
- **No network** — the LAN is the network: with no peers the app opens, shows the last known listings
  marked "as of <time>", and says new offers cannot arrive until a device is in range.
- **Storage full or unavailable** — the listing is not published and the app says so; a completed trade
  that cannot be recorded is shown as unrecorded rather than as done.
- **Corrupt saved state** — an unreadable listing file is quarantined and reported, and the app does not
  publish over it, which would erase a trade the other side has already accepted.

**Kits it will need**

- `web-kit` for the shell, storage and the PWA
- web-kit, crypto-kit

---

## After the build

- Append one line to `PROGRESS.log`. Do **not** edit `QUEUE/PLAN.json` — `tools/queue-sync.py` moves row #22 to `built` when the repo and its Pages answer.
- Report in the shape the brief asks for. Anything you did not prove is `unverified`, not done.
