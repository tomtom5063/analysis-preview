// proto.js — 首頁（E 版焦點賽事）與原型 A～E 的互動（2026-11-22）。篩選、過關單、名詞解釋照樣由 hub.js 處理，這支只多做：
//   1. 找比賽：下拉選單「球種 → 聯盟 → 隊伍」＋查隊名／賽事編號，篩下面「全部賽事」（選了聯盟、隊伍或打字時四天一起篩，不用先切日期）
//   2. 焦點賽事：先顯示還沒開打裡最早的一場、‹ › 切換、路單／近 10 場切換
//   3. 報價表整列可以點
(function () {
  var q = document.getElementById("pq"), n = document.getElementById("pqn"), box = document.querySelector(".pgames");
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var pick = { lg: "", tm: "" };   // 下拉選單選到的聯盟、隊伍（球種交給 hub.js 的球種按鈕）

  function run() {
    if (!box) return;
    var v = q ? q.value.trim().toLowerCase() : "", active = !!(v || pick.lg || pick.tm);
    box.classList.toggle("searching", active);
    var hit = 0;
    qa(".grow", box).forEach(function (r) {
      var ok = (!v || (r.getAttribute("data-q") || "").toLowerCase().indexOf(v) >= 0) &&
        (!pick.lg || r.getAttribute("data-lg") === pick.lg) &&
        (!pick.tm || (r.getAttribute("data-tm") || "").split("|").indexOf(pick.tm) >= 0);
      r.classList.toggle("q-out", !ok);
      if (ok && !r.hidden) hit++;
    });
    qa(".lg-block, details.more", box).forEach(function (b) {
      var any = b.querySelector(".grow:not([hidden]):not(.q-out)");
      b.classList.toggle("q-out", active && !any);
      if (active && any && b.tagName === "DETAILS") b.open = true;
    });
    qa(".day", box).forEach(function (d) { d.classList.toggle("q-out", active && !d.querySelector(".grow:not([hidden]):not(.q-out)")); });
    if (n) { n.hidden = !active; n.textContent = hit ? "找到 " + hit + " 場，往下看 ↓" : "這四天沒有符合的場次"; }
    teamCard(hit);
  }
  if (q) {
    q.addEventListener("input", run);
    q.addEventListener("keydown", function (e) { if (e.key === "Enter" && box) { e.preventDefault(); box.scrollIntoView({ behavior: "smooth" }); } });
  }

  // ── 焦點賽事 ──
  var fx = qa(".fx[data-start]"), fxn = document.getElementById("fxn"), fxi = 0;
  function roadsEnd(root) { qa(".fx-road", root).forEach(function (r) { r.scrollLeft = 0; }); }   // 路單停在最新那一邊（11/22 起最新在左）
  function fxShow(i) {
    if (!fx.length) return;
    fxi = (i + fx.length) % fx.length;
    fx.forEach(function (s, j) { s.hidden = j !== fxi; });
    qa(".fxr[data-fxi]").forEach(function (r) { r.hidden = Number(r.getAttribute("data-fxi")) !== fxi; });   // 右邊的走勢圖跟著換
    if (fxn) fxn.textContent = (fxi + 1) + " / " + fx.length;
    roadsEnd(fx[fxi]);
  }
  // 右邊「能單場買的」：點 NBA 焦點場次 → 左邊換成那一場；「全部 N 場」→ 下面賽事表按下「可單場」
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-fxgo]");
    if (a && fx.length) { e.preventDefault(); fxShow(Number(a.getAttribute("data-fxgo"))); var l = document.querySelector(".fx-l"); if (l) l.scrollIntoView({ behavior: "smooth" }); return; }
    var s = e.target.closest && e.target.closest("[data-showsingle]");
    if (s) { var f = document.querySelector('[data-flag="single"]'); if (f && f.getAttribute("aria-pressed") !== "true") f.click(); }
  });
  // 盤路畫法一鍵切換（路單／近 10 場），記在這台裝置（存不了就只在這頁有效）
  var fxl = document.querySelector(".fx-l"), VKEY = "hfa_fx_view";
  function setView(v) {
    if (!fxl) return;
    fxl.classList.toggle("road-view", v === "road");
    qa("[data-fxview]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-fxview") === v ? "true" : "false"); });
    if (v === "road") roadsEnd(fxl);
    try { localStorage.setItem(VKEY, v); } catch (e) { /* 無痕模式存不了 */ }
  }
  qa("[data-fxview]").forEach(function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-fxview")); }); });
  try { if (localStorage.getItem(VKEY) === "bead") setView("bead"); } catch (e) { /* 沒存就用預設的路單 */ }
  if (fx.length) {
    var now = Date.now(), first = -1;
    fx.forEach(function (s, j) { var t = Date.parse(s.getAttribute("data-start")); if (first < 0 && !(t <= now)) first = j; });
    fxShow(first < 0 ? fx.length - 1 : first);
    qa("[data-fx]").forEach(function (b) { b.addEventListener("click", function () { fxShow(fxi + Number(b.getAttribute("data-fx"))); }); });
    qa(".fx-all").forEach(function (b) { b.addEventListener("click", function () { b.closest(".fx").classList.add("all"); }); });
    if (window.matchMedia && window.matchMedia("(min-width: 1000px)").matches) qa(".fx-more").forEach(function (d) { d.open = true; });
  }

  // ── 找比賽：球種 → 聯盟 → 隊伍（11/22 晚 Tom）──
  var PK = window.HUB_PICK || [], sS = document.getElementById("pk-s"), sL = document.getElementById("pk-l"), sT = document.getElementById("pk-t"),
    card = document.getElementById("pk-card"), syncing = false;
  function sportObj() { for (var i = 0; i < PK.length; i++) if (PK[i].s === (sS ? sS.value : "")) return PK[i]; return null; }
  function lgObj() { var S = sportObj(); if (!S) return null; for (var i = 0; i < S.lgs.length; i++) if (S.lgs[i].lg === pick.lg) return S.lgs[i]; return null; }
  function teamObj() { var L = lgObj(); if (!L) return null; for (var i = 0; i < L.teams.length; i++) if (L.teams[i].t === pick.tm) return L.teams[i]; return null; }
  function reset(sel, ph) { sel.innerHTML = ""; sel.appendChild(new Option(ph, "")); }
  function fillLeagues() {
    if (!sL) return;
    reset(sL, "聯盟");
    var S = sportObj();
    sL.disabled = !S;
    if (!S) return;
    S.lgs.forEach(function (L) { sL.appendChild(new Option(L.name + (L.n ? "（" + L.n + " 場）" : "（近期沒比賽）"), L.lg)); });
  }
  function fillTeams() {
    if (!sT) return;
    reset(sT, "隊伍");
    var L = lgObj();
    sT.disabled = !L;
    if (!L) return;
    var has = L.teams.filter(function (t) { return t.n; }), rest = L.teams.filter(function (t) { return !t.n; });
    [["近四天有比賽", has], ["其他球隊（看球隊頁）", rest]].forEach(function (grp) {
      if (!grp[1].length) return;
      var og = document.createElement("optgroup"); og.label = grp[0];
      grp[1].forEach(function (t) { og.appendChild(new Option(t.t, t.t)); });
      sT.appendChild(og);
    });
  }
  // 選隊伍之後的小卡：這四天幾場＋球隊頁連結（只用 textContent 組，不拼 HTML）
  function teamCard(hit) {
    if (!card) return;
    var t = pick.tm ? teamObj() : null;
    if (!t) { card.hidden = true; card.textContent = ""; return; }
    card.textContent = "";
    var b = document.createElement("b"); b.textContent = t.t; card.appendChild(b);
    var s = document.createElement("span"); s.textContent = hit ? "這四天有 " + hit + " 場比賽，在下面「全部賽事」" : "這四天沒有比賽"; card.appendChild(s);
    if (t.f) { var a = document.createElement("a"); a.href = t.f; a.textContent = "球隊頁：完整路單、盤路統計 ›"; card.appendChild(a); }
    card.hidden = false;
  }
  function chipFor(s) { return document.querySelector('[data-sport-btn="' + s + '"]'); }
  if (sS) sS.addEventListener("change", function () {
    pick.lg = ""; pick.tm = "";
    fillLeagues(); fillTeams();
    var c = chipFor(sS.value) || chipFor("");
    if (c) { syncing = true; c.click(); syncing = false; }   // 跟賽事表上的球種按鈕同步
    run();
  });
  if (sL) sL.addEventListener("change", function () { pick.lg = sL.value; pick.tm = ""; fillTeams(); run(); });
  if (sT) sT.addEventListener("change", function () {
    pick.tm = sT.value; run();
    // 選到的隊如果是焦點賽事那幾場之一，左上的面板直接換過去
    if (pick.tm) for (var i = 0; i < fx.length; i++) if ((fx[i].getAttribute("data-tm") || "").split("|").indexOf(pick.tm) >= 0) { fxShow(i); break; }
  });
  // 直接按賽事表的球種按鈕 → 下拉選單跟著換、聯盟隊伍清掉
  qa("[data-sport-btn]").forEach(function (c) {
    c.addEventListener("click", function () {
      if (syncing || !sS) return;
      var s = c.getAttribute("data-sport-btn");
      sS.value = PK.some(function (x) { return x.s === s; }) ? s : "";
      pick.lg = ""; pick.tm = ""; fillLeagues(); fillTeams();
    });
  });
  var clr = document.getElementById("pk-x");
  if (clr) clr.addEventListener("click", function () {
    if (q) q.value = "";
    if (sS) sS.value = "";
    pick.lg = ""; pick.tm = ""; fillLeagues(); fillTeams();
    var c = chipFor(""); if (c) { syncing = true; c.click(); syncing = false; }
    qa('[data-flag][aria-pressed="true"]').forEach(function (f) { f.click(); });
    run();
  });

  // 篩選鈕是 hub.js 在處理；按完再把找比賽的條件套一次
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-flag],[data-sport-btn],[data-day-btn]")) setTimeout(run, 0);
    var tr = e.target.closest && e.target.closest("tr[data-href]");
    if (tr && !e.target.closest("a,button")) location.href = tr.getAttribute("data-href");
  });
})();
