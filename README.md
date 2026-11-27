# Nearby

Find the people you came with, inside a venue — a mela, a mall, a stadium. **Coarse proximity from
anchor check-ins: no GPS, no coordinates, no location history.**

- **Demo:** https://drsamonline.github.io/app-nearby/play/index.html
- **Landing page:** https://drsamonline.github.io/app-nearby/
- **Release:** https://github.com/drsamonline/app-nearby/releases/tag/app-latest
- **Plan row:** #22 of 37 in `drsamonline/forge` → `QUEUE/PLAN.json`
- **Specs absorbed:** `app-beacon` (lead) + 2 absorbed specs
- **Licence:** PolyForm Noncommercial 1.0.0
- **Sponsor:** [github.com/sponsors/drsamonline](https://github.com/sponsors/drsamonline) — free, offline, no account

## Status

| | |
|---|---|
| **Built** | Rooms, members, anchor check-ins that replace the last one; three tiers from a hop count; meet-point pins with a direction and an age; lost-and-found board; quick broadcast; same-device bus. |
| **Release** | Windows EXE, Android APK and Linux binary, built from this source by `app-builder` in CI. |
| **Not built** | **The LAN transport**, and therefore real multi-device presence. Also QR joining. The demo runs the whole room on one device, and says so on the page. |
| **Untested** | Whether the tiers feel right in a real crowd. The hop count is exact; "nearest / same zone / far" is a judgement about a venue, and the venue graph here is a five-anchor example. |

## The spec's "done means", counted

| The spec says | The test |
|---|---|
| two devices in the same room see each other at **nearest** | both checked in at `main-gate` → `tier === "nearest"` |
| a device two rooms away drops to same zone or **far** | one hop → `same zone`; two hops → `far` |
| a meet-point pin appears on the second device **within five seconds** | the bus delivers at the same millisecond, asserted `< 5000` |
| **no exact coordinates anywhere in the room** | no `lat`/`lng`/coordinate/gps/metre/bearing in the serialised room, and a coordinate injected into a member does not survive the round trip |

## The transport gap, stated plainly

The engine takes a bus with `send`/`on`. It ships with a **same-device** bus, so the room, the tiers and
the pins all work on one device and can be tested. A real peer link over the venue's network would be a
runtime network call — which this fleet does not make — so it is **named as absent** on the page, in the
README and in NOTICE.

A demo that showed two phones finding each other by faking it would be a lie about the one thing this
app exists to do.

## Why there is no coordinate in the file

Proximity is `hops(from, to)` over a graph of named anchors, reduced to one of three words. The hop
count is **not shown** to the user; the words are. There is no latitude, longitude, metres, bearing or
radius anywhere, and `clone()` is a **whitelist** of named fields — so even a future version that adds a
coordinate to a member cannot leak it through the store.

## What it will not do

- **Store a coordinate.**
- **Keep a location history** — a check-in replaces the last one.
- **Use GPS or the internet.**
- **Claim a transport it does not have.**

## When things go wrong

| Case | Behaviour |
|---|---|
| **Bad input** | Every refusal names the field: no room name, no member name, an unknown anchor, a pin not at an anchor, an empty broadcast. |
| **No network** | Nothing changes; there is no network code. |
| **Storage full or unavailable** | **NOT SAVED**, and the room on screen is unchanged. |
| **Corrupt saved state** | Reported and offered for export, never replaced with an empty room. |

## Tests

```bash
npm test                      # all three suites
node tests/self-tests.js      # engine — 52 assertions
node tests/ui-tests.js        # the page in jsdom — 25 assertions
node tests/page-smoke.js      # every local src/href resolves, nothing off-origin
```

Mutation-tested six ways on 26/11/2026. Five failed: every distance reading "nearest" (1 failure), a
check-in keeping a history (1), the pin never reaching the second device (crash), a broken room replaced
with an empty one (3), a check-in at a nonexistent anchor accepted (crash). **One survived — the
coordinate leak — and it survived for the right reason:** `clone()` is a whitelist of named fields, so a
`lat`/`lng` added to a member is dropped on the way out. That is defence in depth rather than a missing
test, and there is now an assertion that proves the whitelist is what does the work.

## The bug that appeared for the fourth time

`persist()` then `setStatus("ok", …)` — so a failed write's **NOT SAVED** warning was overwritten by the
cheerful line. Rows #11, #14, #15 and now #22. This time **all seven call sites** were fixed at once, and
the UI test replaces `localStorage` with a throwing stub to prove it.

## Layout

```
docs/index.html            landing page
docs/play/index.html       the app — the room, check-ins, the tiers, pins, the board
docs/play/app.js           DOM wiring: create/join, check-in, pins, board, export, save guard
docs/play/nearby-core.js   the engine — venue graph, tiers, room, pins, board, bus, storage
docs/play/web-kit.js       vendored kit (unmodified)
docs/play/export-kit.js    vendored kit (unmodified)
tests/self-tests.js        engine suite (52)
tests/ui-tests.js          page suite (25, jsdom)
tests/page-smoke.js        shape on disk
PAGES.json                 landing = docs/index.html, app = docs/play/index.html
```

## Where the spec was silent, and what was chosen

- **Proximity is a hop count over named anchors**, not signal strength: Wi-Fi RSSI is not available to a web page, and a check-in at a gate is a thing people will actually do.
- **Three words, and the number is hidden.** "Two hops" is a measurement; "far" is what the person needs.
- **A check-in replaces the last one** — a history is the thing that makes a privacy claim false.
- **Pins show a direction, not a distance**, for the same reason.
- **The bus is injected**, so the LAN transport can be added later without touching the logic — and its absence is stated rather than papered over.

## What is not built, and why

**The LAN transport and QR joining.** A runtime network call is out of scope for this fleet, and a fake
one would misrepresent the app. What ships is the logic that would run over that transport, tested, with
no coordinate in it.
