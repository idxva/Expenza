// ===== STATE MANAGEMENT =====
let state = {
  expenses: [],
  investments: [],
  budget: {
    income: 0,
    food: 0,
    transport: 0,
    shopping: 0,
    bills: 0,
    entertainment: 0,
    other: 0,
  },
  liveRates: {
    gold: 0,
    silver: 0,
    baseGold: 0,
    baseSilver: 0,
    prevGold: 0,
    prevSilver: 0,
    goldChange: 0,
    silverChange: 0,
    history: {
      labels: [],
      gold: [],
      silver: [],
    },
  },
  settings: JSON.parse(localStorage.getItem("wf_settings")) || {
    name: "User",
  },
  profiles: JSON.parse(localStorage.getItem("wf_profiles")) || [],
};

// Initialize rates from saved settings or defaults
const savedRates = JSON.parse(localStorage.getItem("wf_manual_rates")) || {
  gold: 7450,
  silver: 91,
};
state.liveRates.gold = savedRates.gold;
state.liveRates.silver = savedRates.silver;

const chartInstances = {};

// ===== UTILS =====
function showLoading() {
  document.getElementById("loadingOverlay").style.display = "flex";
}
function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}

function getCategoryIcon(category) {
  const c = category.toLowerCase();
  return `<img src="assets/cat-${c}.png" alt="${category}" style="width: 24px; height: 24px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));" />`;
}

function getCategoryColor(category) {
  const colors = {
    Food: "#f59e0b",
    Transport: "#3b82f6",
    Shopping: "#ec4899",
    Healthcare: "#10b981",
    Entertainment: "#8b5cf6",
    Bills: "#ef4444",
    Education: "#0088a0",
    Travel: "#4d00b1",
    Other: "#94a3b8",
    Income: "#02a32a",
  };
  return colors[category] || "#94a3b8";
}

// ===== INITIALIZATION =====
document.addEventListener("DOMContentLoaded", async () => {
  updateDate();
  initCharts();

  loadLocalData();

  updateRatesUI();
  updateSettingsUI();
});

function saveLocalData() {
  localStorage.setItem('wf_data', JSON.stringify({
    expenses: state.expenses,
    investments: state.investments,
    budget: state.budget
  }));
}

function loadLocalData() {
  showLoading();
  try {
    const data = JSON.parse(localStorage.getItem('wf_data'));
    if (data) {
      state.expenses = data.expenses || [];
      state.investments = data.investments || [];
      state.budget = data.budget || state.budget;
    }
    updateDashboard();
    updateInvestments();
    updateBudgetPage();
    renderRecentExpenses();
    renderFullExpenses();
  } catch (err) {
    console.error(err);
    showToast("Error loading local data");
  }
  hideLoading();
}

// ===== AUTH SYSTEM =====
function logout() {
  // Removed
}

// ===== NAVIGATION =====
function navigate(pageId) {
  document
    .querySelectorAll(".nav-item")
    .forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`[data-page="${pageId}"]`).classList.add("active");

  document
    .querySelectorAll(".page")
    .forEach((page) => page.classList.remove("active"));
  document.getElementById(`page-${pageId}`).classList.add("active");

  const titles = {
    dashboard: {
      title: "Dashboard",
      sub: "Your financial overview at a glance",
    },
    expenses: { title: "Expenses", sub: "All your transactions" },
    analytics: {
      title: "Analytics",
      sub: "Deep dive into your spending habits",
    },
    investments: {
      title: "Investments",
      sub: "Track your gold & silver portfolio",
    },
    budget: { title: "Budget", sub: "Manage your monthly allocations" },
    settings: { title: "Settings", sub: "Configure rates and preferences" },
  };
  document.getElementById("pageTitle").innerText = titles[pageId].title;
  document.getElementById("pageSubtitle").innerText = titles[pageId].sub;

  if (pageId === "analytics") updateAnalyticsCharts();
  if (pageId === "budget") updateBudgetCharts();
  if (pageId === "dashboard") updateDashboardCharts();
}

function updateDate() {
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  document.getElementById("currentDate").innerText =
    new Date().toLocaleDateString("en-US", options);
}

// ===== MODAL & FORMS =====
function openAddModal() {
  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("modalTitle").innerText = "Add New Expense";
  document.getElementById("categoryGroup").style.display = "block";
  document.getElementById("descGroup").style.display = "block";
  document.getElementById("incomeOption").style.display = "none";
  document.getElementById("expCategory").value = "Food"; 
  document.getElementById("expDate").valueAsDate = new Date();
}

function openAddIncomeModal() {
  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("modalTitle").innerText = "Add New Income";
  document.getElementById("categoryGroup").style.display = "none";
  document.getElementById("descGroup").style.display = "none";
  document.getElementById("incomeOption").style.display = "block";
  document.getElementById("expCategory").value = "Income";
  document.getElementById("expDate").valueAsDate = new Date();
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.getElementById("expAmount").value = "";
  document.getElementById("expDesc").value = "";
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ===== EXPENSES LOGIC =====
async function addExpense() {
  const amount = parseFloat(document.getElementById("expAmount").value);
  const category = document.getElementById("expCategory").value;
  let desc = document.getElementById("expDesc").value;
  const date = document.getElementById("expDate").value;
  const method = document.getElementById("expMethod").value;

  if (category === "Income" && !desc) desc = "Income Received";
  if (!desc) desc = category;

  if (isNaN(amount) || amount <= 0 || !date) {
    alert("Please enter valid amount and date");
    return;
  }

  showLoading();
  const id = Date.now().toString();
  const savedExp = { id, amount, category, desc, date, method };
  
  state.expenses.unshift(savedExp);
  saveLocalData();
  hideLoading();

  closeModal();
  showToast("Expense Added Successfully!");

  updateDashboard();
  renderRecentExpenses();
  renderFullExpenses();
  if (document.getElementById("page-analytics").classList.contains("active"))
    updateAnalyticsCharts();
  if (document.getElementById("page-budget").classList.contains("active"))
    updateBudgetPage();
}

async function deleteExpense(id) {
  if (!confirm("Delete this transaction?")) return;
  showLoading();
  state.expenses = state.expenses.filter((e) => e.id !== id);
  saveLocalData();
  hideLoading();

  showToast("Expense Deleted");
  updateDashboard();
  renderRecentExpenses();
  renderFullExpenses();
  updateAnalyticsCharts();
  updateBudgetPage();
}

function filterExpenses() {
  renderFullExpenses();
}

function renderRecentExpenses() {
  const list = document.getElementById("recentTxList");
  const recent = state.expenses.slice(0, 5);

  if (recent.length === 0) {
    list.innerHTML = `<div class="empty-state">No transactions yet. Add your first expense!</div>`;
    return;
  }

  list.innerHTML = recent
    .map(
      (exp) => {
        const isIncome = exp.category === "Income";
        return `
    <div class="tx-item">
      <div class="tx-icon cat-${exp.category}">${getCategoryIcon(isIncome ? "Healthcare" : exp.category)}</div>
      <div class="tx-info">
        <div class="tx-desc">${exp.desc}</div>
        <div class="tx-meta">${formatDate(exp.date)} • ${exp.method}</div>
      </div>
      <div class="tx-amount ${isIncome ? "income" : ""}">${isIncome ? "+" : "-"}₹${exp.amount.toFixed(2)}</div>
    </div>
  `;
      },
    )
    .join("");
}

function renderFullExpenses() {
  const list = document.getElementById("fullTxList");
  const search = document.getElementById("searchInput").value.toLowerCase();
  const catFilter = document.getElementById("categoryFilter").value;
  const monthFilter = document.getElementById("monthFilter").value;

  let filtered = state.expenses;

  if (search) {
    filtered = filtered.filter((e) => e.desc.toLowerCase().includes(search));
  }
  if (catFilter) {
    filtered = filtered.filter((e) => e.category === catFilter);
  }
  if (monthFilter !== "") {
    filtered = filtered.filter(
      (e) => new Date(e.date).getMonth() === parseInt(monthFilter),
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">No transactions match your filters.</div>`;
    return;
  }

  list.innerHTML = filtered
    .map(
      (exp) => {
        const isIncome = exp.category === "Income";
        return `
    <div class="tx-item">
      <div class="tx-icon cat-${exp.category}">${getCategoryIcon(isIncome ? "Healthcare" : exp.category)}</div>
      <div class="tx-info">
        <div class="tx-desc">${exp.desc}</div>
        <div class="tx-meta">${formatDate(exp.date)} • ${exp.method} • ${exp.category}</div>
      </div>
      <div class="tx-amount ${isIncome ? "income" : ""}">${isIncome ? "+" : "-"}₹${exp.amount.toFixed(2)}</div>
      <button class="tx-delete" onclick="deleteExpense('${exp.id}')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    </div>
  `;
      },
    )
    .join("");
}

// ===== DASHBOARD LOGIC =====
function updateDashboard() {
  const totalSpent = getThisMonthExpenses();
  const totalIncome = getThisMonthIncome();
  const balance = totalIncome - totalSpent;

  document.getElementById("totalBalance").innerText =
    `₹${balance.toLocaleString()}`;
  document.getElementById("totalIncome").innerText =
    `₹${totalIncome.toLocaleString()}`;
  document.getElementById("totalSpent").innerText =
    `₹${totalSpent.toLocaleString()}`;
  document.getElementById("netSavings").innerText =
    `₹${Math.max(0, balance).toLocaleString()}`;

  updateDashboardCharts();
}

// ===== INVESTMENTS LOGIC =====
async function addInvestment() {
  const type = document.getElementById("metalType").value;
  const qty = parseFloat(document.getElementById("metalQty").value);
  const buyPrice = parseFloat(document.getElementById("metalBuyPrice").value);
  const date = document.getElementById("metalDate").value;

  if (isNaN(qty) || isNaN(buyPrice) || qty <= 0 || buyPrice <= 0 || !date) {
    alert("Please enter valid investment details");
    return;
  }

  showLoading();
  const id = Date.now().toString();
  const newInv = { id, type, qty, buyPrice, date };
  
  state.investments.push(newInv);
  saveLocalData();
  hideLoading();

  document.getElementById("metalQty").value = "";
  document.getElementById("metalBuyPrice").value = "";
  showToast("Investment Added!");
  updateInvestments();
}

async function deleteInvestment(id) {
  if (!confirm("Delete this investment?")) return;
  showLoading();
  state.investments = state.investments.filter((i) => i.id !== id);
  saveLocalData();
  hideLoading();

  updateInvestments();
  showToast("Investment Removed");
}

function updateInvestments() {
  let goldQty = 0,
    goldCost = 0;
  let silverQty = 0,
    silverCost = 0;

  const tableHtml = [];

  state.investments.forEach((inv) => {
    const currentRate = state.liveRates[inv.type];
    const currentValue = inv.qty * currentRate;
    const costValue = inv.qty * inv.buyPrice;
    const pnl = currentValue - costValue;
    const pnlPercent = costValue > 0 ? ((pnl / costValue) * 100).toFixed(2) : 0;
    const pnlClass = pnl >= 0 ? "invest-gain" : "invest-loss";
    const pnlPrefix = pnl >= 0 ? "+" : "";

    if (inv.type === "gold") {
      goldQty += inv.qty;
      goldCost += costValue;
    } else {
      silverQty += inv.qty;
      silverCost += costValue;
    }

    tableHtml.push(`
      <div class="invest-row">
        <div>${inv.type === "gold" ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold);"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle></svg> 24k Gold' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--silver);"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle></svg> Silver'}</div>
        <div>${inv.qty}g</div>
        <div>₹${inv.buyPrice.toLocaleString()}/g</div>
        <div>₹${costValue.toLocaleString()}</div>
        <div>₹${currentValue.toLocaleString()}</div>
        <div class="${pnlClass}">${pnlPrefix}₹${Math.abs(pnl).toLocaleString()} (${pnlPrefix}${pnlPercent}%)</div>
        <button class="tx-delete" onclick="deleteInvestment('${inv.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      </div>
    `);
  });

  const goldValue = goldQty * state.liveRates.gold;
  const silverValue = silverQty * state.liveRates.silver;
  const totalValue = goldValue + silverValue;
  const totalCost = goldCost + silverCost;
  const totalPnL = totalValue - totalCost;

  // Update Summary Cards
  document.getElementById("goldPortfolioValue").innerText =
    `₹${goldValue.toLocaleString()}`;
  document.getElementById("silverPortfolioValue").innerText =
    `₹${silverValue.toLocaleString()}`;
  document.getElementById("totalInvestedValue").innerText =
    `₹${totalValue.toLocaleString()}`;

  const gPnlEl = document.getElementById("goldPnL");
  const gPnl = goldValue - goldCost;
  gPnlEl.innerText = `P&L: ${gPnl >= 0 ? "+" : ""}₹${gPnl.toLocaleString()}`;
  gPnlEl.className = `metal-pnl ${gPnl < 0 ? "negative" : ""}`;

  const sPnlEl = document.getElementById("silverPnL");
  const sPnl = silverValue - silverCost;
  sPnlEl.innerText = `P&L: ${sPnl >= 0 ? "+" : ""}₹${sPnl.toLocaleString()}`;
  sPnlEl.className = `metal-pnl ${sPnl < 0 ? "negative" : ""}`;

  const tPnlEl = document.getElementById("totalInvestPnL");
  tPnlEl.innerText = `Total P&L: ${totalPnL >= 0 ? "+" : ""}₹${totalPnL.toLocaleString()}`;
  tPnlEl.className = `metal-pnl ${totalPnL < 0 ? "negative" : ""}`;

  // Update Table
  const tableContainer = document.getElementById("investmentsTable");
  if (state.investments.length === 0) {
    tableContainer.innerHTML =
      '<div class="empty-state">No investments added yet.</div>';
  } else {
    tableContainer.innerHTML = `
      <div class="invest-row invest-row-header">
        <div>Asset</div>
        <div>Quantity</div>
        <div>Avg Cost</div>
        <div>Total Cost</div>
        <div>Current Value</div>
        <div>P&L</div>
        <div></div>
      </div>
      ${tableHtml.join("")}
    `;
  }

  updateDashboardInvestMini(goldValue, silverValue, goldCost, silverCost);
  updateMetalCharts();
}

function updateDashboardInvestMini(goldVal, silverVal, goldCost, silverCost) {
  const container = document.getElementById("investMini");
  if (state.investments.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:20px 0;font-size:12px;">No investments tracked.</div>`;
    return;
  }

  const gPnl = goldVal - goldCost;
  const sPnl = silverVal - silverCost;

  container.innerHTML = `
    <div class="invest-mini-item">
      <div class="invest-mini-left">
        <div class="invest-mini-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--gold);"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle></svg></div>
        <div>
          <div class="invest-mini-name">24k Gold</div>
          <div class="invest-mini-sub">${state.liveRates.gold}/g</div>
        </div>
      </div>
      <div class="invest-mini-right">
        <div class="invest-mini-val">₹${goldVal.toLocaleString()}</div>
        <div class="invest-mini-pnl ${gPnl < 0 ? "neg" : ""}">${gPnl >= 0 ? "+" : ""}₹${Math.abs(gPnl).toLocaleString()}</div>
      </div>
    </div>
    <div class="invest-mini-item">
      <div class="invest-mini-left">
        <div class="invest-mini-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--silver);"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle></svg></div>
        <div>
          <div class="invest-mini-name">Silver</div>
          <div class="invest-mini-sub">${state.liveRates.silver}/g</div>
        </div>
      </div>
      <div class="invest-mini-right">
        <div class="invest-mini-val">₹${silverVal.toLocaleString()}</div>
        <div class="invest-mini-pnl ${sPnl < 0 ? "neg" : ""}">${sPnl >= 0 ? "+" : ""}₹${Math.abs(sPnl).toLocaleString()}</div>
      </div>
    </div>
  `;
}

// Set up periodic chart updates for manual rates
function updateRatesUI() {
  const gRateEl = document.getElementById("liveGoldRate");
  const sRateEl = document.getElementById("liveSilverRate");

  if (gRateEl && sRateEl) {
    gRateEl.innerText = `₹${state.liveRates.gold.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/g`;
    sRateEl.innerText = `₹${state.liveRates.silver.toLocaleString("en-IN", { maximumFractionDigits: 1 })}/g`;

    // Visual 'blink' effect on update
    [gRateEl, sRateEl].forEach((el) => {
      el.style.transition = "none";
      el.style.color = "#fff";
      el.style.textShadow = "0 0 10px var(--primary)";
      setTimeout(() => {
        el.style.transition = "all 0.5s";
        el.style.color = "";
        el.style.textShadow = "none";
      }, 50);
    });
  }

  updateInvestments();
}

setInterval(updateMetalCharts, 10000);

function updateMetalCharts() {
  // Only add data points if prices are valid
  if (state.liveRates.gold === 0 || state.liveRates.silver === 0) return;

  const timeStr = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  state.liveRates.history.labels.push(timeStr);
  state.liveRates.history.gold.push(state.liveRates.gold);
  state.liveRates.history.silver.push(state.liveRates.silver);

  if (state.liveRates.history.labels.length > 60) {
    state.liveRates.history.labels.shift();
    state.liveRates.history.gold.shift();
    state.liveRates.history.silver.shift();
  }

  if (chartInstances.performance) {
    const sortedInvs = [...state.investments].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );
    const labels = [];
    const investedData = [];
    const currentData = [];

    let cumCost = 0;
    let currentGoldQty = 0;
    let currentSilverQty = 0;

    if (sortedInvs.length === 0) {
      labels.push("No Data");
      investedData.push(0);
      currentData.push(0);
    } else {
      sortedInvs.forEach((inv) => {
        cumCost += inv.qty * inv.buyPrice;
        if (inv.type === "gold") currentGoldQty += inv.qty;
        else currentSilverQty += inv.qty;

        const currentValAtStep =
          currentGoldQty * state.liveRates.gold +
          currentSilverQty * state.liveRates.silver;

        labels.push(`${inv.date}`);
        investedData.push(cumCost);
        currentData.push(currentValAtStep);
      });
    }

    chartInstances.performance.data.labels = labels;
    chartInstances.performance.data.datasets[0].data = investedData;
    chartInstances.performance.data.datasets[1].data = currentData;

    const totalCurrent = currentData[currentData.length - 1];
    const totalInvested = investedData[investedData.length - 1];
    const isProfit = totalCurrent >= totalInvested;

    chartInstances.performance.data.datasets[1].borderColor = isProfit
      ? "#10b981"
      : "#ef4444";
    chartInstances.performance.data.datasets[1].backgroundColor = isProfit
      ? "rgba(16,185,129,0.1)"
      : "rgba(239,68,68,0.1)";

    chartInstances.performance.update("none");
  }

  if (chartInstances.goldMini) {
    chartInstances.goldMini.data.labels = [...state.liveRates.history.labels];
    chartInstances.goldMini.data.datasets[0].data = [
      ...state.liveRates.history.gold,
    ];
    chartInstances.goldMini.update("none");
  }

  if (chartInstances.silverMini) {
    chartInstances.silverMini.data.labels = [...state.liveRates.history.labels];
    chartInstances.silverMini.data.datasets[0].data = [
      ...state.liveRates.history.silver,
    ];
    chartInstances.silverMini.update("none");
  }
}

// ===== BUDGET LOGIC =====
async function saveBudget() {
  state.budget = {
    income: parseFloat(document.getElementById("budgetIncome").value) || 0,
    food: parseFloat(document.getElementById("budgetFood").value) || 0,
    transport:
      parseFloat(document.getElementById("budgetTransport").value) || 0,
    shopping: parseFloat(document.getElementById("budgetShopping").value) || 0,
    bills: parseFloat(document.getElementById("budgetBills").value) || 0,
    entertainment:
      parseFloat(document.getElementById("budgetEntertainment").value) || 0,
    other: parseFloat(document.getElementById("budgetOther").value) || 0,
  };

  showLoading();
  saveLocalData();
  hideLoading();

  showToast("Budget Saved!");
  updateBudgetPage();
  updateDashboard();
}

function updateBudgetPage() {
  // Populate inputs
  document.getElementById("budgetIncome").value = state.budget.income || "";
  document.getElementById("budgetFood").value = state.budget.food || "";
  document.getElementById("budgetTransport").value =
    state.budget.transport || "";
  document.getElementById("budgetShopping").value = state.budget.shopping || "";
  document.getElementById("budgetBills").value = state.budget.bills || "";
  document.getElementById("budgetEntertainment").value =
    state.budget.entertainment || "";
  document.getElementById("budgetOther").value = state.budget.other || "";

  // Calculate spent per category this month
  const spent = getExpensesByCategory(new Date().getMonth());
  const categories = [
    "food",
    "transport",
    "shopping",
    "bills",
    "entertainment",
    "other",
  ];

  let barsHtml = "";
  categories.forEach((cat) => {
    const Cat = cat.charAt(0).toUpperCase() + cat.slice(1);
    const allocated = state.budget[cat] || 0;
    const used = spent[Cat] || 0;
    const percent = allocated > 0 ? Math.min(100, (used / allocated) * 100) : 0;

    let colorClass = "safe";
    if (percent > 75) colorClass = "warn";
    if (percent > 90) colorClass = "danger";

    barsHtml += `
      <div class="budget-bar-item">
        <div class="budget-bar-label">
          <span style="display:flex;align-items:center;gap:6px;">${getCategoryIcon(Cat)} ${Cat}</span>
          <span>₹${used.toLocaleString()} / ₹${allocated.toLocaleString()}</span>
        </div>
        <div class="budget-bar-track">
          <div class="budget-bar-fill ${colorClass}" style="width: ${percent}%"></div>
        </div>
      </div>
    `;
  });

  document.getElementById("budgetProgressBars").innerHTML = barsHtml;
  updateBudgetCharts();
}

// ===== CHARTS & VISUALIZATIONS =====
Chart.defaults.color = "#5f6572";
Chart.defaults.font.family = "'Inter', sans-serif";

function initCharts() {
  // Dashboard Charts
  const ctxTrend = document.getElementById("trendChart").getContext("2d");
  chartInstances.trend = new Chart(ctxTrend, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: "rgba(255,255,255,0.04)" }, beginAtZero: true },
        x: { grid: { display: false } },
      },
      tension: 0.5,
    },
  });

  const ctxCat = document.getElementById("categoryChart").getContext("2d");
  chartInstances.category = new Chart(ctxCat, {
    type: "doughnut",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      plugins: { legend: { display: false } },
      borderWidth: 0,
    },
  });

  // Analytics Charts
  const ctxBar = document.getElementById("barChart").getContext("2d");
  chartInstances.bar = new Chart(ctxBar, {
    type: "bar",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });

  const ctxPie = document.getElementById("pieChart").getContext("2d");
  chartInstances.pie = new Chart(ctxPie, {
    type: "pie",
    data: { labels: [], datasets: [] },
    options: { responsive: true, maintainAspectRatio: false, borderWidth: 0 },
  });

  const ctxRadar = document.getElementById("radarChart").getContext("2d");
  chartInstances.radar = new Chart(ctxRadar, {
    type: "radar",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          grid: { color: "rgba(255,255,255,0.1)" },
          angleLines: { color: "rgba(255,255,255,0.1)" },
          ticks: { display: false },
        },
      },
      plugins: { legend: { display: false } },
    },
  });

  const ctxSavings = document.getElementById("savingsChart").getContext("2d");
  chartInstances.savings = new Chart(ctxSavings, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: { responsive: true, maintainAspectRatio: false, tension: 0.5 },
  });

  // Budget Chart
  const ctxBudget = document.getElementById("budgetChart").getContext("2d");
  chartInstances.budget = new Chart(ctxBudget, {
    type: "doughnut",
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: { legend: { display: false } },
    },
  });

  // Portfolio Performance Chart
  const ctxPerf = document.getElementById("performanceChart").getContext("2d");
  chartInstances.performance = new Chart(ctxPerf, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Invested",
          data: [],
          borderColor: "rgba(255, 255, 255, 0.4)",
          backgroundColor: "transparent",
          fill: false,
          tension: 0.5,
          borderWidth: 2,
          borderDash: [5, 5],
        },
        {
          label: "Current Value",
          data: [],
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.1)",
          fill: true,
          tension: 0.5,
          borderWidth: 2,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label + ": ₹" + context.raw.toLocaleString()
              );
            },
          },
        },
      },
      scales: {
        y: { beginAtZero: false, grid: { color: "rgba(255,255,255,0.05)" } },
        x: { grid: { display: false } },
      },
    },
  });

  // Gold Mini Chart
  const ctxGoldMini = document.getElementById("goldMiniChart").getContext("2d");
  chartInstances.goldMini = new Chart(ctxGoldMini, {
    type: "line",
    data: {
      labels: state.liveRates.history.labels,
      datasets: [
        {
          data: state.liveRates.history.gold,
          borderColor: "#f59e0b",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
    },
  });

  // Silver Mini Chart
  const ctxSilverMini = document
    .getElementById("silverMiniChart")
    .getContext("2d");
  chartInstances.silverMini = new Chart(ctxSilverMini, {
    type: "line",
    data: {
      labels: state.liveRates.history.labels,
      datasets: [
        {
          data: state.liveRates.history.silver,
          borderColor: "#94a3b8",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
    },
  });
}

function updateDashboardCharts() {
  // Category Doughnut (Expenses Only)
  const spent = getExpensesByCategory(new Date().getMonth());
  // Filter out 'Income' from the doughnut chart
  const labels = Object.keys(spent).filter((k) => spent[k] > 0 && k !== "Income");
  const data = labels.map((k) => spent[k]);
  const bgColors = labels.map((k) => getCategoryColor(k));

  chartInstances.category.data = {
    labels,
    datasets: [{ data, backgroundColor: bgColors }],
  };
  chartInstances.category.update();

  // Render Custom Legend
  const legendHtml = labels
    .map(
      (l, i) => `
    <div class="donut-legend-item">
      <div class="donut-legend-dot" style="background:${bgColors[i]}"></div>
      ${l} (₹${data[i].toLocaleString()})
    </div>
  `,
    )
    .join("");
  document.getElementById("donutLegend").innerHTML = legendHtml;

  // Trend Line Chart (Last 7 days)
  const last7Days = [...Array(7)]
    .map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    })
    .reverse();

  const dailyExp = last7Days.map((date) => {
    return state.expenses
      .filter((e) => e.date === date && e.category !== "Income")
      .reduce((sum, e) => sum + e.amount, 0);
  });

  const dailyInc = last7Days.map((date) => {
    return state.expenses
      .filter((e) => e.date === date && e.category === "Income")
      .reduce((sum, e) => sum + e.amount, 0);
  });

  chartInstances.trend.data = {
    labels: last7Days.map((d) => d.substring(5)), // MM-DD
    datasets: [
      {
        label: "Income",
        data: dailyInc,
        borderColor: "#10b981", // Green
        backgroundColor: "rgba(16, 185, 129, 0.08)",
        fill: true,
        borderWidth: 2,
        pointBackgroundColor: "#10b981",
        pointBorderColor: "#10b981",
        pointRadius: 3,
        tension: 0.4,
      },
      {
        label: "Expenses",
        data: dailyExp,
        borderColor: "#ef4444", // Red
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        fill: true,
        borderWidth: 2,
        pointBackgroundColor: "#ef4444",
        pointBorderColor: "#ef4444",
        pointRadius: 3,
        tension: 0.4,
      },
    ],
  };
  chartInstances.trend.update();
}

function updateAnalyticsCharts() {
  const spent = getExpensesByCategory();
  const labels = Object.keys(spent).filter((k) => spent[k] > 0);
  const data = labels.map((k) => spent[k]);
  const bgColors = labels.map((k) => getCategoryColor(k));

  // Bar Chart
  chartInstances.bar.data = {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Monthly Expenses",
        data: getMonthlyExpensesArray(),
        backgroundColor: "rgba(16, 185, 129, 0.6)",
        borderRadius: 6,
        hoverBackgroundColor: "rgba(16, 185, 129, 0.8)",
      },
    ],
  };
  chartInstances.bar.update();

  // Pie Chart
  chartInstances.pie.data = {
    labels,
    datasets: [{ data, backgroundColor: bgColors }],
  };
  chartInstances.pie.update();

  // Radar Chart
  chartInstances.radar.data = {
    labels: [
      "Food",
      "Transport",
      "Shopping",
      "Bills",
      "Entertainment",
      "Other",
    ],
    datasets: [
      {
        label: "Spending Profile",
        data: [
          "Food",
          "Transport",
          "Shopping",
          "Bills",
          "Entertainment",
          "Other",
        ].map((c) => spent[c] || 0),
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderColor: "#10b981",
        pointBackgroundColor: "#10b981",
      },
    ],
  };
  chartInstances.radar.update();

  // Savings Chart
  const monthlyExp = getMonthlyExpensesArray();
  const inc = state.budget.income || 0;
  const savings = monthlyExp.map((exp) => (inc > 0 ? inc - exp : 0));
  chartInstances.savings.data = {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Savings",
        data: savings,
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.06)",
        fill: true,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: "#10b981",
      },
    ],
  };
  chartInstances.savings.update();
}

function updateBudgetCharts() {
  const totalBudget =
    Object.values(state.budget).reduce((a, b) => a + b, 0) -
    (state.budget.income || 0);
  const totalSpent = getThisMonthExpenses();

  chartInstances.budget.data = {
    labels: ["Spent", "Remaining"],
    datasets: [
      {
        data: [totalSpent, Math.max(0, totalBudget - totalSpent)],
        backgroundColor: ["#ef4444", "#10b981"],
        borderWidth: 0,
      },
    ],
  };
  chartInstances.budget.update();
}

// ===== SETTINGS LOGIC =====
// Supabase settings removed

function updateSettingsUI() {
  document.getElementById("settingGoldPrice").value =
    state.liveRates.gold || "";
  document.getElementById("settingSilverPrice").value =
    state.liveRates.silver || "";
}

function saveSettings() {
  const gPrice = parseFloat(document.getElementById("settingGoldPrice").value);
  const sPrice = parseFloat(
    document.getElementById("settingSilverPrice").value,
  );

  if (!isNaN(gPrice) && gPrice > 0) state.liveRates.gold = gPrice;
  if (!isNaN(sPrice) && sPrice > 0) state.liveRates.silver = sPrice;

  localStorage.setItem(
    "wf_manual_rates",
    JSON.stringify({
      gold: state.liveRates.gold,
      silver: state.liveRates.silver,
    }),
  );

  updateRatesUI();
  updateSettingsUI();
  showToast("Rates Saved!");
}

// Clear data removed

function getThisMonthExpenses() {
  const currentMonth = new Date().getMonth();
  return state.expenses
    .filter((e) => new Date(e.date).getMonth() === currentMonth && e.category !== "Income")
    .reduce((sum, e) => sum + e.amount, 0);
}

function getThisMonthIncome() {
  const currentMonth = new Date().getMonth();
  const baseIncome = state.budget.income || 0;
  const recordedIncome = state.expenses
    .filter((e) => new Date(e.date).getMonth() === currentMonth && e.category === "Income")
    .reduce((sum, e) => sum + e.amount, 0);
  return baseIncome + recordedIncome;
}

function getExpensesByCategory(month = null) {
  const categories = {};
  state.expenses.forEach((e) => {
    if (month !== null && new Date(e.date).getMonth() !== month) return;
    categories[e.category] = (categories[e.category] || 0) + e.amount;
  });
  return categories;
}

function getMonthlyExpensesArray() {
  const arr = new Array(12).fill(0);
  state.expenses.forEach((e) => {
    if (e.category !== "Income") {
      arr[new Date(e.date).getMonth()] += e.amount;
    }
  });
  return arr;
}

function formatDate(dateStr) {
  const options = { month: "short", day: "numeric", year: "numeric" };
  return new Date(dateStr).toLocaleDateString("en-US", options);
}

// ===== BACKUP & RESTORE =====
function backupData() {
  const password = document.getElementById("backupPassword").value;
  if (!password) {
    showToast("Please enter a password for backup");
    return;
  }

  const dataToBackup = {
    wf_settings: localStorage.getItem("wf_settings"),
    wf_profiles: localStorage.getItem("wf_profiles"),
    wf_manual_rates: localStorage.getItem("wf_manual_rates"),
    wf_data: localStorage.getItem("wf_data")
  };

  const jsonString = JSON.stringify(dataToBackup);
  
  try {
    const encrypted = CryptoJS.AES.encrypt(jsonString, password).toString();
    const blob = new Blob([encrypted], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = `wealthflow_backup_${new Date().toISOString().split('T')[0]}.enc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    document.getElementById("backupPassword").value = "";
    showToast("Backup downloaded successfully!");
  } catch (error) {
    console.error("Backup failed", error);
    showToast("Backup failed. Please try again.");
  }
}

function restoreData() {
  const fileInput = document.getElementById("restoreFile");
  const password = document.getElementById("restorePassword").value;
  
  if (!fileInput.files.length) {
    showToast("Please select a backup file");
    return;
  }
  if (!password) {
    showToast("Please enter the decryption password");
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const encryptedData = e.target.result;
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error("Invalid password or corrupted file");
      }

      const parsedData = JSON.parse(decryptedString);
      
      if (typeof parsedData !== 'object') {
        throw new Error("Invalid backup format");
      }

      if (parsedData.wf_settings) localStorage.setItem("wf_settings", parsedData.wf_settings);
      if (parsedData.wf_profiles) localStorage.setItem("wf_profiles", parsedData.wf_profiles);
      if (parsedData.wf_manual_rates) localStorage.setItem("wf_manual_rates", parsedData.wf_manual_rates);
      if (parsedData.wf_data) localStorage.setItem("wf_data", parsedData.wf_data);

      document.getElementById("restorePassword").value = "";
      fileInput.value = "";
      
      showToast("Data restored successfully! Reloading...");
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (error) {
      console.error("Restore failed", error);
      showToast("Restore failed: " + (error.message || "Invalid password or file"));
    }
  };

  reader.readAsText(file);
}
