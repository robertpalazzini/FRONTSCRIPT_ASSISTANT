## Version

Current version: **2.1**

# FrontScript Assistant

This browser extension enhances the eFront embedded FrontReport coding window by providing tooltips, autocomplete, a searchable reference panel, and snippet insertion for FrontScript keywords, functions, procedures, and macros. Works on any Chrome and Edge browsers.

## Features

### Hover Tooltips
- Hover over any FrontScript keyword inside the embedded FrontReport window (CodeMirror editor) in any eFront environment (self-hosted or Cloud).
- Instantly see a helpful description and example.
- Works with all major FrontScript syntax elements.

### Autocomplete / IntelliSense (New in v2.1)
- As you type in the CodeMirror editor, a dropdown appears with matching FrontScript keywords, procs, functions, and macros.
- Each suggestion shows a color-coded category badge (Keyword, Proc, Function, Macro).
- Navigate with Arrow keys, accept with Tab or Enter, dismiss with Escape.
- Supports `%` prefix for macro suggestions.

### Searchable Side Panel (New in v2.1)
- Open a Chrome side panel from the extension popup with the "Open Reference Panel" button.
- **Reference tab**: Browse all FrontScript keywords, procs, functions, and macros with instant search and category filtering.
- **Snippets tab**: Browse 37 ready-made code templates across 11 categories (DATA Steps, PROC PRINT, PROC MEANS, PROC SORT, PROC FORMAT, PROC GCHART/GPLOT, Macro Statements, and more).
- Expand any entry to see its description, example code, and copy/insert buttons.

### Snippet Insertion (New in v2.1)
- Click "Insert into Editor" from the side panel to insert a code snippet directly into the CodeMirror editor at the cursor position.
- Click "Copy" to copy any snippet or example to your clipboard.

### General
- Lightweight, no data collection, no performance hit.
- Enable/disable tooltips and autocomplete independently from the extension popup.

## Security

- Runs in any **eFront environment** (self-hosted or cloud)
- Activates **only inside `CodeMirror` FrontScript editor**
- Loads static JSON definitions locally
- No tracking, analytics, or network requests
- Open source, auditable, minimal footprint
- No API calls, everything runs locally

## Installation

1. Download the zip file
2. In your browser, click on "Manage Extensions" (or visit `chrome://extensions`)
3. Enable "Developer Mode"
4. Drag the zip file anywhere on the page
5. Restart your browser
6. Relax...

## Usage

1. **Tooltips**: Hover over any keyword in the FrontReport CodeMirror editor to see its description and example.
2. **Autocomplete**: Start typing a keyword and suggestions will appear automatically. Use arrow keys to navigate and Tab/Enter to accept.
3. **Side Panel**: Click the extension icon, then "Open Reference Panel" to browse the full reference and snippet library.
4. **Snippets**: In the side panel, switch to the Snippets tab, expand a category, and click "Insert into Editor" or "Copy".

## Feedback

Have a suggestion or found a bug?
Please [open an issue](https://github.com/robertpalazzini/FRONTSCRIPT_ASSISTANT/issues) or start a discussion!

STILL A WORK IN PROGRESS - Please add comments, issues and I'll try to fix ASAP.

## License

Use freely, but no warranty.

---
Developed by Robert Palazzini

*Made for FrontScript developers working in eFront FrontReport environments.*

This extension is provided "as is" without warranty of any kind. By downloading or using it, you agree that the author is not liable for any direct, indirect, incidental, or consequential damages arising from its use. Use at your own risk.
