// DKU Dining Wrap MVP (pure HTML/JS)
// - Upload CSV
// - Compute a few fun stats
// - Render 5 "cards"
// - Export current/all cards as PNG
//
// Expected columns: dateTime,type,txn,service,amount,status

(() => {
  const BOOKMARKLET_SRC = "https://williamguo34.github.io/dku-dining-wrap/export-dku-transactions.js";
  const HANDOFF_STORAGE_KEY = "DKU_WRAP_V1"; // must match exporter

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
  }

  // --- CSV parsing + stats
  function parseAmount(x){
    const v = Number(String(x ?? "").replace(/[^0-9.\-+]/g,""));
    return Number.isFinite(v) ? v : 0;
  }

  function parseDateTime(s){
    const raw = String(s ?? "").trim();
    if (!raw) return null;

    let d = new Date(raw);
    if (!isNaN(d.getTime())) return d;

    const norm = raw.replace(/[./]/g, "-");
    d = new Date(norm);
    if (!isNaN(d.getTime())) return d;

    return null;
  }

  function incMap(map, key, delta){
    map.set(key, (map.get(key) || 0) + delta);
  }

  function topNFromMap(map, n){
    return Array.from(map.entries())
      .map(([key,value]) => ({key, value}))
      .sort((a,b) => b.value - a.value)
      .slice(0, n);
  }

  // --- Row classification (filter non-dining)
  function classifyRow(r){
    const type = String(r.type || "").toLowerCase();
    const service = String(r.service || "").toLowerCase();

    if (type.includes("wechat top up") || type.includes("微信充值")) return "topup";
    if (service.includes("pharos") || service.includes("printing") || service.includes("打印")) return "printing";
    if (type.includes("social medical insurance") || service.includes("rms-")) return "admin";

    if (type.includes("expense") || type.includes("消费")) return "expense";
    return "other";
  }

  function inferIsDining(r){
    // classify as dining if it's an expense
    if (classifyRow(r) !== "expense") return false;

    const service = String(r.service || "");
    // Common dining stall formats: 2F-5 / 3F-3 / 1F-2
    if (/\b[1-9]F-\d+\b/i.test(service)) return true;

    // If in the future some dining halls don't have floor formats, whitelist here
    // const wl = ["zartar", "late diner", "weigh-and-pay", "taste of the occident", "juice bar", "harbour deli", "malatang"];
    // if (wl.some(k => service.toLowerCase().includes(k))) return true;

    return false;
  }

  function spendValue(r){
    // Unified: dining spend (positive number)
    // DKU "Expense" entries usually have negative amounts.
    // We count only negative values as spend; positive entries (refunds/adjustments) become 0 here.
    const amt = parseAmount(r.amount);
    return (classifyRow(r) === "expense" && amt < 0) ? (-amt) : 0;
  }

  function computeStats(rows){
    const totalRows = rows.length;

    // Count categories on the original dataset (before dining filter)
    const catCounts = { dining: 0, topup: 0, printing: 0, admin: 0, expense_non_dining: 0, other: 0 };
    for (const r of rows) {
      const cls = classifyRow(r);
      if (cls === "topup") catCounts.topup += 1;
      else if (cls === "printing") catCounts.printing += 1;
      else if (cls === "admin") catCounts.admin += 1;
      else if (cls === "expense") {
        if (inferIsDining(r)) catCounts.dining += 1;
        else catCounts.expense_non_dining += 1;
      } else {
        catCounts.other += 1;
      }
    }

    const diningRows = rows.filter(r => inferIsDining(r));
    const txns = diningRows.length;
    const amounts = diningRows.map(r => spendValue(r));
    const totalSpend = amounts.reduce((a,b) => a + b, 0);

    const spendByService = new Map();
    const visitsByService = new Map();

    const hours = Array.from({length:24}, (_,h)=>({hour:h, count:0}));
    const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>({day:d, count:0}));
    const spendByMonth = new Map(); // YYYY-MM

    let validTime = 0;

    for (const r of diningRows){
      const amt = spendValue(r); // positive number spend
      const svc = String(r.service ?? "").trim() || "Unknown";
      incMap(spendByService, svc, amt);
      incMap(visitsByService, svc, 1);

      const d = parseDateTime(r.dateTime);
      if (d){
        validTime += 1;
        hours[d.getHours()].count += 1;
        weekdays[d.getDay()].count += 1;

        const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        incMap(spendByMonth, ym, amt);
      }
    }

    const topSpend = topNFromMap(spendByService, 8);
    const topVisits = topNFromMap(visitsByService, 8);

    const favorite = topVisits[0]?.key || "—";
    const favoriteCount = topVisits[0]?.value || 0;

    const peakHour = hours.reduce((best, cur) => cur.count > best.count ? cur : best, hours[0]);
    const peakWeekday = weekdays.reduce((best, cur) => cur.count > best.count ? cur : best, weekdays[0]);

    const months = Array.from(spendByMonth.entries())
      .map(([month, spend]) => ({month, spend}))
      .sort((a,b) => a.month.localeCompare(b.month));

    return {
      txns,
      totalSpend,
      topSpend,
      topVisits,
      favorite,
      favoriteCount,
      peakHour,
      peakWeekday,
      hours,
      weekdays,
      months,
      validTime,
      meta: {
        totalRows,
        diningRows: diningRows.length,
        catCounts,
      }
    };
  }

  function fmtMoney(x){
    const v = Number(x);
    if (!Number.isFinite(v)) return "—";
    return v.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 });
  }

  function setText(id, txt){
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function buildVibeText(stats){
    if (stats.txns === 0) return "No transactions found in this file.";
    const nightTxns = stats.hours.filter(h => h.hour >= 22 || h.hour <= 5).reduce((a,b)=>a+b.count,0);
    const nightRatio = stats.txns ? (nightTxns / stats.txns) : 0;

    const vibeBits = [];
    vibeBits.push(`You made ${stats.txns} swipes in total.`);
    vibeBits.push(`Peak time: ${String(stats.peakHour.hour).padStart(2,"0")}:00.`);
    vibeBits.push(`Busiest day: ${stats.peakWeekday.day}.`);

    if (nightRatio >= 0.25) vibeBits.push("Night owl detected 🦉");
    else if (stats.peakHour.hour <= 9) vibeBits.push("Morning person energy ☀️");
    else if (stats.peakHour.hour >= 18) vibeBits.push("Dinner-core 🌙");

    return vibeBits.join(" ");
  }

  function buildTrendText(stats){
    if (!stats.months.length) return "Not enough date info to compute monthly trends.";
    const maxM = stats.months.reduce((a,b)=> b.spend>a.spend ? b : a, stats.months[0]);
    return `Your biggest month was ${maxM.month} with spend ${fmtMoney(maxM.spend)}.`;
  }

  function renderTopVisitsList(stats){
    const ol = document.getElementById("listTopVisits");
    ol.innerHTML = "";
    for (const x of stats.topVisits){
      const li = document.createElement("li");
      li.textContent = `${x.key} — ${x.value} visits`;
      ol.appendChild(li);
    }
  }

  function renderAll(stats){
    setText("kpiTotalSpend", fmtMoney(stats.totalSpend));
    setText("kpiSpendSub", "Total dining spend");
    setText("kpiTxnCount", String(stats.txns));
    if (stats.meta?.totalRows && stats.meta.totalRows !== stats.txns) {
      const c = stats.meta.catCounts || {};
      const bits = [];
      if (c.topup) bits.push(`${c.topup} top-up`);
      if (c.printing) bits.push(`${c.printing} printing`);
      if (c.admin) bits.push(`${c.admin} admin`);
      if (c.expense_non_dining) bits.push(`${c.expense_non_dining} non-dining expense`);
      const excluded = bits.length ? `Excluded: ${bits.join(", ")}` : "Excluded non-dining transactions";
      setText("kpiTxnSub", `${stats.validTime} with timestamps • ${excluded}`);
    } else {
      setText("kpiTxnSub", stats.validTime ? `${stats.validTime} with timestamps` : "No parsable timestamps");
    }
    setText("kpiFav", stats.favorite);
    setText("kpiFavSub", stats.favoriteCount ? `${stats.favoriteCount} visits` : "—");
    setText("vibeText", buildVibeText(stats));
    setText("trendText", buildTrendText(stats));

    renderTopVisitsList(stats);
    renderCharts(stats);

    btnExportCurrent.disabled = false;
    btnExportAll.disabled = false;
  }

  function loadAndRenderRows(rows, sourceLabel){
    const stats = computeStats(rows);
    const diningCount = stats.txns;
    const totalCount = stats.meta?.totalRows ?? rows.length;
    elStatus.textContent = `${sourceLabel}: ${totalCount} rows loaded • ${diningCount} dining expenses used`;
    renderAll(stats);
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
