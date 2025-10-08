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
      <img decoding="async" src="${chrome.runtime.getURL('backup.png')}" title="Download JSON">
    </a>
  `;

  // Create Load JSON button
  const loadDiv = document.createElement('div');
  loadDiv.className = '';
  loadDiv.style.textAlign = 'center';
  loadDiv.innerHTML = `
    <a class="download" id="json-load-btn" style="cursor: pointer;">
      <img decoding="async" src="${chrome.runtime.getURL('restore.png')}" title="Load JSON">
    </a>
  `;

  // Create hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  fileInput.id = 'json-file-input';

  // Append buttons to action div
  actionDiv.appendChild(downloadDiv);
  actionDiv.appendChild(loadDiv);
  document.body.appendChild(fileInput);

  // Add event listeners
  document.getElementById('json-download-btn').addEventListener('click', downloadJSON);
  document.getElementById('json-load-btn').addEventListener('click', () => fileInput.click());
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
  script.onload = function() {
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
  
  reader.onload = function(e) {
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
      console.error('Error loading JSON:', error);
      alert('Error: Invalid JSON file - ' + error.message);
    }
  };
  
  reader.onerror = function() {
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