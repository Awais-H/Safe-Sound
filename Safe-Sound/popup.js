// Popup script for Safe Sound extension
// This creates a simple popup interface that works with Chrome extensions

// Import utility functions
import('./utils.js').then(({ getOSHALimit, getExposureColor, getExposureBarColor, getFullDayName }) => {
  // Create a simple popup interface
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div class="popup-container">
        <div class="header">
          <h1>Safe Sound</h1>
          <p>System Audio Level Monitor</p>
          <button id="monitorBtn" class="monitor-btn">Loading...</button>
          <div id="status" class="status"></div>
        </div>
        
        <div class="content">
          <div class="tabs">
            <button class="tab-btn active" data-tab="levels">Levels</button>
            <button class="tab-btn" data-tab="time">Time</button>
          </div>
          
          <div class="view-toggle">
            <button class="view-btn active" data-view="day">Day</button>
            <button class="view-btn" data-view="week">Week</button>
          </div>
          
          <div id="dataContainer" class="data-container">
            <div class="loading">Loading data...</div>
          </div>
        </div>
        
        <div class="footer">
          <p>OSHA-Compliant System Audio Monitoring</p>
          <div class="legend">
            <span class="legend-item"><span class="dot green"></span>Safe</span>
            <span class="legend-item"><span class="dot yellow"></span>Caution</span>
            <span class="legend-item"><span class="dot red"></span>Danger</span>
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners
    setupEventListeners();
    
    // Check monitoring status and update UI
    updateMonitoringStatus();
    
    // Load initial data
    loadData();
  }
}).catch(error => {
  console.error('Failed to load popup:', error);
  document.getElementById('root').innerHTML = '<div>Error loading Safe Sound</div>';
});

function setupEventListeners() {
  // Monitor button
  const monitorBtn = document.getElementById('monitorBtn');
  monitorBtn.addEventListener('click', toggleMonitoring);
  
  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadData();
    });
  });
  
  // View buttons
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadData();
    });
  });
}

function updateMonitoringStatus() {
  const btn = document.getElementById('monitorBtn');
  const status = document.getElementById('status');
  
  // Get current monitoring status from background script
  chrome.runtime.sendMessage({ action: 'getMonitoringStatus' }, (response) => {
    if (response && typeof response.isMonitoring === 'boolean') {
      if (response.isMonitoring) {
        btn.textContent = 'Stop Monitoring';
        btn.classList.add('monitoring');
        status.textContent = '✓ Monitoring system audio output';
        status.className = 'status active';
      } else {
        btn.textContent = 'Start Monitoring';
        btn.classList.remove('monitoring');
        status.textContent = '';
        status.className = 'status';
      }
    } else {
      // Default to stopped state if we can't get status
      btn.textContent = 'Start Monitoring';
      btn.classList.remove('monitoring');
      status.textContent = '';
      status.className = 'status';
    }
  });
}

function toggleMonitoring() {
  const btn = document.getElementById('monitorBtn');
  const status = document.getElementById('status');
  
  if (btn.classList.contains('monitoring')) {
    // Stop monitoring
    chrome.runtime.sendMessage({ action: 'stopMonitoring' }, (response) => {
      if (response && response.success) {
        btn.textContent = 'Start Monitoring';
        btn.classList.remove('monitoring');
        status.textContent = '';
        status.className = 'status';
      }
    });
  } else {
    // Start monitoring
    chrome.runtime.sendMessage({ action: 'startMonitoring' }, (response) => {
      if (response && response.success) {
        btn.textContent = 'Stop Monitoring';
        btn.classList.add('monitoring');
        status.textContent = '✓ Monitoring system audio output';
        status.className = 'status active';
      }
    });
  }
}

function loadData() {
  const container = document.getElementById('dataContainer');
  const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
  const activeView = document.querySelector('.view-btn.active').dataset.view;
  
  container.innerHTML = '<div class="loading">Loading data...</div>';
  
  // Get data from storage
  chrome.storage.local.get(['audioData'], (result) => {
    const data = result.audioData || [];
    displayData(data, activeTab, activeView);
  });
}

function displayData(data, tab, view) {
  const container = document.getElementById('dataContainer');
  
  if (data.length === 0) {
    container.innerHTML = '<div class="no-data">No data available. Start monitoring to see results.</div>';
    return;
  }
  
  // Process data based on tab and view
  let processedData = [];
  if (tab === 'levels') {
    processedData = processLevelsData(data, view);
  } else {
    processedData = processTimeData(data, view);
  }
  
  // Display the data
  container.innerHTML = processedData.map(item => `
    <div class="data-item">
      <span class="label">${item.label}</span>
      <div class="bar-container">
        <div class="bar ${item.color}" style="width: ${item.width}%"></div>
      </div>
      <span class="value ${item.color}">${item.value}</span>
    </div>
  `).join('');
}

function processLevelsData(data, view) {
  // Simple data processing for demo
  return [
    { label: '12AM', value: '45dB', width: 30, color: 'green' },
    { label: '1AM', value: '52dB', width: 45, color: 'green' },
    { label: '2AM', value: '85dB', width: 70, color: 'yellow' },
    { label: '3AM', value: '95dB', width: 85, color: 'red' }
  ];
}

function processTimeData(data, view) {
  // Simple data processing for demo
  return [
    { label: '20-40dB', value: '2.5h', width: 25, color: 'green' },
    { label: '40-60dB', value: '6.2h', width: 60, color: 'green' },
    { label: '60-80dB', value: '1.8h', width: 18, color: 'yellow' },
    { label: '80-90dB', value: '0.8h', width: 8, color: 'yellow' }
  ];
}