document.getElementById('start-shopping').addEventListener('click', async () => {
  const groceryList = document.getElementById('grocery-list').value
    .split('\n')
    .filter(item => item.trim() !== '');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [groceryList],
    func: async (items) => {
      for (const item of items) {
        // Find and fill the search input
        const searchInput = document.querySelector('.search-form input');
        searchInput.value = item;
        
        // Trigger input event to ensure any listeners are notified
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Simulate pressing Enter key
        searchInput.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        }));
        
        // Wait for results and add to cart
        await new Promise(resolve => {
          const checkForAddButton = setInterval(() => {
            const addToCartButton = document.querySelector('.add-to-cart');
            if (addToCartButton) {
              clearInterval(checkForAddButton);
              addToCartButton.click();
              resolve();
            }
          }, 100); // Check every 100ms
          
          // Timeout after 10 seconds
          setTimeout(() => {
            clearInterval(checkForAddButton);
            resolve();
          }, 10000);
        });
        
        // Check for replacements popup and click "Salta" if present
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
          }, 100); // Check every 100ms
          
          // Timeout after 5 seconds if no replacements popup appears
          setTimeout(() => {
            clearInterval(checkForReplacements);
            resolve();
          }, 5000);
        });

        // Wait a bit before processing the next item
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  });
});
