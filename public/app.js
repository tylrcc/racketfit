/* RacketFit single-page app: tab routing + quiz + browse, engine runs in-browser. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  const VIEWS = ["home", "quiz", "loading", "results", "rackets", "strings", "guide"];
  const HASH_VIEWS = ["home", "quiz", "rackets", "strings", "guide"];

  function showView(name) {
    VIEWS.forEach((v) => { const n = $("#view-" + v); if (n) n.hidden = v !== name; });
    $$(".nav-tab").forEach((t) => t.classList.toggle("active", t.getAttribute("href") === "#" + name));
    $("#nav").classList.remove("nav-open");
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }

  // --- data load --------------------------------------------------------
  let DATA = null;
  const dataReady = (async () => {
    const [rk, st] = await Promise.all([
      fetch("/data/rackets.json").then((r) => r.json()),
      fetch("/data/strings.json").then((r) => r.json()),
    ]);
    DATA = { rackets: rk.rackets, strings: st.strings };
    return DATA;
  })().catch((e) => { console.error(e); return null; });

  // --- routing ----------------------------------------------------------
  function route() {
    const hash = (location.hash || "#home").slice(1);
    const name = HASH_VIEWS.includes(hash) ? hash : "home";
    if (name === "quiz") { showView("quiz"); startQuiz(); }
    else if (name === "rackets") { showView("rackets"); renderRackets(); }
    else if (name === "strings") { showView("strings"); renderStrings(); }
    else showView(name);
  }
  function navigate(hash) {
    if (location.hash === hash) route(); else location.hash = hash;
  }
  window.addEventListener("hashchange", route);
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-nav]");
    if (!a) return;
    e.preventDefault();
    navigate(a.getAttribute("href"));
  });
  $("#navBurger").addEventListener("click", () => $("#nav").classList.toggle("nav-open"));
  window.addEventListener("scroll", () => {
    $("#nav").classList.toggle("scrolled", window.scrollY > 8);
  });

  // --- home: map grid ---------------------------------------------------
  const MAP = [
    { emoji: "🌱", title: "New to the game", desc: "Light, forgiving, big sweet spot.", a: "beginner" },
    { emoji: "🔥", title: "Aggressive baseliner", desc: "Drive through the ball with spin.", a: "aggro" },
    { emoji: "🎯", title: "Control player", desc: "Precision and feel over free power.", a: "control" },
    { emoji: "🛡️", title: "Counterpuncher", desc: "Consistency, redirect pace all day.", a: "counter" },
    { emoji: "🤚", title: "Sensitive arm", desc: "Soft, flexible, arm-friendly frames.", a: "arm" },
    { emoji: "🥎", title: "Spin monster", desc: "Heavy topspin, open string beds.", a: "spin" },
  ];
  function buildMap() {
    const g = $("#mapGrid");
    if (!g || g.childElementCount) return;
    MAP.forEach((m) => {
      const card = el("a", "map-card");
      card.href = "#quiz";
      card.setAttribute("data-nav", "");
      card.innerHTML = `<span class="map-emoji">${m.emoji}</span><span class="map-title">${m.title}</span><span class="map-desc">${m.desc}</span>`;
      g.appendChild(card);
    });
  }

  // --- quiz -------------------------------------------------------------
  const SURVEY = window.RacketFit.SURVEY;
  let step = 0;
  let answers = {};

  function startQuiz() {
    step = 0; answers = {};
    renderQuestion();
  }
  function renderQuestion() {
    const q = SURVEY[step];
    const mount = $("#questionMount");
    mount.innerHTML = "";
    mount.appendChild(el("h2", "q-title", q.title));
    if (q.help) mount.appendChild(el("p", "q-help", q.help));

    if (q.type === "number") {
      const input = el("input", "num-input");
      input.type = "number"; input.inputMode = "decimal";
      if (q.step) input.step = q.step;
      input.placeholder = q.placeholder || "";
      if (answers[q.key] != null) input.value = answers[q.key];
      input.addEventListener("input", () => {
        const v = input.value.trim();
        answers[q.key] = v === "" ? null : Number(v);
        validate();
      });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !$("#nextBtn").disabled) next(); });
      mount.appendChild(input);
      setTimeout(() => input.focus(), 40);
    } else {
      const wrap = el("div", "options");
      q.options.forEach((opt) => {
        const node = el("button", "option");
        node.type = "button";
        node.innerHTML = `<span class="dot"></span><span><span class="opt-label">${opt.label}</span>` +
          (opt.desc ? `<br><span class="opt-desc">${opt.desc}</span>` : "") + `</span>`;
        if (answers[q.key] === opt.value) node.classList.add("selected");
        node.addEventListener("click", () => {
          answers[q.key] = opt.value;
          $$(".option", wrap).forEach((o) => o.classList.remove("selected"));
          node.classList.add("selected");
          validate();
          setTimeout(next, 200); // auto-advance to the next question
        });
        wrap.appendChild(node);
      });
      mount.appendChild(wrap);
    }

    $("#progressFill").style.width = `${(step / SURVEY.length) * 100}%`;
    $("#progressLabel").textContent = `Question ${step + 1} of ${SURVEY.length}`;
    $("#backBtn").style.visibility = step === 0 ? "hidden" : "visible";
    $("#nextBtn").textContent = step === SURVEY.length - 1 ? "See my setup →" : "Next →";
    validate();
  }
  function validate() {
    const q = SURVEY[step];
    $("#nextBtn").disabled = !(q.optional || answers[q.key] !== undefined);
  }
  function next() {
    if (step < SURVEY.length - 1) { step++; renderQuestion(); } else submit();
  }
  function back() { if (step > 0) { step--; renderQuestion(); } }
  $("#nextBtn").addEventListener("click", next);
  $("#backBtn").addEventListener("click", back);
  $("#redoBtn").addEventListener("click", () => navigate("#quiz"));

  async function submit() {
    showView("loading");
    const data = await dataReady;
    if (!data) {
      showView("results");
      $("#matchList").innerHTML = `<p class="error">Could not load the gear database. Please refresh and try again.</p>`;
      return;
    }
    await new Promise((r) => setTimeout(r, 380));
    renderResults(window.RacketFit.buildReport(answers, data, 5));
    showView("results");
  }

  function animateBar(card, score, i) {
    requestAnimationFrame(() => setTimeout(() => {
      const bar = card.querySelector(".score-bar");
      if (bar) bar.style.width = `${score}%`;
    }, 60 + i * 80));
  }

  function renderResults(data) {
    const ideal = data.ideal;
    const chips = Object.values(ideal.targets)
      .map((t) => `<div class="spec-chip"><div class="k">${t.label}</div><div class="v">${t.ideal}${t.unit || ""}</div></div>`).join("");
    let pat = "";
    if (ideal.prefer_open_pattern === true) pat = "Open string pattern (more spin)";
    else if (ideal.prefer_open_pattern === false) pat = "Dense string pattern (more control)";
    const notes = (ideal.notes || []).concat(pat ? [pat] : []);
    $("#idealCard").innerHTML = `<h3>Your target spec profile</h3><div class="spec-grid">${chips}</div>` +
      (notes.length ? `<ul class="ideal-notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : "");

    const banner = $("#setupBanner");
    if (data.summary) { banner.hidden = false; banner.innerHTML =
      `<span class="setup-label">Your complete setup</span><span class="setup-text">${data.summary}</span>`; }
    else banner.hidden = true;

    const list = $("#matchList"); list.innerHTML = "";
    data.recommendations.forEach((rec, i) => {
      const r = rec.racket;
      const card = el("div", "match" + (i === 0 ? " top" : ""));
      const price = r.msrp_usd ? `<span class="match-price">$${r.msrp_usd}</span>` : "";
      const isNew = r.year >= 2026 ? `<span class="new-badge">NEW 2026</span>` : "";
      card.innerHTML =
        `<span class="match-rank">${i === 0 ? "BEST MATCH" : "#" + (i + 1)}</span>` +
        `<div class="match-top"><span class="match-name">${r.brand} ${r.model} ${isNew}</span>` +
        `<span class="match-cat">${r.category} ${price}</span></div>` +
        `<div class="score-row"><div class="score-track"><div class="score-bar"></div></div><span class="score-pct">${rec.score}%</span></div>` +
        `<div class="spec-line">${Math.round(r.head_size_sqin)} sq in · ${Math.round(r.strung_weight_g)} g · ${r.balance_pts_hl} pts HL · SW ${Math.round(r.swingweight)} · RA ${Math.round(r.stiffness_ra)} · ${r.string_pattern}</div>` +
        `<ul class="reasons">${rec.reasons.map((x) => `<li class="good">${x}</li>`).join("")}${rec.cautions.map((x) => `<li class="warn">${x}</li>`).join("")}</ul>`;
      list.appendChild(card); animateBar(card, rec.score, i);
    });

    const slist = $("#stringList"); slist.innerHTML = "";
    (data.strings || []).forEach((srec, i) => {
      const s = srec.string;
      const card = el("div", "match" + (i === 0 ? " top" : ""));
      const price = s.price_usd ? `<span class="match-price">$${s.price_usd}</span>` : "";
      const arm = s.arm_friendly ? `<span class="pill pill-soft">arm-friendly</span>` : "";
      card.innerHTML =
        `<span class="match-rank">${i === 0 ? "TOP PICK" : "#" + (i + 1)}</span>` +
        `<div class="match-top"><span class="match-name">${s.brand} ${s.model}</span>` +
        `<span class="match-cat">${s.type} · ${s.gauge} mm ${price}</span></div>` +
        `<div class="score-row"><div class="score-track"><div class="score-bar"></div></div><span class="score-pct">${srec.score}%</span></div>` +
        `<div class="spec-line">Spin ${s.spin} · Control ${s.control} · Power ${s.power} · Comfort ${s.comfort} ${arm}</div>` +
        `<ul class="reasons">${srec.reasons.map((x) => `<li class="good">${x}</li>`).join("")}</ul>`;
      slist.appendChild(card); animateBar(card, srec.score, i);
    });

    const t = data.tension;
    if (t) $("#tensionCard").innerHTML =
      `<div class="kit-icon">🎯</div><div class="kit-label">Stringing tension</div><div class="kit-value">${t.ideal} lbs</div>` +
      `<div class="kit-sub">recommended range ${t.lo} to ${t.hi} lbs</div>` +
      `<ul class="kit-notes">${t.notes.map((n) => `<li>${n}</li>`).join("")}</ul>`;

    const g = data.grip;
    $("#gripCard").innerHTML =
      `<div class="kit-icon">✊</div><div class="kit-label">Grip size${g.confident ? "" : " (estimate)"}</div><div class="kit-value">${g.label}</div>` +
      `<div class="kit-sub">${g.inches}"</div><ul class="kit-notes">${g.notes.map((n) => `<li>${n}</li>`).join("")}</ul>`;

    $("#disclaimer").textContent = data.disclaimer || "Specs are approximate, demo before you buy.";
  }

  // --- browse rackets ---------------------------------------------------
  let racketsBound = false;
  async function renderRackets() {
    const data = await dataReady; if (!data) return;
    if (!racketsBound) {
      drawRacketRows(data.rackets);
      $("#browseCount").textContent = `(${data.rackets.length})`;
      $("#browseFilter").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        drawRacketRows(data.rackets.filter((r) => `${r.brand} ${r.model} ${r.category} ${r.year}`.toLowerCase().includes(q)));
      });
      racketsBound = true;
    }
  }
  function drawRacketRows(rackets) {
    const tb = $("#racketTable tbody"); tb.innerHTML = "";
    rackets.forEach((r) => {
      const tr = el("tr");
      const isNew = r.year >= 2026 ? ` <span class="new-badge">NEW</span>` : "";
      tr.innerHTML = `<td>${r.brand} ${r.model}${isNew}</td><td>${r.year}</td><td>${Math.round(r.head_size_sqin)}</td>` +
        `<td>${Math.round(r.strung_weight_g)} g</td><td>${r.balance_pts_hl}</td><td>${Math.round(r.swingweight)}</td>` +
        `<td>${Math.round(r.stiffness_ra)}</td><td>${r.string_pattern}</td><td>${r.category}</td>`;
      tb.appendChild(tr);
    });
  }

  // --- browse strings ---------------------------------------------------
  let stringsBound = false;
  async function renderStrings() {
    const data = await dataReady; if (!data) return;
    if (!stringsBound) {
      drawStringRows(data.strings);
      $("#stringCount").textContent = `(${data.strings.length})`;
      $("#stringFilter").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        drawStringRows(data.strings.filter((s) => `${s.brand} ${s.model} ${s.type}`.toLowerCase().includes(q)));
      });
      stringsBound = true;
    }
  }
  function drawStringRows(strings) {
    const tb = $("#stringTable tbody"); tb.innerHTML = "";
    strings.forEach((s) => {
      const tr = el("tr");
      const arm = s.arm_friendly ? `<span class="pill pill-soft">yes</span>` : `<span class="muted-count">no</span>`;
      tr.innerHTML = `<td>${s.brand} ${s.model}</td><td>${s.type}</td><td>${s.gauge} mm</td><td>${s.spin}</td>` +
        `<td>${s.control}</td><td>${s.power}</td><td>${s.comfort}</td><td>${arm}</td><td>${s.price_usd ? "$" + s.price_usd : ""}</td>`;
      tb.appendChild(tr);
    });
  }

  // --- boot -------------------------------------------------------------
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !$("#view-quiz").hidden && !$("#nextBtn").disabled) next();
  });
  buildMap();
  route();
})();
