// Content script for Safe Sound extension
// This script runs in the context of web pages

console.log('Safe Sound content script loaded');

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  sendResponse({ received: true });
});

// Inject audio monitoring if needed
function injectAudioMonitoring() {
  // This could be used to monitor audio from specific websites
  // For now, we'll rely on the background script for general monitoring
}

// Initialize when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectAudioMonitoring);
} else {
  injectAudioMonitoring();
} 