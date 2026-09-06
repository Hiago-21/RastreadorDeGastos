// --- Estado da Aplicação ---
let appData = JSON.parse(localStorage.getItem('finTrackerData')) || {};
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
    populateMonthSelector();
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
    const form = document.getElementById('expense-form');
    const monthSelector = document.getElementById('month-selector');
    const btnExport = document.getElementById('btn-export');

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

    // Submeter Gasto
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseCurrency(expenseAmountInput.value);
        const category = document.getElementById('expense-category').value;
        const desc = document.getElementById('expense-desc').value;

        if (amount > 0 && category && desc) {
            appData[currentMonthKey].expenses.push({ id: Date.now(), amount, category, desc });
            saveData();
            form.reset();
            updateUI();
        }
    });

    // Mudar de Mês
    monthSelector.addEventListener('change', (e) => {
        currentMonthKey = e.target.value;
        updateUI();
    });

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
function populateMonthSelector() {
    const selector = document.getElementById('month-selector');
    selector.innerHTML = '';
    
    const months = Object.keys(appData).sort().reverse();
    months.forEach(month => {
        const [year, m] = month.split('-');
        const date = new Date(year, m - 1);
        const name = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        
        const option = document.createElement('option');
        option.value = month;
        option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
        if (month === currentMonthKey) option.selected = true;
        
        selector.appendChild(option);
    });
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