// export-dku-transactions.js
// DKU Dining Wrap — Transaction History CSV exporter
// Usage (Bookmarklet loads this file): it will auto-run once after being injected.
//
// Notes:
// - Must be executed on the DKU "Transaction History" page where dtlsearch(), pageSubmit(), and #pdata exist.
// - All processing happens in-browser; this script only downloads a CSV.

(() => {
  // Prevent double-runs if user clicks bookmark repeatedly
  if (window.__DKU_DINING_EXPORT_RUNNING__) {
    alert("DKU Dining Exporter is already running.");
    return;
  }
  window.__DKU_DINING_EXPORT_RUNNING__ = true;

  /***********************
   * Handoff mode
   *
   * By default we do NOT download a CSV.
   * Instead we store the rows in window.name and redirect to your GitHub Pages app.
   * This makes the user flow: (1) open Transaction History page -> (2) click bookmark -> done.
   *
   * If you still want the CSV download, set:
   *   window.__DKU_DINING_EXPORT_MODE__ = "download"
   * before running the script.
   ***********************/

  const WRAP_URL = "https://williamguo34.github.io/dku-dining-wrap/";
  const HANDOFF_STORAGE_KEY = "DKU_WRAP_V1";
  const HANDOFF_MAX_BYTES = 3_500_000; // keep below common window.name limits

  (async () => {
    try {
      /***********************
       * Config (edit here if you want defaults)
       ***********************/
      // Defaults: scrape from Jan 1 of (currentYear - 2) to today.
      // You can override in console before running:
      //   window.__DKU_DINING_EARLIEST__ = "YYYY.MM.DD"
      //   window.__DKU_DINING_LATEST__   = "YYYY.MM.DD"
      //   window.__DKU_DINING_WINDOW_DAYS__ = 30
      const TODAY = new Date();
      TODAY.setHours(0, 0, 0, 0);
      const DEFAULT_LATEST = fmtDate(TODAY);
      const DEFAULT_EARLIEST = fmtDate(new Date(TODAY.getFullYear() - 2, 0, 1));

      const EARLIEST = String(window.__DKU_DINING_EARLIEST__ || DEFAULT_EARLIEST);
      const LATEST   = String(window.__DKU_DINING_LATEST__   || DEFAULT_LATEST);
      const WINDOW_DAYS = Number(window.__DKU_DINING_WINDOW_DAYS__ || 365);

      const EXPORT_FILENAME = "dku_transactions.csv";

      /***********************
       * Helpers
       ***********************/
      const sleep = (ms) => new Promise(r => setTimeout(r, ms));

      function assertOnPage() {
        if (typeof dtlsearch !== "function") {
          throw new Error("dtlsearch() not found — make sure you're on Transaction History page.");
        }
        if (typeof pageSubmit !== "function") {
          throw new Error("pageSubmit() not found — make sure pagination is available on this page.");
        }
        if (!document.querySelector("#pdata")) {
          throw new Error("#pdata not found — page structure differs.");
        }
      }

      function fmtDate(d) {
        // YYYY.MM.DD
        const iso = d.toISOString().slice(0, 10);
        return iso.replace(/-/g, ".");
      }

      function parseDotDate(s) {
        // "YYYY.MM.DD" -> Date
        return new Date(s.replace(/\./g, "-") + "T00:00:00");
      }

      function downloadCSV(text, filename) {
        const blob = new Blob([text], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      }

      function toCSV(rows) {
        const header = ["dateTime","type","txn","service","amount","status"];
        const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const lines = [header.join(",")];
        for (const r of rows) {
          lines.push(header.map(k => esc(r[k])).join(","));
        }
        return lines.join("\n");
      }

      /***********************
       * DOM scrape
       ***********************/
      function parseRow(tr) {
        const tds = tr.querySelectorAll("td");
        const dateTime = (tds[0]?.innerText || "").replace(/\s+/g, " ").trim();
        const refText  = (tds[1]?.innerText || "").trim();
        const service  = (tds[2]?.innerText || "").trim();
        const amountRaw = (tds[3]?.innerText || "").trim();
        const status   = (tds[4]?.innerText || "").trim();

        const txnMatch = refText.match(/Transaction Number:\s*(\d+)/);
        const txn = txnMatch ? txnMatch[1] : "";

        const type = (refText.split("\n")[0] || "").trim();
        const amount = amountRaw.replace(/[^0-9\.\-\+]/g, ""); // keep sign

        return { dateTime, type, txn, service, amount, status };
      }

      function scrapeCurrentPage() {
        const rows = Array.from(document.querySelectorAll("#pdata table.nyu-table tbody tr"));
        return rows.map(parseRow);
      }

      function rowCount() {
        return document.querySelectorAll("#pdata table.nyu-table tbody tr").length;
      }

      function getTotalPages() {
        const el = document.querySelector("#pdata b.fontred");
        if (!el) return 1;
        const m = el.innerText.match(/(\d+)\s*\/\s*(\d+)/);
        return m ? parseInt(m[2], 10) : 1;
      }

      function getCurrentPageNo() {
        const el = document.querySelector("#pdata b.fontred");
        if (!el) return 1;
        const m = el.innerText.match(/(\d+)\s*\/\s*(\d+)/);
        return m ? parseInt(m[1], 10) : 1;
      }

      /***********************
       * Robust wait: MutationObserver
       ***********************/
      function waitForPdataChange(timeoutMs = 3000) {
        return new Promise((resolve, reject) => {
          const target = document.querySelector("#pdata");
          if (!target) return reject(new Error("#pdata not found"));

          const before = target.innerText;

          const obs = new MutationObserver(() => {
            const now = target.innerText;
            if (now !== before) {
              obs.disconnect();
              resolve(true);
            }
          });

          obs.observe(target, { childList: true, subtree: true, characterData: true });

          setTimeout(() => {
            obs.disconnect();
            // Even if text didn't change, page might have refreshed to identical content (rare)
            resolve(false);
          }, timeoutMs);
        });
      }

      async function waitForPageNo(targetPage, timeoutMs = 3000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          if (getCurrentPageNo() === targetPage) return true;
          await sleep(120);
        }
        return false;
      }

      /***********************
       * Date controls
       ***********************/
      function setDateRange(start, end) {
        document.querySelectorAll("#startdate").forEach(el => el.value = start);
        document.querySelectorAll("#enddate").forEach(el => el.value = end);
      }

      async function runSearchAndWait() {
        const pChange = waitForPdataChange();
        dtlsearch();
        await pChange;
        // small yield helps slow browsers
        await sleep(80);
      }

      async function gotoPage(p) {
        const pChange = waitForPdataChange(3000);
        pageSubmit(String(p), "1");
        // Prefer page number check; fallback to DOM change
        const ok = await Promise.race([
          waitForPageNo(p, 3000),
          pChange.then(() => true)
        ]);
        if (!ok) {
          // last fallback
          await sleep(200);
        }
      }

      /***********************
       * Scrape one query window
       ***********************/
      async function scrapeWindow(start, end) {
        setDateRange(start, end);
        await runSearchAndWait();

        // Empty window fast-path
        const rc = rowCount();
        if (rc === 0) {
          // still might show "Page 1/0" weirdness; treat as empty
          console.log(`  (empty) ${start} ~ ${end}`);
          return [];
        }

        const total = getTotalPages();
        const out = [];

        for (let p = 1; p <= total; p++) {
          await gotoPage(p);
          const rows = scrapeCurrentPage();
          out.push(...rows);
          console.log(`  page ${p}/${total} +${rows.length}`);
          // gentle pacing to reduce throttling / UI lag
          await sleep(60);
        }
        return out;
      }

      /***********************
       * Build windows over long time range
       ***********************/
      function buildRanges(earliest, latest, windowDays) {
        const out = [];
        let cur = parseDotDate(earliest);
        const endD = parseDotDate(latest);

        while (cur <= endD) {
          const s = new Date(cur);
          const e = new Date(cur);
          e.setDate(e.getDate() + (windowDays - 1));

          const endDate = (e <= endD) ? e : endD;

          out.push({ start: fmtDate(s), end: fmtDate(endDate) });
          cur.setDate(cur.getDate() + windowDays);
        }
        return out;
      }

      /***********************
       * MAIN
       ***********************/
      assertOnPage();

      const ranges = buildRanges(EARLIEST, LATEST, WINDOW_DAYS);
      console.log(`Will scrape ${ranges.length} windows (${WINDOW_DAYS} days each) from ${EARLIEST} to ${LATEST}`);

      let all = [];
      for (let i = 0; i < ranges.length; i++) {
        const { start, end } = ranges[i];
        console.log(`\n[${i+1}/${ranges.length}] Query ${start} ~ ${end}`);
        try {
          const part = await scrapeWindow(start, end);
          all.push(...part);
        } catch (e) {
          console.warn(`  ⚠️ window failed ${start}~${end}:`, e);
          // keep going; do not stop whole export
        }
      }

      // Dedup (txn preferred)
      const seen = new Set();
      const uniq = [];
      for (const r of all) {
        const key = r.txn || `${r.dateTime}|${r.amount}|${r.service}|${r.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniq.push(r);
        }
      }

      console.log(`\nTotal unique records: ${uniq.length}`);

      const mode = String(window.__DKU_DINING_EXPORT_MODE__ || "").toLowerCase();
      const wantsDownload = mode === "download";

      if (wantsDownload) {
        const csv = toCSV(uniq);
        downloadCSV(csv, EXPORT_FILENAME);
        console.log(`✅ Exported ${EXPORT_FILENAME}`);
        return;
      }

      // --- Handoff via window.name (no server, no file download)
      // IMPORTANT: window.name has size limits (browser-dependent). If we exceed it,
      // we fall back to CSV download.
      const payload = {
        k: HANDOFF_STORAGE_KEY,
        v: 1,
        createdAt: new Date().toISOString(),
        rows: uniq,
      };

      const json = JSON.stringify(payload);
      if (json.length > HANDOFF_MAX_BYTES) {
        console.warn(`window.name payload too large (${json.length} bytes). Falling back to CSV download.`);
        alert(
          "Your transaction history is too large to pass via window.name.\n\n" +
          "We will download a CSV instead. Please upload it to the DKU Dining Wrap page."
        );
        const csv = toCSV(uniq);
        downloadCSV(csv, EXPORT_FILENAME);
        return;
      }

      window.name = `${HANDOFF_STORAGE_KEY}:${json}`;
      console.log("✅ Saved rows into window.name. Redirecting to DKU Dining Wrap…");
      location.href = WRAP_URL;
    } catch (e) {
      console.error(e);
      alert("❌ Export failed: " + (e?.message || e));
    } finally {
      window.__DKU_DINING_EXPORT_RUNNING__ = false;
    }
  })();
})();
