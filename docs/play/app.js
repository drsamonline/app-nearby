/* app — the Nearby page. SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0 · (c) 2026 Dr Sohil Momin
 * Wiring only: the tiers, the pins and the room live in nearby-core.js. The LAN transport is NOT built;
 * this page runs the whole room on one device so the logic can be seen and tested. */
(function () {
  "use strict";
  var N = window.NearbyCore;
  var $ = function (id) { return document.getElementById(id); };
  var K = "nearby:room";
  var state = { room: null, meId: "m1", otherId: "m2", unreadable: null, bus: N.makeBus() };

  var els = {
    status: $("status"), roomName: $("roomName"), createBtn: $("createBtn"), memberName: $("memberName"),
    joinBtn: $("joinBtn"), addOther: $("addOther"), memberList: $("memberList"),
    myAnchor: $("myAnchor"), checkBtn: $("checkBtn"), checkNote: $("checkNote"), otherAnchor: $("otherAnchor"), otherCheck: $("otherCheck"),
    proxSays: $("proxSays"), proxList: $("proxList"),
    pinLabel: $("pinLabel"), pinBtn: $("pinBtn"), pinList: $("pinList"),
    say: $("say"), sayBtn: $("sayBtn"), lostItem: $("lostItem"), lostBtn: $("lostBtn"), boardList: $("boardList"),
    exportBtn: $("exportBtn"), ioNote: $("ioNote")
  };

  function today() { var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; }; return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function setStatus(k, m) { els.status.className = "status show " + k; els.status.textContent = m; }
  function node(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }

  function persist() {
    if (!state.room) return true;
    try { window.localStorage.setItem(K, N.serialize(state.room)); return true; }
    catch (e) { setStatus("bad", "NOT SAVED: " + (e && e.name === "QuotaExceededError" ? "storage is full" : "storage is unavailable") + ". The room on this device is unchanged."); return false; }
  }

  function fillAnchors() {
    [els.myAnchor, els.otherAnchor].forEach(function (sel) {
      if (sel.options.length) return;
      N.VENUE.anchors.forEach(function (a) {
        var o = document.createElement("option"); o.value = a.id; o.textContent = a.label; sel.appendChild(o);
      });
    });
  }

  function render() {
    var r = state.room;
    els.memberList.textContent = "";
    if (!r) { els.memberList.appendChild(node("li", null, "No room yet. Create one.")); }
    else r.members.forEach(function (m) {
      var li = node("li", null, m.name + (m.anchorLabel ? "  \u2014  " + m.anchorLabel : "  \u2014  not checked in"));
      li.appendChild(node("span", "meta", m.id === state.meId ? "you" : "in the room"));
      els.memberList.appendChild(li);
    });

    var v = r ? N.proximityView(r, state.meId) : { ok: false, reason: "no room yet" };
    els.proxSays.textContent = v.ok ? v.says + "  " + v.note : (v.reason || "no room yet");
    els.proxList.textContent = "";
    (v.rows || []).forEach(function (row) {
      var cls = row.tier === "nearest" ? "nearest" : (row.tier === "same zone" ? "zone" : "far");
      var li = node("li", cls, row.name + "  \u2014  " + row.tier);
      li.appendChild(node("span", "meta", row.where + (row.seen ? " \u00b7 seen " + row.seen : "")));
      els.proxList.appendChild(li);
    });

    var pv = r ? N.pinView(r, state.meId, Date.now()) : { pins: [], says: "no room yet" };
    els.pinList.textContent = "";
    if (!pv.pins.length) els.pinList.appendChild(node("li", null, pv.says));
    pv.pins.forEach(function (p) {
      var li = node("li", null, p.label + "  \u2014  " + p.where);
      li.appendChild(node("span", "meta", p.direction + " \u00b7 " + p.clock + " \u00b7 " + p.ageSeconds + "s ago"));
      els.pinList.appendChild(li);
    });

    els.boardList.textContent = "";
    if (!r || (!r.board.length && !r.messages.length)) els.boardList.appendChild(node("li", null, "Nothing said yet."));
    if (r) {
      r.messages.slice().reverse().forEach(function (m) {
        var li = node("li", null, m.text);
        li.appendChild(node("span", "meta", (m.by || "someone") + " \u00b7 " + m.clock));
        els.boardList.appendChild(li);
      });
      r.board.slice().reverse().forEach(function (b) {
        var li = node("li", null, "Lost: " + b.item + (b.where ? " \u2014 " + b.where : ""));
        li.appendChild(node("span", "meta", (b.by || "someone") + " \u00b7 " + b.clock));
        els.boardList.appendChild(li);
      });
    }
  }

  function create() {
    var out = N.createRoom({ name: els.roomName.value }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.room = out.room;
    var saved = persist(); render();
    if (saved) setStatus("ok", out.says);
  }

  function join() {
    if (!state.room) { setStatus("bad", "Create the room first."); return; }
    var out = N.join(state.room, { name: els.memberName.value }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.room = out.room;
    state.meId = out.member.id;
    var savedJoin = persist(); render();
    if (savedJoin) setStatus("ok", out.says);
  }

  function addOther() {
    if (!state.room) { setStatus("bad", "Create the room first."); return; }
    var out = N.join(state.room, { name: els.memberName.value || "Someone else" }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.room = out.room;
    state.otherId = out.member.id;
    var savedOther = persist(); render();
    if (savedOther) setStatus("ok", out.says);
  }

  function checkIn(which) {
    if (!state.room) { setStatus("bad", "Create the room first."); return; }
    var id = which === "me" ? state.meId : state.otherId;
    var anchor = which === "me" ? els.myAnchor.value : els.otherAnchor.value;
    var out = N.checkIn(state.room, { memberId: id, anchor: anchor }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.room = out.room;
    var savedCheck = persist(); render();
    els.checkNote.textContent = out.says;
    if (savedCheck) setStatus("ok", out.says);
  }

  function dropPin() {
    if (!state.room) { setStatus("bad", "Create the room first."); return; }
    var out = N.dropPin(state.room, { label: els.pinLabel.value, anchor: els.myAnchor.value, by: "you" }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.room = out.room;
    /* the same-device bus: on a LAN this is what would carry the pin to the other phone */
    state.bus.send({ type: "pin", pin: out.pin, at: Date.now() });
    var savedPin = persist(); render();
    if (savedPin) setStatus("ok", out.says);
  }

  function say() {
    if (!state.room) { setStatus("bad", "Create the room first."); return; }
    var out = N.broadcast(state.room, { text: els.say.value, by: "you" }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.room = out.room;
    var savedSay = persist(); render();
    if (savedSay) setStatus("ok", out.says);
  }

  function lost() {
    if (!state.room) { setStatus("bad", "Create the room first."); return; }
    var out = N.postLost(state.room, { item: els.lostItem.value, where: "", by: "you" }, Date.now());
    if (!out.ok) { setStatus("bad", out.reason); return; }
    state.room = out.room;
    var savedLost = persist(); render();
    if (savedLost) setStatus("ok", out.says);
  }

  function doExport() {
    if (!state.room) { setStatus("bad", "There is no room to export."); return; }
    var out = N.exportFile("room", { room: state.room }, { when: today() }, function (name, text, mime) {
      if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
      window.Export.save(name, text, mime); return true;
    });
    if (out.ok) { els.ioNote.textContent = "Wrote " + out.filename + "."; setStatus("ok", "Exported."); }
    else setStatus("bad", out.reason + ".");
  }

  els.createBtn.addEventListener("click", create);
  els.joinBtn.addEventListener("click", join);
  els.addOther.addEventListener("click", addOther);
  els.checkBtn.addEventListener("click", function () { checkIn("me"); });
  els.otherCheck.addEventListener("click", function () { checkIn("other"); });
  els.pinBtn.addEventListener("click", dropPin);
  els.sayBtn.addEventListener("click", say);
  els.lostBtn.addEventListener("click", lost);
  els.exportBtn.addEventListener("click", doExport);

  fillAnchors();

  var raw = null;
  try { raw = window.localStorage.getItem(K); } catch (e) { raw = null; }
  if (raw) {
    var parsed = N.parseState(raw);
    if (parsed.ok) {
      state.room = parsed.room;
      state.meId = (parsed.room.members[0] || { id: "m1" }).id;
      state.otherId = (parsed.room.members[1] || { id: "m2" }).id;
    } else {
      state.unreadable = parsed;
      setStatus("bad", parsed.reason);
      var keep = node("button", "small", "Export the unreadable room");
      keep.addEventListener("click", function () {
        var out = N.exportFile("raw", parsed, { when: today() }, function (name, text, mime) {
          if (!window.Export || typeof window.Export.save !== "function") throw new Error("the export kit did not load");
          window.Export.save(name, text, mime); return true;
        });
        setStatus(out.ok ? "ok" : "bad", out.ok ? "Wrote " + out.filename + "." : out.reason);
      });
      els.ioNote.parentNode.insertBefore(keep, els.ioNote);
    }
  }

  render();
  if (window.Loom && window.Loom.pwa) window.Loom.pwa.register("sw.js");
})();
