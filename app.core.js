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
    if (favoriteCount > 50) return { name: "🏠 Home Base Hero", desc: "Loyalty to your favorite spot!" };
    if (stats.topVisits.length >= 10) return { name: "🎯 Location Hopper", desc: "You like to explore the menu!" };

    // Day-based personality
    if (weekday === "Fri" || weekday === "Sat") return { name: "🎉 Weekend Warrior", desc: "Dining is your weekend ritual!" };
    if (weekday === "Mon") return { name: "📚 Monday Motivator", desc: "Starting the week with good food!" };

    // Default personality
    return { name: "🍜 DKU Foodie", desc: "You're all about that campus life!" };
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

    // Loyalty achievements
    if (stats.favoriteCount >= 50) achievements.push({ icon: "💎", name: "Loyal Legend", desc: "100+ visits to one spot" });
    if (stats.favoriteCount >= 100) achievements.push({ icon: "👑", name: "Crown Jewel", desc: "200+ visits - you're basically family!" });

    // Exploration achievements
    if (stats.topVisits.length >= 10) achievements.push({ icon: "🗺️", name: "Campus Explorer", desc: "Visited 10+ dining spots" });
    if (stats.topVisits.length >= 15) achievements.push({ icon: "🧭", name: "Food Cartographer", desc: "Mapped the entire campus!" });

    // Spending achievements
    if (stats.totalSpend >= 2000) achievements.push({ icon: "💰", name: "Big Spender", desc: "¥2000+ invested in dining" });
    if (stats.totalSpend >= 5000) achievements.push({ icon: "🏦", name: "Dining Investor", desc: "¥5000+ - you fund the campus!" });

    // Consistency achievements
    const monthlyAvg = stats.txns / Math.max(1, stats.months.length);
    if (monthlyAvg >= 30) achievements.push({ icon: "📅", name: "Regular Customer", desc: "30+ meals per month" });

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
    const comparisons = [];
    const spend = stats.totalSpend;
    const txns = stats.txns;

    // Food equivalents
    const ramenBowls = Math.floor(spend / 25);
    if (ramenBowls > 0) comparisons.push(`You've bought enough ramen for ${ramenBowls} bowls! 🍜`);

    const bubbleTea = Math.floor(spend / 15);
    if (bubbleTea > 0) comparisons.push(`That's ${bubbleTea} bubble teas worth of spending! 🧋`);

    const pizzas = Math.floor(spend / 45);
    if (pizzas > 0) comparisons.push(`You could buy ${pizzas} large pizzas with your dining budget! 🍕`);

    // Time equivalents
    const studyHours = Math.floor(txns * 0.5); // Assuming 30min per meal
    comparisons.push(`You've spent about ${studyHours} hours dining this year!`);

    // DKU-themed comparisons
    const libraryVisits = Math.floor(txns / 10);
    comparisons.push(`If dining spots were libraries, you've visited ${libraryVisits} times more than most students study! 📚`);

    // Cafeteria-specific insights
    const breakfastMeals = stats.hours.filter(h => h.hour >= 7 && h.hour <= 9).reduce((sum, h) => sum + h.count, 0);
    const dinnerMeals = stats.hours.filter(h => h.hour >= 17 && h.hour <= 19.5).reduce((sum, h) => sum + h.count, 0);

    if (breakfastMeals > 0) comparisons.push(`You've beaten the breakfast rush ${breakfastMeals} times! 🏃‍♂️`);
    if (dinnerMeals > 0) comparisons.push(`You've conquered dinner hour ${dinnerMeals} times! 👑`);

    return comparisons;
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

      const growthRate = ((recentAvg - olderAvg) / olderAvg) * 100;
      if (growthRate > 20) predictions.push("📈 Your spending is trending upward - watch that wallet!");
      if (growthRate < -20) predictions.push("📉 Getting more budget-conscious? Keep it up!");
    }

    // Location predictions
    if (stats.favoriteCount > 30) {
      predictions.push(`🏆 ${stats.favorite} might name a dish after you soon!`);
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

    // Fun predictions
    predictions.push("🔮 Next year you'll discover at least 2 new favorite spots!");
    predictions.push("🎯 Your dining game will reach legendary status!");

    return predictions;
  }

  function createShareableQuotes(stats) {
    const quotes = [];
    const personality = getDiningPersonality(stats);

    quotes.push(`"I am a ${personality.name} at DKU! ${personality.desc}"`);

    if (stats.favorite) {
      quotes.push(`"My heart belongs to ${stats.favorite} - ${stats.favoriteCount} visits and counting!"`);
    }

    quotes.push(`"This year I invested ¥${fmtMoney(stats.totalSpend)} in campus cuisine! 🍽️"`);

    const peakHour = stats.peakHour;
    let mealPeriod = "off-hours";
    if (peakHour.hour >= 7 && peakHour.hour <= 9) mealPeriod = "breakfast rush";
    else if (peakHour.hour >= 11 && peakHour.hour <= 13.5) mealPeriod = "lunch rush";
    else if (peakHour.hour >= 17 && peakHour.hour <= 19.5) mealPeriod = "dinner rush";

    quotes.push(`"My peak dining hour is ${peakHour.hour}:00 during the ${mealPeriod} - perfect timing!"`);

    const peakWeekday = stats.peakWeekday;
    quotes.push(`"${peakWeekday.day} is my dining day - I eat like it's going out of style!"`);

    return quotes;
  }

  function getMemoryHighlights(stats) {
    const memories = [];

    // First meal
    if (stats.months.length > 0) {
      const firstMonth = stats.months[0];
      memories.push(`Your dining journey began in ${firstMonth.month} with ¥${fmtMoney(firstMonth.spend)} spent!`);
    }

    // Meal period insights
    const breakfastMeals = stats.hours.filter(h => h.hour >= 7 && h.hour <= 9).reduce((sum, h) => sum + h.count, 0);
    const lunchMeals = stats.hours.filter(h => h.hour >= 11 && h.hour <= 13.5).reduce((sum, h) => sum + h.count, 0);
    const dinnerMeals = stats.hours.filter(h => h.hour >= 17 && h.hour <= 19.5).reduce((sum, h) => sum + h.count, 0);

    if (breakfastMeals > 0) memories.push(`You've started your day right with ${breakfastMeals} breakfast visits! 🌅`);
    if (lunchMeals > 0) memories.push(`${lunchMeals} lunches fueled your academic journey! 🌞`);
    if (dinnerMeals > 0) memories.push(`${dinnerMeals} dinners capped off your busy days! 🍽️`);

    // Most expensive meal estimate
    const avgMealCost = stats.totalSpend / Math.max(1, stats.txns);
    memories.push(`Your average meal costs ¥${fmtMoney(avgMealCost)} - every bite worth it!`);

    // Streak analysis (simplified)
    if (stats.favoriteCount > 10) {
      memories.push(`You had a ${Math.floor(stats.favoriteCount / 7)}-week streak of visiting ${stats.favorite}!`);
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
