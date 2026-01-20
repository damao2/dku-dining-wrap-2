// DKU Dining Wrapped 2024 — Entertainment UI Layer

(() => {
  const BOOKMARKLET_SRC = "https://williamguo34.github.io/dku-dining-wrap/export-dku-transactions.js";
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

  const btnExportCurrent = document.getElementById("btnExportCurrent");
  const btnExportAll = document.getElementById("btnExportAll");

  const bookmarkletLink = document.getElementById("bookmarkletLink");
  const btnCopyBookmarklet = document.getElementById("btnCopyBookmarklet");
  const btnLoadSample = document.getElementById("btnLoadSample");
  const btnDownloadTemplate = document.getElementById("btnDownloadTemplate");

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

  // --- Slide navigation
  let slideIndex = 0;
  function showSlide(i){
    slideIndex = Math.max(0, Math.min(slides.length - 1, i));
    slides.forEach((s, idx) => s.classList.toggle("active", idx === slideIndex));
    elPager.textContent = `Card ${slideIndex + 1} / ${slides.length} • ${slides[slideIndex].dataset.title || ""}`;
    btnPrev.disabled = slideIndex === 0;
    btnNext.disabled = slideIndex === slides.length - 1;
  }
  btnPrev.addEventListener("click", () => showSlide(slideIndex - 1));
  btnNext.addEventListener("click", () => showSlide(slideIndex + 1));
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

  function renderTopVisitsList(stats){
    const el = document.getElementById("listTopVisits");
    if (!el) return;

    const items = Array.isArray(stats?.topVisits) ? stats.topVisits : [];
    if (!items.length) {
      el.innerHTML = "<li class=\"muted\">—</li>";
      return;
    }

    el.innerHTML = items
      .map((x) => {
        const place = escapeHtml(x.key);
        const visits = Number(x.value) || 0;
        return `<li><strong>${place}</strong> — ${visits} visit${visits === 1 ? "" : "s"}</li>`;
      })
      .join("");
  }

  function renderCharts(stats){
    chartTopSpend = destroyChart(chartTopSpend);
    chartHours = destroyChart(chartHours);
    chartWeekdays = destroyChart(chartWeekdays);
    chartMonths = destroyChart(chartMonths);

    const topSpendLabels = stats.topSpend.map(x => x.key);
    const topSpendValues = stats.topSpend.map(x => x.value);

    chartTopSpend = new Chart(document.getElementById("chartTopSpend"), {
      type: "bar",
      data: { labels: topSpendLabels, datasets: [{ label: "Spend", data: topSpendValues }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { maxRotation: 30, minRotation: 0 } } }
      }
    });

    chartHours = new Chart(document.getElementById("chartHours"), {
      type: "bar",
      data: {
        labels: stats.hours.map(h => String(h.hour).padStart(2,"0")),
        datasets: [{ label: "Txns", data: stats.hours.map(h => h.count) }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });

    chartWeekdays = new Chart(document.getElementById("chartWeekdays"), {
      type: "bar",
      data: {
        labels: stats.weekdays.map(w => w.day),
        datasets: [{ label: "Txns", data: stats.weekdays.map(w => w.count) }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });

    chartMonths = new Chart(document.getElementById("chartMonths"), {
      type: "line",
      data: {
        labels: stats.months.map(m => m.month),
        datasets: [{ label: "Spend", data: stats.months.map(m => m.spend) }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });

    renderTopVisitsList(stats);
  }

  // --- Entertaining Wrap Rendering ---

  function animateIn(element, delay = 0) {
    setTimeout(() => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(20px)';
      element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';

      requestAnimationFrame(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      });
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
        <div class="fun-facts">
          <h3>Fun Facts</h3>
          <ul>
            ${comparisons.map(fact => `<li>${fact}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;

    // Animate big numbers
    const numbers = content.querySelectorAll('.big-num');
    numbers.forEach((num, i) => animateIn(num, i * 300));
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
    const slide = document.querySelector('[data-title="Memory Lane"]');
    if (!slide) return;

    const memories = getMemoryHighlights(stats);
    const content = slide.querySelector('.slide-inner');

    content.innerHTML = `
      <div class="memories">
        <h2>📸 Memory Lane</h2>
        <div class="memory-cards">
          ${memories.map(memory => `
            <div class="memory-card">
              <div class="memory-icon">💭</div>
              <div class="memory-text">${memory}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Animate memory cards
    const cards = content.querySelectorAll('.memory-card');
    cards.forEach((card, i) => animateIn(card, i * 200));
  }

  function renderPredictionsSlide(stats) {
    const slide = document.querySelector('[data-title="2025 Predictions"]');
    if (!slide) return;

    const predictions = predictFutureHabits(stats);
    const content = slide.querySelector('.slide-inner');

    content.innerHTML = `
      <div class="predictions">
        <h2>🔮 2025 Predictions</h2>
        <div class="crystal-ball">🔮</div>
        <div class="prediction-list">
          ${predictions.map(prediction => `
            <div class="prediction-item">
              <div class="prediction-icon">✨</div>
              <div class="prediction-text">${prediction}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Animate predictions
    const items = content.querySelectorAll('.prediction-item');
    items.forEach((item, i) => animateIn(item, i * 250));
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
        background: #28a745;
        color: white;
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

    const avgMealCost = stats.totalSpend / Math.max(1, stats.txns);
    setText("avgMealCost", `¥${fmtMoney(avgMealCost)}`);
    setText("totalInvested", `¥${fmtMoney(stats.totalSpend)}`);
  }

  function renderComparisonSlide(stats) {
    const slide = document.querySelector('[data-title="Compared to DKU"]');
    if (!slide) return;

    // Calculate approximate percentiles (simplified)
    const mealsPerMonth = Math.floor(stats.txns / Math.max(1, stats.months.length));
    const spendingPerMonth = stats.totalSpend / Math.max(1, stats.months.length);

    // Mock percentiles (in real app, you'd have actual DKU data)
    let frequencyPercentile = "Top 75%";
    if (mealsPerMonth > 25) frequencyPercentile = "Top 25%";
    if (mealsPerMonth > 35) frequencyPercentile = "Top 10%";

    let spendingPercentile = "Top 60%";
    if (spendingPerMonth > 1500) spendingPercentile = "Top 30%";
    if (spendingPerMonth > 2500) spendingPercentile = "Top 15%";

    setText("mealFrequency", `${mealsPerMonth} meals/month`);
    setText("frequencyPercentile", frequencyPercentile);
    setText("spendingLevel", `¥${fmtMoney(spendingPerMonth)}/month`);
    setText("spendingPercentile", spendingPercentile);
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

    // Render charts for remaining slides (compatibility)
    renderCharts(stats);

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
    const canvas = await html2canvas(el, { backgroundColor: null, scale: window.devicePixelRatio || 2 });
    const a = document.createElement("a");
    a.download = filename;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }

  btnExportCurrent.addEventListener("click", async () => {
    const active = slides.find(s => s.classList.contains("active"));
    if (!active) return;
    const title = active.dataset.title || `card-${slideIndex+1}`;
    await exportElementAsPNG(active, `dku-wrap-${slideIndex+1}-${slugify(title)}.png`);
  });

  btnExportAll.addEventListener("click", async () => {
    const oldIndex = slideIndex;
    for (let i = 0; i < slides.length; i++){
      showSlide(i);
      await new Promise(r => setTimeout(r, 140));
      const title = slides[i].dataset.title || `card-${i+1}`;
      await exportElementAsPNG(slides[i], `dku-wrap-${i+1}-${slugify(title)}.png`);
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
