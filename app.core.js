// DKU Dining Wrap — core stats + parsing helpers
// Pure data logic. No DOM dependencies.

(() => {
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

    // Date-derived metrics (only from dining rows with parseable dateTime)
    let earliest = null; // { d: Date, row, spend }
    let latest = null;   // { d: Date, row, spend }
    let mostExpensive = null; // { d: Date|null, row, spend }
    const byDay = new Map(); // YYYY-MM-DD -> { day, count, spend }

    function fmtYMD(d){
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }

    for (const r of diningRows){
      const amt = spendValue(r); // positive number spend
      const svc = String(r.service ?? "").trim() || "Unknown";
      incMap(spendByService, svc, amt);
      incMap(visitsByService, svc, 1);

      if (!mostExpensive || amt > mostExpensive.spend) {
        mostExpensive = { d: null, row: r, spend: amt };
      }

      const d = parseDateTime(r.dateTime);
      if (d){
        validTime += 1;
        hours[d.getHours()].count += 1;
        weekdays[d.getDay()].count += 1;

        const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        incMap(spendByMonth, ym, amt);

        const ymd = fmtYMD(d);
        const prev = byDay.get(ymd) || { day: ymd, count: 0, spend: 0 };
        prev.count += 1;
        prev.spend += amt;
        byDay.set(ymd, prev);

        if (!earliest || d.getTime() < earliest.d.getTime()) earliest = { d, row: r, spend: amt };
        if (!latest || d.getTime() > latest.d.getTime()) latest = { d, row: r, spend: amt };
        if (mostExpensive && (!mostExpensive.d || amt === mostExpensive.spend)) {
          // Keep the date for the most expensive record if available
          if (!mostExpensive.d || d.getTime() < mostExpensive.d.getTime()) {
            mostExpensive.d = d;
          }
        }
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

    const uniquePlaces = visitsByService.size;

    const days = Array.from(byDay.values()).sort((a,b) => a.day.localeCompare(b.day));
    const busiestDay = days.reduce((best, cur) => {
      if (!best) return cur;
      if (cur.count > best.count) return cur;
      if (cur.count === best.count && cur.spend > best.spend) return cur;
      return best;
    }, null);

    const activeDays = days.length;
    const activeMonths = months.length;

    const topMonth = months.reduce((best, cur) => {
      if (!best) return cur;
      return cur.spend > best.spend ? cur : best;
    }, null);

    const avgMealCost = totalSpend / Math.max(1, txns);

    return {
      txns,
      totalSpend,
      avgMealCost,
      topSpend,
      topVisits,
      favorite,
      favoriteCount,
      peakHour,
      peakWeekday,
      hours,
      weekdays,
      months,
      topMonth,
      uniquePlaces,
      days,
      busiestDay,
      earliest,
      latest,
      mostExpensive,
      activeDays,
      activeMonths,
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

  // --- Personality & Entertainment Features ---

  function getDiningPersonality(stats) {
    const hour = stats.peakHour.hour;
    const weekday = stats.peakWeekday.day;
    const totalTxns = stats.txns;
    const favoriteCount = stats.favoriteCount;

    // Time-based personality - DKU cafeteria hours
    // Breakfast: 7-9 AM, Lunch: 11 AM-1:30 PM, Dinner: 5-7:30 PM

    if (hour >= 17 && hour <= 19) return { name: "🍽️ Dinner Rush Champion", desc: "Peak dinner hours are your prime time!" };
    if (hour >= 11 && hour <= 13) return { name: "🌞 Lunch Lover", desc: "You master the midday rush!" };
    if (hour >= 7 && hour <= 9) return { name: "🌅 Breakfast Boss", desc: "Early riser, early eater!" };
    if (hour >= 19 && hour <= 19.5) return { name: "⏰ Last Call Hero", desc: "You time it perfectly with closing!" };

    // Frequency-based personality
    if (favoriteCount >= 50) return { name: "🏠 Home Base Hero", desc: "You keep coming back to the same favorite spot." };
    if ((stats.uniquePlaces || 0) >= 10) return { name: "🎯 Location Hopper", desc: "You explore lots of different spots." };

    // Day-based personality
    if (weekday === "Fri" || weekday === "Sat") return { name: "🎉 Weekend Warrior", desc: "Dining is your weekend ritual!" };
    if (weekday === "Mon") return { name: "📚 Monday Motivator", desc: "Starting the week with good food!" };

    // Default personality
    return { name: "🍜 DKU Foodie", desc: "You keep campus dining interesting." };
  }

  function calculateAchievements(stats) {
    const achievements = [];

    // Time-based achievements - DKU cafeteria hours
    const peakHour = stats.peakHour.hour;

    // Breakfast achievements (7-9 AM)
    if (peakHour >= 7 && peakHour <= 9) achievements.push({ icon: "🌅", name: "Breakfast Club", desc: "Morning meal regular" });

    // Lunch achievements (11 AM-1:30 PM)
    if (peakHour >= 11 && peakHour <= 13.5) achievements.push({ icon: "🌞", name: "Lunch Bunch", desc: "Midday dining champion" });

    // Dinner achievements (5-7:30 PM)
    if (peakHour >= 17 && peakHour <= 19.5) achievements.push({ icon: "🍽️", name: "Dinner Winner", desc: "Evening meal master" });

    // Last call achievement (right before closing)
    if (peakHour >= 19 && peakHour <= 19.5) achievements.push({ icon: "⏰", name: "Last Call", desc: "Timing it perfectly with closing!" });

    // Loyalty achievements (thresholds match descriptions)
    if (stats.favoriteCount >= 25) achievements.push({ icon: "💎", name: "Loyal Legend", desc: "25+ visits to your #1 spot" });
    if (stats.favoriteCount >= 50) achievements.push({ icon: "👑", name: "Crown Jewel", desc: "50+ visits — you basically have a reserved seat" });

    // Exploration achievements (use uniquePlaces; topVisits is capped to top-N)
    if ((stats.uniquePlaces || 0) >= 8) achievements.push({ icon: "🗺️", name: "Campus Explorer", desc: "Visited 8+ different spots" });
    if ((stats.uniquePlaces || 0) >= 12) achievements.push({ icon: "🧭", name: "Food Cartographer", desc: "Visited 12+ different spots" });

    // Spending achievements
    if (stats.totalSpend >= 2000) achievements.push({ icon: "💰", name: "Big Spender", desc: "¥2000+ invested in dining" });
    if (stats.totalSpend >= 5000) achievements.push({ icon: "🏦", name: "Dining Investor", desc: "¥5000+ - you fund the campus!" });

    // Consistency achievements
    const activeMonths = Math.max(1, stats.activeMonths || stats.months.length || 1);
    const monthlyAvg = stats.txns / activeMonths;
    if (monthlyAvg >= 25) achievements.push({ icon: "📅", name: "Regular Customer", desc: "25+ meals per active month" });

    // Special achievements - meal period focus
    const breakfastMeals = stats.hours.filter(h => h.hour >= 7 && h.hour <= 9).reduce((sum, h) => sum + h.count, 0);
    const lunchMeals = stats.hours.filter(h => h.hour >= 11 && h.hour <= 13.5).reduce((sum, h) => sum + h.count, 0);
    const dinnerMeals = stats.hours.filter(h => h.hour >= 17 && h.hour <= 19.5).reduce((sum, h) => sum + h.count, 0);

    if (breakfastMeals >= 15) achievements.push({ icon: "🌅", name: "Breakfast Regular", desc: "15+ breakfast visits" });
    if (lunchMeals >= 20) achievements.push({ icon: "🌞", name: "Lunch Loyalist", desc: "20+ lunch meals" });
    if (dinnerMeals >= 25) achievements.push({ icon: "🍽️", name: "Dinner Devotee", desc: "25+ dinner visits" });

    return achievements;
  }

  function generateFunComparisons(stats) {
    // Keep this strictly data-based (no assumptions about prices/time/other students)
    const facts = [];
    const txns = stats.txns;
    const spend = stats.totalSpend;

    if (stats.uniquePlaces) facts.push(`You visited ${stats.uniquePlaces} unique dining spots.`);
    if (stats.favorite && stats.favorite !== "—") {
      const pct = txns ? Math.round((stats.favoriteCount / txns) * 100) : 0;
      facts.push(`${stats.favorite} is your #1: ${stats.favoriteCount} visits (${pct}% of your meals).`);
    }

    const peakHourCount = stats.hours?.[stats.peakHour.hour]?.count || 0;
    facts.push(`Peak time: ${String(stats.peakHour.hour).padStart(2, "0")}:00 (${peakHourCount} meals).`);
    facts.push(`Favorite day: ${stats.peakWeekday.day}.`);

    if (Number.isFinite(stats.avgMealCost)) {
      facts.push(`Average meal: ¥${fmtMoney(stats.avgMealCost)}.`);
    }

    if (stats.topMonth?.month) {
      facts.push(`Your biggest month: ${stats.topMonth.month} (¥${fmtMoney(stats.topMonth.spend)}).`);
    }

    if (stats.activeDays) {
      const perActiveDay = stats.activeDays ? (txns / stats.activeDays) : 0;
      facts.push(`You ate on ${stats.activeDays} different days (${perActiveDay.toFixed(2)} meals/day when active).`);
    }

    // “Spicy but safe” comment (still based on data)
    if (stats.favoriteCount >= 40) facts.push("Do you live at your #1 spot? 👑");
    else if (stats.uniquePlaces >= 12) facts.push("You really said: variety is the spice of life. 🗺️");

    return facts;
  }

  function predictFutureHabits(stats) {
    const predictions = [];
    const months = stats.months;
    if (months.length < 2) return predictions;

    // Trend analysis
    const recentMonths = months.slice(-3);
    const olderMonths = months.slice(-6, -3);

    if (recentMonths.length > 0 && olderMonths.length > 0) {
      const recentAvg = recentMonths.reduce((sum, m) => sum + m.spend, 0) / recentMonths.length;
      const olderAvg = olderMonths.reduce((sum, m) => sum + m.spend, 0) / olderMonths.length;

      if (olderAvg > 0) {
        const growthRate = ((recentAvg - olderAvg) / olderAvg) * 100;
        if (growthRate > 20) predictions.push("📈 Recent months are trending higher than earlier months.");
        if (growthRate < -20) predictions.push("📉 Recent months are trending lower than earlier months.");
      }
    }

    // Habit hints (data-based)
    if (stats.favoriteCount >= 30 && stats.favorite && stats.favorite !== "—") {
      predictions.push(`🏠 You’re very consistent — ${stats.favorite} is clearly your home base.`);
    }

    // Time predictions - cafeteria specific
    const peakHour = stats.peakHour.hour;
    if (peakHour >= 17 && peakHour <= 19.5) {
      predictions.push("🍽️ Your dinner timing will remain impeccable!");
    } else if (peakHour >= 11 && peakHour <= 13.5) {
      predictions.push("🌞 You'll continue to master the lunch rush!");
    } else if (peakHour >= 7 && peakHour <= 9) {
      predictions.push("🌅 Early bird habits will serve you well!");
    }

    return predictions;
  }

  function createShareableQuotes(stats) {
    const quotes = [];
    const personality = getDiningPersonality(stats);

    quotes.push(`I am a ${personality.name} at DKU! ${personality.desc}`);

    if (stats.favorite) {
      quotes.push(`My heart belongs to ${stats.favorite} — ${stats.favoriteCount} visits and counting.`);
    }

    quotes.push(`This year I spent ¥${fmtMoney(stats.totalSpend)} on campus dining. 🍽️`);

    const peakHour = stats.peakHour;
    let mealPeriod = "off-hours";
    if (peakHour.hour >= 7 && peakHour.hour <= 9) mealPeriod = "breakfast rush";
    else if (peakHour.hour >= 11 && peakHour.hour <= 13.5) mealPeriod = "lunch rush";
    else if (peakHour.hour >= 17 && peakHour.hour <= 19.5) mealPeriod = "dinner rush";

    quotes.push(`My peak dining hour is ${peakHour.hour}:00 (the ${mealPeriod}).`);

    const peakWeekday = stats.peakWeekday;
    quotes.push(`${peakWeekday.day} is my dining day.`);

    return quotes;
  }

  function getMemoryHighlights(stats) {
    const memories = [];

    // Time anchors (only if we can parse dateTime)
    if (stats.earliest?.d && stats.earliest?.row) {
      const svc = String(stats.earliest.row.service ?? "Unknown");
      memories.push(`Earliest meal: ${stats.earliest.d.toLocaleString()} (${svc}). ☀️`);
    }

    if (stats.latest?.d && stats.latest?.row) {
      const svc = String(stats.latest.row.service ?? "Unknown");
      memories.push(`Latest meal: ${stats.latest.d.toLocaleString()} (${svc}). 🌙`);
    }

    if (stats.busiestDay?.day) {
      memories.push(`Busiest day: ${stats.busiestDay.day} — ${stats.busiestDay.count} meals. 🔥`);
    }

    if (stats.mostExpensive?.spend && stats.mostExpensive?.row) {
      const svc = String(stats.mostExpensive.row.service ?? "Unknown");
      const when = stats.mostExpensive.d ? stats.mostExpensive.d.toLocaleString() : "(time unknown)";
      memories.push(`Most expensive meal: ¥${fmtMoney(stats.mostExpensive.spend)} at ${svc} on ${when}. 🤑`);
    }

    // Meal period insights
    const breakfastMeals = stats.hours.filter(h => h.hour >= 7 && h.hour <= 9).reduce((sum, h) => sum + h.count, 0);
    const lunchMeals = stats.hours.filter(h => h.hour >= 11 && h.hour <= 13.5).reduce((sum, h) => sum + h.count, 0);
    const dinnerMeals = stats.hours.filter(h => h.hour >= 17 && h.hour <= 19.5).reduce((sum, h) => sum + h.count, 0);

    if (breakfastMeals > 0) memories.push(`${breakfastMeals} breakfasts — early bird energy. 🌅`);
    if (lunchMeals > 0) memories.push(`${lunchMeals} lunches — the classic grind fuel. 🌞`);
    if (dinnerMeals > 0) memories.push(`${dinnerMeals} dinners — end-of-day recharge. 🍽️`);

    if (Number.isFinite(stats.avgMealCost)) {
      memories.push(`Average meal: ¥${fmtMoney(stats.avgMealCost)}.`);
    }

    return memories;
  }

  window.DKUWrapCore = {
    computeStats,
    fmtMoney,
    classifyRow,
    inferIsDining,
    spendValue,
    getDiningPersonality,
    calculateAchievements,
    generateFunComparisons,
    predictFutureHabits,
    createShareableQuotes,
    getMemoryHighlights,
  };
})();
