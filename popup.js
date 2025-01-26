const state = {
  isProcessing: false,
  currentItemIndex: 0,
  items: [],
  selectionLogic: 'most-relevant'
};

const elements = {
  groceryList: document.getElementById('grocery-list'),
  selectionLogic: document.getElementById('selection-logic'),
  startButton: document.getElementById('start-shopping'),
  progressContainer: document.getElementById('progress-container'),
  progressFill: document.getElementById('progress-fill'),
  progressText: document.getElementById('progress-text'),
  currentItem: document.getElementById('current-item')
};

// Load saved state
chrome.storage.local.get(['groceryList', 'selectionLogic'], (result) => {
  if (result.groceryList) {
    elements.groceryList.value = result.groceryList;
  }
  if (result.selectionLogic) {
    elements.selectionLogic.value = result.selectionLogic;
  }
});

// Check current status when popup opens
chrome.runtime.sendMessage({ type: 'getStatus' }, (response) => {
  if (response.isProcessing) {
    updateUIForProcessing(response);
  }
});

// Save state when inputs change
elements.groceryList.addEventListener('input', () => {
  chrome.storage.local.set({ groceryList: elements.groceryList.value });
});

elements.selectionLogic.addEventListener('change', () => {
  chrome.storage.local.set({ selectionLogic: elements.selectionLogic.value });
});

function updateProgress(current, total, currentItem) {
  const percentage = (current / total) * 100;
  elements.progressFill.style.width = `${percentage}%`;
  elements.progressText.textContent = `Processing items: ${current}/${total}`;
  elements.currentItem.textContent = `Current item: ${currentItem || 'Complete'}`;
}

function updateUIForProcessing(status) {
  elements.startButton.disabled = true;
  elements.groceryList.disabled = true;
  elements.selectionLogic.disabled = true;
  elements.progressContainer.style.display = 'block';
  
  if (status.totalItems > 0) {
    updateProgress(status.currentItemIndex + 1, status.totalItems, status.currentItem);
  }
}

function resetUI() {
  elements.startButton.disabled = false;
  elements.groceryList.disabled = false;
  elements.selectionLogic.disabled = false;
  
  setTimeout(() => {
    elements.progressContainer.style.display = 'none';
    elements.progressFill.style.width = '0%';
  }, 2000);
}

elements.startButton.addEventListener('click', async () => {
  const items = elements.groceryList.value
    .split('\n')
    .filter(item => item.trim() !== '');
    
  if (items.length === 0) return;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  chrome.runtime.sendMessage({
    type: 'startShopping',
    items: items,
    selectionLogic: elements.selectionLogic.value,
    tabId: tab.id
  });
  
  updateUIForProcessing({
    currentItemIndex: 0,
    totalItems: items.length,
    currentItem: items[0]
  });
});

// Listen for status updates from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'statusUpdate') {
    if (message.status.isProcessing) {
      updateUIForProcessing(message.status);
    } else {
      resetUI();
    }
  }
});
