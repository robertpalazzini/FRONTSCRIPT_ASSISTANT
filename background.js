// Background service worker for FrontScript Tooltip Helper v2.2

// Open side panel when extension icon is clicked (with Alt/Option key)
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_TOOLTIP_ENABLED") {
    chrome.storage.local.get("tooltipEnabled", ({ tooltipEnabled }) => {
      sendResponse({ tooltipEnabled: tooltipEnabled !== false });
    });
    return true;
  }

  if (message.type === "OPEN_SIDE_PANEL") {
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.sidePanel.open({ tabId: tabs[0].id });
        }
      });
    }
    return;
  }

  if (message.type === "INSERT_SNIPPET") {
    // Query all active tabs across all windows, then pick the first real web
    // tab (not an extension/browser internal page). Must exclude both Chrome
    // and Edge URL schemes — Edge uses extension:// and edge:// instead of
    // chrome-extension:// and chrome://.
    chrome.tabs.query({ active: true }, (tabs) => {
      const internalPrefixes = [
        "chrome-extension://", "chrome://",
        "extension://", "edge://"
      ];
      const tab = tabs.find(t =>
        t.url && !internalPrefixes.some(p => t.url.startsWith(p))
      );
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: "DO_INSERT_SNIPPET",
          code: message.code
        }, () => { void chrome.runtime.lastError; });
      }
    });
    return;
  }

  if (message.type === "SEARCH_KEYWORD") {
    // Forward search request to side panel (panel may not be open — ignore errors)
    chrome.runtime.sendMessage({
      type: "HIGHLIGHT_IN_PANEL",
      keyword: message.keyword
    }).catch(() => {});
    return;
  }
});

// Set side panel behavior - open on action click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  .catch(() => {});
