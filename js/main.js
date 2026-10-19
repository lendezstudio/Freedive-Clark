/* Freedive Clark | site behaviour. No dependencies. */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");
  var DATA = window.FC_DATA || { classes: {}, sessions: [] };
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Dates (Asia/Manila) ---------- */
  function manilaToday() {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (e) {
      var d = new Date(Date.now() + 8 * 3600 * 1000);
      return d.toISOString().slice(0, 10);
    }
  }
  var TODAY = manilaToday();

  function toDate(iso) { return new Date(iso + "T12:00:00+08:00"); }
  function fmt(iso, opts) {
    try { return new Intl.DateTimeFormat("en-US", Object.assign({ timeZone: "Asia/Manila" }, opts)).format(toDate(iso)); }
    catch (e) { return iso; }
  }
  function longDate(iso) { return fmt(iso, { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }

  function upcomingSessions() {
    return (DATA.sessions || [])
      .filter(function (s) { return s.status !== "cancelled" && s.date >= TODAY && DATA.classes[s.classId]; })
      .sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }
  function findSession(id) {
    return (DATA.sessions || []).filter(function (s) { return s.id === id; })[0] || null;
  }

  /* ---------- Mobile menu ---------- */
  var toggle = $(".menu-toggle");
  var sheet = $("#menu-sheet");
  if (toggle && sheet) {
    var label = $(".label", toggle);
    var setMenu = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (label) label.textContent = open ? "Close" : "Menu";
      sheet.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      if (open) { var first = $("a", sheet); if (first) first.focus(); }
    };
    toggle.addEventListener("click", function () { setMenu(toggle.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheet.classList.contains("is-open")) { setMenu(false); toggle.focus(); }
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 960 && sheet.classList.contains("is-open")) setMenu(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$(".reveal, .mask");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in-view"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------- Hero photo wipe slideshow ---------- */
  var heroMain = $(".hero-main");
  if (heroMain) {
    var slides = $$(".slide", heroMain);
    var counter = $("[data-slide-count]");
    var pauseBtn = $("[data-slide-toggle]");
    var idx = 0, timer = null, playing = !reduceMotion;
    var show = function (n) {
      var prev = slides[idx];
      idx = (n + slides.length) % slides.length;
      slides.forEach(function (s) { s.classList.remove("is-leaving"); });
      if (prev && prev !== slides[idx]) { prev.classList.remove("is-active"); prev.classList.add("is-leaving"); }
      slides[idx].classList.add("is-active");
      if (counter) counter.textContent = "0" + (idx + 1) + " / 0" + slides.length;
    };
    var setPlaying = function (p) {
      playing = p;
      clearInterval(timer);
      if (p) timer = setInterval(function () { show(idx + 1); }, 4800);
      if (pauseBtn) {
        pauseBtn.setAttribute("aria-label", p ? "Pause slideshow" : "Play slideshow");
        pauseBtn.innerHTML = p
          ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>'
          : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>';
      }
    };
    if (slides.length > 1) {
      show(0);
      setPlaying(playing);
      if (pauseBtn) pauseBtn.addEventListener("click", function () { setPlaying(!playing); });
      var nextBtn = $("[data-slide-next]");
      if (nextBtn) nextBtn.addEventListener("click", function () { show(idx + 1); if (playing) setPlaying(true); });
      document.addEventListener("visibilitychange", function () { if (document.hidden) clearInterval(timer); else if (playing) setPlaying(true); });
    }
  }

  /* ---------- Promotion with automatic expiry ---------- */
  var promo = DATA.introPromo;
  var promoLive = promo && TODAY <= promo.expires;
  $$("[data-promo]").forEach(function (el) { el.hidden = !promoLive; });
  $$("[data-promo-fallback]").forEach(function (el) { el.hidden = !!promoLive; });
  if (promoLive) {
    $$("[data-promo-amount]").forEach(function (el) { el.textContent = promo.amount; });
    $$("[data-promo-until]").forEach(function (el) { el.textContent = fmt(promo.expires, { month: "long", day: "numeric", year: "numeric" }); });
  }

  /* Dated content (e.g. a trip on a fixed day) disappears once that day has passed. */
  $$("[data-hide-after]").forEach(function (el) {
    if (TODAY > el.getAttribute("data-hide-after")) el.hidden = true;
  });

  /* ---------- Schedule ---------- */
  var ICON_ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';

  function sessionRow(s) {
    var c = DATA.classes[s.classId];
    var tr = document.createElement("tr");
    tr.setAttribute("data-kind", c.kind);
    tr.innerHTML =
      '<td data-label="Date"><div class="date-cell"><span class="date-block" aria-hidden="true"><span class="m">' +
      fmt(s.date, { month: "short" }).toUpperCase() + '</span><span class="d">' + fmt(s.date, { day: "numeric" }) +
      '</span></span><span class="full-date">' + longDate(s.date) + "</span></div></td>" +
      '<td data-label="Time">' + s.time + "</td>" +
      '<td data-label="Venue">' + s.venue + "</td>" +
      '<td data-label="Class"><div><span class="class-name">' + c.name + "</span>" + (s.price ? '<span class="price">' + s.price + "</span>" : "") + "</div></td>" +
      '<td class="action-cell"><a class="btn btn--small" href="contact.html?session=' + encodeURIComponent(s.id) + '">Ask About This Session ' + ICON_ARROW + "</a></td>";
    return tr;
  }

  var schedTable = $("[data-schedule-table]");
  if (schedTable) {
    var list = upcomingSessions();
    var tbody = $("tbody", schedTable);
    list.forEach(function (s) { tbody.appendChild(sessionRow(s)); });
    var emptyAll = $("[data-empty='all']");
    var emptyIntro = $("[data-empty='intro']");
    var hasIntro = list.some(function (s) { return s.classId === "intro"; });
    if (!list.length) { schedTable.hidden = true; if (emptyAll) emptyAll.hidden = false; }
    if (emptyIntro) emptyIntro.hidden = hasIntro || !list.length;

    var chips = $$("[data-filter]");
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var f = chip.getAttribute("data-filter");
        chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
        var shown = 0;
        $$("tr[data-kind]", tbody).forEach(function (tr) {
          var on = f === "all" || tr.getAttribute("data-kind") === f;
          tr.classList.toggle("is-hidden", !on);
          if (on) shown++;
        });
        schedTable.hidden = shown === 0;
        if (emptyIntro) emptyIntro.hidden = hasIntro || f === "trip";
        if (emptyAll) emptyAll.hidden = !(shown === 0 && f !== "class");
      });
    });
  }

  var nextSlot = $("[data-next-session]");
  if (nextSlot) {
    var up = upcomingSessions();
    if (up.length) {
      var s = up[0], c = DATA.classes[s.classId];
      nextSlot.innerHTML =
        '<p class="sub-label">Next posted date</p>' +
        '<div class="date-cell" style="display:flex;gap:1rem;align-items:center;margin-bottom:1rem">' +
        '<span class="date-block" aria-hidden="true"><span class="m">' + fmt(s.date, { month: "short" }).toUpperCase() +
        '</span><span class="d">' + fmt(s.date, { day: "numeric" }) + "</span></span>" +
        '<div><p class="h3" style="margin:0 0 .3rem">' + c.name + "</p><p style=\"margin:0\">" + longDate(s.date) + " · " + s.venue + "</p></div></div>" +
        '<div class="btn-row"><a class="btn btn--small" href="contact.html?session=' + encodeURIComponent(s.id) + '">Ask About This Session ' + ICON_ARROW +
        '</a><a class="link-arrow" href="schedule.html">See all posted dates</a></div>';
    }
  }

  /* ---------- Video players ---------- */
  var players = $$("[data-player]");
  function pauseOthers(except) {
    players.forEach(function (p) { var v = $("video", p); if (v !== except && !v.paused) v.pause(); });
  }
  players.forEach(function (shell) {
    var video = $("video", shell);
    var big = $("[data-play-big]", shell);
    var playBtn = $("[data-play]", shell);
    var soundBtn = $("[data-sound]", shell);
    var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>';
    var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>';
    var ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    var ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    video.muted = true;
    var sync = function () {
      var playing = !video.paused && !video.ended;
      shell.classList.toggle("is-playing", playing);
      if (playBtn) playBtn.innerHTML = playing ? ICON_PAUSE + "<span>Pause video</span>" : ICON_PLAY + "<span>Play video</span>";
      if (soundBtn) soundBtn.innerHTML = video.muted ? ICON_OFF + "<span>Turn sound on</span>" : ICON_ON + "<span>Turn sound off</span>";
    };
    var play = function () { pauseOthers(video); var p = video.play(); if (p && p.catch) p.catch(function () {}); };
    if (big) big.addEventListener("click", play);
    if (playBtn) playBtn.addEventListener("click", function () { if (video.paused) play(); else video.pause(); });
    if (soundBtn) soundBtn.addEventListener("click", function () { video.muted = !video.muted; sync(); });
    video.addEventListener("click", function () { if (video.paused) play(); else video.pause(); });
    ["play", "pause", "ended", "volumechange"].forEach(function (ev) { video.addEventListener(ev, sync); });
    sync();
  });

  /* ---------- Gallery lightbox ---------- */
  var lb = $("#lightbox");
  var thumbs = $$("[data-lightbox]");
  if (lb && thumbs.length && typeof lb.showModal === "function") {
    var lbImg = $("img", lb), lbCap = $(".lb-caption", lb), lbCount = $(".lb-count", lb);
    var cur = 0, opener = null;
    var render = function () {
      var t = thumbs[cur], img = $("img", t);
      lbImg.src = t.getAttribute("data-full");
      lbImg.alt = img ? img.alt : "";
      lbCap.textContent = t.getAttribute("data-caption") || "";
      lbCount.textContent = (cur + 1) + " / " + thumbs.length;
    };
    var go = function (d) { cur = (cur + d + thumbs.length) % thumbs.length; render(); };
    thumbs.forEach(function (t, i) {
      t.addEventListener("click", function () { cur = i; opener = t; render(); lb.showModal(); document.body.classList.add("menu-open"); });
    });
    $("[data-lb-prev]", lb).addEventListener("click", function () { go(-1); });
    $("[data-lb-next]", lb).addEventListener("click", function () { go(1); });
    $("[data-lb-close]", lb).addEventListener("click", function () { lb.close(); });
    lb.addEventListener("close", function () { document.body.classList.remove("menu-open"); if (opener) opener.focus(); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    });
    var sx = null;
    lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
      sx = null;
    });
  }

  /* ---------- Inquiry message builder ---------- */
  var form = $("#inquiry-form");
  if (form) {
    var fClass = $("#f-class"), fSession = $("#f-session"), fDate = $("#f-date"), dateWrap = $("#date-wrap");
    var fName = $("#f-name"), fCount = $("#f-count"), fQ = $("#f-question");
    var review = $("#review"), out = $("#message-out"), status = $("#copy-status"), summary = $("#form-errors");
    var chat = $("#open-chat");
    if (chat && DATA.chatUrl) chat.href = DATA.chatUrl;
    fDate.min = TODAY;

    var fillSessions = function (keep) {
      var list = upcomingSessions().filter(function (s) { return s.classId === fClass.value; });
      fSession.innerHTML = "";
      list.forEach(function (s) {
        var o = document.createElement("option");
        o.value = s.id;
        o.textContent = longDate(s.date) + ", " + s.venue;
        fSession.appendChild(o);
      });
      var other = document.createElement("option");
      other.value = "custom";
      other.textContent = list.length ? "Another date (choose below)" : "My preferred date (choose below)";
      fSession.appendChild(other);
      if (keep && $("option[value='" + keep + "']", fSession)) fSession.value = keep;
      toggleDate();
    };
    var toggleDate = function () { dateWrap.hidden = fSession.value !== "custom"; };
    fClass.addEventListener("change", function () { fillSessions(); });
    fSession.addEventListener("change", toggleDate);

    var params = new URLSearchParams(window.location.search);
    var pre = params.get("session"), preClass = params.get("class");
    var preS = pre ? findSession(pre) : null;
    if (preS && DATA.classes[preS.classId]) fClass.value = preS.classId;
    else if (preClass && DATA.classes[preClass]) fClass.value = preClass;
    fillSessions(preS ? preS.id : null);
    if (pre && preS && preS.date < TODAY) {
      summary.textContent = "Please review the session details before continuing. That date has passed, so choose another session or date.";
      summary.classList.add("is-shown");
    }

    var setErr = function (input, on) { input.closest(".field").classList.toggle("has-error", on); input.setAttribute("aria-invalid", on ? "true" : "false"); };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      summary.classList.remove("is-shown");
      var firstBad = null;
      var name = fName.value.trim();
      setErr(fName, !name); if (!name) firstBad = firstBad || fName;

      var dateText = "";
      if (fSession.value === "custom") {
        var okDate = fDate.value && fDate.value > TODAY;
        setErr(fDate, !okDate); if (!okDate) firstBad = firstBad || fDate;
        if (okDate) dateText = longDate(fDate.value);
      } else {
        setErr(fDate, false);
        var s = findSession(fSession.value);
        if (!s || s.date < TODAY) {
          summary.textContent = "Please review the session details before continuing.";
          summary.classList.add("is-shown");
          firstBad = firstBad || fSession;
        } else {
          dateText = longDate(s.date) + " (" + s.venue + ")";
        }
      }

      var n = parseInt(fCount.value, 10);
      var okCount = n >= 1;
      setErr(fCount, !okCount); if (!okCount) firstBad = firstBad || fCount;

      if (firstBad) { firstBad.focus(); return; }

      var c = DATA.classes[fClass.value];
      var what = c.kind === "trip" ? c.name + " trip" : c.name + " class";
      var lines = [
        "Hi Freedive Clark! I'd like to ask about your " + what + ".",
        "",
        "Name: " + name,
        "Preferred date: " + dateText,
        "Number of participants: " + n
      ];
      var q = fQ.value.trim();
      if (q) lines.push("Question: " + q);
      lines.push("", "Could you share the availability, full cost and booking details?");
      out.value = lines.join("\n");

      form.hidden = true;
      review.classList.add("is-shown");
      status.textContent = "";
      status.classList.remove("is-warn");
      var h = $("h3", review); h.setAttribute("tabindex", "-1"); h.focus();
    });

    $("#copy-msg").addEventListener("click", function () {
      var done = function () { status.textContent = "Message copied. Paste it into our chat when you're ready."; status.classList.remove("is-warn"); };
      var fail = function () {
        status.textContent = "Couldn't copy automatically. Select and copy the message below.";
        status.classList.add("is-warn");
        out.focus(); out.select();
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(out.value).then(done, fail);
      } else {
        try { out.focus(); out.select(); if (document.execCommand("copy")) done(); else fail(); } catch (err) { fail(); }
      }
    });

    $("#edit-msg").addEventListener("click", function () {
      review.classList.remove("is-shown");
      form.hidden = false;
      fName.focus();
    });
  }
})();
