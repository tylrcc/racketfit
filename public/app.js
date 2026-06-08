/* RacketFit single-page app: clean-URL routing + quiz + browse, engine runs
   in-browser, fully localized via window.I18N. */
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
  const t = (k, v) => (window.I18N ? window.I18N.t(k, v) : k);

  const VIEWS = ["home", "quiz", "loading", "results", "rackets", "strings", "guide"];
  const HASH_VIEWS = ["home", "quiz", "rackets", "strings", "guide"];

  function showView(name) {
    VIEWS.forEach((v) => { const n = $("#view-" + v); if (n) n.hidden = v !== name; });
    $$(".nav-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === name));
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

  // --- clean-URL routing (no more #home in the address bar) -------------
  // Maps a view name to a clean path and back. Home is just "/".
  const pathFor = (name) => (name === "home" ? "/" : "/" + name);
  function viewFromLocation() {
    // Support legacy hash links (#quiz) by reading either source.
    let p = location.pathname.replace(/\/+$/, "") || "/";
    let name = p === "/" ? "home" : p.slice(1);
    if (location.hash) { const h = location.hash.slice(1); if (HASH_VIEWS.includes(h)) name = h; }
    return HASH_VIEWS.includes(name) ? name : "home";
  }
  function render(name) {
    if (name === "quiz") { showView("quiz"); startQuiz(); }
    else if (name === "rackets") { showView("rackets"); renderRackets(); }
    else if (name === "strings") { showView("strings"); renderStrings(); }
    else showView(name);
  }
  function navigate(name) {
    const path = pathFor(name);
    if (location.pathname !== path || location.hash) {
      history.pushState({ view: name }, "", path);
    }
    render(name);
  }
  window.addEventListener("popstate", () => render(viewFromLocation()));
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-nav]");
    if (!a) return;
    e.preventDefault();
    navigate(a.getAttribute("data-view") || "home");
  });
  $("#navBurger").addEventListener("click", () => $("#nav").classList.toggle("nav-open"));
  window.addEventListener("scroll", () => {
    $("#nav").classList.toggle("scrolled", window.scrollY > 8);
  });

  // --- generated artwork (license-safe SVG "photos") --------------------
  const BRAND_COLOR = {
    Babolat: "#e8b500", Wilson: "#d4202a", Head: "#1d1d1f", Yonex: "#0a3d91",
    Tecnifibre: "#e2001a", Prince: "#5b2a86", Dunlop: "#f0a500", Volkl: "#cf1020",
    Solinco: "#222428",
  };
  const TYPE_COLOR = {
    Polyester: "#5774a8", Multifilament: "#7ec6a0", "Synthetic Gut": "#c0a35e",
    "Natural Gut": "#e8d6a8",
  };

  // A clean tennis-racket illustration. Head oval scales with head size and the
  // string grid reflects the actual pattern (e.g. 16x19).
  function racketSVG(r) {
    const c = BRAND_COLOR[r.brand] || "#3b5998";
    const mains = parseInt(String(r.string_pattern).split("x")[0], 10) || 16;
    const crosses = parseInt(String(r.string_pattern).split("x")[1], 10) || 19;
    const hw = 60, hh = 78; // head ellipse radii area (viewBox 140x220)
    const cx = 70, cy = 70;
    // string grid clipped to head ellipse
    let lines = "";
    for (let i = 1; i < mains; i++) {
      const x = cx - hw + (2 * hw) * (i / mains);
      lines += `<line x1="${x}" y1="${cy - hh}" x2="${x}" y2="${cy + hh}" />`;
    }
    for (let i = 1; i < crosses; i++) {
      const y = cy - hh + (2 * hh) * (i / crosses);
      lines += `<line x1="${cx - hw}" y1="${y}" x2="${cx + hw}" y2="${y}" />`;
    }
    return `<svg viewBox="0 0 140 220" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${r.brand} ${r.model}">
      <defs><clipPath id="h${r.id}"><ellipse cx="${cx}" cy="${cy}" rx="${hw - 5}" ry="${hh - 5}"/></clipPath></defs>
      <ellipse cx="${cx}" cy="${cy}" rx="${hw}" ry="${hh}" fill="#fbfcff" stroke="${c}" stroke-width="9"/>
      <g clip-path="url(#h${r.id})" stroke="#c9d3e6" stroke-width="1.1">${lines}</g>
      <ellipse cx="${cx}" cy="${cy}" rx="${hw}" ry="${hh}" fill="none" stroke="${c}" stroke-width="9" opacity=".9"/>
      <path d="M52 ${cy + hh - 6} L62 200 M88 ${cy + hh - 6} L78 200" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <rect x="60" y="196" width="20" height="20" rx="4" fill="${c}"/>
      <rect x="58" y="150" width="24" height="52" rx="6" fill="none" stroke="${c}" stroke-width="6"/>
    </svg>`;
  }

  // A spool/reel of string, tinted by string type.
  function stringSVG(s) {
    const c = TYPE_COLOR[s.type] || "#5774a8";
    const bc = BRAND_COLOR[s.brand] || c;
    let coils = "";
    for (let i = 0; i < 7; i++) {
      const y = 64 + i * 13;
      coils += `<path d="M34 ${y} Q70 ${y - 9} 106 ${y}" stroke="${c}" stroke-width="4" fill="none" opacity="${0.55 + i * 0.06}"/>`;
    }
    return `<svg viewBox="0 0 140 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${s.brand} ${s.model}">
      <rect x="26" y="44" width="88" height="112" rx="12" fill="#fbfcff" stroke="${bc}" stroke-width="6"/>
      <rect x="26" y="44" width="88" height="26" rx="12" fill="${bc}"/>
      ${coils}
      <circle cx="70" cy="150" r="9" fill="${bc}"/>
    </svg>`;
  }

  // --- home: map grid ---------------------------------------------------
  const MAP = [
    { emoji: "🌱", key: "beginner" }, { emoji: "🔥", key: "aggro" },
    { emoji: "🎯", key: "control" }, { emoji: "🛡️", key: "counter" },
    { emoji: "🤚", key: "arm" }, { emoji: "🥎", key: "spin" },
  ];
  function buildMap() {
    const g = $("#mapGrid");
    if (!g) return;
    g.innerHTML = "";
    MAP.forEach((m) => {
      const card = el("a", "map-card");
      card.setAttribute("data-nav", ""); card.setAttribute("data-view", "quiz"); card.href = "/quiz";
      card.innerHTML = `<span class="map-emoji">${m.emoji}</span>` +
        `<span class="map-title">${t("map." + m.key + ".t")}</span>` +
        `<span class="map-desc">${t("map." + m.key + ".d")}</span>`;
      g.appendChild(card);
    });
  }

  // --- quiz -------------------------------------------------------------
  const SURVEY = window.RacketFit.SURVEY;
  let step = 0;
  let answers = {};

  function startQuiz() { step = 0; answers = {}; renderQuestion(); }
  function renderQuestion() {
    const q = SURVEY[step];
    const mount = $("#questionMount");
    mount.innerHTML = "";
    mount.appendChild(el("h2", "q-title", t("q." + q.key + ".title")));
    mount.appendChild(el("p", "q-help", t("q." + q.key + ".help")));

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
        const label = t("o." + q.key + "." + String(opt.value) + ".l");
        const desc = t("o." + q.key + "." + String(opt.value) + ".d");
        node.innerHTML = `<span class="dot"></span><span><span class="opt-label">${label}</span>` +
          `<br><span class="opt-desc">${desc}</span></span>`;
        if (answers[q.key] === opt.value) node.classList.add("selected");
        node.addEventListener("click", () => {
          answers[q.key] = opt.value;
          $$(".option", wrap).forEach((o) => o.classList.remove("selected"));
          node.classList.add("selected");
          validate();
          setTimeout(next, 200);
        });
        wrap.appendChild(node);
      });
      mount.appendChild(wrap);
    }

    $("#progressFill").style.width = `${(step / SURVEY.length) * 100}%`;
    $("#progressLabel").textContent = t("quiz.qof", { n: step + 1, total: SURVEY.length });
    $("#backBtn").style.visibility = step === 0 ? "hidden" : "visible";
    $("#backBtn").textContent = t("quiz.back");
    $("#nextBtn").textContent = step === SURVEY.length - 1 ? t("quiz.see") : t("quiz.next");
    validate();
  }
  function validate() {
    const q = SURVEY[step];
    $("#nextBtn").disabled = !(q.optional || answers[q.key] !== undefined);
  }
  function next() { if (step < SURVEY.length - 1) { step++; renderQuestion(); } else submit(); }
  function back() { if (step > 0) { step--; renderQuestion(); } }
  $("#nextBtn").addEventListener("click", next);
  $("#backBtn").addEventListener("click", back);
  $("#redoBtn").addEventListener("click", () => navigate("quiz"));

  let lastReport = null;
  async function submit() {
    showView("loading");
    const data = await dataReady;
    if (!data) {
      showView("results");
      $("#matchList").innerHTML = `<p class="error">Could not load the gear database. Please refresh and try again.</p>`;
      return;
    }
    await new Promise((r) => setTimeout(r, 380));
    lastReport = window.RacketFit.buildReport(answers, data, 5);
    renderResults(lastReport);
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
      .map((tt) => `<div class="spec-chip"><div class="k">${tt.label}</div><div class="v">${tt.ideal}${tt.unit || ""}</div></div>`).join("");
    let pat = "";
    if (ideal.prefer_open_pattern === true) pat = t("results.patopen") || "Open string pattern (more spin)";
    else if (ideal.prefer_open_pattern === false) pat = t("results.patdense") || "Dense string pattern (more control)";
    const notes = (ideal.notes || []).concat(pat ? [pat] : []);
    $("#idealCard").innerHTML = `<h3>${t("results.target")}</h3><div class="spec-grid">${chips}</div>` +
      (notes.length ? `<ul class="ideal-notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : "");

    const banner = $("#setupBanner");
    if (data.summary) { banner.hidden = false; banner.innerHTML =
      `<span class="setup-label">${t("results.setuplabel")}</span><span class="setup-text">${data.summary}</span>`; }
    else banner.hidden = true;

    const list = $("#matchList"); list.innerHTML = "";
    data.recommendations.forEach((rec, i) => {
      const r = rec.racket;
      const card = el("div", "match" + (i === 0 ? " top" : ""));
      const price = r.msrp_usd ? `<span class="match-price">$${r.msrp_usd}</span>` : "";
      const isNew = r.year >= 2026 ? `<span class="new-badge">${t("results.new")}</span>` : "";
      card.innerHTML =
        `<span class="match-rank">${i === 0 ? t("results.bestmatch") : "#" + (i + 1)}</span>` +
        `<div class="match-media">${racketSVG(r)}</div>` +
        `<div class="match-body">` +
        `<div class="match-top"><span class="match-name">${r.brand} ${r.model} ${isNew}</span>` +
        `<span class="match-cat">${r.category} ${price}</span></div>` +
        `<div class="score-row"><div class="score-track"><div class="score-bar"></div></div><span class="score-pct">${rec.score}%</span></div>` +
        `<div class="spec-line">${Math.round(r.head_size_sqin)} sq in · ${Math.round(r.strung_weight_g)} g · ${r.balance_pts_hl} pts HL · SW ${Math.round(r.swingweight)} · RA ${Math.round(r.stiffness_ra)} · ${r.string_pattern}</div>` +
        `<ul class="reasons">${rec.reasons.map((x) => `<li class="good">${x}</li>`).join("")}${rec.cautions.map((x) => `<li class="warn">${x}</li>`).join("")}</ul>` +
        `</div>`;
      list.appendChild(card); animateBar(card, rec.score, i);
    });

    const slist = $("#stringList"); slist.innerHTML = "";
    (data.strings || []).forEach((srec, i) => {
      const s = srec.string;
      const card = el("div", "match" + (i === 0 ? " top" : ""));
      const price = s.price_usd ? `<span class="match-price">$${s.price_usd}</span>` : "";
      const arm = s.arm_friendly ? `<span class="pill pill-soft">arm-friendly</span>` : "";
      card.innerHTML =
        `<span class="match-rank">${i === 0 ? t("results.toppick") : "#" + (i + 1)}</span>` +
        `<div class="match-media">${stringSVG(s)}</div>` +
        `<div class="match-body">` +
        `<div class="match-top"><span class="match-name">${s.brand} ${s.model}</span>` +
        `<span class="match-cat">${s.type} · ${s.gauge} mm ${price}</span></div>` +
        `<div class="score-row"><div class="score-track"><div class="score-bar"></div></div><span class="score-pct">${srec.score}%</span></div>` +
        `<div class="spec-line">Spin ${s.spin} · Control ${s.control} · Power ${s.power} · Comfort ${s.comfort} ${arm}</div>` +
        `<ul class="reasons">${srec.reasons.map((x) => `<li class="good">${x}</li>`).join("")}</ul>` +
        `</div>`;
      slist.appendChild(card); animateBar(card, srec.score, i);
    });

    const tn = data.tension;
    if (tn) $("#tensionCard").innerHTML =
      `<div class="kit-icon">🎯</div><div class="kit-label">${t("kit.tension")}</div><div class="kit-value">${tn.ideal} lbs</div>` +
      `<div class="kit-sub">${t("kit.tensionrange", { lo: tn.lo, hi: tn.hi })}</div>` +
      `<ul class="kit-notes">${tn.notes.map((n) => `<li>${n}</li>`).join("")}</ul>`;

    const g = data.grip;
    $("#gripCard").innerHTML =
      `<div class="kit-icon">✊</div><div class="kit-label">${g.confident ? t("kit.grip") : t("kit.gripest")}</div><div class="kit-value">${g.label}</div>` +
      `<div class="kit-sub">${g.inches}"</div><ul class="kit-notes">${g.notes.map((n) => `<li>${n}</li>`).join("")}</ul>`;

    $("#disclaimer").textContent = data.disclaimer || "";
  }

  // --- browse rackets (table + gallery) ---------------------------------
  let racketsBound = false, racketView = "grid", racketRows = [];
  async function renderRackets() {
    const data = await dataReady; if (!data) return;
    racketRows = data.rackets;
    if (!racketsBound) {
      $("#browseCount").textContent = `(${data.rackets.length})`;
      $("#browseFilter").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        drawRackets(data.rackets.filter((r) => `${r.brand} ${r.model} ${r.category} ${r.year}`.toLowerCase().includes(q)));
      });
      $$("#racketToggle .seg").forEach((b) => b.addEventListener("click", () => {
        racketView = b.dataset.mode;
        $$("#racketToggle .seg").forEach((x) => x.classList.toggle("active", x === b));
        drawRackets(racketRows);
      }));
      racketsBound = true;
    }
    drawRackets(data.rackets);
  }
  function drawRackets(rackets) {
    racketRows = rackets;
    const tableWrap = $("#racketTableWrap"), grid = $("#racketGrid");
    if (racketView === "table") {
      tableWrap.hidden = false; grid.hidden = true;
      const tb = $("#racketTable tbody"); tb.innerHTML = "";
      rackets.forEach((r) => {
        const tr = el("tr");
        const isNew = r.year >= 2026 ? ` <span class="new-badge">${t("results.new")}</span>` : "";
        tr.innerHTML = `<td>${r.brand} ${r.model}${isNew}</td><td>${r.year}</td><td>${Math.round(r.head_size_sqin)}</td>` +
          `<td>${Math.round(r.strung_weight_g)} g</td><td>${r.balance_pts_hl}</td><td>${Math.round(r.swingweight)}</td>` +
          `<td>${Math.round(r.stiffness_ra)}</td><td>${r.string_pattern}</td><td>${r.category}</td>`;
        tb.appendChild(tr);
      });
    } else {
      tableWrap.hidden = true; grid.hidden = false;
      grid.innerHTML = "";
      rackets.forEach((r) => {
        const isNew = r.year >= 2026 ? `<span class="new-badge">${t("results.new")}</span>` : "";
        const card = el("div", "gcard");
        card.innerHTML = `<div class="gcard-media gcard-media--racket">${racketSVG(r)}</div>` +
          `<div class="gcard-name">${r.brand} ${r.model} ${isNew}</div>` +
          `<div class="gcard-meta">${r.year} · ${r.category}</div>` +
          `<div class="gcard-spec">${Math.round(r.head_size_sqin)} sq in · ${Math.round(r.strung_weight_g)} g · ${r.string_pattern} · RA ${Math.round(r.stiffness_ra)}</div>`;
        grid.appendChild(card);
      });
    }
  }

  // --- browse strings (table + gallery) ---------------------------------
  let stringsBound = false, stringView = "grid", stringRows = [];
  async function renderStrings() {
    const data = await dataReady; if (!data) return;
    stringRows = data.strings;
    if (!stringsBound) {
      $("#stringCount").textContent = `(${data.strings.length})`;
      $("#stringFilter").addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase();
        drawStrings(data.strings.filter((s) => `${s.brand} ${s.model} ${s.type}`.toLowerCase().includes(q)));
      });
      $$("#stringToggle .seg").forEach((b) => b.addEventListener("click", () => {
        stringView = b.dataset.mode;
        $$("#stringToggle .seg").forEach((x) => x.classList.toggle("active", x === b));
        drawStrings(stringRows);
      }));
      stringsBound = true;
    }
    drawStrings(data.strings);
  }
  function drawStrings(strings) {
    stringRows = strings;
    const tableWrap = $("#stringTableWrap"), grid = $("#stringGrid");
    if (stringView === "table") {
      tableWrap.hidden = false; grid.hidden = true;
      const tb = $("#stringTable tbody"); tb.innerHTML = "";
      strings.forEach((s) => {
        const tr = el("tr");
        const arm = s.arm_friendly ? `<span class="pill pill-soft">✓</span>` : `<span class="muted-count">–</span>`;
        tr.innerHTML = `<td>${s.brand} ${s.model}</td><td>${s.type}</td><td>${s.gauge} mm</td><td>${s.spin}</td>` +
          `<td>${s.control}</td><td>${s.power}</td><td>${s.comfort}</td><td>${arm}</td><td>${s.price_usd ? "$" + s.price_usd : ""}</td>`;
        tb.appendChild(tr);
      });
    } else {
      tableWrap.hidden = true; grid.hidden = false;
      grid.innerHTML = "";
      strings.forEach((s) => {
        const card = el("div", "gcard");
        card.innerHTML = `<div class="gcard-media gcard-media--string">${stringSVG(s)}</div>` +
          `<div class="gcard-name">${s.brand} ${s.model}</div>` +
          `<div class="gcard-meta">${s.type} · ${s.gauge} mm</div>` +
          `<div class="gcard-spec">Spin ${s.spin} · Control ${s.control} · Power ${s.power} · Comfort ${s.comfort}</div>`;
        grid.appendChild(card);
      });
    }
  }

  // --- re-render dynamic content on language change ---------------------
  document.addEventListener("i18n:change", () => {
    buildMap();
    if (!$("#view-quiz").hidden) renderQuestion();
    if (!$("#view-results").hidden && lastReport) renderResults(lastReport);
    if (!$("#view-rackets").hidden) drawRackets(racketRows);
    if (!$("#view-strings").hidden) drawStrings(stringRows);
  });

  // --- boot -------------------------------------------------------------
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !$("#view-quiz").hidden && !$("#nextBtn").disabled) next();
  });
  // Fill the hero stat counts from the live dataset.
  dataReady.then((d) => {
    if (!d) return;
    const a = $("#statRackets"), b = $("#statStrings");
    if (a) a.textContent = d.rackets.length;
    if (b) b.textContent = d.strings.length;
  });
  // Strip any legacy hash so the URL stays clean on first load.
  if (location.hash) {
    const name = viewFromLocation();
    history.replaceState({ view: name }, "", pathFor(name));
  }
  buildMap();
  render(viewFromLocation());
})();
