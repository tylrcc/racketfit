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
  const tierBadge = (it) => (it && it.tier ? `<span class="tier-badge tier-${it.tier}" title="Tier ${it.tier}">${it.tier}</span>` : "");

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

  function darken(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r * (1 - amt)); g = Math.round(g * (1 - amt)); b = Math.round(b * (1 - amt));
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
  }

  // Realistic, uniform tennis-racket render (transparent SVG): brand-colored
  // frame with gloss, real string pattern, throat bridge, wrapped grip, butt cap.
  function racketSVG(r) {
    const c = BRAND_COLOR[r.brand] || "#3b5998", d = darken(c, 0.5);
    const parts = String(r.string_pattern).split("x");
    const mains = parseInt(parts[0], 10) || 16, crosses = parseInt(parts[1], 10) || 19;
    const cx = 100, cy = 150, rx = 80, ry = 122, irx = rx - 9, iry = ry - 9;
    let s = "";
    for (let i = 1; i < mains; i++) { const x = cx - irx + (2 * irx) * (i / mains); s += `<line x1="${x}" y1="${cy - iry}" x2="${x}" y2="${cy + iry}"/>`; }
    for (let i = 1; i < crosses; i++) { const y = cy - iry + (2 * iry) * (i / crosses); s += `<line x1="${cx - irx}" y1="${y}" x2="${cx + irx}" y2="${y}"/>`; }
    let grip = "";
    for (let i = 0; i < 8; i++) { const y = 366 + i * 13; grip += `<line x1="86" y1="${y}" x2="114" y2="${y - 8}" stroke="rgba(255,255,255,.13)" stroke-width="2"/>`; }
    const gid = "rg" + r.id, cid = "rc" + r.id;
    return `<svg viewBox="0 0 200 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${r.brand} ${r.model}">
      <defs>
        <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient>
        <clipPath id="${cid}"><ellipse cx="${cx}" cy="${cy}" rx="${irx}" ry="${iry}"/></clipPath>
      </defs>
      <ellipse cx="100" cy="486" rx="30" ry="6" fill="rgba(15,23,42,.10)"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${irx}" ry="${iry}" fill="#fcfdff"/>
      <g clip-path="url(#${cid})" stroke="#aeb8c8" stroke-width="1">${s}</g>
      <path d="M64 250 L93 322" stroke="url(#${gid})" stroke-width="12" stroke-linecap="round"/>
      <path d="M136 250 L107 322" stroke="url(#${gid})" stroke-width="12" stroke-linecap="round"/>
      <rect x="90" y="300" width="20" height="172" rx="6" fill="url(#${gid})"/>
      <rect x="86" y="356" width="28" height="116" rx="8" fill="#23262c"/>
      ${grip}
      <rect x="83" y="464" width="34" height="16" rx="5" fill="#15171c"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="url(#${gid})" stroke-width="12"/>
      <ellipse cx="${cx - 3}" cy="${cy}" rx="${rx - 6}" ry="${ry - 6}" fill="none" stroke="#ffffff" stroke-opacity=".3" stroke-width="2"/>
    </svg>`;
  }

  // Realistic coiled string set (transparent SVG), tinted by type, with a label.
  function stringSVG(s) {
    const c = TYPE_COLOR[s.type] || "#5774a8", d = darken(c, 0.4);
    const bc = BRAND_COLOR[s.brand] || c;
    return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${s.brand} ${s.model}">
      <ellipse cx="100" cy="150" rx="76" ry="9" fill="rgba(15,23,42,.10)"/>
      <ellipse cx="100" cy="100" rx="74" ry="52" fill="none" stroke="${c}" stroke-width="26"/>
      <ellipse cx="100" cy="100" rx="74" ry="52" fill="none" stroke="${d}" stroke-width="26" stroke-dasharray="2 7" opacity=".55"/>
      <ellipse cx="100" cy="100" rx="74" ry="52" fill="none" stroke="#ffffff" stroke-width="26" stroke-dasharray="1 26" opacity=".22"/>
      <rect x="82" y="36" width="36" height="128" rx="7" fill="${bc}"/>
      <rect x="82" y="36" width="36" height="128" rx="7" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1.5"/>
    </svg>`;
  }

  // Real product photo when an `image` URL is present, else the vector render.
  // A broken photo swaps back to the render via the data-fallback handler.
  function mediaFor(item, kind) {
    if (item.image) {
      return `<img class="real-photo" src="${item.image}" alt="${item.brand} ${item.model}" loading="lazy" ` +
        `onerror="this.replaceWith(window.__rfArt('${item.id}','${kind}'))">`;
    }
    return kind === "racket" ? racketSVG(item) : stringSVG(item);
  }
  // Lookup used by the photo onerror fallback to swap in the vector render.
  window.__rfArt = (id, kind) => {
    const item = (DATA && (kind === "racket" ? DATA.rackets : DATA.strings) || []).find((x) => x.id === id);
    const span = document.createElement("span");
    span.innerHTML = item ? (kind === "racket" ? racketSVG(item) : stringSVG(item)) : "";
    return span.firstChild || span;
  };

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
        `<div class="match-media">${mediaFor(r, "racket")}</div>` +
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
        `<div class="match-media">${mediaFor(s, "string")}</div>` +
        `<div class="match-body">` +
        `<div class="match-top"><span class="match-name">${s.brand} ${s.model} ${tierBadge(s)}</span>` +
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

    const cz = data.customization;
    const cc = $("#customCard");
    if (cz && cc) cc.innerHTML =
      `<div class="custom-head"><span class="kit-icon">🛠️</span><div><div class="kit-label">${t("custom.title")}</div>` +
      `<div class="custom-sw">${t("custom.target")} <strong>${cz.target_swingweight}</strong></div></div></div>` +
      `<ul class="custom-tips">${cz.tips.map((x) => `<li>${x}</li>`).join("")}</ul>` +
      `<a href="/guide" data-nav data-view="guide" class="custom-link">${t("custom.more")} →</a>`;

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
        card.innerHTML = `<div class="gcard-media gcard-media--racket">${mediaFor(r, "racket")}</div>` +
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
        tr.innerHTML = `<td>${tierBadge(s)} ${s.brand} ${s.model}</td><td>${s.type}</td><td>${s.gauge} mm</td><td>${s.spin}</td>` +
          `<td>${s.control}</td><td>${s.power}</td><td>${s.comfort}</td><td>${arm}</td><td>${s.price_usd ? "$" + s.price_usd : ""}</td>`;
        tb.appendChild(tr);
      });
    } else {
      tableWrap.hidden = true; grid.hidden = false;
      grid.innerHTML = "";
      strings.forEach((s) => {
        const card = el("div", "gcard");
        card.innerHTML = `<div class="gcard-media gcard-media--string">${mediaFor(s, "string")}</div>` +
          `<div class="gcard-name">${s.brand} ${s.model} ${tierBadge(s)}</div>` +
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
