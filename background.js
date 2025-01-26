let shoppingState = {
  isProcessing: false,
  currentItemIndex: 0,
  items: [],
  selectionLogic: 'most-relevant',
  tabId: null
};

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startShopping') {
    startShoppingProcess(message.items, message.selectionLogic, message.tabId);
    sendResponse({ success: true });
  } else if (message.type === 'getStatus') {
    sendResponse({
      isProcessing: shoppingState.isProcessing,
      currentItemIndex: shoppingState.currentItemIndex,
      totalItems: shoppingState.items.length,
      currentItem: shoppingState.items[shoppingState.currentItemIndex]
    });
  }
  return true; // Required for async response
});

async function startShoppingProcess(items, logic, tabId) {
  if (shoppingState.isProcessing) return;
  
  shoppingState = {
    isProcessing: true,
    currentItemIndex: 0,
    items: items,
    selectionLogic: logic,
    tabId: tabId
  };

  // Notify popup of start
  broadcastStatus();

  for (let i = 0; i < items.length; i++) {
    shoppingState.currentItemIndex = i;
    
    // Check if tab still exists
    try {
      await chrome.tabs.get(tabId);
    } catch (e) {
      console.error('Shopping tab was closed');
      resetState();
      return;
    }

    // Execute shopping logic for current item
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        args: [[items[i]], logic], // Wrap single item in array
        func: async (items, logic) => {
          const selectionStrategies = {
            'most-relevant': () => document.querySelector('.add-to-cart'),
          };
          
          for (const item of items) {
            const searchInput = document.querySelector('.search-form input');
            if (!searchInput) throw new Error('Search input not found');
            
            searchInput.value = item;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true
            }));
            
            await new Promise(resolve => {
              const checkForAddButton = setInterval(() => {
                const addToCartButton = selectionStrategies[logic]();
                if (addToCartButton) {
                  clearInterval(checkForAddButton);
                  addToCartButton.click();
                  resolve();
                }
              }, 100);
              
              setTimeout(() => {
                clearInterval(checkForAddButton);
                resolve();
              }, 10000);
            });
            
            await new Promise(resolve => {
              const checkForReplacements = setInterval(() => {
                const replacementsElement = document.querySelector('.vader-replacements');
                if (replacementsElement) {
                  const skipButton = Array.from(replacementsElement.querySelectorAll('button'))
                    .find(button => button.textContent.includes('Salta'));
                  if (skipButton) {
                    skipButton.click();
                    clearInterval(checkForReplacements);
                    resolve();
                  }
                }
              }, 100);
              
              setTimeout(() => {
                clearInterval(checkForReplacements);
                resolve();
              }, 5000);
            });

            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      });
    } catch (error) {
      console.error('Error processing item:', error);
      // Continue with next item
    }

    // Broadcast progress after each item
    broadcastStatus();
  }

  // Shopping complete
  resetState();
  broadcastStatus();
}

function resetState() {
  shoppingState = {
    isProcessing: false,
    currentItemIndex: 0,
    items: [],
    selectionLogic: 'most-relevant',
    tabId: null
  };
}

function broadcastStatus() {
  chrome.runtime.sendMessage({
    type: 'statusUpdate',
    status: {
      isProcessing: shoppingState.isProcessing,
      currentItemIndex: shoppingState.currentItemIndex,
      totalItems: shoppingState.items.length,
      currentItem: shoppingState.items[shoppingState.currentItemIndex]
    }
  });
}
