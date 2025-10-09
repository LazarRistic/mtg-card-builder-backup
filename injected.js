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

// Listen for card name requests
window.addEventListener('getCardNameRequest', function (event) {
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
            preset: response.data[0]['preset']
          }
        }));
      }
    }
  });
});