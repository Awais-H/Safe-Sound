(() => {
  let analyser, dataArray, bufferLength, intervalId;
  const BUCKET_SIZE = 10;
  const MIN_DB = 10;
  const MAX_DB = 120;
  const SAMPLE_RATE_MS = 1000; // sample every second

  function getBucket(db) {
    if (db < MIN_DB) return null;
    const bucket = Math.min(MAX_DB - BUCKET_SIZE, Math.floor(db / BUCKET_SIZE) * BUCKET_SIZE);
    return bucket; // returns lower bound of bucket
  }

  function startTracking() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (videos.length === 0) return;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let sources = videos.map(v => audioCtx.createMediaElementSource(v));
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    sources.forEach(src => src.connect(analyser));
    analyser.connect(audioCtx.destination);

    bufferLength = analyser.frequencyBinCount;
    dataArray = new Float32Array(bufferLength);

    intervalId = setInterval(sampleAudio, SAMPLE_RATE_MS);
  }

  function sampleAudio() {
    analyser.getFloatFrequencyData(dataArray);
    // calculate RMS
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const val = dataArray[i];
      if (val === -Infinity) continue;
      sumSquares += Math.pow(10, val / 10);
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    // approximate decibels relative to full scale (0 dBFS)
    const db = 20 * Math.log10(rms) + 100; // shift into positive range approx
    const bucket = getBucket(db);
    if (bucket !== null) {
      const now = new Date();
      const weekKey = `${now.getUTCFullYear()}W${getWeekNumber(now)}`;
      chrome.storage.sync.get([weekKey], data => {
        const usage = data[weekKey] || {};
        usage[bucket] = (usage[bucket] || 0) + 1; // add 1 second
        chrome.storage.sync.set({ [weekKey]: usage });
      });
    }
  }

  function getWeekNumber(d) {
    // ISO week number
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  function stopTracking() {
    clearInterval(intervalId);
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg === 'START_TRACKING') {
      startTracking();
    } else if (msg === 'STOP_TRACKING') {
      stopTracking();
    }
  });
})();