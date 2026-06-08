/* RacketFit front-end. Vanilla JS, no build step. */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };

  const sections = {
    intro: $("#intro"),
    survey: $("#survey"),
    loading: $("#loading"),
    results: $("#results"),
    browse: $("#browse"),
  };
  function show(name) {
    Object.entries(sections).forEach(([k, node]) => (node.hidden = k !== name));
    $("#restartLink").hidden = name === "intro";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let survey = [];
  let step = 0;
  const answers = {};

  // --- load survey -------------------------------------------------------
  async function loadSurvey() {
    try {
      const res = await fetch("/api/survey");
      const data = await res.json();
      survey = data.survey;
    } catch (e) {
      survey = FALLBACK_SURVEY; // works even if opened as a static file
    }
  }

  // --- render one question ----------------------------------------------
  function renderQuestion() {
    const q = survey[step];
    const mount = $("#questionMount");
    mount.innerHTML = "";

    mount.appendChild(el("h2", "q-title", q.title));
    if (q.help) mount.appendChild(el("p", "q-help", q.help));

    if (q.type === "number") {
      const input = el("input", "num-input");
      input.type = "number";
      input.inputMode = "numeric";
      input.placeholder = q.placeholder || "";
      if (answers[q.key] != null) input.value = answers[q.key];
      input.addEventListener("input", () => {
        const v = input.value.trim();
        answers[q.key] = v === "" ? null : Number(v);
        validate();
      });
      mount.appendChild(input);
    } else {
      const wrap = el("div", "options");
      q.options.forEach((opt) => {
        const node = el("button", "option");
        node.type = "button";
        node.innerHTML =
          `<span class="dot"></span>` +
          `<span><span class="opt-label">${opt.label}</span>` +
          (opt.desc ? `<br><span class="opt-desc">${opt.desc}</span>` : "") +
          `</span>`;
        if (answers[q.key] === opt.value) node.classList.add("selected");
        node.addEventListener("click", () => {
          answers[q.key] = opt.value;
          wrap.querySelectorAll(".option").forEach((o) => o.classList.remove("selected"));
          node.classList.add("selected");
          validate();
        });
        wrap.appendChild(node);
      });
      mount.appendChild(wrap);
    }

    const pct = ((step) / survey.length) * 100;
    $("#progressFill").style.width = `${pct}%`;
    $("#progressLabel").textContent = `Question ${step + 1} of ${survey.length}`;
    $("#backBtn").style.visibility = step === 0 ? "hidden" : "visible";
    $("#nextBtn").textContent = step === survey.length - 1 ? "See my matches →" : "Next →";
    validate();
  }

  function validate() {
    const q = survey[step];
    const answered = q.optional || answers[q.key] !== undefined;
    $("#nextBtn").disabled = !answered;
  }

  // --- navigation --------------------------------------------------------
  function next() {
    if (step < survey.length - 1) {
      step++;
      renderQuestion();
    } else {
      submit();
    }
  }
  function back() {
    if (step > 0) {
      step--;
      renderQuestion();
    }
  }

  // --- submit & results --------------------------------------------------
  async function submit() {
    show("loading");
    let payload;
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: answers, top_n: 5 }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Request failed");
      payload = await res.json();
    } catch (e) {
      $("#results").hidden = false;
      $("#loading").hidden = true;
      $("#matchList").innerHTML = `<p class="error">Could not reach the engine: ${e.message}. Run with <code>python -m racketfit.web</code>.</p>`;
      return;
    }
    renderResults(payload);
    show("results");
  }

  function specChip(k, t) {
    const v = `${t.ideal}${t.unit || ""}`;
    return `<div class="spec-chip"><div class="k">${t.label}</div><div class="v">${v}</div></div>`;
  }

  function renderResults(data) {
    // ideal card
    const ideal = data.ideal;
    const chips = Object.entries(ideal.targets).map(([k, t]) => specChip(k, t)).join("");
    let patternNote = "";
    if (ideal.prefer_open_pattern === true) patternNote = "Open string pattern (more spin)";
    else if (ideal.prefer_open_pattern === false) patternNote = "Dense string pattern (more control)";
    const notes = (ideal.notes || []).concat(patternNote ? [patternNote] : []);
    $("#idealCard").innerHTML =
      `<h3>Your target spec profile</h3>` +
      `<div class="spec-grid">${chips}</div>` +
      (notes.length ? `<ul class="ideal-notes">${notes.map((n) => `<li>${n}</li>`).join("")}</ul>` : "");

    // matches
    const list = $("#matchList");
    list.innerHTML = "";
    data.recommendations.forEach((rec, i) => {
      const r = rec.racket;
      const card = el("div", "match" + (i === 0 ? " top" : ""));
      const price = r.msrp_usd ? `<span class="match-price">$${r.msrp_usd}</span>` : "";
      const isNew = r.year >= 2026 ? `<span class="new-badge">NEW 2026</span>` : "";
      const reasons = rec.reasons.map((x) => `<li class="good">${x}</li>`).join("");
      const cautions = rec.cautions.map((x) => `<li class="warn">${x}</li>`).join("");
      card.innerHTML =
        `<span class="match-rank">${i === 0 ? "BEST MATCH" : "#" + (i + 1)}</span>` +
        `<div class="match-top"><span class="match-name">${r.brand} ${r.model} ${isNew}</span>` +
        `<span class="match-cat">${r.category} ${price}</span></div>` +
        `<div class="score-row"><div class="score-track"><div class="score-bar"></div></div>` +
        `<span class="score-pct">${rec.score}%</span></div>` +
        `<div class="spec-line">${Math.round(r.head_size_sqin)} sq in · ${Math.round(r.strung_weight_g)} g · ` +
        `${r.balance_pts_hl} pts HL · SW ${Math.round(r.swingweight)} · RA ${Math.round(r.stiffness_ra)} · ${r.string_pattern}</div>` +
        `<ul class="reasons">${reasons}${cautions}</ul>`;
      list.appendChild(card);
      animateBar(card, rec.score, i);
    });

    // setup banner
    if (data.summary) {
      const b = $("#setupBanner");
      b.hidden = false;
      b.innerHTML = `<span class="setup-label">Your complete setup</span><span class="setup-text">${data.summary}</span>`;
    }

    // strings
    const slist = $("#stringList");
    slist.innerHTML = "";
    (data.strings || []).forEach((srec, i) => {
      const s = srec.string;
      const card = el("div", "match" + (i === 0 ? " top" : ""));
      const price = s.price_usd ? `<span class="match-price">$${s.price_usd}</span>` : "";
      const reasons = srec.reasons.map((x) => `<li class="good">${x}</li>`).join("");
      const arm = s.arm_friendly ? `<span class="pill pill-soft">arm-friendly</span>` : "";
      card.innerHTML =
        `<span class="match-rank">${i === 0 ? "TOP PICK" : "#" + (i + 1)}</span>` +
        `<div class="match-top"><span class="match-name">${s.brand} ${s.model}</span>` +
        `<span class="match-cat">${s.type} · ${s.gauge} mm ${price}</span></div>` +
        `<div class="score-row"><div class="score-track"><div class="score-bar"></div></div>` +
        `<span class="score-pct">${srec.score}%</span></div>` +
        `<div class="spec-line">Spin ${s.spin} · Control ${s.control} · Power ${s.power} · Comfort ${s.comfort} ${arm}</div>` +
        `<ul class="reasons">${reasons}</ul>`;
      slist.appendChild(card);
      animateBar(card, srec.score, i);
    });

    // tension
    const t = data.tension;
    if (t) {
      $("#tensionCard").innerHTML =
        `<div class="kit-icon">🎯</div><div class="kit-label">Stringing tension</div>` +
        `<div class="kit-value">${t.ideal} lbs</div>` +
        `<div class="kit-sub">recommended range ${t.lo}–${t.hi} lbs</div>` +
        `<ul class="kit-notes">${t.notes.map((n) => `<li>${n}</li>`).join("")}</ul>`;
    }

    // grip
    const g = data.grip;
    $("#gripCard").innerHTML =
      `<div class="kit-icon">✊</div><div class="kit-label">Grip size${g.confident ? "" : " (estimate)"}</div>` +
      `<div class="kit-value">${g.label}</div>` +
      `<div class="kit-sub">${g.inches}"</div>` +
      `<ul class="kit-notes">${g.notes.map((n) => `<li>${n}</li>`).join("")}</ul>`;

    $("#disclaimer").textContent = data.disclaimer ||
      "Specs are approximate, demo before you buy.";
  }

  function animateBar(card, score, i) {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const bar = card.querySelector(".score-bar");
        if (bar) bar.style.width = `${score}%`;
      }, 60 + i * 90);
    });
  }

  // --- browse all --------------------------------------------------------
  async function showBrowse() {
    show("browse");
    const tbody = $("#racketTable tbody");
    if (tbody.children.length) return;
    try {
      const res = await fetch("/api/rackets");
      const data = await res.json();
      data.rackets.forEach((r) => {
        const tr = el("tr");
        tr.innerHTML =
          `<td>${r.brand} ${r.model}</td><td>${Math.round(r.head_size_sqin)}</td>` +
          `<td>${Math.round(r.strung_weight_g)} g</td><td>${r.balance_pts_hl}</td>` +
          `<td>${Math.round(r.swingweight)}</td><td>${Math.round(r.stiffness_ra)}</td>` +
          `<td>${r.string_pattern}</td><td>${r.category}</td>`;
        tbody.appendChild(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" class="error">Could not load rackets.</td></tr>`;
    }
  }

  function start() {
    step = 0;
    show("survey");
    renderQuestion();
  }
  function restart() {
    step = 0;
    for (const k of Object.keys(answers)) delete answers[k];
    show("intro");
  }

  // --- wire up -----------------------------------------------------------
  $("#startBtn").addEventListener("click", start);
  $("#nextBtn").addEventListener("click", next);
  $("#backBtn").addEventListener("click", back);
  $("#redoBtn").addEventListener("click", restart);
  $("#restartLink").addEventListener("click", (e) => { e.preventDefault(); restart(); });
  $("#browseBtn").addEventListener("click", showBrowse);
  $("#browseBackBtn").addEventListener("click", () => show("results"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !sections.survey.hidden && !$("#nextBtn").disabled) next();
  });

  // fallback survey if API is unreachable (e.g. opened via file://)
  const FALLBACK_SURVEY = [];

  loadSurvey().then(() => {
    // nothing else; user clicks "Take the survey"
  });
})();
