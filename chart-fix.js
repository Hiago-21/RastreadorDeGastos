(() => {
  let fullLabels = [];
  let fullValues = [];
  let fullColors = [];
  let fullSignature = '';
  let weekIndex = 0;

  function currency(value) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0); }

  function renderWeek() {
    const canvas = document.querySelector('#dailyChart');
    if (!canvas || !fullLabels.length || document.querySelector('#dailyDetailModal')?.hidden === false) return;
    const weekCount = Math.max(1, Math.ceil(fullLabels.length / 7));
    weekIndex = Math.min(Math.max(weekIndex, 0), weekCount - 1);
    const start = weekIndex * 7;
    const labels = fullLabels.slice(start, start + 7);
    const values = fullValues.slice(start, start + 7);
    const colors = fullColors.slice(start, start + 7);
    const previous = Chart.getChart(canvas);
    const wrap = document.querySelector('.bar-chart-wrap');
    const chartWidth = Math.max(300, wrap?.clientWidth || 390);
    const previousLabels = previous?.data.labels || [];
    if (previous && previousLabels.join(',') === labels.join(',') && canvas.width === chartWidth && canvas.height === 190) return;
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--muted');
    canvas.width = chartWidth;
    canvas.height = 190;
    canvas.style.width = `${chartWidth}px`;
    canvas.style.height = '190px';
    if (previous) { previous.data.labels = labels; previous.data.datasets[0].data = values; previous.data.datasets[0].backgroundColor = colors; previous.options.layout = { padding: { left: 4, right: 4, top: 4, bottom: 0 } }; previous.options.scales.x.ticks.autoSkip = false; previous.options.scales.y.display = true; previous.options.scales.y.position = 'left'; previous.options.scales.y.ticks.maxTicksLimit = 4; previous.options.scales.y.ticks.callback = value => currency(value).replace(',00', ''); previous.options.scales.y.grid.color = 'rgba(125,132,146,.12)'; previous.update('none'); }
    const label = document.querySelector('#dailyWeekLabel');
    if (label) label.textContent = `Dias ${labels[0]}–${labels[labels.length - 1]}`;
    const previousButton = document.querySelector('#previousDailyWeek');
    const nextButton = document.querySelector('#nextDailyWeek');
    if (previousButton) previousButton.disabled = weekIndex === 0;
    if (nextButton) nextButton.disabled = weekIndex >= weekCount - 1;
  }

  function normalizeCharts() {
    if (!window.Chart) return;
    const donutCanvas = document.querySelector('#categoryChart');
    const donut = donutCanvas && Chart.getChart(donutCanvas);
    if (donut && (donutCanvas.width !== 190 || donutCanvas.height !== 190)) {
      donutCanvas.width = 190;
      donutCanvas.height = 190;
      donutCanvas.style.width = '190px';
      donutCanvas.style.height = '190px';
      donut.update('none');
    }
    const dailyCanvas = document.querySelector('#dailyChart');
    const daily = dailyCanvas && Chart.getChart(dailyCanvas);
    if (!daily || document.querySelector('#dailyDetailModal')?.hidden === false) return;
    const signature = `${daily.data.labels.join(',')}|${daily.data.datasets[0].data.join(',')}`;
    if (daily.data.labels.length > 7 && signature !== fullSignature) {
      fullLabels = daily.data.labels.slice();
      fullValues = daily.data.datasets[0].data.slice();
      fullColors = daily.data.datasets[0].backgroundColor.slice();
      fullSignature = signature;
      weekIndex = 0;
    }
    if (fullLabels.length) renderWeek();
  }

  document.querySelector('#previousDailyWeek')?.addEventListener('click', () => { weekIndex -= 1; renderWeek(); });
  document.querySelector('#nextDailyWeek')?.addEventListener('click', () => { weekIndex += 1; renderWeek(); });
  setInterval(normalizeCharts, 100);
})();
