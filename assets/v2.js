// v2.js — 分析中心「清爽重整對照版」的互動（2026-11-23；只有 build_analysis.js --v2 產的頁面會載入）
//   1. 看盤快訊跑馬燈：一輪約 35～45 秒、⏸ 暫停／▶ 播放、手指按住暫停（滑鼠移入、鍵盤停在上面由 CSS 處理）
//   2. 路單／近 10 場切換（路單榜、單場頁）：跟首頁共用同一個記憶 hfa_fx_view；首頁的焦點面板由 proto.js 處理
//   3. 盤口異動榜：主要聯賽／全部、球種篩選
//   4. 找隊列（首頁、賽事表）：選到隊伍出直達卡（看最近一場、進球隊頁）
//   5. 首頁打字／選球種聯盟 → 「這四天 N 場 → 到賽事表看」　6. 賽事表套用網址 # 帶進來的條件
(function () {
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ── 1. 跑馬燈 ──
  var tk = document.querySelector(".ticker");
  if (tk) {
    var track = tk.querySelector(".tk-track"), list = tk.querySelector(".tk-list"), btn = tk.querySelector(".tk-btn"), view = tk.querySelector(".tk-view");
    // 速度照內容長度算（約每秒 55px），一輪夾在 35～45 秒
    var setDur = function () { if (list && track) track.style.setProperty("--tk-dur", Math.max(35, Math.min(45, list.scrollWidth / 55)) + "s"); };
    setDur();
    window.addEventListener("resize", setDur);
    if (btn) btn.addEventListener("click", function () {
      var p = tk.classList.toggle("paused");
      btn.setAttribute("aria-pressed", p ? "true" : "false");
      btn.setAttribute("aria-label", p ? "繼續播放快訊" : "暫停快訊");
      btn.textContent = p ? "▶" : "⏸";
    });
    if (view) {
      var holdT = null;
      view.addEventListener("touchstart", function () { clearTimeout(holdT); tk.classList.add("hold"); }, { passive: true });
      ["touchend", "touchcancel"].forEach(function (ev) {
        view.addEventListener(ev, function () { holdT = setTimeout(function () { tk.classList.remove("hold"); }, 1500); }, { passive: true });
      });
    }
  }

  // ── 2. 路單／近 10 場（首頁以外）──
  var scopes = qa(".rv-scope"), VKEY = "hfa_fx_view";
  if (scopes.length && !document.querySelector(".fx-l")) {
    var setView = function (v, save) {
      scopes.forEach(function (s) { s.classList.toggle("road-view", v === "road"); });
      qa("[data-fxview]").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-fxview") === v ? "true" : "false"); });
      if (v === "road") qa(".rv-road .road").forEach(function (r) { r.scrollLeft = 0; });   // 最新在左
      if (save) { try { localStorage.setItem(VKEY, v); } catch (e) { /* 無痕模式存不了，只在這頁有效 */ } }
    };
    qa("[data-fxview]").forEach(function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-fxview"), true); }); });
    try { if (localStorage.getItem(VKEY) === "bead") setView("bead", false); } catch (e) { /* 沒存就用預設的路單 */ }
  }

  // ── 3. 盤口異動榜 ──
  var mvt = document.querySelector(".mvt2");
  if (mvt) {
    var scope = "core", sport = "", empty = document.querySelector(".mv-empty");
    var apply = function () {
      var n = 0;
      qa("tbody tr", mvt).forEach(function (tr) {
        var ok = (scope === "all" || tr.getAttribute("data-core") === "1") && (!sport || tr.getAttribute("data-sport") === sport);
        tr.hidden = !ok;
        if (ok) n++;
      });
      if (empty) empty.hidden = n > 0;
    };
    var group = function (attr, set) {
      qa("[" + attr + "]").forEach(function (b) {
        b.addEventListener("click", function () {
          set(b.getAttribute(attr));
          qa("[" + attr + "]").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          apply();
        });
      });
    };
    group("data-mvscope", function (v) { scope = v; });
    group("data-mvsport", function (v) { sport = v; });
  }

  // ── 4. 首頁找隊列：選到隊伍 → 直達卡（11/23）──
  //   下拉選單的連動、篩下面的全部賽事、焦點面板切換都是 proto.js 在做；這裡只照目前選到的值畫卡片（只用 textContent，不拼 HTML）
  var qc = document.getElementById("qb-card"), qS = document.getElementById("pk-s"), qL = document.getElementById("pk-l"), qT = document.getElementById("pk-t");
  if (qc && qS && qL && qT) {
    var PK = window.HUB_PICK || [], PG = window.HUB_PICK_G || [];
    var find = function (arr, key, v) { for (var i = 0; i < arr.length; i++) if (arr[i][key] === v) return arr[i]; return null; };
    var el = function (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
    var render = function () {
      var S = find(PK, "s", qS.value), L = S && find(S.lgs, "lg", qL.value), T = L && qT.value ? find(L.teams, "t", qT.value) : null;
      qc.textContent = "";
      if (!T) { qc.hidden = true; return; }
      var h = el("div", "qc-h");
      h.appendChild(el("b", "", T.t));
      h.appendChild(el("small", "", L.name + "・" + (T.n ? "這四天 " + T.n + " 場" : "這四天沒有比賽")));
      var inFx = qa(".fx[data-tm]").some(function (f) { return (f.getAttribute("data-tm") || "").split("|").indexOf(T.t) >= 0; });
      if (inFx) h.appendChild(el("small", "qc-fx", "焦點賽事已切到這場"));
      qc.appendChild(h);
      var G = T.g != null ? PG[T.g] : null;   // [賽事頁, 時間, 客, 主, 狀態]
      if (G) {
        var home = G[3] === T.t;
        var a = el("a", "qc-go pri", "看最近一場（" + G[1] + "・" + (home ? "主場對 " + G[2] : "客場對 " + G[3]) + (G[4] ? "・" + G[4] : "") + "）›");
        a.href = "match/" + G[0] + ".html";
        qc.appendChild(a);
      }
      if (T.f) { var b = el("a", "qc-go sec", "進球隊完整路單頁 ›"); b.href = T.f; qc.appendChild(b); }
      qc.hidden = false;
    };
    // 聯盟選項改短：proto.js 寫「NBA（23 場）」，手機上選單只剩 115px 會被切成「NBA…」→ 改「NBA 23場」（這四天沒比賽的寫 0場）
    var shortLg = function () {
      var S = find(PK, "s", qS.value);
      if (!S) return;
      [].forEach.call(qL.options, function (o) { var L = o.value && find(S.lgs, "lg", o.value); if (L) o.textContent = L.name + " " + L.n + "場"; });
    };
    qS.addEventListener("change", shortLg);
    [qS, qL, qT].forEach(function (s) { s.addEventListener("change", render); });
    // 「清除」、直接按下面的球種膠囊 → proto.js 會把選單清掉，等它清完再畫
    document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#pk-x,[data-sport-btn]")) setTimeout(function () { shortLg(); render(); }, 0); });
    render();   // 瀏覽器「上一頁」回來時選單可能還留著值

    var pq = document.getElementById("pq"), pqn = document.getElementById("pqn"), onHome = !document.querySelector(".pgames");
    // ── 5. 首頁（沒有賽事表）：打字、只選球種／聯盟 → 「這四天 N 場 → 到賽事表看」，連結帶著條件 ──
    if (onHome && pq && pqn) {
      var Q = window.HUB_Q || { L: [], g: [] };
      var hint = function () {
        var v = pq.value.trim(), lv = v.toLowerCase(), s = qS.value, lg = qL.value, p = [];
        if (!v && !s) { pqn.hidden = true; return; }
        if (s) p.push("s=" + encodeURIComponent(s));
        if (lg) p.push("lg=" + encodeURIComponent(lg));
        if (v) p.push("q=" + encodeURIComponent(v));
        var n = 0;
        Q.g.forEach(function (x) {
          var k = Q.L[x[1]] || "";
          if ((!lv || x[0].indexOf(lv) >= 0) && (!s || k.indexOf(s + "|") === 0) && (!lg || k === s + "|" + lg)) n++;
        });
        pqn.href = "games.html#" + p.join("&");
        pqn.textContent = n ? "這四天有 " + n + " 場 → 到賽事表看 ›" : "這四天沒有符合的場次";
        pqn.hidden = false;
      };
      pq.addEventListener("input", hint);
      pq.addEventListener("keydown", function (e) { if (e.key === "Enter" && pq.value.trim()) { e.preventDefault(); hint(); location.href = pqn.href; } });
      [qS, qL, qT].forEach(function (s) { s.addEventListener("change", hint); });
      document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#pk-x")) setTimeout(hint, 0); });
    }
    // ── 6. 賽事表：網址 # 帶進來的條件（首頁速覽、找隊列、右欄單場都靠這個）──
    //   已經在賽事表、只改網址 # 的條件（例如自己改網址）→ 重新載入，條件才不會疊在舊的上面；「#games」這種錨點不算
    if (!onHome) window.addEventListener("hashchange", function () { if (location.hash.indexOf("=") > 0) location.reload(); });
    if (!onHome && location.hash.length > 1) {
      var P = {};
      location.hash.slice(1).split("&").forEach(function (kv) { var i = kv.indexOf("="); if (i > 0) { try { P[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } catch (e) { /* 壞掉的網址就略過 */ } } });
      var fire = function (el, ev) { el.dispatchEvent(new Event(ev)); };
      if (P.s) { qS.value = P.s; fire(qS, "change"); }
      if (P.lg && P.s) { qL.value = P.lg; fire(qL, "change"); }
      if (P.t && P.lg) { qT.value = P.t; fire(qT, "change"); }
      if (P.q && pq) { pq.value = P.q; fire(pq, "input"); }
      (P.f || "").split(",").forEach(function (k) { var b = k && document.querySelector('[data-flag="' + k.replace(/[^a-z0-9]/g, "") + '"]'); if (b && b.getAttribute("aria-pressed") !== "true") b.click(); });
      // 捲到哪：聯盟膠囊 → 今天分頁的那個聯盟；快篩 → 賽事表開頭；搜尋／聯盟／隊伍 → 留在上面看結果提示
      var to = null;
      if (P.go) to = qa("#d1 .lg-block").filter(function (b) { return b.getAttribute("data-lgb") === P.go; })[0] || null;
      if (!to && P.f) to = document.getElementById("games");
      if (to) setTimeout(function () { to.scrollIntoView(); }, 0);
    }
  }
})();
