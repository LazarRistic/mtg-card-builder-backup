// This script runs in the page context and can access page functions

// Listen for load card data requests
window.addEventListener('loadCardData', function (event) {
  const cardData = event.detail.cardData;

  // Use the site's saveCardCache function
  if (typeof loadCardData === 'function') {
    try {
      loadCardData(cardData);
      console.log('Card data loaded into the page context');
    } catch (error) {
      console.error('Error loading card data:', error);
    }
  } else {
    console.error('loadCardData function not found on page');
  }
});

// Listen for load card requests (kept for backward compatibility)
window.addEventListener('loadCardFromJSON', function (event) {
  if (typeof loadCard === 'function') {
    loadCard(event.detail.key);
    console.log('Card loaded successfully from JSON via custom event');
  } else {
    console.error('loadCard function not found on page');
  }
});

// Listen for card data requests
window.addEventListener('getCardDataRequest', function (event) {
  let cardData = JSON.stringify({});
  let cardName = 'card';

  if (typeof getCardData === 'function') {
    try {
      cardData = getCardData();
      console.log('Card data retrieved:', cardData);

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

    } catch (error) {
      console.error('Error calling getCardData:', error);
    }
  } else {
    console.error('getCardData function not found on page');
  }

  // Send response back
  window.dispatchEvent(new CustomEvent('cardDataResponse', {
    detail: { name: cardName, data: cardData }
  }));
});

// Listen for presets list request
window.addEventListener('getPresetsListRequest', function (event) {
  var formData = new FormData();
  formData.append('action', 'builder_ajax');
  formData.append('method', 'load_preset');

  jQuery.ajax({
    url: the_ajax_script.ajaxurl,
    type: 'POST',
    dataType: 'json',
    processData: false,
    contentType: false,
    data: formData,
    success: function (response) {
      if (response.success == 1) {
        window.dispatchEvent(new CustomEvent('presetsListResponse', {
          detail: { presets: response.data }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('presetsListResponse', {
          detail: { presets: [] }
        }));
      }
    },
    error: function () {
      window.dispatchEvent(new CustomEvent('presetsListResponse', {
        detail: { presets: [] }
      }));
    }
  });
});

// Listen for individual preset data request
window.addEventListener('getPresetDataRequest', function (event) {
  var presetId = event.detail.id;
  var presetCategory = event.detail.category;

  var formData = new FormData();
  formData.append('action', 'builder_ajax');
  formData.append('method', 'load_preset_data');
  formData.append('id', presetId);

  jQuery.ajax({
    url: the_ajax_script.ajaxurl,
    type: 'POST',
    dataType: 'json',
    processData: false,
    contentType: false,
    data: formData,
    success: function (response) {
      if (response.success == 1 && response.data && response.data[0]) {
        window.dispatchEvent(new CustomEvent('presetDataResponse', {
          detail: {
            id: presetId,
            category: presetCategory,
            preset: response.data[0]['preset']
          }
        }));
      }
    }
  });
});