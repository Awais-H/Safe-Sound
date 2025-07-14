document.getElementById('startBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, 'START_TRACKING');
  });
});

document.getElementById('stopBtn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.tabs.sendMessage(tabs[0].id, 'STOP_TRACKING');
  });
});

document.getElementById('weeklyBtn').addEventListener('click', () => {
  const canvas = document.getElementById('chart');
  canvas.style.display = 'block';
  chrome.storage.sync.get(null, data => {
    const now = new Date();
    const weekKey = `${now.getUTCFullYear()}W${getWeekNumber(now)}`;
    const usage = data[weekKey] || {};
    const labels = [];
    const values = [];
    for (let bucket = 10; bucket <= 120; bucket += 10) {
      labels.push(`${bucket}-${bucket + 9} dB`);
      values.push((usage[bucket] || 0) / 3600); // seconds -> hours
    }
    renderChart(labels, values);
    // OPTIONAL: send to backend
    /*
    fetch('https://your-backend.example.com/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ week: weekKey, usage })
    });
    */
  });
});

function getWeekNumber(d) {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

let chart;
function renderChart(labels, values) {
  if (chart) chart.destroy();
  const ctx = document.getElementById('chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Hours exposure (this week)',
          data: values
        },
        {
          label: 'OSHA weekly limit (hrs)',
          data: labels.map(label => {
            const rangeStart = parseInt(label);
            const dB = rangeStart + 5; // midpoint
            let dailyLimitHours = 8 * Math.pow(2, (90 - dB) / 5);
            if (dailyLimitHours > 24) dailyLimitHours = 24;
            return dailyLimitHours * 5;
          })
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Hours'
          }
        }
      }
    }
  });
}