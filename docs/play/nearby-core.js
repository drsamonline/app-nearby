/* nearby-core — the engine behind Nearby.
 * SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
 * (c) 2026 Dr Sohil Momin
 *
 * ONE JOB: find the people you came with, inside a venue, without GPS and without the internet.
 *
 * Proximity is COARSE ON PURPOSE. A member is at one of three tiers — nearest / same zone / far —
 * worked out from which fixed anchor they last checked in at (a gate, a stall, a hall), and how many
 * hops apart two anchors are. There is no coordinate in this file, no latitude, no longitude, no
 * distance in metres, and no location history: a check-in replaces the previous one.
 *
 * THE TRANSPORT IS NOT BUILT. This engine takes a `bus` object with send/on, and ships with a
 * same-device bus so the app runs and can be tested. A real LAN transport (WebSocket to a peer on the
 * venue network) is named in the README as absent, because this fleet does not make runtime network
 * calls and a demo that pretended to would be a lie about the one thing this app exists to do.
 *
 * Pure functions plus one small stateful bus: no DOM, no network, no storage.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.NearbyCore = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VERSION = "1.0.0";
  var TIERS = ["nearest", "same zone", "far"];

  /* The venue map: anchors and how many hops apart they are. No coordinates — a graph, not a map. */
  var VENUE = {
    name: "the venue",
    anchors: [
      { id: "main-gate", label: "Main gate", next: ["main-hall"] },
      { id: "main-hall", label: "Main hall", next: ["main-gate", "food-court", "stage"] },
      { id: "food-court", label: "Food court", next: ["main-hall"] },
      { id: "stage", label: "Stage", next: ["main-hall", "north-exit"] },
      { id: "north-exit", label: "North exit", next: ["stage"] }
    ]
  };

  function clean(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hhmm(ms) { var d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function stamp(when) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(when || "")); return m ? m[3] + "-" + m[2] + "-" + m[1] : "undated"; }

  function anchorById(id) { return VENUE.anchors.filter(function (a) { return a.id === id; })[0] || null; }

  /* Hops between two anchors, by breadth-first search over the graph. Never a distance. */
  function hops(fromId, toId) {
    if (!anchorById(fromId) || !anchorById(toId)) return Infinity;
    if (fromId === toId) return 0;
    var seen = {}, queue = [[fromId, 0]];
    seen[fromId] = true;
    while (queue.length) {
      var cur = queue.shift(), node = anchorById(cur[0]);
      for (var i = 0; i < node.next.length; i++) {
        var nx = node.next[i];
        if (nx === toId) return cur[1] + 1;
        if (!seen[nx]) { seen[nx] = true; queue.push([nx, cur[1] + 1]); }
      }
    }
    return Infinity;
  }

  /* The whole privacy story is this function: hops become a tier, and the number is thrown away. */
  function tier(fromAnchorId, toAnchorId) {
    var h = hops(fromAnchorId, toAnchorId);
    if (h === 0) return TIERS[0];
    if (h === 1) return TIERS[1];
    return TIERS[2];
  }

  /* ---------------------------------------------------------------- the room */

  function createRoom(input, now) {
    var name = clean(input && input.name);
    if (!name) return { ok: false, field: "name", reason: "a room with no name is refused" };
    var at = now || Date.now();
    return {
      ok: true,
      room: { id: "room-" + at, name: name, createdAt: at, members: [], pins: [], board: [], messages: [] },
      says: "Room \u201c" + name + "\u201d created. Others join with its code."
    };
  }

  function join(room, input, now) {
    var name = clean(input && input.name);
    if (!name) return { ok: false, field: "name", reason: "a member with no name is refused" };
    var at = now || Date.now();
    var r = clone(room);
    if (r.members.some(function (m) { return m.name.toLowerCase() === name.toLowerCase(); })) {
      return { ok: false, field: "name", reason: "there is already a member called \u201c" + name + "\u201d in this room" };
    }
    var m = { id: "m" + (r.members.length + 1), name: name, anchor: "", at: at, seenAt: at };
    r.members.push(m);
    return { ok: true, room: r, member: m, says: name + " joined." };
  }

  /* A check-in REPLACES the last one: there is no location history to leak. */
  function checkIn(room, input, now) {
    var r = clone(room);
    var m = r.members.filter(function (x) { return x.id === (input && input.memberId) || x.name === clean(input && input.name); })[0];
    if (!m) return { ok: false, field: "member", reason: "there is no such member in this room" };
    var a = anchorById(clean(input && input.anchor));
    if (!a) return { ok: false, field: "anchor", reason: "there is no anchor called \u201c" + clean(input && input.anchor) + "\u201d at " + VENUE.name };
    var at = now || Date.now();
    m.anchor = a.id;
    m.anchorLabel = a.label;
    m.at = at;
    m.seenAt = at;
    return { ok: true, room: r, member: m, says: m.name + " is at the " + a.label + "." };
  }

  /* The proximity view: a tier per member, and nothing else. */
  function proximityView(room, meId) {
    var me = (room.members || []).filter(function (m) { return m.id === meId; })[0];
    if (!me) return { ok: false, reason: "there is no such member in this room" };
    if (!me.anchor) return { ok: false, reason: "check in at an anchor first, so the room knows roughly where you are" };
    var rows = (room.members || []).filter(function (m) { return m.id !== meId; }).map(function (m) {
      return {
        id: m.id, name: m.name,
        tier: m.anchor ? tier(me.anchor, m.anchor) : "unknown",
        where: m.anchorLabel || "not checked in",
        seen: m.seenAt ? hhmm(m.seenAt) : ""
      };
    });
    var order = {}; TIERS.forEach(function (t, i) { order[t] = i; }); order.unknown = 9;
    rows.sort(function (a, b) { return order[a.tier] - order[b.tier] || a.name.localeCompare(b.name); });
    var near = rows.filter(function (r) { return r.tier === "nearest"; }).length;
    return {
      ok: true, rows: rows, me: { name: me.name, where: me.anchorLabel },
      nearest: near,
      says: near ? near + " of " + rows.length + " member(s) are at the same anchor as you." : "Nobody else is at your anchor right now.",
      note: "Proximity only. This app has no coordinates, no GPS and no location history."
    };
  }

  /* --------------------------------------------------------------- meet points */

  function dropPin(room, input, now) {
    var r = clone(room);
    var a = anchorById(clean(input && input.anchor));
    if (!a) return { ok: false, field: "anchor", reason: "a pin has to be at an anchor that exists" };
    var label = clean(input && input.label) || a.label;
    var at = now || Date.now();
    var pin = { id: "p" + (r.pins.length + 1), label: label, anchor: a.id, anchorLabel: a.label, by: clean(input && input.by), at: at, clock: hhmm(at) };
    r.pins.push(pin);
    return { ok: true, room: r, pin: pin, says: "Pinned \u201c" + label + "\u201d at the " + a.label + " for everyone in the room." };
  }

  function pinView(room, meId, now) {
    var me = (room.members || []).filter(function (m) { return m.id === meId; })[0];
    var at = now || Date.now();
    return {
      pins: (room.pins || []).slice().reverse().map(function (p) {
        return {
          id: p.id, label: p.label, where: p.anchorLabel, clock: p.clock, by: p.by,
          direction: me && me.anchor ? (hops(me.anchor, p.anchor) === 0 ? "you are here" : (hops(me.anchor, p.anchor) === 1 ? "one anchor away" : "further away")) : "check in to see",
          ageSeconds: Math.max(0, Math.round((at - p.at) / 1000))
        };
      }),
      says: (room.pins || []).length ? (room.pins.length + " meet point(s) in the room.") : "No meet point dropped yet."
    };
  }

  /* ------------------------------------------------------------- board + broadcast */

  function postLost(room, input, now) {
    var item = clean(input && input.item);
    if (!item) return { ok: false, field: "item", reason: "a lost-and-found post with no item is refused" };
    var r = clone(room);
    var at = now || Date.now();
    var post = { id: "b" + (r.board.length + 1), item: item, where: clean(input && input.where), by: clean(input && input.by), at: at, clock: hhmm(at) };
    r.board.push(post);
    return { ok: true, room: r, post: post, says: "Posted: " + item + (post.where ? " \u2014 " + post.where : "") + "." };
  }

  function broadcast(room, input, now) {
    var text = clean(input && input.text);
    if (!text) return { ok: false, field: "text", reason: "a broadcast with no words is refused" };
    var r = clone(room);
    var at = now || Date.now();
    var msg = { id: "x" + (r.messages.length + 1), text: text, by: clean(input && input.by), at: at, clock: hhmm(at) };
    r.messages.push(msg);
    return { ok: true, room: r, message: msg, says: "Said to the room at " + msg.clock + "." };
  }

  /* --------------------------------------------------------------- the bus */

  /* A same-device bus: send/on, no network. The LAN transport is NOT built (see README). */
  function makeBus() {
    var handlers = [];
    var log = [];
    return {
      kind: "same-device",
      send: function (msg) {
        var m = { payload: msg, at: (msg && msg.at) || Date.now() };
        log.push(m);
        handlers.forEach(function (h) { h(m.payload); });
        return m;
      },
      on: function (h) { handlers.push(h); return function () { handlers = handlers.filter(function (x) { return x !== h; }); }; },
      log: function () { return log.slice(); }
    };
  }

  function clone(room) {
    var r = room || { members: [], pins: [], board: [], messages: [] };
    return {
      id: r.id, name: r.name, createdAt: r.createdAt,
      members: (r.members || []).map(function (m) { return { id: m.id, name: m.name, anchor: m.anchor || "", anchorLabel: m.anchorLabel || "", at: m.at || 0, seenAt: m.seenAt || 0 }; }),
      pins: (r.pins || []).map(function (p) { return { id: p.id, label: p.label, anchor: p.anchor, anchorLabel: p.anchorLabel, by: p.by, at: p.at, clock: p.clock }; }),
      board: (r.board || []).map(function (b) { return { id: b.id, item: b.item, where: b.where, by: b.by, at: b.at, clock: b.clock }; }),
      messages: (r.messages || []).map(function (x) { return { id: x.id, text: x.text, by: x.by, at: x.at, clock: x.clock }; })
    };
  }

  function serialize(room) { return JSON.stringify({ version: VERSION, format: "nearby-room-1", room: clone(room) }, null, 2); }

  function parseState(text) {
    var raw = String(text == null ? "" : text);
    if (!raw.trim()) return { ok: false, empty: true, reason: "there is no room on this device yet", raw: raw };
    var data;
    try { data = JSON.parse(raw); }
    catch (e) { return { ok: false, unreadable: true, reason: "The saved room cannot be read. It was NOT replaced with an empty one; export it to keep it.", raw: raw }; }
    if (!data || !data.room || !Array.isArray(data.room.members)) {
      return { ok: false, unreadable: true, reason: "The saved file holds no room. Nothing was started over it; export it to keep it.", raw: raw };
    }
    return { ok: true, room: clone(data.room), raw: raw };
  }

  function exportFile(what, payload, meta, writer) {
    meta = meta || {};
    if (typeof writer !== "function") return { ok: false, reason: "the file was not written: no writer is available in this browser" };
    var name, body, mime = "application/json";
    if (what === "room") { name = "nearby-room-" + stamp(meta.when) + ".json"; body = serialize(payload.room); }
    else if (what === "raw") { name = "nearby-unreadable-" + stamp(meta.when) + ".txt"; body = String(payload.raw || ""); mime = "text/plain;charset=utf-8"; }
    else return { ok: false, reason: "nothing was written: unknown export \u201c" + what + "\u201d" };
    try {
      var wrote = writer(name, body, mime);
      if (wrote === false) return { ok: false, filename: name, reason: "the file was not written: the browser refused the save" };
      return { ok: true, filename: name, bytes: body.length };
    } catch (e) {
      var why = e && e.name === "QuotaExceededError" ? "storage is full" : (e && e.message ? e.message : "storage is unavailable");
      return { ok: false, filename: name, reason: "the file was not written: " + why };
    }
  }

  return {
    version: VERSION, TIERS: TIERS, VENUE: VENUE,
    anchorById: anchorById, hops: hops, tier: tier,
    createRoom: createRoom, join: join, checkIn: checkIn, proximityView: proximityView,
    dropPin: dropPin, pinView: pinView, postLost: postLost, broadcast: broadcast,
    makeBus: makeBus, serialize: serialize, parseState: parseState, exportFile: exportFile
  };
});
