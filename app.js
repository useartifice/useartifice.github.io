/* ARTIFICE — interaction apparatus. No dependencies.
   Landing: dot field + on-load reveal.
   Report: a normal scrolling document; demos fire on scroll-into-view. */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const page = document.body.dataset.page;

  /* ---------------- pointer-reactive dot field (both pages) ---------------- */
  const canvas = $("#field");
  if (canvas && !reduced) {
    const host = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    let dots = [], W = 0, H = 0, raf = null;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const pointer = { x: -9999, y: -9999 };
    const build = () => {
      W = host.offsetWidth; H = host.offsetHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      const gap = 30;
      for (let x = gap / 2; x < W; x += gap)
        for (let y = gap / 2; y < H; y += gap)
          dots.push({ ox: x, oy: y, p: Math.random() * Math.PI * 2 });
    };
    const tick = (t) => {
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        const dx = d.ox - pointer.x, dy = d.oy - pointer.y;
        const dist = Math.hypot(dx, dy);
        const R = 130;
        let mx = 0, my = 0, lift = 0;
        if (dist < R) {
          const f = (1 - dist / R) * 14;
          mx = (dx / (dist || 1)) * f;
          my = (dy / (dist || 1)) * f;
          lift = (1 - dist / R) * 0.22;
        }
        const breathe = Math.sin(t / 2600 + d.p) * 0.018;
        ctx.fillStyle = `rgba(234,234,234,${0.05 + breathe + lift})`;
        ctx.fillRect(d.ox + mx - 0.5, d.oy + my - 0.5, 1.2, 1.2);
      }
      raf = requestAnimationFrame(tick);
    };
    host.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
    });
    host.addEventListener("pointerleave", () => { pointer.x = pointer.y = -9999; });
    addEventListener("resize", build);
    build();
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!raf) raf = requestAnimationFrame(tick); }
      else { cancelAnimationFrame(raf); raf = null; }
    }).observe(host);
  }

  /* ---------------- reveal on scroll (both pages) ---------------- */
  const rvIO = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rvIO.unobserve(e.target); } }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".rv").forEach((el) => rvIO.observe(el));

  /* ---------------- landing: reveal on load, then done ---------------- */
  if (page === "landing") {
    requestAnimationFrame(() => $$(".rv").forEach((el) => el.classList.add("in")));
    return;
  }
  if (page !== "research") return;

  /* ================================================================
     REPORT
     ================================================================ */

  /* progress bar + nav state */
  const bar = $("#progressBar");
  const nav = $("#nav");
  const onScroll = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
    if (nav) nav.classList.toggle("is-scrolled", h.scrollTop > 24);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* nav active section */
  const navMap = new Map($$("[data-nav]").map((a) => [a.dataset.nav, a]));
  if (navMap.size) {
    const SECT_NAV = {
      abstract: "abstract", system: "system", compose: "compose", manipulate: "manipulate",
      vocabulary: "vocabulary", findings: "findings", guide: "guide", laws: "guide", references: "references",
    };
    const secIO = new IntersectionObserver(
      (es) => es.forEach((e) => {
        const link = navMap.get(SECT_NAV[e.target.id]);
        if (e.isIntersecting && link) {
          navMap.forEach((a) => a.classList.remove("is-active"));
          link.classList.add("is-active");
        }
      }),
      { rootMargin: "-32% 0px -58% 0px" }
    );
    Object.keys(SECT_NAV).forEach((id) => { const el = document.getElementById(id); if (el) secIO.observe(el); });
  }

  initPipeline();
  initCompose();
  initRank();
  initVocab();
  initStats();
  initCites();
  initToast();

  /* ---------------- pipeline stepper ---------------- */
  function initPipeline() {
    const stages = $$(".stage");
    const pipe = $("#pipeline");
    if (!stages.length || !pipe) return;
    const STAGES = [
      ["S0 · intent", "⌘K. A single field asks what you're doing — not which feature you want. The sentence is the entire input; everything after it is inferred."],
      ["S1 · plan + fetch", "At low temperature the model plans the data it needs and calls tools — local ones and any you connect over MCP. Results land in a dataset store; the model sees manifests, never raw rows."],
      ["S2 · surface", "The generative engine streams real HTML/CSS/JS into a sealed sandbox; the structured engine streams a JSON spec through a validator into the vetted renderer. Either way it paints as it arrives."],
      ["S3 · interact", "The surface runs live on your machine — a generative surface's own script, or the structured engine's client-side transforms re-ranking and filtering with zero model round-trips."],
      ["S4 · evolve", "Follow-ups patch or regenerate the live surface with its current state as context. Repeated intents hit a semantic cache and render instantly, replaying tool calls so the data stays fresh."],
    ];
    const dLabel = $("#stageDetailLabel");
    const dText = $("#stageDetailText");
    const pipeDot = $("#pipeDot");
    let i = 0, timer = null, pinned = false;
    const set = (n) => {
      i = n;
      stages.forEach((s, j) => s.classList.toggle("is-active", n === j));
      dLabel.textContent = STAGES[n][0];
      dText.textContent = STAGES[n][1];
      pipeDot.style.left = `calc(${(n / (STAGES.length - 1)) * 100}% - ${n === STAGES.length - 1 ? 5 : 0}px)`;
    };
    const arm = () => { clearInterval(timer); if (!reduced && !pinned) timer = setInterval(() => set((i + 1) % STAGES.length), 3600); };
    stages.forEach((s) => {
      const pick = () => { clearInterval(timer); set(+s.dataset.stage); };
      s.addEventListener("pointerenter", pick);
      s.addEventListener("pointerleave", arm);
      const btn = s.querySelector(".stage-btn");
      if (btn) { btn.addEventListener("focus", () => { pinned = true; pick(); }); btn.addEventListener("click", () => { pinned = true; pick(); }); }
    });
    set(0);
    new IntersectionObserver(([e]) => e.isIntersecting ? arm() : clearInterval(timer)).observe(pipe);
  }

  /* ---------------- fig 1 · spec replay ---------------- */
  function initCompose() {
    const specCode = $("#specStream code");
    if (!specCode) return;
    const wf = (html) => { const d = document.createElement("div"); d.innerHTML = html; const n = d.firstElementChild; n.classList.add("wf"); return n; };
    const WF = {
      heading: () => wf(`<div class="wf-heading"></div>`),
      sliders: () => wf(`<div class="wf-row"><div class="wf-slider"><div class="wf-cap"></div><div class="wf-track"><span class="wf-thumb"></span></div></div><div class="wf-slider"><div class="wf-cap"></div><div class="wf-track"><span class="wf-thumb"></span></div></div></div>`),
      slider: () => wf(`<div class="wf-slider"><div class="wf-cap"></div><div class="wf-track"><span class="wf-thumb"></span></div></div>`),
      table: (rows = 4) => wf(`<div class="wf-table"><div class="wf-thead"><span></span><span></span><span></span><span></span></div>${`<div class="wf-tr"><span></span><span></span><span></span><span></span></div>`.repeat(rows)}</div>`),
      stat: () => wf(`<div class="wf-stat"><div class="wf-cap"></div><div class="wf-val"></div></div>`),
      field: () => wf(`<div class="wf-field"><div class="wf-cap"></div><div class="wf-in"></div></div>`),
      area: () => wf(`<div class="wf-field wf-area"><div class="wf-cap"></div><div class="wf-in"></div></div>`),
      toggles: () => wf(`<div class="wf-row" style="align-items:center"><div class="wf-toggle"><span class="wf-pill"></span><span class="wf-cap"></span></div><div class="wf-toggle"><span class="wf-pill"></span><span class="wf-cap"></span></div><span class="wf-badge">3 matches</span></div>`),
      seg: () => wf(`<div class="wf-seg"><span class="on"><i></i></span><span><i></i></span><span><i></i></span></div>`),
      swatches: () => wf(`<div class="wf-swatches">${["#eaeaea", "#bdbdbd", "#8f8f8f", "#626262", "#343434"].map((c) => `<div class="wf-swatch"><i style="background:${c}"></i><div class="wf-cap"></div></div>`).join("")}</div>`),
      button: () => wf(`<div class="wf-btn"><i></i></div>`),
      skeleton: () => wf(`<div class="wf-skeleton"></div>`),
    };
    const EXAMPLES = [
      {
        title: "Plan comparison",
        seg: [
          [`{\n  "surface": {\n    "title": "Plan comparison",\n`, "title"],
          [`    "root": {\n      "type": "VStack",\n      "props": { "spacing": 16 },\n      "children": [\n`, null],
          [`        { "type": "Heading",\n          "props": { "text": "Compare plans", "level": 2 } },\n`, "heading"],
          [`        { "type": "HStack", "children": [\n          { "type": "Slider", "bind": "weight.premium",\n            "props": { "label": "Premium" } },\n          { "type": "Slider", "bind": "weight.coverage",\n            "props": { "label": "Coverage" } } ] },\n`, "sliders"],
          [`        { "type": "Table",\n          "data": { "source": "dataset.plans", "transform": [\n            { "op": "computeScore", "as": "score",\n              "weights": { "premium": "@weight.premium",\n                           "coverage": "@weight.coverage" },\n              "invert": ["premium"] },\n            { "op": "sort", "by": "score", "dir": "desc" } ] },\n          "props": { "columns": [ { "key": "plan" },\n            { "key": "premium", "format": "currency" },\n            { "key": "score", "format": "score" } ] } },\n`, "table"],
          [`        { "type": "Stat", "props": { "label": "Best value" },\n          "data": { "source": "dataset.plans" } }\n`, "stat"],
          [`      ]\n    }\n  }\n}`, null],
        ],
      },
      {
        title: "Regex tester",
        seg: [
          [`{\n  "surface": {\n    "title": "Regex tester",\n`, "title"],
          [`    "root": {\n      "type": "VStack",\n      "props": { "spacing": 16 },\n      "children": [\n`, null],
          [`        { "type": "TextField", "bind": "input.pattern",\n          "props": { "label": "Pattern" } },\n`, "field"],
          [`        { "type": "TextArea", "bind": "input.sample",\n          "props": { "label": "Test string", "rows": 4 } },\n`, "area"],
          [`        { "type": "HStack", "children": [\n          { "type": "Toggle", "bind": "input.global", "props": { "label": "g" } },\n          { "type": "Toggle", "bind": "input.ignoreCase", "props": { "label": "i" } },\n          { "type": "Badge", "props": { "text": "3 matches" } } ] },\n`, "toggles"],
          [`        { "type": "Table",\n          "data": { "source": "dataset.matches" },\n          "props": { "columns": [ { "key": "match" },\n            { "key": "index", "format": "number" } ] } }\n`, "table3"],
          [`      ]\n    }\n  }\n}`, null],
        ],
      },
      {
        title: "Palette picker",
        seg: [
          [`{\n  "surface": {\n    "title": "Palette picker",\n`, "title"],
          [`    "root": {\n      "type": "VStack",\n      "props": { "spacing": 16 },\n      "children": [\n`, null],
          [`        { "type": "Segmented", "bind": "input.mode",\n          "props": { "options": ["Analogous", "Triadic"] } },\n`, "seg"],
          [`        { "type": "Slider", "bind": "input.hue",\n          "props": { "label": "Base hue", "max": 360 } },\n`, "slider"],
          [`        { "type": "Grid", "props": { "columns": 5 }, "children": [\n          { "type": "Badge", "props": { "text": "#EAEAEA" } },\n          { "type": "Badge", "props": { "text": "#BDBDBD" } },\n          { "type": "Badge", "props": { "text": "#8F8F8F" } },\n          { "type": "Badge", "props": { "text": "#626262" } },\n          { "type": "Badge", "props": { "text": "#343434" } } ] },\n`, "swatches"],
          [`        { "type": "Button",\n          "action": { "kind": "set", "set": { "input.copied": true } },\n          "props": { "label": "Copy CSS variables" } }\n`, "button"],
          [`      ]\n    }\n  }\n}`, null],
        ],
      },
    ];
    const MOUNTS = {
      heading: () => WF.heading(), sliders: () => WF.sliders(), slider: () => WF.slider(),
      table: () => WF.table(4), table3: () => WF.table(3), stat: () => WF.stat(),
      field: () => WF.field(), area: () => WF.area(), toggles: () => WF.toggles(),
      seg: () => WF.seg(), swatches: () => WF.swatches(), button: () => WF.button(),
    };
    const specPre = $("#specStream");
    const wfStage = $("#wfStage");
    const wfTitle = $("#wfTitle");
    const tabs = $$(".tab");
    let run = 0, current = 0, started = false;
    const highlight = (raw) => raw
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/"type": "([A-Za-z]+)"/g, `"type": <span class="j-type">"$1"</span>`)
      .replace(/: "((?!<)[^"]*)"/g, `: <span class="j-str">"$1"</span>`);
    const play = async (ix) => {
      const my = ++run;
      const ex = EXAMPLES[ix];
      specCode.innerHTML = ""; wfStage.innerHTML = ""; wfTitle.textContent = "";
      let text = "";
      const pending = WF.skeleton();
      for (const [chunk, mount] of ex.seg) {
        if (my !== run) return;
        if (mount && mount !== "title") wfStage.appendChild(pending);
        let k = 0;
        while (k < chunk.length) {
          if (my !== run) return;
          k += reduced ? chunk.length : 2 + ((Math.random() * 3) | 0);
          specCode.innerHTML = highlight(text + chunk.slice(0, k)) + `<span class="caret"></span>`;
          specPre.scrollTop = specPre.scrollHeight;
          if (!reduced) await new Promise((r) => setTimeout(r, 24));
        }
        text += chunk;
        if (my !== run) return;
        if (mount === "title") wfTitle.textContent = ex.title;
        else if (mount) { pending.remove(); wfStage.appendChild(MOUNTS[mount]()); if (!reduced) await new Promise((r) => setTimeout(r, 160)); }
      }
      pending.remove();
      specCode.innerHTML = highlight(text);
    };
    tabs.forEach((t) => t.addEventListener("click", () => {
      tabs.forEach((x) => { x.classList.remove("is-active"); x.setAttribute("aria-pressed", "false"); });
      t.classList.add("is-active"); t.setAttribute("aria-pressed", "true");
      current = +t.dataset.example; play(current);
    }));
    const replayBtn = $("#replayBtn");
    if (replayBtn) replayBtn.addEventListener("click", () => play(current));
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; play(0); } }, { threshold: 0.25 }).observe($(".fig"));
  }

  /* ---------------- fig 2 · live ranking demo ---------------- */
  function initRank() {
    const rankDemo = $("#rankDemo");
    if (!rankDemo) return;
    const PLANS = [
      { plan: "Bronze",   premium: 220, deductible: 6500, coverage: 62 },
      { plan: "Silver",   premium: 340, deductible: 4200, coverage: 74 },
      { plan: "Gold",     premium: 480, deductible: 2000, coverage: 85 },
      { plan: "Platinum", premium: 620, deductible: 800,  coverage: 93 },
      { plan: "HDHP",     premium: 180, deductible: 7000, coverage: 58 },
    ];
    const FIELDS = ["premium", "deductible", "coverage"];
    const INVERT = { premium: true, deductible: true, coverage: false };
    const norm = {};
    FIELDS.forEach((f) => {
      const vals = PLANS.map((p) => p[f]);
      const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
      norm[f] = {};
      PLANS.forEach((p) => { const n = (p[f] - min) / span; norm[f][p.plan] = INVERT[f] ? 1 - n : n; });
    });
    const weights = {};
    $$(".demo-range", rankDemo).forEach((r) => { weights[r.dataset.weight] = +r.value; });
    const money = (n) => "$" + n.toLocaleString("en-US");
    const rowsEl = $("#rankRows");
    const metaEl = $("#rankMeta");
    const outs = {};
    $$("[data-out]", rankDemo).forEach((el) => { outs[el.dataset.out] = el; });
    const rowFor = {};
    PLANS.forEach((p) => {
      const row = document.createElement("div");
      row.className = "demo-row demo-body-row";
      row.dataset.plan = p.plan;
      row.innerHTML =
        `<span class="demo-rank"></span>` +
        `<span class="demo-plan">${p.plan}</span>` +
        `<span class="demo-num">${money(p.premium)}</span>` +
        `<span class="demo-num">${money(p.deductible)}</span>` +
        `<span class="demo-num">${p.coverage}%</span>` +
        `<span class="demo-score"><span class="demo-bar"><i></i></span><span class="demo-score-val"></span></span>`;
      rowsEl.appendChild(row);
      rowFor[p.plan] = row;
    });
    const compute = () => {
      const wSum = FIELDS.reduce((s, f) => s + weights[f], 0) || 1;
      return PLANS.map((p) => ({ plan: p.plan, score: FIELDS.reduce((s, f) => s + weights[f] * norm[f][p.plan], 0) / wSum }))
        .sort((a, b) => b.score - a.score);
    };
    const render = (animate) => {
      const t0 = performance.now();
      const ranked = compute();
      const dt = performance.now() - t0;
      const first = new Map();
      if (animate && !reduced) ranked.forEach((r) => first.set(r.plan, rowFor[r.plan].getBoundingClientRect().top));
      ranked.forEach((r, n) => {
        const row = rowFor[r.plan];
        rowsEl.appendChild(row);
        row.classList.toggle("is-top", n === 0);
        row.querySelector(".demo-rank").textContent = n + 1;
        const pct = Math.round(r.score * 100);
        row.querySelector(".demo-bar i").style.width = pct + "%";
        row.querySelector(".demo-score-val").textContent = pct;
      });
      if (animate && !reduced) {
        ranked.forEach((r) => {
          const row = rowFor[r.plan];
          const delta = first.get(r.plan) - row.getBoundingClientRect().top;
          if (delta) {
            row.style.transform = `translateY(${delta}px)`;
            row.style.transition = "transform 0s";
            requestAnimationFrame(() => { row.style.transition = "transform 0.5s cubic-bezier(0.19,1,0.22,1)"; row.style.transform = ""; });
          }
        });
      }
      const ms = dt < 0.01 ? "<0.01" : dt.toFixed(2);
      metaEl.textContent = `re-ranked locally in ${ms} ms · 0 model calls · 0 tokens`;
    };
    $$(".demo-range", rankDemo).forEach((r) => {
      r.addEventListener("input", () => {
        weights[r.dataset.weight] = +r.value;
        if (outs[r.dataset.weight]) outs[r.dataset.weight].textContent = (+r.value).toFixed(2);
        render(true);
      });
    });
    render(false);
  }

  /* ---------------- fig 3 · vocabulary ---------------- */
  function initVocab() {
    const vocab = $("#vocab");
    if (!vocab) return;
    const CATS = [
      ["Layout", ["VStack", "HStack", "Grid", "Scroll", "Section", "Split", "Spacer", "Divider"]],
      ["Display", ["Heading", "Text", "Markdown", "Badge", "Icon", "Image", "KeyValue", "Callout"]],
      ["Data", ["Table", "List", "Card", "Stat", "Timeline", "Chart", "Map"]],
      ["Input", ["TextField", "TextArea", "SearchField", "Slider", "Stepper", "Toggle", "Segmented", "Select", "MultiSelect", "RadioGroup", "DatePicker", "FilePicker"]],
      ["Action", ["Button", "Link", "MenuButton"]],
      ["Feedback", ["ProgressBar", "Skeleton", "Empty"]],
    ];
    const legend = $("#vocabLegend");
    const grid = $("#vocabGrid");
    let activeCat = null;
    CATS.forEach(([name, list]) => {
      const b = document.createElement("button");
      b.innerHTML = `${name}<em>${list.length}</em>`;
      b.dataset.cat = name;
      b.addEventListener("click", () => {
        activeCat = activeCat === name ? null : name;
        legend.querySelectorAll("button").forEach((x) => x.classList.toggle("is-on", x.dataset.cat === activeCat));
        vocab.classList.toggle("is-filtered", !!activeCat);
        grid.querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-kept", c.dataset.cat === activeCat));
      });
      legend.appendChild(b);
      list.forEach((comp) => {
        const chip = document.createElement("span");
        chip.className = "chip";
        chip.dataset.cat = name;
        chip.textContent = comp;
        chip.addEventListener("pointerenter", () => { if (activeCat) return; legend.querySelectorAll("button").forEach((x) => x.classList.toggle("is-on", x.dataset.cat === name)); });
        chip.addEventListener("pointerleave", () => { if (activeCat) return; legend.querySelectorAll("button").forEach((x) => x.classList.remove("is-on")); });
        grid.appendChild(chip);
      });
    });
  }

  /* ---------------- findings · count-up ---------------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = +(el.dataset.decimals || 0);
    if (reduced) { el.textContent = target.toFixed(decimals); return; }
    const t0 = performance.now(), dur = 1300;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function initStats() {
    const els = $$(".stat-n");
    if (!els.length) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); } }), { threshold: 0.6 });
    els.forEach((el) => io.observe(el));
  }

  /* ---------------- citations ---------------- */
  function initCites() {
    const tip = $("#citeTip");
    if (!tip) return;
    const refText = (id) => { const li = document.getElementById("ref-" + id); return li ? li.children[1].textContent.trim() : ""; };
    $$(".cite").forEach((a) => {
      a.addEventListener("pointerenter", () => {
        tip.textContent = `[${a.dataset.ref}] ` + refText(a.dataset.ref);
        tip.classList.add("is-on");
        const r = a.getBoundingClientRect();
        const w = Math.min(340, innerWidth - 32);
        const x = Math.min(Math.max(16, r.left - 20), innerWidth - w - 16);
        tip.style.left = x + "px";
        const above = r.top > 160;
        tip.style.top = above ? "" : r.bottom + 12 + "px";
        requestAnimationFrame(() => { if (above) tip.style.top = r.top - tip.offsetHeight - 12 + "px"; });
      });
      a.addEventListener("pointerleave", () => tip.classList.remove("is-on"));
      a.addEventListener("click", () => {
        tip.classList.remove("is-on");
        const li = document.getElementById("ref-" + a.dataset.ref);
        if (li) { li.classList.add("is-flash"); setTimeout(() => li.classList.remove("is-flash"), 1900); }
      });
    });
    $$(".refs li").forEach((li) => {
      li.addEventListener("pointerenter", () => $$(`.cite[data-ref="${li.dataset.refid}"]`).forEach((c) => c.classList.add("is-lit")));
      li.addEventListener("pointerleave", () => $$(`.cite[data-ref="${li.dataset.refid}"]`).forEach((c) => c.classList.remove("is-lit")));
    });
  }

  /* ---------------- ⌘K easter egg ---------------- */
  function initToast() {
    const toast = $("#toast");
    if (!toast) return;
    let timer;
    addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toast.classList.add("is-on");
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.remove("is-on"), 2200);
      }
    });
  }
})();
