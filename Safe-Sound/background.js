// Background script for Safe Sound extension (Manifest V2)
let audioContext = null;
let analyser = null;
let audioSource = null;
let dataArray = null;
let isMonitoring = false;
let monitoringInterval = null;

// Initialize audio monitoring
async function initializeAudioMonitoring() {
  try {
    // Request system audio capture permission
    const stream = await navigator.mediaDevices.getDisplayMedia({ 
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 44100
      },
      video: false
    });

    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    audioSource = audioContext.createMediaStreamSource(stream);
    
    // Connect audio source to analyser
    audioSource.connect(analyser);
    
    // Configure analyser
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    console.log('System audio monitoring initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize system audio monitoring:', error);
    return false;
  }
}

// Calculate decibel level from system audio data
function calculateDecibelLevel() {
  if (!analyser || !dataArray) return 0;
  
  analyser.getByteFrequencyData(dataArray);
  
  // Calculate RMS (Root Mean Square) of the audio data
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / dataArray.length);
  
  // Convert to decibels for system audio output
  // System audio typically has a different range than microphone input
  // We'll use a more appropriate conversion for output audio levels
  const decibels = 20 * Math.log10(rms / 255) + 60; // Adjusted baseline for system audio
  
  return Math.max(0, Math.min(130, decibels)); // Clamp between 0-130dB
}

// Start monitoring system audio levels
function startMonitoring() {
  if (isMonitoring) return;
  
  if (!audioContext) {
    initializeAudioMonitoring().then(success => {
      if (success) {
        startMonitoring();
      }
    });
    return;
  }
  
  isMonitoring = true;
  monitoringInterval = setInterval(() => {
    const decibelLevel = calculateDecibelLevel();
    const timestamp = new Date().toISOString();
    
    // Store data locally
    storeAudioData(decibelLevel, timestamp);
    
    // Send to backend
    sendToBackend(decibelLevel, timestamp);
  }, 1000); // Sample every second
  
  console.log('System audio monitoring started');
}

// Stop monitoring system audio levels
function stopMonitoring() {
  if (!isMonitoring) return;
  
  isMonitoring = false;
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
  }
  
  console.log('System audio monitoring stopped');
}

// Store audio data locally
function storeAudioData(decibelLevel, timestamp) {
  const data = {
    level: decibelLevel,
    timestamp: timestamp,
    hour: new Date(timestamp).getHours(),
    day: new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short' })
  };
  
  chrome.storage.local.get(['audioData'], (result) => {
    const audioData = result.audioData || [];
    audioData.push(data);
    
    // Keep only last 7 days of data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const filteredData = audioData.filter(item => 
      new Date(item.timestamp) > sevenDaysAgo
    );
    
    chrome.storage.local.set({ audioData: filteredData });
  });
}

// Send data to backend
async function sendToBackend(decibelLevel, timestamp) {
  try {
    const response = await fetch('http://localhost:3000/api/audio-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level: decibelLevel,
        timestamp: timestamp,
        hour: new Date(timestamp).getHours(),
        day: new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short' })
      })
    });
    
    if (!response.ok) {
      console.error('Failed to send data to backend:', response.statusText);
    }
  } catch (error) {
    console.error('Error sending data to backend:', error);
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Safe Sound extension installed');
  // Don't auto-start monitoring - user needs to grant screen capture permission
  console.log('Click the extension icon to start monitoring system audio');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'startMonitoring':
      startMonitoring();
      sendResponse({ success: true });
      break;
      
    case 'stopMonitoring':
      stopMonitoring();
      sendResponse({ success: true });
      break;
      
    case 'getAudioData':
      chrome.storage.local.get(['audioData'], (result) => {
        sendResponse({ data: result.audioData || [] });
      });
      return true; // Keep message channel open for async response
      
    case 'getMonitoringStatus':
      sendResponse({ isMonitoring });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Don't auto-start monitoring - user needs to grant screen capture permission
// Monitoring will start when user clicks the extension icon