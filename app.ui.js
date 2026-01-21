// DKU Dining Wrapped 2024 — Entertainment UI Layer

(() => {
  const BOOKMARKLET_SRC = "https://damao2.github.io/dku-dining-wrap-2/export-dku-transactions.js";
  const HANDOFF_STORAGE_KEY = "DKU_WRAP_V1"; // must match exporter

  const {
    computeStats,
    fmtMoney,
    getDiningPersonality,
    calculateAchievements,
    generateFunComparisons,
    predictFutureHabits,
    createShareableQuotes,
    getMemoryHighlights
  } = window.DKUWrapCore || {};

  if (!computeStats || !fmtMoney) {
    console.error("DKUWrapCore not found. Ensure app.core.js is loaded before app.ui.js.");
    return;
  }

  // --- Elements
  const elFile = document.getElementById("fileInput");
  const elStatus = document.getElementById("status");

  const elSlides = document.getElementById("slides");
  const slides = Array.from(elSlides.querySelectorAll(".slide"));
  const elPager = document.getElementById("pager");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");

  const btnPlayPause = document.getElementById("btnPlayPause");
  const btnFullscreen = document.getElementById("btnFullscreen");
  const elWrapShell = document.querySelector(".wrap-shell");
  const elProgressWrap = document.querySelector(".progress");
  const elProgressBar = document.getElementById("slideProgress");

  const btnExportCurrent = document.getElementById("btnExportCurrent");
  const btnExportAll = document.getElementById("btnExportAll");

  const bookmarkletLink = document.getElementById("bookmarkletLink");
  const btnCopyBookmarklet = document.getElementById("btnCopyBookmarklet");
  const btnLoadSample = document.getElementById("btnLoadSample");
  const btnDownloadTemplate = document.getElementById("btnDownloadTemplate");

  // --- Hover glow (mouse-tracked)
  function initGlowHover(root = document){
    const selectors = [
      ".card",
      ".chart-panel",
      ".kpi",
      ".personality-stats .stat",
      ".big-num",
      ".note",
      ".rank-big",
      ".rank-small",
      ".quote-card",
      ".achievement-card",
      ".memory-card",
      ".prediction-item",
      ".spend-category",
      ".comparison-item",
    ];

    const tiltSelectors = [
      // Tilt all boxed mini-panels (NOT whole slides/outer cards)
      ".chart-panel",
      ".kpi",
      ".personality-stats .stat",
      ".big-num",
      ".note",
      ".rank-big",
      ".rank-small",
      ".quote-card",
      ".achievement-card",
      ".memory-card",
      ".prediction-item",
      ".spend-category",
      ".comparison-item",
    ];

    // Tune tilt strength here
    const MAX_RY_DEG = 4; // left/right
    const MAX_RX_DEG = 3; // up/down

    const nodes = root.querySelectorAll(selectors.join(","));
    nodes.forEach((el) => {
      if (!el || el.dataset.glowInit === "1") return;
      el.dataset.glowInit = "1";
      el.classList.add("glow-hover");

      const shouldTilt = tiltSelectors.some((sel) => el.matches(sel));
      if (shouldTilt) el.classList.add("tilt-hover");

      if (!shouldTilt) return;

      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / Math.max(1, r.width);   // 0..1
        const py = (e.clientY - r.top) / Math.max(1, r.height);  // 0..1
        const x = (px - 0.5); // -0.5..0.5
        const y = (py - 0.5); // -0.5..0.5

        // Keep tilt subtle (Wrapped-like, not gimmicky)
        const ry = (x * MAX_RY_DEG);   // deg
        const rx = (-y * MAX_RX_DEG);  // deg
        el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
        el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      }, { passive: true });

      el.addEventListener("pointerleave", () => {
        el.style.setProperty("--rx", "0deg");
        el.style.setProperty("--ry", "0deg");
      });
    });
  }

  // Sample data
  const SAMPLE_DATA = `dateTime,type,txn,service,amount,status
2024-09-01 12:30:00,Expense,123456789,2F-5 Malatang,-25.00,Success
2024-09-01 18:45:00,Expense,123456790,3F-2 Late Diner,-38.50,Success
2024-09-02 08:15:00,Expense,123456791,1F-3 Harbour Deli,-12.00,Success
2024-09-02 12:00:00,Expense,123456792,2F-1 Taste of the Occident,-45.00,Success
2024-09-02 19:30:00,Expense,123456793,3F-2 Late Diner,-32.00,Success
2024-09-03 07:45:00,Expense,123456794,1F-2 Juice Bar,-8.50,Success
2024-09-03 13:15:00,Expense,123456795,2F-5 Malatang,-22.00,Success
2024-09-03 20:00:00,Expense,123456796,3F-3 Pharos,-15.00,Success
2024-09-04 11:30:00,Expense,123456797,2F-1 Taste of the Occident,-28.00,Success
2024-09-04 17:20:00,Expense,123456798,1F-3 Harbour Deli,-18.50,Success
2024-09-05 09:00:00,Expense,123456799,1F-2 Juice Bar,-6.00,Success
2024-09-05 12:45:00,Expense,123456800,2F-4 Zartar,-35.00,Success
2024-09-05 18:30:00,Expense,123456801,3F-2 Late Diner,-42.00,Success
2024-09-06 08:30:00,Expense,123456802,1F-3 Harbour Deli,-14.00,Success
2024-09-06 13:00:00,Expense,123456803,2F-5 Malatang,-19.50,Success
2024-09-07 10:15:00,Expense,123456804,2F-1 Taste of the Occident,-31.00,Success
2024-09-07 16:45:00,Expense,123456805,1F-2 Juice Bar,-7.50,Success
2024-09-07 21:00:00,Expense,123456806,3F-2 Late Diner,-29.00,Success
2024-09-08 11:20:00,Expense,123456807,2F-4 Zartar,-40.00,Success
2024-09-08 14:30:00,Expense,123456808,2F-5 Malatang,-26.00,Success
2024-09-09 07:30:00,Expense,123456809,1F-3 Harbour Deli,-11.00,Success
2024-09-09 12:15:00,Expense,123456810,2F-1 Taste of the Occident,-33.00,Success
2024-09-09 19:45:00,Expense,123456811,3F-3 Pharos,-20.00,Success
2024-09-10 08:45:00,Expense,123456812,1F-2 Juice Bar,-9.00,Success
2024-09-10 17:30:00,Expense,123456813,2F-4 Zartar,-37.00,Success
2024-09-11 13:45:00,Expense,123456814,2F-5 Malatang,-24.00,Success
2024-09-11 20:15:00,Expense,123456815,3F-2 Late Diner,-35.00,Success
2024-09-12 09:30:00,Expense,123456816,1F-3 Harbour Deli,-16.00,Success
2024-09-12 12:30:00,Expense,123456817,2F-1 Taste of the Occident,-27.00,Success
2024-09-13 15:00:00,Expense,123456818,1F-2 Juice Bar,-5.50,Success
2024-09-13 18:20:00,Expense,123456819,2F-4 Zartar,-39.00,Success
2024-09-14 10:45:00,Expense,123456820,2F-5 Malatang,-21.00,Success
2024-09-14 22:00:00,Expense,123456821,3F-2 Late Diner,-31.00,Success
2024-09-15 08:00:00,Expense,123456822,1F-3 Harbour Deli,-13.50,Success
2024-09-15 14:15:00,Expense,123456823,2F-1 Taste of the Occident,-36.00,Success
2024-09-16 11:30:00,Expense,123456824,2F-4 Zartar,-34.00,Success
2024-09-16 19:30:00,Expense,123456825,3F-3 Pharos,-17.00,Success
2024-09-17 07:15:00,Expense,123456826,1F-2 Juice Bar,-8.00,Success
2024-09-17 16:45:00,Expense,123456827,2F-5 Malatang,-23.00,Success
2024-09-18 12:00:00,Expense,123456828,2F-1 Taste of the Occident,-29.00,Success
2024-09-18 20:45:00,Expense,123456829,3F-2 Late Diner,-38.00,Success
2024-09-19 09:45:00,Expense,123456830,1F-3 Harbour Deli,-15.50,Success
2024-09-19 13:30:00,Expense,123456831,2F-4 Zartar,-41.00,Success
2024-09-20 10:30:00,Expense,123456832,2F-5 Malatang,-20.50,Success
2024-09-20 18:15:00,Expense,123456833,3F-3 Pharos,-18.50,Success
2024-09-21 08:30:00,Expense,123456834,1F-2 Juice Bar,-7.00,Success
2024-09-21 15:00:00,Expense,123456835,2F-1 Taste of the Occident,-32.00,Success
2024-09-22 12:45:00,Expense,123456836,2F-4 Zartar,-36.00,Success
2024-09-22 21:30:00,Expense,123456837,3F-2 Late Diner,-33.00,Success
2024-09-23 11:15:00,Expense,123456838,2F-5 Malatang,-25.50,Success
2024-09-23 17:00:00,Expense,123456839,1F-3 Harbour Deli,-12.50,Success
2024-09-24 09:00:00,Expense,123456840,2F-1 Taste of the Occident,-30.00,Success
2024-09-24 14:30:00,Expense,123456841,1F-2 Juice Bar,-6.50,Success
2024-09-25 16:15:00,Expense,123456842,2F-4 Zartar,-38.50,Success
2024-09-25 19:45:00,Expense,123456843,3F-3 Pharos,-16.00,Success
2024-09-26 13:00:00,Expense,123456844,2F-5 Malatang,-22.50,Success
2024-09-26 22:30:00,Expense,123456845,3F-2 Late Diner,-37.00,Success
2024-09-27 10:45:00,Expense,123456846,1F-3 Harbour Deli,-14.50,Success
2024-09-27 15:30:00,Expense,123456847,2F-1 Taste of the Occident,-28.50,Success
2024-09-28 12:15:00,Expense,123456848,2F-4 Zartar,-35.50,Success
2024-09-28 18:00:00,Expense,123456849,1F-2 Juice Bar,-8.50,Success
2024-09-29 11:45:00,Expense,123456850,2F-5 Malatang,-24.50,Success
2024-09-29 20:30:00,Expense,123456851,3F-2 Late Diner,-34.00,Success
2024-09-30 08:15:00,Expense,123456852,1F-3 Harbour Deli,-11.50,Success
2024-09-30 13:45:00,Expense,123456853,2F-1 Taste of the Occident,-31.50,Success
2024-09-15 10:00:00,WeChat Top Up,,100.00,Success
2024-09-20 14:00:00,Social Medical Insurance,,50.00,Success
2024-09-25 16:00:00,Expense,123456854,Pharos Printing,-5.00,Success`;

  // --- Bookmarklet
  const bookmarklet = `javascript:(()=>{const u=\"${BOOKMARKLET_SRC}\";const s=document.createElement(\"script\");s.src=u+\"?t=\"+Date.now();s.onerror=()=>alert(\"Failed to load DKU exporter: \"+u);document.documentElement.appendChild(s);})();`;
  bookmarkletLink.href = bookmarklet;

  btnCopyBookmarklet.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(bookmarklet);
      btnCopyBookmarklet.textContent = "Copied!";
      setTimeout(() => (btnCopyBookmarklet.textContent = "Copy bookmarklet"), 1000);
    } catch {
      alert("Copy failed. You can manually create a bookmark and paste the bookmarklet.");
    }
  });

  // Sample data button
  btnLoadSample.addEventListener("click", () => {
    Papa.parse(SAMPLE_DATA, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data || []).filter(Boolean);
        loadAndRenderRows(rows, "Sample data");
      },
      error: (err) => {
        console.error(err);
        elStatus.textContent = "Failed to load sample data.";
      }
    });
  });

  // Template download
  btnDownloadTemplate.addEventListener("click", () => {
    const templateCSV = "dateTime,type,txn,service,amount,status\n2024-01-01 12:00:00,Expense,123456789,2F-5 Example Stall,-25.00,Success";
    const blob = new Blob([templateCSV], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dku-transactions-template.csv";
    a.click();
  });

  // --- Fullscreen (Wrap only)
  function getFullscreenElement(){
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function supportsFullscreen(){
    if (!elWrapShell) return false;
    return Boolean(
      elWrapShell.requestFullscreen ||
      elWrapShell.webkitRequestFullscreen ||
      document.exitFullscreen ||
      document.webkitExitFullscreen
    );
  }

  function syncFullscreenUI(){
    if (!btnFullscreen) return;
    const isFs = Boolean(getFullscreenElement());
    btnFullscreen.textContent = isFs ? "Exit" : "Fullscreen";
    btnFullscreen.setAttribute("aria-label", isFs ? "Exit fullscreen" : "Enter fullscreen");
  }

  async function toggleFullscreen(){
    if (!btnFullscreen || !elWrapShell) return;
    if (!supportsFullscreen()) {
      alert("Fullscreen is not supported in this browser.");
      return;
    }

    const cur = getFullscreenElement();
    try {
      if (cur) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      } else {
        if (elWrapShell.requestFullscreen) await elWrapShell.requestFullscreen();
        else if (elWrapShell.webkitRequestFullscreen) elWrapShell.webkitRequestFullscreen();
      }
    } finally {
      syncFullscreenUI();
      // Nudge layout observers (Chart.js responsive resize)
      setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
    }
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener("click", () => toggleFullscreen());
    if (!supportsFullscreen()) btnFullscreen.disabled = true;
  }

  document.addEventListener("fullscreenchange", syncFullscreenUI);
  document.addEventListener("webkitfullscreenchange", syncFullscreenUI);

  // --- Slide navigation
  let slideIndex = 0;
  const AUTO_MS = 6500;
  const AUTO_RESUME_AFTER_USER_MS = 12000;

  let hardPaused = false;     // user pressed pause
  let softPaused = false;     // temporary pause after user navigation
  let resumeTimer = null;
  let advanceTimer = null;
  let rafId = null;
  let slideStartTs = 0;
  let slideDurationMs = AUTO_MS;
  let slideElapsedWhenPaused = 0;

  function setProgress(pct){
    if (!elProgressBar) return;
    const clamped = Math.max(0, Math.min(100, pct));
    elProgressBar.style.width = `${clamped}%`;
  }

  function clearAdvance(){
    if (advanceTimer) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
  }

  function clearResume(){
    if (resumeTimer) {
      clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  }

  function setProgressPausedUI(isPaused){
    if (!elProgressWrap) return;
    elProgressWrap.classList.toggle("is-paused", isPaused);
  }

  function scheduleAdvance(durationMs){
    clearAdvance();
    slideDurationMs = durationMs;
    slideStartTs = performance.now();
    slideElapsedWhenPaused = 0;
    setProgress(0);
    setProgressPausedUI(false);

    if (hardPaused || softPaused) return;

    advanceTimer = setTimeout(() => {
      showSlide((slideIndex + 1) % slides.length);
      scheduleAdvance(AUTO_MS);
    }, durationMs);
  }

  function tickProgress(){
    if (!elProgressBar) return;
    rafId = requestAnimationFrame(tickProgress);
    if (hardPaused || softPaused) return;

    if (!slideStartTs) return;
    const now = performance.now();
    const elapsed = now - slideStartTs;
    const pct = (elapsed / Math.max(1, slideDurationMs)) * 100;
    setProgress(pct);
  }

  function startAuto(){
    // Starts (or restarts) autoplay from a fresh slide duration.
    clearResume();
    softPaused = false;
    if (!rafId) tickProgress();
    if (!hardPaused) scheduleAdvance(AUTO_MS);
  }

  function softPauseAndResume(){
    if (hardPaused) return;
    softPaused = true;
    clearAdvance();
    setProgress(0);
    setProgressPausedUI(true);
    clearResume();
    resumeTimer = setTimeout(() => {
      softPaused = false;
      startAuto();
    }, AUTO_RESUME_AFTER_USER_MS);
  }

  function togglePause(){
    hardPaused = !hardPaused;
    if (btnPlayPause) btnPlayPause.textContent = hardPaused ? "Play" : "Pause";

    if (hardPaused) {
      // Freeze progress at current %.
      if (slideStartTs) {
        slideElapsedWhenPaused = Math.min(slideDurationMs, performance.now() - slideStartTs);
      }
      clearAdvance();
      clearResume();
      setProgressPausedUI(true);
      return;
    }

    // Resume from where we paused.
    softPaused = false;
    const remaining = Math.max(0, slideDurationMs - slideElapsedWhenPaused);
    slideStartTs = performance.now() - slideElapsedWhenPaused;
    setProgressPausedUI(false);
    clearAdvance();
    advanceTimer = setTimeout(() => {
      showSlide((slideIndex + 1) % slides.length);
      scheduleAdvance(AUTO_MS);
    }, remaining);
  }

  function triggerEnterAnimation(activeSlide){
    if (!activeSlide) return;
    activeSlide.classList.remove("enter");
    // force reflow so animation retriggers
    void activeSlide.offsetWidth;
    activeSlide.classList.add("enter");
  }

  function showSlide(i){
    slideIndex = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, idx) => s.classList.toggle("active", idx === slideIndex));
    elPager.textContent = `Card ${slideIndex + 1} / ${slides.length} • ${slides[slideIndex].dataset.title || ""}`;
    btnPrev.disabled = slideIndex === 0;
    btnNext.disabled = slideIndex === slides.length - 1;
    triggerEnterAnimation(slides[slideIndex]);
    // ensure dynamically rendered blocks get hover glow
    initGlowHover(slides[slideIndex]);
  }

  btnPrev.addEventListener("click", () => {
    showSlide(slideIndex - 1);
    softPauseAndResume();
  });
  btnNext.addEventListener("click", () => {
    showSlide(slideIndex + 1);
    softPauseAndResume();
  });

  if (btnPlayPause) {
    btnPlayPause.addEventListener("click", () => togglePause());
  }
  showSlide(0);

  // --- One-click flow: auto import from exporter via window.name
  function tryLoadFromWindowName() {
    if (!window.name) return null;
    const prefix = `${HANDOFF_STORAGE_KEY}:`;
    if (!window.name.startsWith(prefix)) return null;

    try {
      const json = window.name.slice(prefix.length);
      const payload = JSON.parse(json);
      if (!payload || payload.k !== HANDOFF_STORAGE_KEY || !Array.isArray(payload.rows)) {
        throw new Error("bad payload shape");
      }

      // Clear immediately to avoid re-import on refresh
      window.name = "";
      return payload.rows;
    } catch (err) {
      // Most common cause: window.name is truncated by the browser (size limits vary).
      // In that case JSON.parse fails and we can't recover the dataset.
      elStatus.textContent =
        "One-click data transfer was detected but could not be read (likely too large / truncated). " +
        "Please re-run the exporter in CSV download mode and upload the CSV here.";
      // Clear to avoid endless failures on refresh.
      window.name = "";
      console.warn("window.name handoff parse failed:", err);
      return null;
    }
  }

  // --- Charts
  let chartTopSpend = null;
  let chartHours = null;
  let chartWeekdays = null;
  let chartMonths = null;

  function destroyChart(ch){
    if (ch && typeof ch.destroy === "function") ch.destroy();
    return null;
  }

  function setText(id, txt){
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderRankBlock(elId, items, opts){
    const el = document.getElementById(elId);
    if (!el) return;

    const safeItems = Array.isArray(items) ? items : [];
    if (!safeItems.length) {
      el.innerHTML = `<div class="muted">—</div>`;
      return;
    }

    const total = Number(opts?.total) || 0;
    const kind = opts?.kind || "count"; // "count" | "money"

    function fmtVal(v){
      const n = Number(v) || 0;
      if (kind === "money") return `¥${escapeHtml(fmtMoney(n))}`;
      return `${n} visit${n === 1 ? "" : "s"}`;
    }

    function fmtShare(v){
      const n = Number(v) || 0;
      if (!total) return "—";
      return `${Math.round((n / total) * 100)}%`;
    }

    const top = safeItems[0];
    const rest = safeItems.slice(1, 5);

    let spicy = "";
    if (opts?.spicy && kind === "count") {
      const share = total ? (Number(top.value) / total) : 0;
      if (Number(top.value) >= 15 && share >= 0.45) spicy = "Do you live here? 👑";
      else if (Number(top.value) >= 10) spicy = "Main character energy.";
    }

    const shareLabel = kind === "money" ? "Share of your spend" : "Share of your meals";

    el.innerHTML = `
      <div class="rank-big">
        <div class="rank-banner">
          <div class="rank-banner-left">
            <div class="rank-title rank-title-big"><span class="rank-dot">1</span>${escapeHtml(top.key)}</div>
            <div class="rank-sub">${escapeHtml(shareLabel)}: <b>${escapeHtml(fmtShare(top.value))}</b>${spicy ? ` • ${escapeHtml(spicy)}` : ""}</div>
          </div>
          <div class="rank-banner-right">
            <div class="rank-value rank-value-big">${fmtVal(top.value)}</div>
          </div>
        </div>
      </div>
      <div class="rank-smalls rank-smalls-vert">
        ${rest.map((x, idx) => `
          <div class="rank-small">
            <div class="rank-row">
              <div class="rank-title"><span class="rank-dot">${idx + 2}</span>${escapeHtml(x.key)}</div>
              <div class="rank-value">${fmtVal(x.value)}</div>
            </div>
            <div class="rank-sub">${escapeHtml(fmtShare(x.value))} of your ${kind === "money" ? "spend" : "meals"}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderLocationLegends(stats){
    renderRankBlock("rankSpend", stats?.topSpend, { kind: "money", total: stats?.totalSpend });
    renderRankBlock("rankVisits", stats?.topVisits, { kind: "count", total: stats?.txns, spicy: true });
  }

  function renderCharts(stats){
    chartTopSpend = destroyChart(chartTopSpend);
    chartHours = destroyChart(chartHours);
    chartWeekdays = destroyChart(chartWeekdays);
    chartMonths = destroyChart(chartMonths);

    const elHours = document.getElementById("chartHours");
    if (elHours) {
      chartHours = new Chart(elHours, {
      type: "bar",
      data: {
        labels: stats.hours.map(h => String(h.hour).padStart(2,"0")),
        datasets: [{ label: "Txns", data: stats.hours.map(h => h.count) }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }

    const elWeekdays = document.getElementById("chartWeekdays");
    if (elWeekdays) {
      chartWeekdays = new Chart(elWeekdays, {
      type: "bar",
      data: {
        labels: stats.weekdays.map(w => w.day),
        datasets: [{ label: "Txns", data: stats.weekdays.map(w => w.count) }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }
  }

  // --- Entertaining Wrap Rendering ---

  function animateIn(element, delay = 0) {
    if (!element) return;
    element.classList.add("reveal");
    setTimeout(() => {
      element.classList.add("reveal-in");
    }, delay);
  }

  function renderPersonalitySlide(stats) {
    const personality = getDiningPersonality(stats);
    const slide = document.querySelector('[data-title="Your Dining Personality"]');

    if (!slide) return;

    const content = slide.querySelector('.slide-inner');
    content.innerHTML = `
      <div class="personality-reveal">
        <div class="big-emoji">🎭</div>
        <h2>Your Dining Personality</h2>
        <div class="personality-name">${personality.name}</div>
        <div class="personality-desc">${personality.desc}</div>
        <div class="personality-stats">
          <div class="stat">Peak Hour: ${stats.peakHour.hour}:00</div>
          <div class="stat">Favorite Day: ${stats.peakWeekday.day}</div>
          <div class="stat">Total Meals: ${stats.txns}</div>
        </div>
      </div>
    `;

    // Animate elements
    const elements = content.querySelectorAll('.big-emoji, .personality-name, .personality-desc, .stat');
    elements.forEach((el, i) => animateIn(el, i * 200));
  }

  function renderBigPictureSlide(stats) {
    const slide = document.querySelector('[data-title="The Big Picture"]');
    if (!slide) return;

    const comparisons = generateFunComparisons(stats);
    const content = slide.querySelector('.slide-inner');

    const activeMonths = Math.max(1, stats.activeMonths || stats.months.length || 1);
    const mealsPerMonth = stats.txns / activeMonths;
    const uniquePlaces = stats.uniquePlaces || stats.topVisits.length;

    content.innerHTML = `
      <div class="big-picture">
        <h2>This Year in Bites</h2>
        <div class="big-numbers">
          <div class="big-num">
            <div class="number">${stats.txns}</div>
            <div class="label">Meals Swiped</div>
          </div>
          <div class="big-num">
            <div class="number">¥${fmtMoney(stats.totalSpend)}</div>
            <div class="label">Total Spent</div>
          </div>
        </div>
        <div class="kpi-grid" style="max-width:760px;margin:18px auto 0">
          <div class="kpi">
            <div class="kpi-label">Average meal</div>
            <div class="kpi-value">¥${fmtMoney(stats.avgMealCost)}</div>
            <div class="kpi-sub muted">Based on ${stats.txns} dining expenses</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Unique spots</div>
            <div class="kpi-value">${uniquePlaces}</div>
            <div class="kpi-sub muted">Different dining services visited</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Pace</div>
            <div class="kpi-value">${mealsPerMonth.toFixed(1)}</div>
            <div class="kpi-sub muted">Meals per active month</div>
          </div>
        </div>
        <div class="fun-facts">
          <h3>Fun Facts</h3>
          <ul>
            ${comparisons.map(fact => `<li>${fact}</li>`).join('')}
          </ul>
        </div>

        <div class="note" style="max-width:760px;margin:18px auto 0">
          <div class="note-title">Spicy take</div>
          <div class="note-body" id="spicyTake">—</div>
        </div>
      </div>
    `;

    // Animate big numbers
    const numbers = content.querySelectorAll('.big-num');
    numbers.forEach((num, i) => animateIn(num, i * 300));

    // Data-driven spicy templates (always visible)
    setText("spicyTake", buildSpicyComment(stats));
  }

  function buildSpicyComment(stats){
    // Multiple templates, all strictly based on computed stats.
    const txns = stats.txns || 0;
    const uniquePlaces = stats.uniquePlaces || 0;
    const favoriteCount = stats.favoriteCount || 0;
    const favorite = stats.favorite || "—";
    const latestHour = stats.latest?.d ? stats.latest.d.getHours() : null;
    const earliestHour = stats.earliest?.d ? stats.earliest.d.getHours() : null;
    const busiest = stats.busiestDay?.count || 0;
    const avg = Number(stats.avgMealCost);

    const share = txns ? favoriteCount / txns : 0;

    if (latestHour !== null && (latestHour <= 3 || latestHour >= 23)) {
      return `I’m not judging, but… your latest meal was at ${String(latestHour).padStart(2,"0")}:xx. Night owl confirmed. 🌙`;
    }

    if (earliestHour !== null && earliestHour <= 7) {
      return `Early bird energy: you’ve eaten as early as ${String(earliestHour).padStart(2,"0")}:xx. Respect. ☀️`;
    }

    if (favorite !== "—" && favoriteCount >= 15 && share >= 0.55) {
      return `${favorite} with ${favoriteCount} visits (${Math.round(share*100)}% of your meals)… do you live here? 👑`;
    }

    if (uniquePlaces >= 15) {
      return `${uniquePlaces} different spots. You’re not loyal — you’re exploratory. 🗺️`;
    }

    if (busiest >= 4) {
      return `${busiest} meals in one day… was that all you? 🔥`;
    }

    if (Number.isFinite(avg) && avg >= 35) {
      return `Average meal ¥${fmtMoney(avg)}. Taste is expensive, and you’re okay with that. 🤑`;
    }

    if (txns >= 80) {
      return `${txns} meals logged. Consistency is your superpower. 📅`;
    }

    return "Quietly efficient. Not chaotic. Not dramatic. Just solid dining. ✅";
  }

  function renderTimelineSlide(stats) {
    const slide = document.querySelector('[data-title="Your Dining Timeline"]');
    if (!slide) return;

    const content = slide.querySelector('.slide-inner');
    const monthlyData = stats.months;
    const maxSpend = Math.max(...monthlyData.map(m => m.spend));

    content.innerHTML = `
      <div class="timeline">
        <h2>Your Dining Journey</h2>
        <div class="monthly-chart">
          ${monthlyData.map(month => `
            <div class="month-bar">
              <div class="month-label">${month.month}</div>
              <div class="bar-container">
                <div class="bar" style="width: ${(month.spend / maxSpend) * 100}%"></div>
              </div>
              <div class="month-spend">¥${fmtMoney(month.spend)}</div>
            </div>
          `).join('')}
        </div>
        <div class="timeline-insight">
          <p>Your dining peaks in <strong>${monthlyData.reduce((a,b) => b.spend > a.spend ? b : a).month}</strong></p>
        </div>
      </div>
    `;

    // Animate bars sequentially
    const bars = content.querySelectorAll('.month-bar');
    bars.forEach((bar, i) => animateIn(bar, i * 100));
  }

  function renderBingeSlide(stats){
    // Reuse the existing "Memory Lane" slide to show concrete highlights first.
    // (We keep the slide title, but content becomes more Wrapped-like and data-backed.)
    const slide = document.querySelector('[data-title="Memory Lane"]');
    if (!slide) return;

    const content = slide.querySelector('.slide-inner');

    const busiest = stats.busiestDay;
    const earliest = stats.earliest;
    const latest = stats.latest;
    const mostExpensive = stats.mostExpensive;

    function fmtWhen(d){
      if (!d) return "—";
      return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
    }

    function svcFromRow(row){
      const svc = String(row?.service ?? "").trim();
      return svc || "Unknown";
    }

    content.innerHTML = `
      <div class="memories">
        <h2>⚡ The Big Binge</h2>
        <div class="memory-cards">
          <div class="memory-card">
            <div class="memory-icon">🔥</div>
            <div class="memory-text">
              <strong>My busiest day</strong><br/>
              ${busiest ? `${escapeHtml(busiest.day)} — <b>${busiest.count}</b> meals` : "—"}
            </div>
          </div>
          <div class="memory-card">
            <div class="memory-icon">☀️</div>
            <div class="memory-text">
              <strong>Earliest meal</strong><br/>
              ${earliest?.d ? `${escapeHtml(fmtWhen(earliest.d))} • ${escapeHtml(svcFromRow(earliest.row))}` : "—"}
            </div>
          </div>
          <div class="memory-card">
            <div class="memory-icon">🌙</div>
            <div class="memory-text">
              <strong>Latest meal</strong><br/>
              ${latest?.d ? `${escapeHtml(fmtWhen(latest.d))} • ${escapeHtml(svcFromRow(latest.row))}` : "—"}
            </div>
          </div>
          <div class="memory-card">
            <div class="memory-icon">🤑</div>
            <div class="memory-text">
              <strong>Most expensive meal</strong><br/>
              ${mostExpensive?.spend ? `¥${escapeHtml(fmtMoney(mostExpensive.spend))} • ${escapeHtml(mostExpensive.d ? fmtWhen(mostExpensive.d) : "time unknown")} • ${escapeHtml(svcFromRow(mostExpensive.row))}` : "—"}
            </div>
          </div>
        </div>
      </div>
    `;

    const cards = content.querySelectorAll('.memory-card');
    cards.forEach((card, i) => animateIn(card, i * 160));
  }

  function renderAchievementsSlide(stats) {
    const slide = document.querySelector('[data-title="Achievement Unlocked!"]');
    if (!slide) return;

    const achievements = calculateAchievements(stats);
    const content = slide.querySelector('.slide-inner');

    content.innerHTML = `
      <div class="achievements">
        <h2>🏆 Achievement Unlocked!</h2>
        <div class="achievement-grid">
          ${achievements.slice(0, 6).map(achievement => `
            <div class="achievement-card">
              <div class="achievement-icon">${achievement.icon}</div>
              <div class="achievement-name">${achievement.name}</div>
              <div class="achievement-desc">${achievement.desc}</div>
            </div>
          `).join('')}
        </div>
        ${achievements.length > 6 ? `<p class="more-achievements">...and ${achievements.length - 6} more!</p>` : ''}
      </div>
    `;

    // Animate achievement cards
    const cards = content.querySelectorAll('.achievement-card');
    cards.forEach((card, i) => animateIn(card, i * 150));
  }

  function renderMemoriesSlide(stats) {
    // Keep a second section in the same slide for additional highlights.
    // The first section is the "Big Binge" block.
    renderBingeSlide(stats);

    const slide = document.querySelector('[data-title="Memory Lane"]');
    if (!slide) return;

    const memories = getMemoryHighlights(stats);
    const content = slide.querySelector('.slide-inner');

    const extra = `
      <div class="note" style="max-width:760px;margin:18px auto 0">
        <div class="note-title">More highlights</div>
        <div class="note-body">
          <ul style="margin:0;padding-left:18px">
            ${memories.map(m => `<li>${escapeHtml(m)}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;

    content.querySelector('.memories')?.insertAdjacentHTML('beforeend', extra);
  }

  function renderPredictionsSlide(stats) {
    const slide = document.querySelector('[data-title="2026 Predictions"]');
    if (!slide) return;

    const predictions = predictFutureHabits(stats);
    const content = slide.querySelector('.slide-inner');

    const year = new Date().getFullYear();
    const titleYear = year >= 2026 ? year : 2026;

    const items = (predictions && predictions.length)
      ? predictions
      : [
          "Not enough month-to-month data for a trend yet.",
          "Try importing a longer date range to unlock trend insights."
        ];

    content.innerHTML = `
      <div class="predictions">
        <h2>🔮 ${titleYear} Predictions</h2>
        <div class="crystal-ball">🔮</div>
        <div class="prediction-list">
          ${items.map(prediction => `
            <div class="prediction-item">
              <div class="prediction-icon">✨</div>
              <div class="prediction-text">${prediction}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Animate predictions
    const els = content.querySelectorAll('.prediction-item');
    els.forEach((item, i) => animateIn(item, i * 250));
  }

  function renderShareableQuotesSlide(stats) {
    const slide = document.querySelector('[data-title="Share Your Wrap"]');
    if (!slide) return;

    const quotes = createShareableQuotes(stats);
    const content = slide.querySelector('.slide-inner');

    content.innerHTML = `
      <div class="share-quotes">
        <h2>📱 Share Your Dining Story</h2>
        <div class="quote-cards">
          ${quotes.map(quote => `
            <div class="quote-card" onclick="copyQuote('${quote.replace(/'/g, "\\'")}')">
              <div class="quote-text">"${quote}"</div>
              <div class="quote-action">Click to copy 📋</div>
            </div>
          `).join('')}
        </div>
        <div class="hashtags">
          #DKUDiningWrapped #CampusFoodie #DKULife
        </div>
      </div>
    `;

    // Animate quote cards
    const cards = content.querySelectorAll('.quote-card');
    cards.forEach((card, i) => animateIn(card, i * 200));
  }

  // Global function for copying quotes
  window.copyQuote = async function(quote) {
    try {
      await navigator.clipboard.writeText(quote);
      // Show temporary success message
      const notification = document.createElement('div');
      notification.textContent = 'Quote copied! 📋';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(125,211,252,.14);
        border: 1px solid rgba(125,211,252,.30);
        color: var(--text);
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    } catch (err) {
      alert('Failed to copy quote');
    }
  };

  function renderMoneySlide(stats) {
    const slide = document.querySelector('[data-title="Money Talks"]');
    if (!slide) return;

    setText("avgMealCost", `¥${fmtMoney(stats.avgMealCost)}`);
    setText("totalInvested", `¥${fmtMoney(stats.totalSpend)}`);
  }

  function renderComparisonSlide(stats) {
    const slide = document.querySelector('[data-title="Compared to DKU"]');
    if (!slide) return;

    // Replace DKU percentiles with self-based, data-backed context.
    const activeMonths = Math.max(1, stats.activeMonths || stats.months.length || 1);
    const mealsPerMonth = stats.txns / activeMonths;
    const spendingPerMonth = stats.totalSpend / activeMonths;

    const topMonth = stats.topMonth;
    const monthRank = topMonth ? 1 : null;
    const monthCount = stats.months?.length || 0;

    setText("mealFrequency", `${mealsPerMonth.toFixed(1)} meals/active month`);
    setText("frequencyPercentile", topMonth ? `Peak month: ${topMonth.month}` : "—");
    setText("spendingLevel", `¥${fmtMoney(spendingPerMonth)}/active month`);
    setText("spendingPercentile", monthCount ? `Measured across ${monthCount} active months` : "—");
  }

  function renderEndingSlide(stats) {
    const slide = document.querySelector('[data-title="The End"]');
    if (!slide) return;

    setText("finalMeals", stats.txns);
    setText("finalSpent", `¥${fmtMoney(stats.totalSpend)}`);
    setText("finalPlaces", stats.topVisits.length);
  }

  function renderAllEntertaining(stats) {
    // Render all slides with entertaining content
    renderPersonalitySlide(stats);
    renderBigPictureSlide(stats);
    renderTimelineSlide(stats);
    renderMoneySlide(stats);
    renderAchievementsSlide(stats);
    renderComparisonSlide(stats);
    renderMemoriesSlide(stats);
    renderPredictionsSlide(stats);
    renderShareableQuotesSlide(stats);
    renderEndingSlide(stats);

    // Location Legends (rank cards)
    renderLocationLegends(stats);

    // Render charts for remaining slides (compatibility)
    renderCharts(stats);

    // Enable hover glow for newly rendered nodes
    initGlowHover(document);

    // Start autoplay once we have real content.
    startAuto();

    btnExportCurrent.disabled = false;
    btnExportAll.disabled = false;
  }

  function loadAndRenderRows(rows, sourceLabel){
    const stats = computeStats(rows);
    const diningCount = stats.txns;
    const totalCount = stats.meta?.totalRows ?? rows.length;
    elStatus.textContent = `${sourceLabel}: ${totalCount} rows loaded • ${diningCount} dining expenses used`;
    renderAllEntertaining(stats);
    showSlide(0);
  }

  // --- Export PNG
  async function exportElementAsPNG(el, filename){
    const rootStyle = getComputedStyle(document.documentElement);
    const bg = (rootStyle.getPropertyValue("--bg") || "").trim() || "#0b0d12";

    const container = el.closest?.(".card") || document.body;
    const containerStyle = getComputedStyle(container);
    const containerBgImage = (containerStyle.backgroundImage || "").trim();
    const containerBgColor = (containerStyle.backgroundColor || "").trim() || bg;
    const containerBgSize = (containerStyle.backgroundSize || "").trim();
    const containerBgPos = (containerStyle.backgroundPosition || "").trim();
    const containerBgRepeat = (containerStyle.backgroundRepeat || "").trim();

    const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    el.dataset.exportToken = token;

    try {
      const scale = Math.max(2, window.devicePixelRatio || 2);
      const baseOpts = {
        backgroundColor: bg,
        scale,
        onclone: (doc) => {
          const target = doc.querySelector(`[data-export-token="${token}"]`);
          if (!target) return;

          // Hide the section title ("3) Your Wrap") so the export is just the wrap itself.
          const title = target.querySelector("h2");
          if (title) title.style.display = "none";

          // Ensure exported root has a solid, consistent backdrop.
          // (Some browsers/html2canvas paths can wash out alpha blends.)
          if (containerBgImage && containerBgImage !== "none") {
            target.style.backgroundImage = containerBgImage;
            target.style.backgroundColor = containerBgColor;
            if (containerBgSize) target.style.backgroundSize = containerBgSize;
            if (containerBgPos) target.style.backgroundPosition = containerBgPos;
            if (containerBgRepeat) target.style.backgroundRepeat = containerBgRepeat;
          } else {
            target.style.backgroundColor = containerBgColor;
          }

          // Add export class to brighten everything for export
          const activeSlide = target.querySelector(".slide.active");
          if (activeSlide) {
            activeSlide.classList.add("exporting");
          }
        }
      };

      let canvas;
      try {
        // Default renderer is usually the most reliable.
        canvas = await html2canvas(el, baseOpts);
      } catch {
        // Fallback: foreignObjectRendering can help in some environments,
        // but can also produce black renders in others.
        canvas = await html2canvas(el, { ...baseOpts, foreignObjectRendering: true, useCORS: true });
      }
      const a = document.createElement("a");
      a.download = filename;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } finally {
      delete el.dataset.exportToken;
    }
  }

  btnExportCurrent.addEventListener("click", async () => {
    const active = slides.find(s => s.classList.contains("active"));
    if (!active || !elWrapShell) return;
    const exportRoot = elWrapShell.closest(".card") || elWrapShell;
    const title = active.dataset.title || `card-${slideIndex+1}`;
    await exportElementAsPNG(exportRoot, `dku-wrap-${slideIndex+1}-${slugify(title)}.png`);
  });

  btnExportAll.addEventListener("click", async () => {
    const oldIndex = slideIndex;
    const exportRoot = elWrapShell ? (elWrapShell.closest(".card") || elWrapShell) : null;
    for (let i = 0; i < slides.length; i++){
      showSlide(i);
      await new Promise(r => setTimeout(r, 140));
      const title = slides[i].dataset.title || `card-${i+1}`;
      if (exportRoot) {
        await exportElementAsPNG(exportRoot, `dku-wrap-${i+1}-${slugify(title)}.png`);
      }
      await new Promise(r => setTimeout(r, 120));
    }
    showSlide(oldIndex);
  });

  function slugify(s){
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
  }

  // --- File input
  btnExportCurrent.disabled = true;
  btnExportAll.disabled = true;

  elFile.addEventListener("change", () => {
    const f = elFile.files?.[0];
    if (!f) return;

    elStatus.textContent = "Parsing CSV…";

    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = (res.data || []).filter(Boolean);
        if (!rows.length){
          elStatus.textContent = "No rows found in the CSV.";
          return;
        }

        const cols = Object.keys(rows[0] || {});
        const required = ["dateTime","type","service","amount"];
        const missing = required.filter(c => !cols.includes(c));
        if (missing.length){
          elStatus.textContent = `Loaded ${rows.length} rows, but missing columns: ${missing.join(", ")}.`;
          return;
        }

        loadAndRenderRows(rows, "CSV");
      },
      error: (err) => {
        console.error(err);
        elStatus.textContent = "Failed to parse CSV.";
      }
    });
  });

  // Auto-import when arriving from the exporter (window.name handoff)
  const handoffRows = tryLoadFromWindowName();
  if (handoffRows && handoffRows.length) {
    loadAndRenderRows(handoffRows, "One-click export");
  }

})();
