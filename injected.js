// This script runs in the page context and can access page functions

// Listen for save and load card requests
window.addEventListener('saveAndLoadCard', function (event) {
  const cardData = event.detail.cardData;

  // Use the site's saveCardCache function
  if (typeof saveCardCache === 'function') {
    try {
      saveCardCache({
        key: 'cardCache',
        data: cardData
      });
      console.log('Card saved using site function');

      // Now load the card
      if (typeof loadCard === 'function') {
        loadCard('cardCache');
        console.log('Card loaded successfully');
      }
    } catch (error) {
      console.error('Error saving/loading card:', error);
    }
  } else {
    console.error('saveCardCache function not found on page');
  }
});

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

// PSD Download functionality
(async function () {
  // Load ag-psd library
  if (typeof window.agPsd === 'undefined') {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/ag-psd@14.3.2/dist/bundle.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    console.log('ag-psd library loaded');
  }

  // Listen for PSD download request
  window.addEventListener('downloadCardAsPSD', async function () {
    const agPsd = window.agPsd;

    // Helper: Convert image/canvas to canvas
    function toCanvas(source, width, height, x = 0, y = 0, zoom = 1, rotate = 0) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (source instanceof HTMLImageElement) {
        ctx.save();
        ctx.translate(x, y);
        if (rotate) {
          ctx.rotate(Math.PI / 180 * rotate);
        }
        ctx.drawImage(source, 0, 0, source.width * zoom, source.height * zoom);
        ctx.restore();
      } else if (source instanceof HTMLCanvasElement) {
        ctx.drawImage(source, 0, 0);
      }

      return canvas;
    }

    // Helper: Render a single frame to canvas
    function renderFrameToCanvas(frame, width, height) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!frame.image) return canvas;

      const bounds = frame.bounds || {};
      const ogBounds = frame.ogBounds || bounds;

      const frameX = Math.round((bounds.x || 0) * width);
      const frameY = Math.round((bounds.y || 0) * height);
      const frameWidth = Math.round((bounds.width || 1) * width);
      const frameHeight = Math.round((bounds.height || 1) * height);

      // Create mask canvas
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');

      // Draw black background
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, width, height);

      // Apply masks
      maskCtx.globalCompositeOperation = 'source-in';
      frame.masks.forEach(mask => {
        if (mask.image) {
          const maskX = (bounds.x || 0) - (ogBounds.x || 0) - ((ogBounds.x || 0) * ((bounds.width || 1) / (ogBounds.width || 1) - 1));
          const maskY = (bounds.y || 0) - (ogBounds.y || 0) - ((ogBounds.y || 0) * ((bounds.height || 1) / (ogBounds.height || 1) - 1));
          const maskScaleX = (bounds.width || 1) / (ogBounds.width || 1);
          const maskScaleY = (bounds.height || 1) / (ogBounds.height || 1);

          maskCtx.drawImage(
            mask.image,
            maskX * width,
            maskY * height,
            maskScaleX * width,
            maskScaleY * height
          );
        }
      });

      // Draw frame image
      maskCtx.drawImage(frame.image, frameX, frameY, frameWidth, frameHeight);

      // Apply color overlay if needed
      if (frame.colorOverlayCheck && frame.colorOverlay) {
        maskCtx.globalCompositeOperation = 'source-in';
        maskCtx.fillStyle = frame.colorOverlay;
        maskCtx.fillRect(0, 0, width, height);
      }

      // Set opacity and blend mode
      ctx.globalAlpha = (frame.opacity || 100) / 100;
      if (frame.opacity === 0) ctx.globalAlpha = 0;
      ctx.globalCompositeOperation = frame.mode || 'source-over';

      // Draw to final canvas
      ctx.drawImage(maskCanvas, 0, 0);

      return canvas;
    }

    // Helper: Render individual text element to canvas
    function renderTextToCanvas(textObject, width, height) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      // Use the existing writeText function
      writeText(textObject, ctx);

      return canvas;
    }

    const width = cardCanvas.width;
    const height = cardCanvas.height;

    // Create PSD document with 1200 DPI resolution
    const psd = {
      width: width,
      height: height,
      channels: 3,
      bitsPerChannel: 8,
      colorMode: 3,
      imageResources: {
        resolutionInfo: {
          horizontalResolution: 1200,
          horizontalResolutionUnit: 'PPI',
          widthUnit: 'Inches',
          verticalResolution: 1200,
          verticalResolutionUnit: 'PPI',
          heightUnit: 'Inches'
        }
      },
      children: []
    };

    // 1. Art layer
    if (art && !art.src.includes('blank.png')) {
      const artCanvas = toCanvas(
        art,
        width,
        height,
        card.artX * width,
        card.artY * height,
        card.artZoom,
        card.artRotate || 0
      );
      psd.children.push({ canvas: artCanvas, name: 'Art' });
    }

    // 2. Frames folder with individual frame layers
    if (card.frames && card.frames.length > 0) {
      const framesGroup = {
        name: 'Frames',
        opened: true,
        children: []
      };

      // Reverse to match draw order (bottom to top)
      const framesToDraw = card.frames.slice().reverse();

      framesToDraw.forEach((frame, index) => {
        const frameCanvas = renderFrameToCanvas(frame, width, height);
        framesGroup.children.push({
          name: frame.name || `Frame ${index + 1}`,
          canvas: frameCanvas,
          opacity: (frame.opacity || 100) / 100
        });
      });

      psd.children.push(framesGroup);
      console.log(`✓ Created Frames folder with ${framesToDraw.length} layers`);
    }

    // 3. Watermark layer
    if (watermarkCanvas && watermarkCanvas.width > 0) {
      const ctx = watermarkCanvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, watermarkCanvas.width, watermarkCanvas.height);
      if (imageData.data.some(v => v !== 0)) {
        psd.children.push({
          canvas: toCanvas(watermarkCanvas, width, height),
          name: 'Watermark'
        });
      }
    }

    // 4. Text folder with individual text elements
    if (card.text && Object.keys(card.text).length > 0) {
      const textGroup = {
        name: 'Text',
        opened: true,
        children: []
      };

      // Render each text element separately
      for (const [key, textObject] of Object.entries(card.text)) {
        if (textObject.text && textObject.text.trim() !== '') {
          const textElementCanvas = renderTextToCanvas(textObject, width, height);
          textGroup.children.push({
            name: textObject.name || key,
            canvas: textElementCanvas
          });
        }
      }

      if (textGroup.children.length > 0) {
        psd.children.push(textGroup);
        console.log(`✓ Created Text folder with ${textGroup.children.length} layers`);
      }
    }

    // 5. Set Symbol layer
    if (setSymbol && !setSymbol.src.includes('blank.png')) {
      const setSymbolCanvas = toCanvas(
        setSymbol,
        width,
        height,
        card.setSymbolX * width,
        card.setSymbolY * height,
        card.setSymbolZoom
      );
      psd.children.push({
        canvas: setSymbolCanvas,
        name: 'Set Symbol'
      });
    }

    // 6. Bottom Info layer (or folder if it has multiple elements)
    if (card.bottomInfo && Object.keys(card.bottomInfo).length > 0) {
      const bottomInfoGroup = {
        name: 'Bottom Info',
        opened: true,
        children: []
      };

      // Render each bottom info element separately
      for (const [key, textObject] of Object.entries(card.bottomInfo)) {
        if (textObject.text && textObject.text.trim() !== '') {
          const bottomInfoCanvas = renderTextToCanvas(textObject, width, height);
          bottomInfoGroup.children.push({
            name: textObject.name || key,
            canvas: bottomInfoCanvas
          });
        }
      }

      if (bottomInfoGroup.children.length > 0) {
        psd.children.push(bottomInfoGroup);
        console.log(`✓ Created Bottom Info folder with ${bottomInfoGroup.children.length} layers`);
      }
    } else if (bottomInfoCanvas && bottomInfoCanvas.width > 0) {
      // Fallback to single layer if bottomInfo structure not available
      psd.children.push({
        canvas: toCanvas(bottomInfoCanvas, width, height),
        name: 'Bottom Info'
      });
    }

    console.log(`Creating PSD with ${psd.children.length} top-level layers...`);

    // Write PSD file
    const buffer = agPsd.writePsdBuffer(psd);

    // Download
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getCardName() + '.psd';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✓ PSD downloaded successfully!');
  });
})();