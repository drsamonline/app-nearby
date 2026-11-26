#!/usr/bin/env node
/* ui-tests — the Nearby page in a real DOM (jsdom). SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin */
"use strict";
var fs = require("fs"), path = require("path"), { JSDOM } = require("jsdom");
var ROOT = path.join(__dirname, ".."), PLAY = path.join(ROOT, "docs", "play");
var passed = 0, failed = [];
function ok(n, c, d) { if (c) { passed++; return; } failed.push(n + (d ? " — " + d : "")); }
function eq(n, a, b) { ok(n, a === b, "expected " + JSON.stringify(b) + ", got " + JSON.stringify(a)); }
function build(seed) {
  var dom = new JSDOM(fs.readFileSync(path.join(PLAY, "index.html"), "utf8"), { url: "https://example.test/play/index.html", runScripts: "outside-only", pretendToBeVisual: true });
  var w = dom.window;
  if (seed) Object.keys(seed).forEach(function (k) { w.localStorage.setItem(k, seed[k]); });
  w.URL.createObjectURL = function () { return "blob:x"; }; w.URL.revokeObjectURL = function () {};
  w.HTMLAnchorElement.prototype.click = function () {};
  ["web-kit.js", "export-kit.js", "nearby-core.js", "app.js"].forEach(function (f) { w.eval(fs.readFileSync(path.join(PLAY, f), "utf8")); });
  return dom;
}
function setAnchor(sel, id) {
  var s = document.querySelector(sel);
  var opt = Array.prototype.filter.call(s.options, function (o) { return o.value === id; })[0];
  ok("the anchor " + id + " exists in the picker", !!opt);
  s.value = id;
}
var dom = build(null), w = dom.window, d = w.document, $ = function (id) { return d.getElementById(id); };
function setAnchorFor(sel, id) { var s = d.querySelector(sel); s.value = id; }

ok("the engine loaded", !!w.NearbyCore);
ok("the transport gap is stated on the page", /The transport is not built/.test(d.body.textContent));

$("createBtn").click();
ok("a room is created", /created/.test($("status").textContent), $("status").textContent);
$("memberName").value = "Sohil"; $("joinBtn").click();
ok("you join", /joined/.test($("status").textContent), $("status").textContent);
$("memberName").value = "Aaji"; $("addOther").click();
ok("someone else joins", /joined/.test($("status").textContent));
eq("two members are listed", d.querySelectorAll("#memberList li").length, 2);

setAnchorFor("#myAnchor", "main-gate"); $("checkBtn").click();
ok("you check in", /is at the Main gate/.test($("status").textContent), $("status").textContent);
setAnchorFor("#otherAnchor", "main-gate"); $("otherCheck").click();
ok("the other checks in at the same anchor", /is at the Main gate/.test($("status").textContent));
ok("the tier is nearest", /nearest/.test($("proxList").textContent), $("proxList").textContent);
eq("one row in the proximity view", d.querySelectorAll("#proxList li").length, 1);

setAnchorFor("#otherAnchor", "stage"); $("otherCheck").click();
ok("two anchors away is far", /far/.test($("proxList").textContent), $("proxList").textContent);
setAnchorFor("#otherAnchor", "main-hall"); $("otherCheck").click();
ok("one anchor away is same zone", /same zone/.test($("proxList").textContent), $("proxList").textContent);

$("pinLabel").value = "meet at the main gate"; setAnchorFor("#myAnchor", "main-gate"); $("pinBtn").click();
ok("a meet point is dropped", /Pinned/.test($("status").textContent), $("status").textContent);
ok("it is listed with a direction, not a distance", /one anchor away|you are here|further away/.test($("pinList").textContent), $("pinList").textContent);
ok("and with its age in seconds", /\d+s ago/.test($("pinList").textContent));

$("say").value = "I'm at the main gate"; $("sayBtn").click();
ok("a broadcast is said", /Said to the room/.test($("status").textContent));
$("lostItem").value = "blue water bottle"; $("lostBtn").click();
ok("a lost item is posted", /Posted/.test($("status").textContent));
ok("both appear on the board", /blue water bottle/.test($("boardList").textContent) && /main gate/.test($("boardList").textContent));

$("exportBtn").click();
ok("the room exports", /Wrote nearby-room-\d{4}-\d\d-\d\d\.json/.test($("ioNote").textContent), $("ioNote").textContent);
var saved = w.localStorage.getItem("nearby:room");
ok("no coordinates are stored", !/"lat"|"lng"/.test(saved), saved.slice(0, 120));

var dom2 = build({ "nearby:room": saved });
var d2 = dom2.window.document;
eq("the reload keeps both members", d2.querySelectorAll("#memberList li").length, 2);
ok("and the proximity view", /nearest|same zone|far/.test(d2.getElementById("proxList").textContent));

var dom3 = build({ "nearby:room": "{ broken room" });
var d3 = dom3.window.document;
ok("a broken room is reported", /cannot be read/.test(d3.getElementById("status").textContent), d3.getElementById("status").textContent);
ok("and not replaced", /NOT replaced with an empty one/.test(d3.getElementById("status").textContent));

var dom4 = build(null), w4 = dom4.window, d4 = dom4.window.document;
Object.defineProperty(w4, "localStorage", { configurable: true, get: function () {
  return { getItem: function () { return null; }, setItem: function () { var e = new Error("q"); e.name = "QuotaExceededError"; throw e; }, removeItem: function () {}, clear: function () {} }; } });
d4.getElementById("createBtn").click();
ok("a failed save says NOT SAVED", /NOT SAVED:/.test(d4.getElementById("status").textContent), d4.getElementById("status").textContent);

var total = passed + failed.length;
if (!total) { console.error("ui-tests: 0 assertions ran."); process.exit(1); }
if (failed.length) { console.error("ui-tests: " + passed + "/" + total + " passed, " + failed.length + " FAILED"); failed.forEach(function (f) { console.error("  FAIL " + f); }); process.exit(1); }
console.log("ui-tests: " + passed + "/" + total + " assertions passed");
