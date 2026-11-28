// hub.js — 花惹發分析中心的互動（model/site/build_analysis.js 會複製到 <out>/assets/）。
// 頁面內容都是事先產生好的，這支只做：首頁日期／球種／可單場／場中篩選、路單捲到最新、走勢頁分頁、名詞解釋、過關單（點賠率加入）→ 帶進官網的過關計算機。
(function () {
  var MAX_LEGS = 12, KEY = "hfa_slip_v1";
  var main = document.body.getAttribute("data-main") || "../";
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ── 首頁：日期分頁＋球種＋可單場／場中 ──
  // flags：single 可單場、live 有場中、moved 盤口有變動、streak 有連 3 場以上的隊（可同時選，全部都要符合）
  var state = { sport: "", flags: {} };
  function apply() {
    var on = Object.keys(state.flags).filter(function (k) { return state.flags[k]; }), flagOn = on.length > 0;
    qa(".day").forEach(function (day) {
      var any = false;
      qa(".grow", day).forEach(function (r) {
        var ok = (!state.sport || r.getAttribute("data-sport") === state.sport) &&
          on.every(function (k) { return r.getAttribute("data-" + k) === "1"; });
        r.hidden = !ok;
        if (ok) any = true;
      });
      qa(".lg-block", day).forEach(function (b) { b.hidden = !b.querySelector(".grow:not([hidden])"); });
      qa("details.more", day).forEach(function (d) {
        d.hidden = !d.querySelector(".grow:not([hidden])");
        if (flagOn && !d.hidden) d.open = true;   // 篩選後只剩少數場，收起來的聯賽直接打開
      });
      var em = day.querySelector(".empty-f");
      if (em) em.hidden = any || !day.querySelector(".grow");
    });
  }
  qa("[data-day-btn]").forEach(function (btn, _, all) {
    btn.addEventListener("click", function () {
      all.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-selected", on ? "true" : "false");
        var d = document.getElementById(b.getAttribute("data-day-btn"));
        if (d) d.hidden = !on;
      });
    });
  });
  qa("[data-sport-btn]").forEach(function (btn, _, all) {
    btn.addEventListener("click", function () {
      state.sport = btn.getAttribute("data-sport-btn");
      all.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      apply();
    });
  });
  qa("[data-flag]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var k = btn.getAttribute("data-flag");
      state.flags[k] = !state.flags[k];
      btn.setAttribute("aria-pressed", state.flags[k] ? "true" : "false");
      apply();
    });
  });

  // ── 單場頁：盤口｜盤路｜近況・對戰 分頁（網址帶 #road／#form 就直接開那一頁）──
  var ptabs = qa("[data-ptab]");
  function openTab(btn) {
    ptabs.forEach(function (b) {
      var on = b === btn;
      b.setAttribute("aria-selected", on ? "true" : "false");
      var p = document.querySelector('[data-ppane="' + b.getAttribute("data-ptab") + '"]');
      if (p) p.hidden = !on;
    });
  }
  ptabs.forEach(function (btn) { btn.addEventListener("click", function () { openTab(btn); }); });
  if (ptabs.length) {
    var want = (location.hash || "").slice(1);
    openTab(ptabs.filter(function (b) { return b.getAttribute("data-ptab") === want; })[0] || ptabs[0]);
  }

  // ── 走勢頁：玩法分頁 ──
  qa("[data-mtab]").forEach(function (btn, _, all) {
    btn.addEventListener("click", function () {
      all.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-selected", on ? "true" : "false");
        var p = document.querySelector('[data-mpane="' + b.getAttribute("data-mtab") + '"]');
        if (p) p.hidden = !on;
      });
    });
  });

  // ── 盤路路單榜：球種篩選（11/22，跟玩法分頁可以疊）──
  qa("[data-tsport]").forEach(function (btn, _, all) {
    btn.addEventListener("click", function () {
      var sp = btn.getAttribute("data-tsport");
      all.forEach(function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      qa("[data-mpane]").forEach(function (pane) {
        var any = false;
        qa("table.board tbody tr", pane).forEach(function (tr) { var ok = !sp || tr.getAttribute("data-sport") === sp; tr.hidden = !ok; if (ok) any = true; });
        var em = pane.querySelector(".tb-empty");
        if (em) em.hidden = any || !pane.querySelector("table.board");
      });
    });
  });

  // ── 名詞解釋（11/20）：點帶「?」的字，在旁邊跳出一句白話；再點一次、點別處或按 Esc 就收起來 ──
  var TERMS = window.HUB_TERMS || {}, tip = document.getElementById("tip"), tipFor = null;
  function closeTip() {
    if (!tip || tip.hidden) return;
    tip.hidden = true;
    if (tipFor) tipFor.setAttribute("aria-expanded", "false");
    tipFor = null;
  }
  function openTip(btn) {
    var t = TERMS[btn.getAttribute("data-k")];
    if (!t || !tip) return;
    closeTip();
    tip.textContent = "";
    var h = document.createElement("b"); h.textContent = t[0];
    var p = document.createElement("span"); p.textContent = t[1];
    tip.appendChild(h); tip.appendChild(p);
    tip.hidden = false;
    var r = btn.getBoundingClientRect(), vw = document.documentElement.clientWidth, w = tip.offsetWidth, hgt = tip.offsetHeight;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8);
    var top = r.bottom + 8;
    if (top + hgt > window.innerHeight - 8 && r.top - hgt - 8 > 0) top = r.top - hgt - 8;   // 下面放不下就放上面
    tip.style.left = (left + window.pageXOffset) + "px";
    tip.style.top = (top + window.pageYOffset) + "px";
    btn.setAttribute("aria-expanded", "true");
    tipFor = btn;
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button.term");
    if (b) { e.preventDefault(); if (tipFor === b) closeTip(); else openTip(b); return; }
    if (tip && !tip.contains(e.target)) closeTip();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeTip(); });
  window.addEventListener("resize", closeTip);

  // ── 路單：一打開就停在最新的那一邊（11/22 起最新在左，所以停在最左邊）──
  function roadsToEnd() { qa(".road").forEach(function (r) { r.scrollLeft = 0; }); }
  roadsToEnd();
  window.addEventListener("load", roadsToEnd);

  // ── 過關單：存在這台裝置的瀏覽器裡（換手機不會跟著走） ──
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "[]") || []; } catch (e) { return []; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 無痕模式存不了，只在這頁有效 */ } }
  var slip = load();
  var toastT;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function paint() {
    qa("button.pick").forEach(function (b) {
      var on = slip.some(function (s) { return s.g === b.getAttribute("data-g") && s.l === b.getAttribute("data-l"); });
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var bar = document.getElementById("slip");
    if (!bar) return;
    bar.hidden = slip.length === 0;
    document.getElementById("slipN").textContent = slip.length;
    document.getElementById("slipGo").href = main + "?calc=" + slip.map(function (s) { return s.o; }).join(",") + "#calc";
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("button.pick");
    if (!b) return;
    var g = b.getAttribute("data-g"), l = b.getAttribute("data-l"), o = b.getAttribute("data-o");
    var same = slip.filter(function (s) { return s.g === g; })[0];
    if (same && same.l === l) { slip = slip.filter(function (s) { return s !== same; }); save(slip); paint(); return; }
    if (same) {
      // 台灣運彩規則：同一場不同玩法不能串在同一張過關單
      slip = slip.map(function (s) { return s === same ? { g: g, l: l, o: o } : s; });
      toast("同一場只能選一個，已換成：" + l);
    } else {
      if (slip.length >= MAX_LEGS) { toast("過關單最多 12 場"); return; }
      slip.push({ g: g, l: l, o: o });
      toast("已加入過關單：" + l + " @" + o);
    }
    save(slip); paint();
  });
  var clr = document.getElementById("slipClear");
  if (clr) clr.addEventListener("click", function () { slip = []; save(slip); paint(); });
  paint();
})();
