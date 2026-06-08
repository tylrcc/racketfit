/* RacketFit engine, ported to the browser. Mirrors the Python package so the
   static site runs with no server. Data is loaded from /data/*.json. */
(function (global) {
  "use strict";

  // ---- Survey (shared source of truth) --------------------------------
  const SURVEY = [
    { key: "skill_level", title: "How would you rate your level?", help: "Be honest, it drives weight and head size more than anything.", type: "single", options: [
      { value: "beginner", label: "Beginner", desc: "New, or play casually a few times a month." },
      { value: "intermediate", label: "Intermediate", desc: "Solid rallies, league or regular play." },
      { value: "advanced", label: "Advanced", desc: "Competitive, strong technique, full strokes." } ] },
    { key: "play_style", title: "What is your style of play?", help: "How do you most like to win points?", type: "single", options: [
      { value: "aggressive_baseliner", label: "Aggressive baseliner", desc: "Dictate with big groundstrokes." },
      { value: "all_court", label: "All-court", desc: "Comfortable everywhere, adapt to the point." },
      { value: "counterpuncher", label: "Counterpuncher", desc: "Defense, consistency, redirect pace." },
      { value: "serve_and_volley", label: "Serve & volley / net", desc: "Get forward and finish at the net." } ] },
    { key: "swing_length", title: "How long is your swing?", help: "Compact, controlled cuts vs. long, full follow-throughs.", type: "single", options: [
      { value: "compact", label: "Compact", desc: "Short, quick swings. Blocks and punches." },
      { value: "moderate", label: "Moderate", desc: "A balanced, repeatable swing." },
      { value: "full", label: "Full", desc: "Long, fast, western-grip windshield wipers." } ] },
    { key: "power_source", title: "Where should the power come from?", help: "Do you want the racket to add pop, or do you bring your own?", type: "single", options: [
      { value: "needs_power", label: "From the racket", desc: "I want free depth and pop." },
      { value: "balanced", label: "A balance", desc: "A bit of help, but I can hit." },
      { value: "generates_own_power", label: "From me", desc: "I generate plenty, give me control." } ] },
    { key: "spin_priority", title: "How important is spin?", help: "Heavy topspin and slice vs. flatter, more direct hitting.", type: "single", options: [
      { value: "low", label: "Low", desc: "I hit fairly flat and direct." },
      { value: "medium", label: "Medium", desc: "Normal amount of spin." },
      { value: "high", label: "High", desc: "I live and die by heavy spin." } ] },
    { key: "maneuverability_priority", title: "How much do you value maneuverability?", help: "Fast hands at the net and quick reactions vs. raw stability.", type: "single", options: [
      { value: "low", label: "Low", desc: "I want stability and plow-through." },
      { value: "medium", label: "Medium", desc: "A reasonable middle ground." },
      { value: "high", label: "High", desc: "Whippy and quick is a must (e.g. doubles)." } ] },
    { key: "arm_sensitive", title: "Any arm, wrist, or elbow concerns?", help: "Tennis elbow or a history of arm trouble steers us to softer frames.", type: "boolean", options: [
      { value: true, label: "Yes, prioritize comfort", desc: "Softer, more flexible, arm-friendly frames." },
      { value: false, label: "No issues", desc: "Comfort is nice but not the priority." } ] },
    { key: "hand_length_in", title: "Measure your hand for grip size (optional)", help: "Open your hitting hand and measure in inches from the middle crease of your palm to the tip of your ring finger. That number is your grip size. Leave blank and we will guide you.", type: "number", optional: true, step: "0.125", placeholder: "e.g. 4.25" },
    { key: "budget_usd", title: "Any budget cap? (optional)", help: "We will only show rackets at or under this MSRP. Leave blank for no limit.", type: "number", optional: true, placeholder: "e.g. 220" },
  ];

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pick = (map, key) => map[key];

  // Match Python's round() (round-half-to-even) so the JS and Python engines
  // produce byte-identical results.
  function pyRound(x) {
    const f = Math.floor(x);
    const d = x - f;
    if (Math.abs(d - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
    return Math.round(x);
  }
  const round1 = (x) => pyRound(x * 10) / 10;

  // ---- Ideal spec from survey -----------------------------------------
  function buildIdealSpec(p) {
    const notes = [];

    let head = 98
      + pick({ beginner: 8, intermediate: 3, advanced: -1 }, p.skill_level)
      + pick({ needs_power: 4, balanced: 0, generates_own_power: -3 }, p.power_source)
      + (p.spin_priority === "high" ? 1 : 0)
      + (p.arm_sensitive ? 2 : 0);
    head = clamp(head, 95, 110);

    let weight = 312
      + pick({ beginner: -22, intermediate: -4, advanced: 8 }, p.skill_level)
      + pick({ needs_power: -8, balanced: 0, generates_own_power: 8 }, p.power_source)
      + pick({ compact: -12, moderate: 0, full: 8 }, p.swing_length)
      + (p.maneuverability_priority === "high" ? -10 : p.maneuverability_priority === "low" ? 4 : 0);
    weight = clamp(weight, 270, 340);

    let balance = 5
      + pick({ beginner: -4, intermediate: 0, advanced: 2 }, p.skill_level)
      + pick({ needs_power: -3, balanced: 0, generates_own_power: 2 }, p.power_source)
      + (p.maneuverability_priority === "high" ? 2 : p.maneuverability_priority === "low" ? -1 : 0);
    balance = clamp(balance, -2, 10);

    let swing = 318
      + pick({ beginner: -16, intermediate: -2, advanced: 8 }, p.skill_level)
      + pick({ compact: -12, moderate: 0, full: 8 }, p.swing_length)
      + pick({ needs_power: -2, balanced: 0, generates_own_power: 4 }, p.power_source)
      + (p.maneuverability_priority === "high" ? -10 : p.maneuverability_priority === "low" ? 4 : 0);
    swing = clamp(swing, 290, 340);

    let stiffness = 65
      + pick({ needs_power: 3, balanced: 0, generates_own_power: -2 }, p.power_source)
      + pick({ beginner: 1, intermediate: 0, advanced: -2 }, p.skill_level);
    let stiffnessWeight = 1.0;
    if (p.arm_sensitive) {
      stiffness -= 8;
      stiffnessWeight = 2.2;
      notes.push("Prioritizing a flexible, arm-friendly frame (lower RA) for comfort.");
    }
    stiffness = clamp(stiffness, 55, 73);

    let preferOpen = null;
    let patternWeight = 0.7;
    if (p.spin_priority === "high") {
      preferOpen = true; patternWeight = 1.0;
      notes.push("Leaning toward an open string pattern for extra spin and bite.");
    } else if (p.spin_priority === "low" && ["all_court", "serve_and_volley", "counterpuncher"].includes(p.play_style)) {
      preferOpen = false; patternWeight = 0.8;
      notes.push("Leaning toward a denser string pattern for control and a predictable response.");
    }

    if (p.play_style === "aggressive_baseliner") notes.push("Built for an aggressive baseliner: enough mass to drive through the ball.");
    else if (p.play_style === "serve_and_volley") notes.push("Tuned for serve-and-volley: maneuverable and stable at the net.");
    else if (p.play_style === "counterpuncher") notes.push("Tuned for a counterpuncher: control and consistency over raw power.");

    const T = (ideal, half, tol, weight, label, unit) =>
      ({ ideal, lo: ideal - half, hi: ideal + half, tolerance: tol, weight, label, unit });

    const targets = {
      head_size_sqin: T(head, 2, 4, 1.4, "Head size", " sq in"),
      strung_weight_g: T(weight, 8, 14, 1.6, "Weight", " g"),
      balance_pts_hl: T(balance, 1.5, 3, 0.9, "Balance", " pts HL"),
      swingweight: T(swing, 8, 14, 1.3, "Swingweight", ""),
      stiffness_ra: T(stiffness, 2, 4, stiffnessWeight, "Stiffness", " RA"),
    };
    return { targets, prefer_open_pattern: preferOpen, pattern_weight: patternWeight, notes };
  }

  function scoreTarget(t, value) {
    const half = Math.max((t.hi - t.lo) / 2, 1e-6);
    const span = half + Math.max(t.tolerance, 1e-6);
    return Math.max(0, 1 - Math.abs(value - t.ideal) / span);
  }

  function isOpenPattern(pattern) {
    const mains = parseInt(String(pattern).toLowerCase().split("x")[0], 10);
    return isNaN(mains) ? true : mains <= 16;
  }

  function fmt(value, unit) {
    const v = Number.isInteger(value) ? value : Math.round(value * 10) / 10;
    return `${v}${unit}`;
  }

  function explainRacket(racket, ideal, matches) {
    const reasons = [], cautions = [];
    const sorted = matches.slice().sort((a, b) => b.score - a.score);
    for (const m of sorted) {
      const text = `${m.label} of ${fmt(m.value, m.unit)} matches your target of about ${fmt(m.target_ideal, m.unit)}.`;
      if (m.score >= 0.8) reasons.push(text);
      else if (m.score < 0.45) {
        const dir = m.value > m.target_ideal ? "higher" : "lower";
        cautions.push(`${m.label} (${fmt(m.value, m.unit)}) is ${dir} than your ideal of about ${fmt(m.target_ideal, m.unit)}.`);
      }
    }
    if (ideal.prefer_open_pattern !== null) {
      const open = isOpenPattern(racket.string_pattern);
      if (open === ideal.prefer_open_pattern) {
        reasons.push(ideal.prefer_open_pattern
          ? `Open ${racket.string_pattern} string bed helps you generate spin.`
          : `Denser ${racket.string_pattern} string bed gives you control and consistency.`);
      } else {
        cautions.push(ideal.prefer_open_pattern
          ? `${racket.string_pattern} pattern is tighter than ideal for maximum spin.`
          : `${racket.string_pattern} pattern is more open than ideal for maximum control.`);
      }
    }
    return { reasons: reasons.slice(0, 4), cautions: cautions.slice(0, 3) };
  }

  function scoreRacket(racket, ideal) {
    const specMatches = [];
    let weighted = 0, total = 0;
    for (const key of Object.keys(ideal.targets)) {
      const t = ideal.targets[key];
      const value = Number(racket[key]);
      const s = scoreTarget(t, value);
      specMatches.push({ key, label: t.label, value, unit: t.unit, score: s,
        target_ideal: t.ideal, target_lo: t.lo, target_hi: t.hi, in_range: value >= t.lo && value <= t.hi });
      weighted += s * t.weight; total += t.weight;
    }
    if (ideal.prefer_open_pattern !== null) {
      const ps = isOpenPattern(racket.string_pattern) === ideal.prefer_open_pattern ? 1.0 : 0.25;
      weighted += ps * ideal.pattern_weight; total += ideal.pattern_weight;
    }
    const score = total ? (weighted / total) * 100 : 0;
    const { reasons, cautions } = explainRacket(racket, ideal, specMatches);
    return { racket, name: `${racket.brand} ${racket.model}`, score: round1(score),
      spec_matches: specMatches, reasons, cautions };
  }

  function recommendRackets(profile, rackets, topN) {
    const ideal = buildIdealSpec(profile);
    let pool = rackets;
    if (profile.budget_usd != null) pool = pool.filter(r => r.msrp_usd == null || r.msrp_usd <= profile.budget_usd);
    const scored = pool.map(r => scoreRacket(r, ideal));
    scored.sort((a, b) => b.score - a.score);
    return { ideal, recs: scored.slice(0, Math.max(topN, 0)) };
  }

  // ---- Strings ---------------------------------------------------------
  const ATTRS = ["power", "control", "spin", "comfort", "durability", "feel"];

  function attributeWeights(p) {
    const w = { power: 1.0, control: 1.0, spin: 1.0, comfort: 1.0, durability: 0.6, feel: 0.6 };
    if (p.arm_sensitive) { w.comfort += 2.6; w.feel += 0.6; w.power += 0.3; }
    if (p.spin_priority === "high") w.spin += 1.8;
    else if (p.spin_priority === "low") { w.spin -= 0.4; w.control += 0.4; }
    if (p.power_source === "needs_power") { w.power += 1.5; w.control -= 0.3; }
    else if (p.power_source === "generates_own_power") { w.control += 1.4; w.power -= 0.5; }
    if (p.skill_level === "beginner") { w.comfort += 1.0; w.power += 0.8; w.durability -= 0.3; }
    else if (p.skill_level === "advanced") { w.control += 0.9; w.spin += 0.4; w.durability += 0.3; }
    if (["counterpuncher", "serve_and_volley"].includes(p.play_style)) w.control += 0.4;
    for (const k of Object.keys(w)) w[k] = Math.max(w[k], 0);
    return w;
  }

  function scoreString(s, weights, p) {
    const totalW = ATTRS.reduce((a, k) => a + weights[k], 0) || 1;
    let score = (ATTRS.reduce((a, k) => a + s[k] * weights[k], 0) / (totalW * 10)) * 100;
    if (p.arm_sensitive) score *= s.arm_friendly ? 1.25 : 0.72;
    if (p.skill_level === "beginner" && !p.arm_sensitive) {
      if (["Multifilament", "Synthetic Gut", "Natural Gut"].includes(s.type)) score *= 1.12;
      else if (s.type === "Polyester" && !s.arm_friendly) score *= 0.85;
    }
    if (p.spin_priority === "high" && !p.arm_sensitive) {
      if (s.type === "Polyester") score *= 1.08;
      else if (["Natural Gut", "Multifilament"].includes(s.type)) score *= 0.9;
    }
    return Math.min(score, 100);
  }

  function stringReasons(s, p) {
    const r = [];
    if (p.arm_sensitive && s.arm_friendly) r.push(`Arm-friendly ${s.type.toLowerCase()} (comfort ${s.comfort}/10) to protect your arm.`);
    if (p.spin_priority === "high" && s.spin >= 8) r.push(`High spin rating (${s.spin}/10)${s.shape !== "round" ? " from its shaped profile" : ""}.`);
    if (p.power_source === "needs_power" && s.power >= 7) r.push(`Adds free power and depth (power ${s.power}/10).`);
    if (p.power_source === "generates_own_power" && s.control >= 8) r.push(`Tight control (control ${s.control}/10) to harness your own pace.`);
    if (p.skill_level === "beginner" && ["Multifilament", "Synthetic Gut"].includes(s.type)) r.push("Soft, forgiving, and easy on developing technique.");
    if (r.length === 0 && s.best_for) r.push(s.best_for);
    return r.slice(0, 3);
  }

  function recommendStrings(profile, strings, topN) {
    const weights = attributeWeights(profile);
    const recs = strings.map(s => ({ string: s, name: `${s.brand} ${s.model}`, type: s.type,
      score: round1(scoreString(s, weights, profile)), reasons: stringReasons(s, profile) }));
    recs.sort((a, b) => b.score - a.score);
    return recs.slice(0, Math.max(topN, 0));
  }

  function recommendTension(profile, string) {
    const lo = string.tension_lo, hi = string.tension_hi, mid = (lo + hi) / 2;
    const notes = [];
    let adjust = 0;
    if (profile.power_source === "needs_power") { adjust -= 2; notes.push("Strung a bit lower for more power and a softer feel."); }
    else if (profile.power_source === "generates_own_power") { adjust += 2; notes.push("Strung a bit higher for more control over your own pace."); }
    if (profile.arm_sensitive) { adjust -= 2; notes.push("Lower tension reduces impact shock for arm comfort."); }
    if (profile.spin_priority === "high") { adjust -= 1; notes.push("Slightly lower tension lets the strings snap back for spin."); }
    if (profile.spin_priority === "low" && ["counterpuncher", "serve_and_volley"].includes(profile.play_style)) adjust += 1;
    const ideal = pyRound(Math.max(lo - 2, Math.min(hi, mid + adjust)));
    if (notes.length === 0) notes.push("A balanced starting tension. Lower for power, higher for control.");
    return { lo: Math.max(lo - 2, ideal - 2), hi: Math.min(hi, ideal + 2), ideal, notes };
  }

  // ---- Grip ------------------------------------------------------------
  const GRIP_SIZES = [
    [4.000, "4 (L0)"], [4.125, "4 1/8 (L1)"], [4.250, "4 1/4 (L2)"],
    [4.375, "4 3/8 (L3)"], [4.500, "4 1/2 (L4)"], [4.625, "4 5/8 (L5)"],
  ];
  const OVERGRIP_TIP = "When between sizes, pick the smaller one and add an overgrip. You can build a grip up, but you cannot shave one down.";

  function recommendGrip(profile) {
    const measure = profile.hand_length_in;
    if (measure == null) {
      return { label: "4 3/8 (L3)", inches: 4.375, confident: false, notes: [
        "No measurement given, so this is the most common adult size as a default.",
        "To size it properly: hold your hitting hand open and measure from the middle crease of your palm to the tip of your ring finger, in inches. That number is your grip size.",
        OVERGRIP_TIP ] };
    }
    let nearest = GRIP_SIZES.reduce((a, b) => Math.abs(b[0] - measure) < Math.abs(a[0] - measure) ? b : a);
    const notes = [`Based on your ${measure} inch hand measurement.`];
    const lowerCandidates = GRIP_SIZES.filter(g => g[0] <= measure);
    const lower = lowerCandidates.length ? lowerCandidates[lowerCandidates.length - 1] : GRIP_SIZES[0];
    if (Math.abs(measure - nearest[0]) > 0.04 && lower[0] !== nearest[0]) {
      notes.push(`You are between ${lower[1]} and ${nearest[1]}. ${OVERGRIP_TIP}`);
      nearest = lower;
    } else {
      notes.push(OVERGRIP_TIP);
    }
    return { label: nearest[1], inches: nearest[0], confident: true, notes };
  }

  // ---- Full report -----------------------------------------------------
  function buildReport(profile, data, topN) {
    topN = topN || 5;
    const { ideal, recs } = recommendRackets(profile, data.rackets, topN);
    const strings = recommendStrings(profile, data.strings, 3);
    const topString = strings.length ? strings[0].string : null;
    const tension = topString ? recommendTension(profile, topString) : null;
    const grip = recommendGrip(profile);
    let summary = null;
    if (recs.length && topString && tension) {
      summary = `${recs[0].name} + ${topString.brand} ${topString.model} @ ${tension.ideal} lbs, grip ${grip.label}`;
    }
    return {
      profile, ideal, recommendations: recs, strings,
      string: strings.length ? strings[0] : null, tension, grip, summary,
      disclaimer: "Specs and ratings are approximate and meant to build a shortlist. Strings, grip, and your own swing change everything. Demo before you buy.",
    };
  }

  global.RacketFit = { SURVEY, buildReport, recommendRackets, recommendStrings, recommendTension, recommendGrip, buildIdealSpec };
})(window);
