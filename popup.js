document.getElementById('start-shopping').addEventListener('click', async () => {
  const groceryList = document.getElementById('grocery-list').value
    .split('\n')
    .filter(item => item.trim() !== '');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const selectionLogic = document.getElementById('selection-logic').value;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    args: [groceryList, selectionLogic],
    func: async (items, logic) => {
      // Product selection strategies
      const selectionStrategies = {
        'most-relevant': () => document.querySelector('.add-to-cart'),
        // Add more strategies here in the future, for example:
        // 'cheapest': () => {
        //   const products = Array.from(document.querySelectorAll('.product'));
        //   return products.sort((a, b) => {
        //     const priceA = parseFloat(a.querySelector('.price').textContent);
        //     const priceB = parseFloat(b.querySelector('.price').textContent);
        //     return priceA - priceB;
        //   })[0].querySelector('.add-to-cart');
        // }
      };
      
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
            const addToCartButton = selectionStrategies[logic]();
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
