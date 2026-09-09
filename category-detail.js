(() => {
  const palette = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f43f5e'];
  let detailChart;

  function money(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0); }
  function getMonthKey() {
    const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const title = document.querySelector('#monthTitle')?.textContent.trim().toLowerCase() || '';
    const [month, year] = title.split(/\s+/);
    const monthIndex = monthNames.indexOf(month);
    return monthIndex >= 0 && year ? `${year}-${String(monthIndex + 1).padStart(2, '0')}` : new Date().toISOString().slice(0, 7);
  }
  function getExpenses() { const data = JSON.parse(localStorage.getItem('fintracker-app-v2') || '{}'); return data.months?.[getMonthKey()]?.expenses || []; }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' }[character])); }
  function formatDate(value) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`)).replace(' de ', ' '); }

  function renderDetail() {
    const expenses = getExpenses();
    const select = document.querySelector('#categoryDetailSelect');
    const selected = select.value;
    const categories = [...new Set(expenses.map(expense => expense.category))];
    const currentOptions = [...select.options].map(option => option.value);
    if (currentOptions.length !== categories.length + 1 || categories.some(category => !currentOptions.includes(category))) {
      select.innerHTML = '<option value="__all">Todos os gastos</option>' + categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
      select.value = categories.includes(selected) ? selected : '__all';
    }
    const filtered = select.value === '__all' ? expenses : expenses.filter(expense => expense.category === select.value);
    const total = filtered.reduce((sum, expense) => sum + expense.amount, 0);
    document.querySelector('#categoryDetailTotal').textContent = money(total);
    document.querySelector('#categoryDetailCount').textContent = `${filtered.length} lançamento${filtered.length === 1 ? '' : 's'}`;
    const grouped = filtered.reduce((result, expense) => { result[expense.category] = (result[expense.category] || 0) + expense.amount; return result; }, {});
    detailChart?.destroy();
    document.querySelector('#categoryDetailBars').innerHTML = Object.entries(grouped).sort(([, first], [, second]) => second - first).map(([category, value], index) => `<div class="category-detail-bar-row"><div class="category-detail-bar-meta"><span>${escapeHtml(category)}</span><span>${money(value)} · ${total ? Math.round((value / total) * 100) : 0}%</span></div><div class="category-detail-bar-track"><div class="category-detail-bar-fill" style="--bar-color:${palette[index % palette.length]};width:${total ? (value / total) * 100 : 0}%"></div></div></div>`).join('') || '<div class="empty-state">Nenhum gasto nesta seleção.</div>';
    document.querySelector('#categoryDetailList').innerHTML = filtered.length ? filtered.slice().sort((a, b) => b.date.localeCompare(a.date)).map(expense => `<div class="category-detail-item"><div><strong>${escapeHtml(expense.description)}</strong><small>${escapeHtml(expense.category)} · ${formatDate(expense.date)}</small></div><strong>${money(expense.amount)}</strong></div>`).join('') : '<div class="empty-state">Nenhum gasto nesta seleção.</div>';
  }
  function openDetail() { document.querySelector('#dailyDetailModal').hidden = true; document.querySelector('#categoryDetailModal').hidden = false; document.querySelector('#scrim').hidden = false; renderDetail(); }
  function closeDetail() { detailChart?.destroy(); document.querySelector('#categoryDetailModal').hidden = true; document.querySelector('#scrim').hidden = true; }
  document.querySelector('#openCategoryDetail').addEventListener('click', openDetail);
  document.querySelector('#closeCategoryDetail').addEventListener('click', closeDetail);
  document.querySelector('#categoryDetailSelect').addEventListener('change', renderDetail);
  document.querySelector('#scrim').addEventListener('click', closeDetail);
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !document.querySelector('#categoryDetailModal').hidden) closeDetail(); });
})();
