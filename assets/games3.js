// games3.js — v3 賽事表：找比賽（選了聯盟、隊伍或打字）時的日期分頁（11/25 深夜 Tom）
//   原本：一開始找就四天一起列，這時點日期分頁沒反應（一直停在昨天那一場）
//   現在：①日期列最前面多一顆「四天全部」（找的時候才出現，預設選它＝原本的四天一起列）
//         ②每顆日期上的數字改成「符合的場數」，找完一眼看出哪天有
//         ③點某一天就只看那天；那天沒有就寫「明天 11/26（四）沒有英超的比賽」，附「昨天 11/24 有 1 場 ›」按鈕
//   篩選本身照舊由 proto.js（找比賽）、hub.js（日期、球種、快篩）處理；這支等它們做完再整理畫面（只用 textContent，不拼 HTML）
(function () {
  var box = document.querySelector(".pgames");
  if (!box) return;
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var tabs = qa("[data-day-btn]"), all = document.querySelector("[data-day-all]");
  var q = document.getElementById("pq"), sL = document.getElementById("pk-l"), sT = document.getElementById("pk-t"), pqn = document.getElementById("pqn");
  var orig = tabs.map(function (b) { var s = b.querySelector("small"); return s ? s.textContent : ""; });
  var lab = function (b) { return qa(".da", b).map(function (x) { return x.textContent; }).join(" "); };   // 「明天 11/26」
  var pin = null, was = false;
  var msg = document.createElement("div");
  msg.className = "gm-empty"; msg.hidden = true; msg.setAttribute("aria-live", "polite");
  var filters = box.querySelector(".filters");
  if (filters) filters.parentNode.insertBefore(msg, filters.nextSibling); else box.insertBefore(msg, box.firstChild);

  // 正在找什麼：隊伍 > 聯盟 > 打的字
  function what() {
    if (sT && sT.value) return sT.value;
    if (sL && sL.value) { var o = sL.options[sL.selectedIndex]; return o ? o.textContent.replace(/\s*\d+\s*場$|（.*）$/, "").trim() : sL.value; }
    if (q && q.value.trim()) return "「" + q.value.trim() + "」";
    return "";
  }
  function count(day) { return day ? day.querySelectorAll(".grow:not([hidden]):not(.q-out)").length : 0; }

  function sync() {
    var on = box.classList.contains("searching");
    if (on && !was) pin = null;          // 剛開始找 → 先看四天全部
    if (!on && was) {                    // 不找了 → 日期分頁回到正常（停在最後點的那天，或原本那天）
      tabs.forEach(function (b, i) {
        var d = document.getElementById(b.getAttribute("data-day-btn"));
        b.setAttribute("aria-selected", d && !d.hidden ? "true" : "false");
        var s = b.querySelector("small"); if (s) s.textContent = orig[i];
        b.classList.remove("d-zero");
      });
    }
    was = on;
    box.classList.toggle("day-pin", on && !!pin);
    if (all) { all.hidden = !on; all.setAttribute("aria-selected", on && !pin ? "true" : "false"); }
    msg.hidden = true; msg.textContent = "";
    if (!on) return;
    var total = 0, per = [];
    tabs.forEach(function (b, i) {
      var id = b.getAttribute("data-day-btn"), n = count(document.getElementById(id));
      total += n; per.push(n);
      var s = b.querySelector("small"); if (s) s.textContent = n;
      b.classList.toggle("d-zero", n === 0);
      b.setAttribute("aria-selected", pin === id ? "true" : "false");
    });
    var as = all && all.querySelector("small"); if (as) as.textContent = total;
    if (!pin) return;
    var i = tabs.map(function (b) { return b.getAttribute("data-day-btn"); }).indexOf(pin), n = per[i];
    if (pqn) pqn.textContent = n ? lab(tabs[i]) + " 找到 " + n + " 場，往下看 ↓" : lab(tabs[i]) + " 沒有符合的場次";   // 「11/26」後面接中文留一格（全站寫法）
    if (n) return;
    // 這天沒有 → 寫清楚，附有比賽的日子
    var p = document.createElement("p");
    var dl = document.getElementById(pin) && document.getElementById(pin).querySelector(".day-lab");
    p.textContent = (dl ? dl.textContent.trim() : lab(tabs[i])) + "沒有" + what() + "的比賽。";
    msg.appendChild(p);
    var others = tabs.filter(function (b, j) { return per[j] > 0; });
    if (others.length) {
      var w = document.createElement("div"); w.className = "gm-go";
      others.forEach(function (b) {
        var j = tabs.indexOf(b), g = document.createElement("button");
        g.type = "button"; g.textContent = lab(b) + " 有 " + per[j] + " 場 ›";
        g.addEventListener("click", function () { b.click(); });
        w.appendChild(g);
      });
      msg.appendChild(w);
    } else {
      var s2 = document.createElement("p"); s2.className = "gm-sub"; s2.textContent = "這四天都沒有，可以換個條件，或按上面的「清除」。"; msg.appendChild(s2);
    }
    msg.hidden = false;
  }
  var later = function () { setTimeout(sync, 10); };   // 等 proto.js 的 setTimeout(run, 0) 先跑完（它會重寫上面那行「找到 N 場」）

  tabs.forEach(function (b) {
    b.addEventListener("click", function () { if (box.classList.contains("searching")) pin = b.getAttribute("data-day-btn"); later(); });
  });
  if (all) all.addEventListener("click", function () { pin = null; later(); });
  if (q) q.addEventListener("input", later);
  [sL, sT, document.getElementById("pk-s")].forEach(function (s) { if (s) s.addEventListener("change", later); });
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#pk-x,[data-sport-btn],[data-flag]")) setTimeout(sync, 10); });
  setTimeout(sync, 30);   // 網址 # 帶條件進來（v2.js 套完條件之後）
})();
