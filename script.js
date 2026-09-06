// --- Estado da Aplicação ---
let appData = JSON.parse(localStorage.getItem('finTrackerData')) || {};
let customCategories = JSON.parse(localStorage.getItem('finTrackerCategories')) || [];
let currentMonthKey = '';
let chartInstance = null;

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    registerServiceWorker();
});

function initApp() {
    const now = new Date();
    // Formato: "YYYY-MM"
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Se o mês atual não existir no banco, cria.
    if (!appData[thisMonth]) {
        appData[thisMonth] = { income: 0, expenses: [] };
    }
    
    currentMonthKey = thisMonth;
    loadCustomCategories();
    updateMonthLabel();
    setupEventListeners();
    updateUI();
}

// --- Máscaras de Moeda (Em Tempo Real) ---
function formatCurrencyBRL(value) {
    const num = Number(value.replace(/\D/g, '')) / 100;
    if (num === 0) return '';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function parseCurrency(str) {
    if (!str) return 0;
    return Number(str.replace(/\D/g, '')) / 100;
}

// --- Event Listeners ---
function setupEventListeners() {
    const incomeInput = document.getElementById('income-input');
    const expenseAmountInput = document.getElementById('expense-amount');
    const categorySelect = document.getElementById('expense-category');
    const customCategoryEditor = document.getElementById('custom-category-editor');
    const customCategoryInput = document.getElementById('custom-category-input');
    const form = document.getElementById('expense-form');
    const previousMonth = document.getElementById('previous-month');
    const nextMonth = document.getElementById('next-month');
    const btnExport = document.getElementById('btn-export');
    const advancedOptionsButton = document.getElementById('advanced-options');
    const advancedOptionsPanel = document.getElementById('advanced-options-panel');
    const installmentsField = document.getElementById('installments-field');
    const installmentsInput = document.getElementById('installments-input');
    const confirmCategoryButton = document.getElementById('confirm-category');
    const monthNavigation = document.querySelector('.header-top');
    let touchStartX = 0;

    // Máscara ao digitar Salário
    incomeInput.addEventListener('input', (e) => {
        e.target.value = formatCurrencyBRL(e.target.value);
        appData[currentMonthKey].income = parseCurrency(e.target.value);
        saveData();
        updateUI(false); // Atualiza sem recarregar o input
    });

    // Máscara ao digitar Gasto
    expenseAmountInput.addEventListener('input', (e) => {
        e.target.value = formatCurrencyBRL(e.target.value);
    });

    categorySelect.addEventListener('change', () => {
        const isCreatingCategory = categorySelect.value === '__new__';
        categorySelect.hidden = isCreatingCategory;
        customCategoryEditor.hidden = !isCreatingCategory;
        if (isCreatingCategory) customCategoryInput.focus();
    });

    confirmCategoryButton.addEventListener('click', () => {
        const category = customCategoryInput.value.trim();
        if (!category) {
            customCategoryInput.focus();
            return;
        }

        if (!customCategories.includes(category)) {
            customCategories.push(category);
            localStorage.setItem('finTrackerCategories', JSON.stringify(customCategories));
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.insertBefore(option, categorySelect.querySelector('option[value="__new__"]'));
        }

        categorySelect.value = category;
        categorySelect.hidden = false;
        customCategoryEditor.hidden = true;
        customCategoryInput.value = '';
    });

    advancedOptionsButton.addEventListener('click', () => {
        const isOpen = advancedOptionsPanel.hidden;
        advancedOptionsPanel.hidden = !isOpen;
        advancedOptionsButton.setAttribute('aria-expanded', String(isOpen));
    });

    document.querySelectorAll('input[name="expense-type"]').forEach(input => {
        input.addEventListener('change', () => {
            installmentsField.hidden = input.value !== 'installment' || !input.checked;
        });
    });

    // Submeter Gasto
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseCurrency(expenseAmountInput.value);
        const category = categorySelect.value;
        const desc = document.getElementById('expense-desc').value;
        const expenseType = document.querySelector('input[name="expense-type"]:checked').value;
        const installments = Number.parseInt(installmentsInput.value, 10);

        if (amount > 0 && category && category !== '__new__' && desc && (expenseType !== 'installment' || installments >= 2)) {
            addProjectedExpenses({ amount, category, desc, expenseType, installments });
            saveData();
            form.reset();
            categorySelect.hidden = false;
            customCategoryEditor.hidden = true;
            advancedOptionsPanel.hidden = true;
            advancedOptionsButton.setAttribute('aria-expanded', 'false');
            installmentsField.hidden = true;
            updateUI();
        }
    });

    // Mudar de Mês
    previousMonth.addEventListener('click', () => changeMonth(-1));
    nextMonth.addEventListener('click', () => changeMonth(1));

    monthNavigation.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    monthNavigation.addEventListener('touchend', (e) => {
        const distance = e.changedTouches[0].screenX - touchStartX;
        if (Math.abs(distance) < 50) return;

        changeMonth(distance < 0 ? 1 : -1);
    }, { passive: true });

    // Exportar CSV
    btnExport.addEventListener('click', exportToCSV);
}

// --- Atualização da UI e IA de Alertas ---
function updateUI(updateIncomeInput = true) {
    const data = appData[currentMonthKey];
    
    // Atualizar Header
    if (updateIncomeInput) {
        document.getElementById('income-input').value = data.income ? (data.income).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';
    }

    // Cálculos
    const totalExpenses = data.expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const balance = data.income - totalExpenses;

    document.getElementById('total-expenses').innerText = totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('total-balance').innerText = balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Cor do saldo
    document.getElementById('total-balance').style.color = balance < 0 ? 'var(--danger)' : 'var(--success)';

    renderExpenseList(data.expenses);
    renderChart(data.expenses);
    processAITips(data.income, data.expenses, balance);
}

// --- Sistema de Alertas (IA Baseada em Regras) ---
function processAITips(income, expenses, balance) {
    const container = document.getElementById('alerts-container');
    container.innerHTML = '';

    if (income === 0) return;

    // Regra 1: Alerta de Risco (Cigarro/Bebida > 30%)
    const riskExpenses = expenses
        .filter(e => e.category === 'Cigarro' || e.category === 'Bebida')
        .reduce((acc, curr) => acc + curr.amount, 0);
    
    if (riskExpenses > (income * 0.30)) {
        container.innerHTML += `
            <div class="alert alert-warning">
                ⚠️ <strong>Atenção:</strong> Seus gastos com Bebida/Cigarro ultrapassaram 30% da sua renda mensal. É bom ficar de olho!
            </div>`;
    }

    // Regra 2: Dica de Economia (Saldo > 20%)
    if (balance > (income * 0.20)) {
        container.innerHTML += `
            <div class="alert alert-success">
                🎉 <strong>Parabéns!</strong> Você tem mais de 20% do salário livre. Ótimo momento para colocar na Reserva de Emergência ou investir!
            </div>`;
    }
}

// --- Gráfico e Renderizações ---
function renderChart(expenses) {
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    if (chartInstance) chartInstance.destroy();

    if (expenses.length === 0) {
        document.getElementById('category-chart').style.display = 'none';
        return;
    }
    document.getElementById('category-chart').style.display = 'block';

    const categories = {};
    expenses.forEach(e => { categories[e.category] = (categories[e.category] || 0) + e.amount; });

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#0ea5e9'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { font: { family: 'Inter' } } } },
            cutout: '70%'
        }
    });
}

function renderExpenseList(expenses) {
    const list = document.getElementById('expense-list');
    list.innerHTML = '';
    
    // Inverter para mostrar os mais recentes primeiro
    [...expenses].reverse().forEach(exp => {
        list.innerHTML += `
            <li class="expense-item">
                <div class="expense-info">
                    <strong>${exp.desc}</strong>
                    <span>${exp.category}</span>
                </div>
                <div class="expense-value">
                    - ${exp.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
            </li>
        `;
    });
}

// --- Utilitários ---
function updateMonthLabel() {
    const [year, month] = currentMonthKey.split('-');
    const date = new Date(year, Number(month) - 1);
    const name = date.toLocaleString('pt-BR', { month: 'long' });
    document.getElementById('month-label').textContent = name.charAt(0).toUpperCase() + name.slice(1);
}

function saveData() {
    localStorage.setItem('finTrackerData', JSON.stringify(appData));
}

// --- Funcionalidade: Exportar CSV ---
function exportToCSV() {
    let csv = 'Mês,Categoria,Descrição,Valor,Receita do Mês\n';
    
    for (const [month, data] of Object.entries(appData)) {
        if (data.expenses.length === 0) {
            csv += `${month},--,--,0,${data.income}\n`;
        } else {
            data.expenses.forEach(exp => {
                csv += `${month},${exp.category},${exp.desc},${exp.amount},${data.income}\n`;
            });
        }
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'meus_gastos_fintracker.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- PWA: Service Worker ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW falhou: ', err));
    }
}

function changeMonth(offset) {
    const nextMonthKey = getMonthKey(currentMonthKey, offset);
    ensureMonth(nextMonthKey);
    currentMonthKey = nextMonthKey;
    updateMonthLabel();
    updateUI();
}

function getMonthKey(monthKey, offset) {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function ensureMonth(monthKey) {
    if (!appData[monthKey]) {
        appData[monthKey] = { income: 0, expenses: [] };
    }
}

function addProjectedExpenses({ amount, category, desc, expenseType, installments }) {
    const totalEntries = expenseType === 'installment' ? installments : expenseType === 'fixed' ? 12 : 1;
    const installmentAmount = expenseType === 'installment' ? amount / installments : amount;

    for (let index = 0; index < totalEntries; index += 1) {
        const monthKey = getMonthKey(currentMonthKey, index);
        ensureMonth(monthKey);

        const installmentDesc = expenseType === 'installment'
            ? `${desc} (${index + 1}/${installments})`
            : desc;

        appData[monthKey].expenses.push({
            id: Date.now() + index,
            amount: installmentAmount,
            category,
            desc: installmentDesc
        });
    }
}

function loadCustomCategories() {
    const categorySelect = document.getElementById('expense-category');
    const newCategoryOption = categorySelect.querySelector('option[value="__new__"]');

    customCategories
        .filter(category => category && ![...categorySelect.options].some(option => option.value === category))
        .forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.insertBefore(option, newCategoryOption);
        });
}