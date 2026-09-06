const DbService = {
  storageKey: "saldo-app-v1",
  categories: [
    { name: "Alimentação", emoji: "🍽️" }, { name: "Transporte", emoji: "🚗" },
    { name: "Casa", emoji: "🏠" }, { name: "Lazer", emoji: "✦" },
    { name: "Saúde", emoji: "♡" }, { name: "Educação", emoji: "◇" }
  ],
  async read() {
    try { return JSON.parse(localStorage.getItem(this.storageKey)) || { months: {}, categories: this.categories }; }
    catch { return { months: {}, categories: this.categories }; }
  },
  async write(data) { localStorage.setItem(this.storageKey, JSON.stringify(data)); return data; },
  async getMonthData(month) {
    const data = await this.read();
    return { month, income: data.months[month]?.income || 0, expenses: data.months[month]?.expenses || [], categories: data.categories || this.categories };
  },
  async updateIncome(month, amount) {
    const data = await this.read();
    data.months[month] ||= { income: 0, expenses: [] }; data.months[month].income = amount;
    await this.write(data); return this.getMonthData(month);
  },
  async saveExpense(expense) {
    const data = await this.read();
    if (expense.category && !data.categories.some(category => category.name === expense.category)) data.categories.push({ name: expense.category, emoji: "•" });
    const targetMonths = expense.type === "fixed" ? 12 : expense.type === "installment" ? expense.installments : 1;
    const originalDate = new Date(`${expense.month}-01T12:00:00`);
    for (let index = 0; index < targetMonths; index += 1) {
      const date = new Date(originalDate); date.setMonth(date.getMonth() + index);
      const month = date.toISOString().slice(0, 7); data.months[month] ||= { income: 0, expenses: [] };
      const amount = expense.type === "installment" ? expense.amount / expense.installments : expense.amount;
      data.months[month].expenses.push({ ...expense, id: `${expense.id}-${index}`, month, amount, installmentLabel: expense.type === "installment" ? `${index + 1}/${expense.installments}` : "" });
    }
    await this.write(data); return this.getMonthData(expense.month);
  },
  async deleteExpense(id, month) {
    const data = await this.read(); if (!data.months[month]) return this.getMonthData(month);
    data.months[month].expenses = data.months[month].expenses.filter(expense => expense.id !== id); await this.write(data); return this.getMonthData(month);
  }
};

const state = { month: new Date().toISOString().slice(0, 7), data: null, categoryChart: null, dailyChart: null };
const $ = selector => document.querySelector(selector);
const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const monthLabel = month => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00`));
const parseMoney = value => Number(String(value).replace(/\D/g, "")) / 100 || 0;
const formatInput = input => { const value = parseMoney(input.value); input.value = value ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""; };

async function loadMonth(month) {
  state.month = month; state.data = await DbService.getMonthData(month); render();
}
function render() {
  const { income, expenses } = state.data; const spent = expenses.reduce((total, expense) => total + expense.amount, 0); const balance = income - spent;
  const label = monthLabel(state.month); $("#monthTitle").innerHTML = `${label.split(" de ")[0]} <span id="monthYear">${label.split(" de ")[1]}</span>`;
  $("#balanceValue").textContent = money(balance); $("#totalSpent").textContent = money(spent); $("#expenseCount").textContent = `${expenses.length} lançamento${expenses.length === 1 ? "" : "s"}`; $("#incomeInput").value = income ? income.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "";
  $("#spentLabel").textContent = `${money(spent)} gastos`; const percent = income ? Math.min((spent / income) * 100, 100) : 0; $("#budgetProgress").style.width = `${percent}%`; $("#budgetLabel").textContent = `${Math.round(percent)}% usado`; $("#balanceStatus").textContent = balance < 0 ? "Acima do limite" : percent > 80 ? "Atenção" : "Em dia";
  const grouped = expenses.reduce((result, expense) => { result[expense.category] = (result[expense.category] || 0) + expense.amount; return result; }, {}); const top = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0]; $("#topCategory").textContent = top?.[0] || "--"; $("#topCategoryAmount").textContent = top ? money(top[1]) : "Sem gastos ainda"; $("#chartTotal").textContent = money(spent).replace(",00", ""); $("#visibleCount").textContent = expenses.length;
  renderList(expenses); renderCharts(grouped, expenses);
}
function renderList(expenses) {
  const search = $("#searchInput").value.toLowerCase(); const filtered = expenses.filter(expense => `${expense.description} ${expense.category}`.toLowerCase().includes(search)); $("#visibleCount").textContent = filtered.length;
  $("#expenseList").innerHTML = filtered.length ? filtered.slice().sort((a, b) => b.date.localeCompare(a.date)).map(expense => `<div class="expense-item" data-id="${expense.id}"><div class="delete-action">Excluir</div><div class="expense-content"><span class="expense-icon">${DbService.categories.find(category => category.name === expense.category)?.emoji || "•"}</span><div class="expense-info"><strong>${escapeHtml(expense.description)}</strong><small>${escapeHtml(expense.category)} · ${formatDate(expense.date)}${expense.installmentLabel ? ` · ${expense.installmentLabel}` : ""}</small></div><span class="expense-amount">${money(expense.amount)}</span></div></div>`).join("") : `<div class="empty-state"><span class="empty-icon">⌕</span><strong>${search ? "Nenhum resultado" : "Nenhum gasto por aqui"}</strong><p>${search ? "Tente outra busca." : "Adicione seu primeiro lançamento para começar."}</p></div>`;
  document.querySelectorAll(".expense-item").forEach(bindSwipe);
}
function renderCharts(grouped, expenses) {
  const colors = ["#111", "#555", "#888", "#aaa", "#ccc", "#ddd"]; const labels = Object.keys(grouped); const values = Object.values(grouped); const dark = matchMedia("(prefers-color-scheme: dark)").matches; const textColor = dark ? "#aaa" : "#777";
  state.categoryChart?.destroy(); state.dailyChart?.destroy(); state.categoryChart = new Chart($("#categoryChart"), { type: "doughnut", data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0 }] }, options: { cutout: "74%", plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => ` ${money(item.raw)}` } } } } });
  $("#categoryLegend").innerHTML = labels.slice(0, 4).map((label, index) => `<div class="legend-item"><i class="legend-dot" style="--dot:${colors[index]}"></i><span>${escapeHtml(label)}</span><span>${money(grouped[label])}</span></div>`).join("") || `<span style="color:var(--muted);font-size:11px">Sem dados</span>`;
  const days = new Date(Number(state.month.slice(0, 4)), Number(state.month.slice(5, 7)), 0).getDate(); const daily = Array.from({ length: days }, () => 0); expenses.forEach(expense => { daily[Number(expense.date.slice(8, 10)) - 1] += expense.amount; }); const average = daily.reduce((a, b) => a + b, 0) / days; $("#averageDaily").textContent = `${money(average)}/dia`;
  state.dailyChart = new Chart($("#dailyChart"), { type: "bar", data: { labels: daily.map((_, i) => i + 1), datasets: [{ data: daily, backgroundColor: dark ? "#aaa" : "#222", borderRadius: 5, borderSkipped: false, barPercentage: .7 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: item => ` ${money(item.raw)}` } } }, scales: { x: { grid: { display: false }, ticks: { color: textColor, maxTicksLimit: 6, font: { size: 9 } } }, y: { display: false, beginAtZero: true } } } });
}
function formatDate(date) { return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(`${date}T12:00:00`)).replace(" de ", " "); }
function escapeHtml(value) { return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[character])); }
function populateCategories() { $("#categorySelect").innerHTML = [...DbService.categories.map(category => `<option value="${category.name}">${category.emoji} ${category.name}</option>`), `<option value="__custom">＋ Criar categoria</option>`].join(""); }
function openSheet() { $("#expenseSheet").hidden = false; $("#scrim").hidden = false; $("#descriptionInput").focus(); }
function closeSheet() { $("#expenseSheet").hidden = true; $("#scrim").hidden = true; $("#formFeedback").textContent = ""; }
function changeMonth(offset) { const date = new Date(`${state.month}-01T12:00:00`); date.setMonth(date.getMonth() + offset); loadMonth(date.toISOString().slice(0, 7)); }
function bindSwipe(item) { let startX = 0; let currentX = 0; const content = item.querySelector(".expense-content"); item.addEventListener("touchstart", event => { startX = event.touches[0].clientX; }, { passive: true }); item.addEventListener("touchmove", event => { currentX = Math.min(0, event.touches[0].clientX - startX); if (currentX < 0) content.style.transform = `translateX(${Math.max(currentX, -82)}px)`; }, { passive: true }); item.addEventListener("touchend", async () => { if (currentX < -45) content.style.transform = "translateX(-82px)"; else content.style.transform = "translateX(0)"; if (currentX < -130) { state.data = await DbService.deleteExpense(item.dataset.id, state.month); render(); } currentX = 0; }); }

$("#openSheet").addEventListener("click", openSheet); $("#closeSheet").addEventListener("click", closeSheet); $("#scrim").addEventListener("click", closeSheet); $("#previousMonth").addEventListener("click", () => changeMonth(-1)); $("#nextMonth").addEventListener("click", () => changeMonth(1)); $("#searchInput").addEventListener("input", () => renderList(state.data.expenses)); $("#incomeInput").addEventListener("input", event => formatInput(event.target)); $("#incomeInput").addEventListener("change", async event => { state.data = await DbService.updateIncome(state.month, parseMoney(event.target.value)); render(); }); $("#amountInput").addEventListener("input", event => formatInput(event.target));
$("#categorySelect").addEventListener("change", event => { $("#customCategoryBox").hidden = event.target.value !== "__custom"; if (event.target.value === "__custom") $("#customCategoryInput").focus(); }); document.querySelectorAll("input[name=expenseType]").forEach(input => input.addEventListener("change", event => { $("#installmentBox").hidden = event.target.value !== "installment"; }));
$("#expenseForm").addEventListener("submit", async event => { event.preventDefault(); const type = document.querySelector("input[name=expenseType]:checked").value; const category = $("#categorySelect").value === "__custom" ? $("#customCategoryInput").value.trim() : $("#categorySelect").value; const amount = parseMoney($("#amountInput").value); if (!category || !amount || (type === "installment" && !Number($("#installmentInput").value))) { $("#formFeedback").textContent = "Preencha os campos obrigatórios para continuar."; return; } state.data = await DbService.saveExpense({ id: crypto.randomUUID(), description: $("#descriptionInput").value.trim(), amount, date: $("#dateInput").value, month: state.month, category, type, installments: Number($("#installmentInput").value) || 1 }); event.target.reset(); $("#dateInput").value = new Date().toISOString().slice(0, 10); $("#installmentBox").hidden = true; closeSheet(); render(); });
let swipeMonthStart = 0; $("#monthSurface").addEventListener("touchstart", event => { swipeMonthStart = event.touches[0].clientX; }, { passive: true }); $("#monthSurface").addEventListener("touchend", event => { const distance = event.changedTouches[0].clientX - swipeMonthStart; if (Math.abs(distance) > 70) changeMonth(distance > 0 ? -1 : 1); });
populateCategories(); $("#dateInput").value = new Date().toISOString().slice(0, 10); loadMonth(state.month);