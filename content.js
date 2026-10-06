(async function () {
  "use strict";

  // ── Debug log ─────────────────────────────────────────────────
  // Logs to console and forwards to page-script, which keeps the buffer.
  // Dump from the page console with: copy(window.__fsLog.join("\n"))
  const t0 = performance.now();
  function log(msg, extra) {
    const line = `+${Math.round(performance.now() - t0)}ms [content] ${msg}` +
      (extra !== undefined ? ` ${extra}` : '');
    console.log('[FS-Helper]', line);
    window.postMessage({ source: '__FRONTSCRIPT_EXT', type: 'LOG', line }, '*');
  }
  log('content script start', location.href);
  window.addEventListener('error', (e) => {
    if (e.filename && e.filename.startsWith('chrome-extension://')) {
      log('uncaught error', `${e.message} @ ${e.filename}:${e.lineno}`);
    }
  });
  window.addEventListener('unhandledrejection', (e) => {
    log('unhandled rejection', e.reason && (e.reason.stack || e.reason));
  });

  // ── Wait for eFront CodeMirror editor ─────────────────────────
  // No timeout: eFront can take well over 10s to build the editor, and
  // the editor may also open later via SPA navigation.
  function waitForEfrontApp() {
    return new Promise((resolve) => {
      const sel = '.CodeMirror.cm-s-frontscript';
      if (document.querySelector(sel)) { resolve(true); return; }
      const obs = new MutationObserver(() => {
        if (document.querySelector(sel)) { obs.disconnect(); resolve(true); }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  const found = await waitForEfrontApp();
  log('editor wait result', found);
  if (!found) return;

  // ── Tooltip enabled check ─────────────────────────────────────
  // Edge sometimes doesn't call the sendMessage callback if the background
  // service worker is sleeping, causing the Promise to hang forever.
  // We use a 2s timeout fallback so the script always continues.
  const tooltipEnabled = await new Promise((resolve) => {
    let resolved = false;
    const done = (val) => { if (!resolved) { resolved = true; resolve(val); } };
    const timer = setTimeout(() => done(true), 2000);
    try {
      chrome.runtime.sendMessage({ type: "GET_TOOLTIP_ENABLED" }, (response) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) { done(true); return; }
        done(response?.tooltipEnabled !== false);
      });
    } catch (e) {
      clearTimeout(timer);
      done(true);
    }
  });

  log('tooltipEnabled', tooltipEnabled);
  if (!tooltipEnabled) return;

  // ── Load tooltip definitions ──────────────────────────────────
  let rawData;
  try {
    rawData = await fetch(chrome.runtime.getURL('frontscript-tooltips.json')).then(r => r.json());
  } catch (e) {
    log('FAILED to load tooltip json', e && e.message);
    return;
  }
  log('tooltip json loaded', Object.keys(rawData).length + ' categories');
  const tooltipData = {};
  const allKeywords = []; // sent to page-script for autocomplete

  for (const category in rawData) {
    rawData[category].forEach(entry => {
      const key = entry.name.toUpperCase();
      tooltipData[key] = {
        description: entry.description,
        example: entry.example,
        category: category
      };
      allKeywords.push({
        name: entry.name,
        upperName: key,
        category: category,
        description: entry.description
      });
    });
  }

  allKeywords.sort((a, b) => a.name.localeCompare(b.name));

  // ── Hover Tooltip (works in isolated world via DOM inspection) ─
  const tooltip = document.createElement('div');
  tooltip.className = "frontscript-tooltip";
  document.body.appendChild(tooltip);

  function getWordFromPoint(x, y) {
    const range = document.caretRangeFromPoint ?
      document.caretRangeFromPoint(x, y) :
      (function() {
        const pos = document.caretPositionFromPoint && document.caretPositionFromPoint(x, y);
        if (!pos) return null;
        const r = document.createRange();
        r.setStart(pos.offsetNode, pos.offset);
        r.setEnd(pos.offsetNode, pos.offset);
        return r;
      })();
    if (!range || !range.startContainer) return { word: '', prevChar: '' };
    let node = range.startContainer;
    let offset = range.startOffset;
    if (node.nodeType !== Node.TEXT_NODE && node.childNodes[offset] && node.childNodes[offset].nodeType === Node.TEXT_NODE) {
      node = node.childNodes[offset];
      offset = 0;
    }
    const text = node.textContent || '';

    const charAtPoint = offset < text.length ? text[offset] : '';
    const charBefore = offset > 0 ? text[offset - 1] : '';
    if (!(/[\w%]/.test(charAtPoint))) {
      if (/[\w%]/.test(charBefore)) {
        offset--;
      } else {
        return { word: '', prevChar: '' };
      }
    }

    let start = offset;
    while (start > 0 && /[\w%]/.test(text[start - 1])) start--;
    let end = offset;
    while (end < text.length && /[\w%]/.test(text[end])) end++;

    let word = text.slice(start, end);
    let prevChar = '';

    if (start === 0) {
      let prev = node.previousSibling;
      while (prev && prev.textContent && /[\w%]$/.test(prev.textContent)) {
        const prevText = prev.textContent;
        let i = prevText.length;
        let segment = '';
        while (i > 0 && /[\w%]/.test(prevText[i - 1])) {
          segment = prevText[i - 1] + segment;
          i--;
        }
        word = segment + word;
        if (i > 0) {
          prevChar = prevText[i - 1] || '';
          break;
        }
        prev = prev.previousSibling;
      }
      if (!prevChar) {
        while (prev && (!prev.textContent || prev.textContent.length === 0)) {
          prev = prev.previousSibling;
        }
        if (prev && prev.textContent) {
          prevChar = prev.textContent.slice(-1);
        }
      }
    } else {
      prevChar = text[start - 1];
    }

    if (end === text.length && /[\w%]$/.test(word)) {
      let next = node.nextSibling;
      while (next && next.textContent && /^[\w%]/.test(next.textContent)) {
        const nextText = next.textContent;
        let i = 0;
        let segment = '';
        while (i < nextText.length && /[\w%]/.test(nextText[i])) {
          segment += nextText[i];
          i++;
        }
        word += segment;
        if (i < nextText.length) break;
        next = next.nextSibling;
      }
    }

    return { word, prevChar };
  }

  document.addEventListener('mousemove', event => {
    if (!event.target.closest('.CodeMirror')) {
      tooltip.style.display = 'none';
      return;
    }

    const { word, prevChar } = getWordFromPoint(event.clientX, event.clientY);
    let key = word.toUpperCase();
    if (prevChar === '%' && tooltipData['%' + key]) {
      key = '%' + key;
    }
    if (!key || !tooltipData[key]) {
      tooltip.style.display = 'none';
      return;
    }

    const { description, example } = tooltipData[key];
    tooltip.innerText = `${key}\n\n${description}\n\nExample:\n${example}`;
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
    tooltip.style.display = 'block';
  });

  document.addEventListener('mouseout', () => {
    tooltip.style.display = 'none';
  });

  // ── Page-world script communication ────────────────────────────
  // page-script.js is injected by Chrome into the MAIN world via the
  // manifest "world": "MAIN" declaration. It has CodeMirror API access.
  // We communicate via window.postMessage.

  // Send keyword data to page-script
  function sendKeywordsToPage() {
    log('sending keywords', allKeywords.length);
    window.postMessage({
      source: '__FRONTSCRIPT_EXT',
      type: 'SET_KEYWORDS',
      keywords: allKeywords
    }, '*');
  }

  // Page script signals it's ready
  window.addEventListener('message', (event) => {
    if (event.data?.source === '__FRONTSCRIPT_PAGE' && event.data?.type === 'PAGE_READY') {
      log('PAGE_READY received');
      sendKeywordsToPage();
    }
  });
  // Also send on delays — both scripts load at document_idle but
  // execution order isn't guaranteed
  setTimeout(sendKeywordsToPage, 500);
  setTimeout(sendKeywordsToPage, 1500);
  setTimeout(sendKeywordsToPage, 3000);

  // ── Bridge: Chrome messages → page-world via postMessage ──────
  // The side panel / background sends DO_INSERT_SNIPPET via chrome
  // messaging, which only the content script (isolated world) can
  // receive. We forward it to the page-world script.
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'DO_INSERT_SNIPPET') {
      window.postMessage({
        source: '__FRONTSCRIPT_EXT',
        type: 'INSERT_SNIPPET',
        code: message.code
      }, '*');
    }
  });
})();
