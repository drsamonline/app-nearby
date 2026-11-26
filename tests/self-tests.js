#!/usr/bin/env node
/* self-tests — Nearby. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * The spec's done-means:
 *   "Two devices in the same room see each other at the NEAREST proximity tier, and a device taken two
 *    rooms away drops to SAME ZONE OR FAR — with no GPS and the internet disconnected. A meet-point pin
 *    dropped at the main gate appears on the second device within FIVE SECONDS. No member's exact
 *    coordinates appear anywhere in the room." */
"use strict";
var fs = require("fs"), path = require("path");
var ROOT = path.join(__dirname, "..");
var N = require(path.join(ROOT, "docs", "play", "nearby-core.js"));
var passed = 0, failed = [], group = "";
function section(n) { group = n; }
function ok(n, c, d) { if (c) { passed++; return; } failed.push(group + " :: " + n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function read(f) { return fs.readFileSync(path.join(ROOT, f), "utf8"); }

function room() {
  var r = N.createRoom({ name: "Mela group" }, 1000).room;
  r = N.join(r, { name: "Sohil" }, 1001).room;
  r = N.join(r, { name: "Aaji" }, 1002).room;
  r = N.checkIn(r, { name: "Sohil", anchor: "main-gate" }, 2000).room;
  return r;
}

section("done means — two devices in the same room see each other at the NEAREST tier");
var r = N.checkIn(room(), { name: "Aaji", anchor: "main-gate" }, 2001).room;
var view = N.proximityView(r, "m1");
eq("the tier is nearest", view.rows[0].tier, "nearest");
eq("and the app says how many are at the same anchor", view.says, "1 of 1 member(s) are at the same anchor as you.");
ok("the tier is one of the three documented words", N.TIERS.indexOf(view.rows[0].tier) >= 0);

section("done means — a device two rooms away drops to same zone or far");
var oneHop = N.checkIn(r, { name: "Aaji", anchor: "main-hall" }, 2002).room;
eq("one anchor away is 'same zone'", N.proximityView(oneHop, "m1").rows[0].tier, "same zone");
var twoHops = N.checkIn(r, { name: "Aaji", anchor: "stage" }, 2003).room;
eq("two anchors away is 'far'", N.proximityView(twoHops, "m1").rows[0].tier, "far");
eq("hops are counted on a graph, not a distance", N.hops("main-gate", "stage"), 2);
eq("the same anchor is zero hops", N.hops("main-gate", "main-gate"), 0);

section("done means — a meet-point pin reaches the second device within five seconds");
var bus = N.makeBus();
var delivered = null, at = 3000;
bus.on(function (m) { if (!delivered) delivered = m; });
var pinned = N.dropPin(r, { label: "Main gate meet", anchor: "main-gate", by: "Sohil" }, at);
eq("the pin is dropped", pinned.ok, true);
bus.send({ type: "pin", pin: pinned.pin, at: at });
ok("it arrives", !!delivered);
ok("within five seconds", delivered && (delivered.at - at) < 5000, delivered && (delivered.at - at));
var seen = N.pinView({ members: r.members, pins: [delivered.pin] }, "m2", at + 2000);
eq("the second device sees it", seen.pins.length, 1);
eq("with its label", seen.pins[0].label, "Main gate meet");
eq("and its age in seconds", seen.pins[0].ageSeconds, 2);
ok("and a direction, not a distance", ["you are here", "one anchor away", "further away"].indexOf(seen.pins[0].direction) >= 0, seen.pins[0].direction);

section("done means — no member's exact coordinates appear anywhere in the room");
var json = JSON.stringify(r);
ok("no latitude or longitude key", !/"lat"|"lng"|latitude|longitude/i.test(json));
ok("no coordinates, gps, metres or bearing", !/coord|gps|metre|meter|bearing|radius/i.test(json));
var codeOnly = read("docs/play/nearby-core.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok("no distance in the engine at all", !/distanceIn|metres|meters|haversine|bearing/i.test(codeOnly));
ok("a check-in replaces the last one, so there is no history", (function () {
  var twice = N.checkIn(N.checkIn(r, { name: "Aaji", anchor: "stage" }, 3000).room, { name: "Aaji", anchor: "food-court" }, 4000).room;
  var aaji = twice.members.filter(function (m) { return m.name === "Aaji"; })[0];
  return aaji.anchor === "food-court" && !aaji.history && Object.keys(aaji).every(function (k) { return k !== "past" && k !== "trail"; });
})());
/* the guard is a whitelist: clone() copies named fields only, so a coordinate cannot ride along even
 * if a future version adds one to a member */
var leaky = JSON.parse(JSON.stringify(r));
leaky.members[0].lat = 19.07; leaky.members[0].lng = 72.87;
var cleaned = N.parseState(N.serialize(leaky)).room;
ok("a coordinate added to a member does not survive the round trip", !/"lat"|"lng"/.test(JSON.stringify(cleaned)));
ok("because the clone is a whitelist of named fields", !("lat" in cleaned.members[0]) && !("lng" in cleaned.members[0]));
ok("the view says it is proximity only", /no coordinates, no GPS and no location history/.test(view.note), view.note);

section("bad input");
eq("a room with no name is refused", N.createRoom({}, 1).field, "name");
eq("a member with no name is refused", N.join(r, {}, 1).field, "name");
eq("a duplicate member name is refused", N.join(r, { name: "Sohil" }, 1).field, "name");
eq("a check-in at an anchor that does not exist is refused", N.checkIn(r, { name: "Sohil", anchor: "moon" }, 1).field, "anchor");
eq("a check-in by a member who is not in the room is refused", N.checkIn(r, { name: "Nobody", anchor: "main-gate" }, 1).field, "member");
eq("a pin not at an anchor is refused", N.dropPin(r, { anchor: "nowhere" }, 1).field, "anchor");
eq("a lost post with no item is refused", N.postLost(r, {}, 1).field, "item");
eq("a broadcast with no words is refused", N.broadcast(r, {}, 1).field, "text");
var unchecked = N.join(N.createRoom({ name: "fresh" }, 1).room, { name: "Nobody" }, 2).room;
eq("a member who has not checked in is refused a view", N.proximityView(unchecked, "m1").ok, false);
ok("and told why", /check in at an anchor first/.test(N.proximityView(unchecked, "m1").reason), N.proximityView(unchecked, "m1").reason);

section("the board and the broadcast");
var board = N.postLost(r, { item: "blue water bottle", where: "near the food court", by: "Aaji" }, 5000);
eq("a lost post is kept", board.room.board.length, 1);
var bc = N.broadcast(board.room, { text: "I'm at the main gate", by: "Sohil" }, 5001);
eq("a broadcast is kept", bc.room.messages.length, 1);
eq("with the time it was said", bc.message.clock.length, 5);

section("must-not — no network, and the transport gap is named");
var core = read("docs/play/nearby-core.js");
var codeOnly2 = (core + read("docs/play/app.js")).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok("no fetch, XHR, WebSocket or beacon", !/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource/.test(codeOnly2));
ok("the engine says the LAN transport is not built", /TRANSPORT IS NOT BUILT/.test(core));
ok("the page forbids connections", /connect-src 'none'/.test(read("docs/play/index.html")));
eq("the demo bus is a same-device bus", N.makeBus().kind, "same-device");

section("storage");
var bad = N.parseState("{ broken room");
eq("a broken room is reported", bad.ok, false);
eq("it is marked unreadable", bad.unreadable, true);
ok("it was not replaced", /NOT replaced with an empty one/.test(bad.reason), bad.reason);
eq("nothing saved yet is distinguished", N.parseState("").empty, true);
var round = N.parseState(N.serialize(r));
eq("a room round-trips", round.room.members.length, 2);
var thrown = N.exportFile("room", { room: r }, { when: "26/11/2026" }, function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; });
eq("a failed write is reported", thrown.ok, false);
ok("it says the file was not written", /not written/.test(thrown.reason));

section("shape — every script the page loads exists beside it");
var page = read("docs/play/index.html");
var srcs = (page.match(/<script[^>]+src="([^"]+)"/g) || []).map(function (t) { return t.replace(/.*src="([^"]+)"/, "$1"); });
srcs.forEach(function (s) { ok("script src resolves: " + s, fs.existsSync(path.join(ROOT, "docs", "play", s.replace(/^\.\//, "")))); });
ok("the landing page exists", fs.existsSync(path.join(ROOT, "docs", "index.html")));
ok("the page manifest exists", fs.existsSync(path.join(ROOT, "PAGES.json")));
ok("the web manifest exists", fs.existsSync(path.join(ROOT, "docs", "play", "manifest.webmanifest")));

var total = passed + failed.length;
if (!total) { console.error("self-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("self-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.slice(0, 12).forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("self-tests: " + passed + "/" + total + " assertions passed");
