# AI Context - MTG Card Builder Backup Extension

This document explains the architecture and implementation details of this Chrome extension for AI coding assistants.

## Purpose

This Chrome extension adds backup/restore functionality to https://mtgcardbuilder.com/creator/ by:
1. Adding three buttons to the existing UI (Download JSON, Load JSON, and Download Presets)
2. Allowing users to export their card designs as JSON files
3. Allowing users to import previously saved JSON files to restore their work
4. Allowing users to browse, download individual presets, or download all presets as a ZIP file

## Architecture Overview

The extension uses a **content script + injected script pattern** to overcome Chrome's Content Security Policy (CSP) restrictions and access the page's JavaScript functions.

### File Structure

```
├── manifest.json          # Extension configuration
├── content.js            # Content script (isolated context)
├── injected.js           # Injected script (page context)
├── download-json.png     # Custom icon for download button
└── load-json.png         # Custom icon for load button
```

## Key Technical Decisions

### 1. Why Two Script Files?

**Problem:** Content scripts run in an isolated context and cannot directly access page JavaScript functions like `loadCard()` and `getCardName()`.

**Solution:** 
- `content.js` - Runs in isolated context, manipulates DOM, handles file operations
- `injected.js` - Injected into page context, can call page functions
- Communication between them via `CustomEvent` dispatched on `window`

### 2. Event-Based Communication

We use custom events to communicate between the two contexts:

**Content Script → Page Context:**
- `getCardDataRequest` - Request card data and name from page
- `loadCardFromJSON` - Tell page to load card from localStorage

**Page Context → Content Script:**
- `cardDataResponse` - Send back the card data and name
- No response needed for loadCard (fire and forget)

### 3. LocalStorage Access

The extension reads/writes directly to the website's `localStorage`:
- Key: `cardCache`
- Value: JSON string containing card data
- No Chrome storage API needed (no permissions required)

## How It Works

### Download Flow

1. User clicks "Download JSON" button
2. `content.js::downloadJSON()` executes
3. Dispatches `getCardDataRequest` event
4. `injected.js` catches event, calls page's `getCardName()` function
5. `injected.js` dispatches `cardNameResponse` with the name
6. `content.js` receives response, sanitizes filename, creates blob
7. Downloads file as `[cardname].json`

### Load Flow

1. User clicks "Load JSON" button
2. Hidden file input opens
3. User selects `.json` file
4. `content.js::loadJSON()` reads file content
5. Validates JSON format with `JSON.parse()`
6. Writes to `localStorage.setItem('cardCache', content)`
7. Dispatches `loadCardFromJSON` event with key name
8. `injected.js` catches event, calls page's `loadCard('cardCache')`
9. Card is immediately restored on page

### Presets Download Flow

1. User clicks "Download Presets" button
2. Modal opens showing loading message
3. `content.js::openPresetsModal()` dispatches `getPresetsListRequest`
4. `injected.js` makes AJAX call to `load_preset` method
5. Returns list of presets (id, name, category) via `presetsListResponse`
6. `content.js::displayPresetsList()` shows all presets in modal
7. **Single preset download:**
   - User clicks "Download" on a preset
   - Dispatches `getPresetDataRequest` with preset ID
   - `injected.js` calls `load_preset_data` with that ID
   - Returns full preset JSON via `presetDataResponse`
   - Downloads as `[preset_name].json`
8. **Download all as ZIP:**
   - User clicks "Download All as ZIP"
   - Fetches all preset data sequentially
   - Creates ZIP file using JSZip library
   - Downloads as `YYYY-MM-DD-all-my-presets-mtgcardbuilder.zip`

## Important Code Patterns

### Injecting the Script

```javascript
function injectPageScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = function() {
    script.remove();
  };
}
```

This injects `injected.js` into the page's context so it can access page functions.

### Custom Event Communication

**Sending from content script:**
```javascript
window.dispatchEvent(new CustomEvent('eventName', { 
  detail: { key: 'value' } 
}));
```

**Receiving in injected script:**
```javascript
window.addEventListener('eventName', function(event) {
  const data = event.detail.key;
  // do something
});
```

### File Download Pattern

```javascript
const blob = new Blob([content], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

### File Upload Pattern

```javascript
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.json';
fileInput.style.display = 'none';
fileInput.addEventListener('change', function(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const content = e.target.result;
    // process content
  };
  reader.readAsText(file);
});
```

## Common Modifications

### To Change Storage Key

Currently uses `cardCache`. To change:
1. Update `localStorage.getItem('cardCache')` in `downloadJSON()`
2. Update `localStorage.setItem('cardCache', content)` in `loadJSON()`
3. Update `loadCard('cardCache')` parameter in `injected.js`

### To Add More Buttons

Follow the same pattern in `content.js::initializeButtons()`:
```javascript
const newDiv = document.createElement('div');
newDiv.className = '';
newDiv.style.textAlign = 'center';
newDiv.innerHTML = `
  <a class="download" id="new-button-id" style="cursor: pointer;">
    <img decoding="async" src="${chrome.runtime.getURL('icon.png')}" title="Tooltip">
  </a>
`;
actionDiv.appendChild(newDiv);
document.getElementById('new-button-id').addEventListener('click', yourFunction);
```

### To Call Other Page Functions

Add to `injected.js`:
```javascript
window.addEventListener('yourCustomEvent', function(event) {
  if (typeof pageFunction === 'function') {
    const result = pageFunction(event.detail.param);
    // Send back result if needed
    window.dispatchEvent(new CustomEvent('yourResponseEvent', {
      detail: { result: result }
    }));
  }
});
```

Then trigger from `content.js`:
```javascript
window.dispatchEvent(new CustomEvent('yourCustomEvent', {
  detail: { param: 'value' }
}));
```

### To Access Page Variables

In `injected.js`, you have full access to page variables:
```javascript
window.addEventListener('getDataRequest', function(event) {
  const pageVar = window.someGlobalVariable;
  window.dispatchEvent(new CustomEvent('dataResponse', {
    detail: { data: pageVar }
  }));
});
```

## Troubleshooting

### "Function not defined" Errors

If you get `ReferenceError: functionName is not defined`:
- The function is being called in `content.js` instead of `injected.js`
- Solution: Move the call to `injected.js` and use events to communicate

### CSP Violations

If you see "Refused to execute inline script":
- You're trying to inject inline JavaScript
- Solution: All injected code must be in separate files (like `injected.js`)
- These files must be listed in `web_accessible_resources` in manifest

### Images Not Loading

If custom button images don't appear:
- Check images are in extension folder
- Check images are listed in `web_accessible_resources` in manifest
- Check using `chrome.runtime.getURL('image.png')` to reference them

### Extension Not Working After Changes

Always remember to:
1. Go to `chrome://extensions/`
2. Click reload button on your extension
3. Refresh the target website

## Manifest Configuration

```json
{
  "manifest_version": 3,
  "content_scripts": [{
    "matches": ["https://mtgcardbuilder.com/creator/*"],
    "js": ["content.js"],
    "run_at": "document_idle"
  }],
  "web_accessible_resources": [{
    "resources": ["injected.js", "download-json.png", "load-json.png"],
    "matches": ["https://mtgcardbuilder.com/*"]
  }]
}
```

Key points:
- `content_scripts.matches` - Only runs on this URL pattern
- `run_at: document_idle` - Waits for DOM to be ready
- `web_accessible_resources` - Files that can be accessed from page context

## Security Considerations

1. **No permissions needed** - Extension doesn't use Chrome APIs that require permissions
2. **No data collection** - All data stays in user's browser
3. **No external requests** - No network calls to external servers
4. **localStorage only** - Uses website's own storage, not Chrome storage

## Testing Checklist

When making changes, test:
- [ ] Download button creates .json file with correct name
- [ ] JSON file contains valid card data
- [ ] Load button opens file picker
- [ ] Loading JSON updates the card immediately
- [ ] Invalid JSON files show error message
- [ ] Buttons appear after page loads
- [ ] Custom icons display correctly
- [ ] No console errors

## Dependencies

**Minimal!** This extension uses:
- Vanilla JavaScript (no frameworks)
- Browser APIs (FileReader, Blob, CustomEvent)
- JSZip 3.10.1 (bundled locally as `jszip.min.js` for creating ZIP files)

## Browser Compatibility

- Chrome/Chromium: ✅ Fully supported
- Edge: ✅ Should work (Chromium-based)
- Firefox: ❌ Would need manifest v2 conversion
- Safari: ❌ Uses different extension format

---

## For AI Assistants

When helping with this extension:
1. Remember the two-context architecture (content script vs page context)
2. Always use events for communication between contexts
3. Page functions can only be called from `injected.js`
4. File operations happen in `content.js`
5. DOM manipulation can happen in either context, but prefer `content.js`
6. Any new resources need to be added to `web_accessible_resources`