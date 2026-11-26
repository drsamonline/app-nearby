# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates: dd/mm/yyyy.

## [Unreleased]

## [1.0.0] — 26/11/2026

### Added
- **Rooms and members**, with a check-in at a named anchor (gate, hall, food court, stage, exit).
- **Three proximity tiers** — nearest, same zone, far — from a hop count over the venue graph, never a
  distance. A check-in **replaces** the last one, so there is no location history.
- **Meet-point pins** at an anchor, shown to each member as a direction ("you are here", "one anchor
  away", "further away") with the age in seconds — not a distance.
- A **lost-and-found board** and a quick room broadcast.
- A **same-device bus** so the whole room runs on one device, and the LAN transport is named as **not
  built** on the page, in the README and in NOTICE.
- Refusals: a room or member with no name, a check-in at an anchor that does not exist, a pin not at an
  anchor, a lost post with no item, a broadcast with no words.
- An unreadable room is reported and offered for export, never replaced with an empty one.
- A failed save says **NOT SAVED** and leaves the room on screen unchanged.
- PWA shell, CI (52 engine assertions + 25 in jsdom + page smoke), and the app-builder pipeline pinned
  to the canonical SHA for the EXE/APK/Linux release.

### Not built
- **The LAN transport**, and therefore real multi-device presence; also QR joining. The demo runs the
  room on one device.
