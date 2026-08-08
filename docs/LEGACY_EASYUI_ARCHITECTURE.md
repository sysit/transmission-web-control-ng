# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A custom WebUI replacement for the Transmission BitTorrent client. This is a **client-side-only web application** — it replaces Transmission's built-in web interface with enhanced PT (Private Tracker) management features including tracker status grouping, batch operations, and data directory auto-matching. The project is **archived and no longer maintained** (as of 2025-06-01).

## Architecture

The application is served directly by Transmission's embedded HTTP server with no build step. It communicates with Transmission exclusively through its [RPC API](https://github.com/transmission/transmission/blob/main/extras/rpc-spec.txt) at the relative path `../rpc`.

### Layer Model

```
index.html / index.mobile.html     ← Entry points (layout, resource loading)
├── system.js / system.mobile.js   ← Application controller (UI init, state, event wiring)
├── transmission.js                ← RPC client (session auth, method dispatch)
│   └── transmission.torrents.js   ← Torrent data model (fetch, cache, categorize)
├── config.js                      ← User-facing defaults (extends system.config)
├── plugin.js                      ← Extension point (system.plugin.exec)
├── public.js                      ← String/Numeric prototype extensions + misc utilities
├── template/                      ← HTML fragments loaded via AJAX for dialogs
├── style/                         ← Custom CSS (base, icons, flags, EasyUI overrides)
├── i18n/                          ← JSON translation files
└── script/easyui/                 ← jQuery EasyUI framework (UI widgets, themes, locales)
```

### Core Objects (Global)

- **`system`** — Top-level application controller. Owns config, UI state, navigation tree, panel management, dialog loading, auto-reload timer, i18n, and context menus. Initialized by `system.init()`.
- **`transmission`** — RPC transport layer. Handles `X-Transmission-Session-Id` retrieval (409 challenge-response), Basic auth, and `torrent-*` method dispatch. The `exec()` method wraps all RPC calls.
- **`transmission.torrents`** — Torrent collection manager. Bridges raw RPC data and UI. Maintains categorized lists (`all`, `actively`, `downloading`, `paused`, `error`, `warning`) and provides `getallids()` for incremental ("recently-active") and full fetches.

### Data Flow

1. `system.init()` → reads localStorage config → calls `transmission.init()`
2. `transmission.init()` → POSTs to `../rpc` → gets 409 + `X-Transmission-Session-Id` → stores session header
3. `system` starts auto-reload timer → calls `transmission.torrents.getallids()` → calls `transmission.exec({method: "torrent-get", ...})`
4. RPC response → `transmission.torrents` categorizes torrents → `system` updates EasyUI datagrid and tree

### Desktop vs Mobile

Two separate implementations with their own `system` object and entry HTML. They share the same `transmission.js`, `transmission.torrents.js`, and `public.js` but have independent `system.js` (desktop, ~4600 lines) and `system.mobile.js` (mobile, jQuery Mobile-based). Desktop uses jQuery EasyUI; mobile uses jQuery Mobile 1.4.5.

### Entry Point Detection

`index.html` checks `$.ua.device.type` (via ua-parser) and redirects mobile devices to `index.mobile.html`. A `?devicetype=computer` query param overrides this.

### i18n System

- `i18n.json` maps language codes to display names
- `i18n/<locale>.json` files contain translation keys
- `system.setlang()` loads the JSON and jQuery EasyUI locale script
- Custom HTML attributes (`system-lang`, `system-tip-lang`) are processed by `system.resetLangText()` to apply translations to DOM elements

### Plugin Extension

`plugin.js` extends `system.plugin` with an `exec(key)` method using a switch-case dispatcher. Plugins registered here appear in the toolbar's "Extensions" dropdown menu.

### Themes

Themes are jQuery EasyUI CSS files under `script/easyui/themes/<name>/easyui.css`. Configurable themes are listed in `config.js` as `system.themes`. The theme switcher changes the `#styleEasyui` link href and optionally swaps the logo image.

## Development Setup

### New UI (React + TypeScript)

The `new-ui/` directory contains the React + TypeScript + Ant Design rewrite. Development workflow:

```sh
cd new-ui

# Install dependencies
npm install

# Dev server
npm run dev

# Type check
npx tsc --noEmit

# Run tests
npx vitest run

# Build for production
npx vite build
```

### Deploy to <transmission-host>

```sh
# Build first, then deploy dist to Transmission web directory
npx vite build && scp -pr new-ui/dist/* root@<transmission-host>:/usr/share/transmission/public_html/.
```

Target: `root@<transmission-host>:/usr/share/transmission/public_html/`
Access: SSH as `root` (no password).

### Old UI (EasyUI, archived)

There is no build step. The `src/` directory contains the working files. Minified versions in `src/tr-web-control/script/min/` are pre-built. A `Gruntfile.js` and `package.json` existed for minification but are gitignored.

To test locally, serve the `src/` directory with a Transmission instance running:

```sh
# Point TRANSMISSION_WEB_HOME to the src/ directory
TRANSMISSION_WEB_HOME=/path/to/src transmission-daemon
```

## Installation (for end users)

The `release/install-tr-control.sh` (or `install-tr-control-cn.sh` for mainland China, `install-tr-control-gitee.sh` for Gitee mirror) shell script:
1. Detects the Transmission web directory
2. Downloads the latest release tarball from GitHub
3. Backs up the original `index.html` as `index.original.html`
4. Extracts `src/` contents into the Transmission web directory
5. Sets file permissions

To revert: run the script and choose option 3, which restores `index.original.html` and removes `tr-web-control/`.

## Key Dependencies (vendored)

- **jQuery 1.12.4** — DOM manipulation, AJAX
- **jQuery EasyUI 1.5.x** — UI widgets (datagrid, tree, dialogs, layout, tabs)
- **jQuery Form Plugin** — AJAX form submission
- **jQuery Mobile 1.4.5** — Mobile UI
- **Base64.js** — Base64 encode for Basic auth
- **json2.js** — JSON polyfill for older browsers
- **ua-parser.js** — Device detection for mobile redirect
- **clipboard.js** — Copy-to-clipboard
- **FileSaver.js** — Client-side file download (export)
