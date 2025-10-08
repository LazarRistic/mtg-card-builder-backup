// This script runs in the page context and can access page functions
window.addEventListener('loadCardFromJSON', function(event) {
  if (typeof loadCard === 'function') {
    loadCard(event.detail.key);
    console.log('Card loaded successfully from JSON via custom event');
  } else {
    console.error('loadCard function not found on page');
  }
});

// Listen for card name requests
window.addEventListener('getCardNameRequest', function(event) {
  let cardName = 'card';
  
  if (typeof getCardName === 'function') {
    try {
      cardName = getCardName();
      console.log('Card name retrieved:', cardName);
    } catch (error) {
      console.error('Error calling getCardName:', error);
    }
  } else {
    console.error('getCardName function not found on page');
  }
  
  // Send response back
  window.dispatchEvent(new CustomEvent('cardNameResponse', {
    detail: { name: cardName }
  }));
});