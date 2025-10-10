// Wait for the page to load
function initializeButtons() {
  const actionDiv = document.getElementById('action-div');

  if (!actionDiv) {
    console.log('action-div not found, retrying...');
    setTimeout(initializeButtons, 500);
    return;
  }

  // Check if buttons already exist
  if (document.getElementById('json-download-btn') || document.getElementById('json-load-btn')) {
    return;
  }

  // Create Download JSON button
  const downloadDiv = document.createElement('div');
  downloadDiv.className = '';
  downloadDiv.style.textAlign = 'center';
  downloadDiv.innerHTML = `
    <a class="download" id="json-download-btn" style="cursor: pointer;">
      <img decoding="async" src="${chrome.runtime.getURL('download-json.png')}" title="Download JSON">
    </a>
  `;

  // Create Load JSON button
  const loadDiv = document.createElement('div');
  loadDiv.className = '';
  loadDiv.style.textAlign = 'center';
  loadDiv.innerHTML = `
    <a class="download" id="json-load-btn" style="cursor: pointer;">
      <img decoding="async" src="${chrome.runtime.getURL('load-json.png')}" title="Load JSON">
    </a>
  `;

  // Create Download Presets button
  const presetsDiv = document.createElement('div');
  presetsDiv.className = '';
  presetsDiv.style.textAlign = 'center';
  presetsDiv.innerHTML = `
    <a class="download" id="presets-download-btn" style="cursor: pointer;">
      <img decoding="async" src="${chrome.runtime.getURL('download-presets.png')}" title="Download Presets">
    </a>
  `;

  // Create hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  fileInput.id = 'json-file-input';

  // Create presets modal
  const presetsModal = createPresetsModal();

  // Append buttons to action div
  actionDiv.appendChild(downloadDiv);
  actionDiv.appendChild(loadDiv);
  actionDiv.appendChild(presetsDiv);
  document.body.appendChild(fileInput);
  document.body.appendChild(presetsModal);

  // Add event listeners
  document.getElementById('json-download-btn').addEventListener('click', downloadJSON);
  document.getElementById('json-load-btn').addEventListener('click', () => fileInput.click());
  document.getElementById('presets-download-btn').addEventListener('click', openPresetsModal);
  fileInput.addEventListener('change', loadJSON);

  console.log('MTG Card Builder JSON Helper: Buttons initialized');

  // Inject event listener into page context
  injectPageScript();
}

// Inject a script into the page context to listen for our custom event
function injectPageScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = function () {
    script.remove();
  };
}

// Download JSON function
function downloadJSON() {
  try {
    // Get cardCache from localStorage
    const cardCache = localStorage.getItem('cardCache');

    if (!cardCache) {
      alert('No card data found in cache!');
      return;
    }

    // Request card name from page context
    window.addEventListener('cardNameResponse', function handler(event) {
      window.removeEventListener('cardNameResponse', handler);

      let filename = event.detail.name || 'card';
      filename = filename.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
      filename += '.json';

      // Create blob and download
      const blob = new Blob([cardCache], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('JSON downloaded:', filename);
    });

    // Dispatch event to request card name
    window.dispatchEvent(new CustomEvent('getCardNameRequest'));

  } catch (error) {
    console.error('Error downloading JSON:', error);
    alert('Error downloading JSON: ' + error.message);
  }
}

// Load JSON function
function loadJSON(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const content = e.target.result;

      // Validate JSON
      JSON.parse(content);

      // Store in localStorage
      localStorage.setItem('cardCache', content);

      console.log('JSON loaded into cardCache');

      // Dispatch a custom event that the page can listen to
      window.dispatchEvent(new CustomEvent('loadCardFromJSON', {
        detail: { key: 'cardCache' }
      }));

      console.log('Custom event dispatched to load card');
    } catch (error) {
      try {
        const content = e.target.result;

        // Send to injected script to use site's saveCardCache function
        window.dispatchEvent(new CustomEvent('loadCardData', {
          detail: {
            cardData: content
          }
        }));

        console.log('Card data sent to be saved and loaded #2');
      } catch (error) {
        console.error('Error loading JSON:', error);
        alert('Error: Invalid JSON file - ' + error.message);
      }
    }
  };

  reader.onerror = function () {
    alert('Error reading file!');
  };

  reader.readAsText(file);

  // Reset file input
  event.target.value = '';
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeButtons);
} else {
  initializeButtons();
}

// Create presets modal
function createPresetsModal() {
  const modal = document.createElement('div');
  modal.id = 'presets-modal';
  modal.style.cssText = `
    display: none;
    position: fixed;
    z-index: 10000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.7);
    overflow: auto;
  `;

  modal.innerHTML = `
    <div style="background-color: #1a1a1a; margin: 5% auto; padding: 20px; border-radius: 10px; width: 80%; max-width: 800px; color: white;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2 style="margin: 0;">My Presets</h2>
        <span id="close-presets-modal" style="font-size: 28px; cursor: pointer;">&times;</span>
      </div>
      <div id="presets-list" style="max-height: 400px; overflow-y: auto; margin-bottom: 20px;">
        <p style="text-align: center;">Loading presets...</p>
      </div>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="download-all-presets-btn" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
          Download All as ZIP
        </button>
      </div>
    </div>
  `;

  // Close modal handlers
  modal.querySelector('#close-presets-modal').addEventListener('click', () => {
    modal.style.display = 'none';
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // Download all button handler
  modal.querySelector('#download-all-presets-btn').addEventListener('click', downloadAllPresets);

  return modal;
}

// Open presets modal
function openPresetsModal() {
  const modal = document.getElementById('presets-modal');
  modal.style.display = 'block';

  // Request presets list
  window.dispatchEvent(new CustomEvent('getPresetsListRequest'));

  // Listen for response
  window.addEventListener('presetsListResponse', function handler(event) {
    window.removeEventListener('presetsListResponse', handler);
    displayPresetsList(event.detail.presets);
  });
}

// Display presets in modal
function displayPresetsList(presets) {
  const container = document.getElementById('presets-list');

  if (!presets || presets.length === 0) {
    container.innerHTML = '<p style="text-align: center;">No presets found.</p>';
    return;
  }

  container.innerHTML = '';

  presets.forEach(preset => {
    const presetDiv = document.createElement('div');
    presetDiv.style.cssText = `
      background-color: #2a2a2a;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    presetDiv.innerHTML = `
      <div>
        <div style="font-weight: bold; font-size: 16px;">${preset.name}</div>
        <div style="color: #888; font-size: 14px;">Category: ${preset.category || 'Uncategorized'}</div>
        <div style="color: #666; font-size: 12px;">ID: ${preset.id}</div>
      </div>
      <button class="download-preset-btn" data-id="${preset.id}" data-name="${preset.name}" data-category="${preset.category}" style="padding: 8px 16px; background-color: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">
        Download
      </button>
    `;

    container.appendChild(presetDiv);
  });

  // Add click handlers to download buttons
  container.querySelectorAll('.download-preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const name = e.target.getAttribute('data-name');
      const category = e.target.getAttribute('data-category');
      downloadSinglePreset(id, name, category, e.target);
    });
  });
}

// Download single preset
function downloadSinglePreset(id, name, category, buttonElement) {
  buttonElement.textContent = 'Loading...';
  buttonElement.disabled = true;

  // Request preset data
  window.dispatchEvent(new CustomEvent('getPresetDataRequest', {
    detail: { id: id }
  }));

  // Listen for response
  window.addEventListener('presetDataResponse', function handler(event) {
    if (event.detail.id === id) {
      window.removeEventListener('presetDataResponse', handler);

      const presetData = event.detail.preset;
      const filename = getFilename(name, category);

      // Create and download file
      const blob = new Blob([presetData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      buttonElement.textContent = 'Downloaded!';
      setTimeout(() => {
        buttonElement.textContent = 'Download';
        buttonElement.disabled = false;
      }, 2000);
    }
  });
}

// Download all presets as ZIP
async function downloadAllPresets() {
  const button = document.getElementById('download-all-presets-btn');
  button.textContent = 'Loading...';
  button.disabled = true;

  try {
    // Check if JSZip is available
    if (typeof JSZip === 'undefined') {
      throw new Error('JSZip library not loaded');
    }

    // Get all preset elements
    const presetButtons = document.querySelectorAll('.download-preset-btn');
    const presetPromises = [];

    for (const btn of presetButtons) {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const category = btn.getAttribute('data-category');

      const promise = new Promise((resolve) => {
        window.dispatchEvent(new CustomEvent('getPresetDataRequest', {
          detail: { id: id, name: name, category: category }
        }));

        const handler = (event) => {
          if (event.detail.id === id) {
            window.removeEventListener('presetDataResponse', handler);
            resolve({
              name: name,
              category: category,
              data: event.detail.preset
            });
          }
        };

        window.addEventListener('presetDataResponse', handler);
      });

      presetPromises.push(promise);
    }

    button.textContent = 'Fetching presets...';
    const presets = await Promise.all(presetPromises);

    button.textContent = 'Creating ZIP...';

    // Create ZIP
    const zip = new JSZip();

    presets.forEach(preset => {
      const filename = getFilename(preset.name, preset.category);
      zip.file(filename, preset.data);
    });

    // Generate and download ZIP
    const content = await zip.generateAsync({ type: 'blob' });

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    const zipFilename = `${today}-all-my-presets-mtgcardbuilder.zip`;

    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    button.textContent = 'Downloaded!';
    setTimeout(() => {
      button.textContent = 'Download All as ZIP';
      button.disabled = false;
    }, 2000);

  } catch (error) {
    console.error('Error downloading all presets:', error);
    button.textContent = 'Error';
    setTimeout(() => {
      button.textContent = 'Download All as ZIP';
      button.disabled = false;
    }, 2000);
  }
}
function getFilename(name, category) {
  return (name + "-" + category).trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.json';
}