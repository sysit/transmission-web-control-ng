# CLAUDE.md

Guidance for Claude Code when working in this repository — the **Transmission Web Control NG** rewrite.

## Project Overview

A modern, client-side-only WebUI for the Transmission BitTorrent client — a React rewrite of the archived
[transmission-web-control](https://github.com/ronggang/transmission-web-control) EasyUI project, aimed at
visually and behaviorally matching the old interface while adding PT (Private Tracker) management features:
tracker status grouping, batch operations, and data-directory auto-matching.

The app is **served directly by Transmission's embedded HTTP server — no server-side build step**. It talks
to Transmission exclusively via the RPC API at the relative path `../rpc`.

> The upstream EasyUI project (archived 2025-06-01) lives in a separate repo (`~/projects/transmission-web-control`).
> Do not modify it. This repo is the actively maintained rewrite.

## Tech Stack

- React 19 + TypeScript + Vite 6 (ESM, `"type": "module"`)
- Ant Design 6 — themed via ConfigProvider to match the old EasyUI look (dense 12px font, muted blue tones)
- TanStack Query — RPC data fetching/caching
- Zustand (persist) — app config, `localStorage` key `tr-web-control-config`
- react-router-dom 7 — `HashRouter` (works from Transmission's web dir)
- react-i18next + i18next — `zh_CN` / `en` locales
- recharts — detail-panel charts; react-resizable — column resizing

## Source Layout

```
src/
├── main.tsx                 # Entry: mounts <App/>
├── app/
│   ├── App.tsx              # Shell: ThemeProvider + QueryClientProvider + HashRouter
│   ├── ThemeContext.tsx     # Theme state, antd ConfigProvider tokens, dark mode via body[data-theme]
│   ├── theme.ts             # antd theme token overrides
│   └── routes.tsx           # RouteObject: `/` → lazy DashboardPage; `*` → Navigate `/`
├── components/              # Reusable UI
│   ├── LegacyIcon.tsx / icon-map.ts   # iconfont glyph wrapper (public/tr-web-control/style/iconfont)
│   ├── BatchOperationBar.tsx          # multi-select batch actions (below toolbar)
│   ├── TorrentContextMenu.tsx         # right-click menu
│   ├── DropZone.tsx                   # drag-drop torrent add
│   └── ResizableTitle.tsx             # resizable table column headers
├── core/
│   ├── config/config-store.ts         # Zustand persisted AppConfig
│   ├── i18n/                          # i18next init + locale JSON (index.ts, locales/{zh_CN,en}.json)
│   └── rpc/                           # Transmission RPC layer
│       ├── transmission-client.ts     # RPC transport (409 session-id handshake, exec, torrent-get)
│       ├── session.ts                 # session-get / session-stats models
│       ├── torrent-model.ts           # TorrentModel, categorizeTorrents() → TorrentCollection
│       ├── rpc-types.ts               # RPC request/response type definitions
│       └── __tests__/                 # vitest unit tests
├── hooks/
│   └── useTorrents.ts        # TanStack Query hooks (torrent list, session stats, mutations)
├── lib/
│   ├── format.ts             # formatSpeed / formatSize / formatPercent / formatETA …
│   └── constants.ts          # shared constants
├── pages/
│   └── dashboard/            # Main page (mirrors old #m_toolbar/#m_left/#m_right/#m_status layout)
│       ├── DashboardPage.tsx        # titlebar + toolbar + body(sidebar|collapse-bar|content) + statusbar
│       ├── SidebarTree.tsx          # left tree (All/Active/Downloading/Paused/Error/Warning + trackers)
│       ├── SidebarSelectedPanel.tsx # multi-select panel pinned at sidebar bottom
│       ├── TorrentTable.tsx         # torrent datagrid (antd Table)
│       ├── TorrentDetailPanel.tsx   # right detail panel (Info/Files/Peers/Trackers/Config tabs)
│       ├── StatusBar.tsx            # bottom status bar
│       ├── SettingsDialog.tsx / UserLabelsTab.tsx
│       ├── dialogs/                 # AddTorrent, AddTracker, ReplaceTracker, Rename, SpeedLimit, …
│       └── tabs/                    # Info/Files/Peers/Trackers/Config + PiecesBar
└── styles/
    └── global.css           # design tokens + EasyUI-faithful component overrides
```

Static assets from the old UI are vendored under `public/tr-web-control/` (logo, country flags, iconfont
glyphs, EasyUI icon PNGs) and keep their original relative paths, so `dist/` can be dropped into
Transmission's web directory unchanged. `vite.config.ts` sets `base: './'`.

## Data Flow

1. `App.tsx` mounts providers; `routes.tsx` lazily loads `DashboardPage`.
2. `useTorrents.ts` queries drive `transmission-client` → POST `../rpc`.
3. `transmission-client` performs the Transmission auth dance: POST → `409` + `X-Transmission-Session-Id`
   header → retry with the header; Basic auth comes from the settings.
4. `torrent-model.ts` maps raw RPC fields (see `TORRENT_FIELDS_*`) into `TorrentModel` and
   `categorizeTorrents()` buckets them (all/actively/downloading/paused/error/warning) for the tree.
5. Row selection (`selectedIds`) drives both `BatchOperationBar` and `SidebarSelectedPanel`; clearing
   selection in either clears the table checkboxes.

## EasyUI-Fidelity Conventions (IMPORTANT)

The interface deliberately reproduces the old EasyUI look. Preserve these when touching UI code:

- **Density**: 12px base font, tight 26×26 toolbar buttons, 4px gaps, `|` dividers between button groups.
- **Toolbar**: `.dashboard-toolbar` in `global.css` — flex, height 28px; hover shows a 1px rounded frame
  (`border:1px solid #ddd; border-radius:5px`) with `color:#00438a`.
- **antd v6 quirks** (why the overrides exist — do not "simplify" them away):
  - `:where(.css-*).ant-btn.ant-btn-icon-only` forces icon-only buttons square with side length equal to
    `--ant-control-height-sm` (ThemeContext sets 18/20). `.dashboard-toolbar .ant-btn { width:auto }` beats
    it by specificity, restoring the old 26px geometry.
  - antd variant hover rules (0,6,0) out-specify plain class overrides — toolbar hover uses `!important`.
- **Theming**: light/dark toggle sets `body[data-theme='dark']`; both global.css and ThemeContext read it.
  Any new palette must keep both themes intentional.

## i18n

- Strings live in `src/core/i18n/locales/{zh_CN,en}.json`, keyed by namespace (`toolbar`, `sidebar`,
  `status`, `dialog.*`, …). Add the key to **both** locales.
- Use `useTranslation()` from react-i18next — no hardcoded UI strings in components.

## Development

```sh
npm install
npm run dev         # vite dev server
npx tsc --noEmit    # type check
npx vitest run      # unit tests (src/**/__tests__)
npm run lint        # oxlint
npx vite build      # production build → dist/
```

Unit tests: vitest + jsdom + @testing-library/react. Add tests for RPC model transforms
(`src/core/rpc/__tests__/`) and formatters (`src/lib/__tests__/`).

## Deploy

```sh
npx vite build
scp -pr dist/* root@<transmission-host>:/usr/share/transmission/public_html/.
```

Transmission serves it at `/transmission/web/` (root `/` 301-redirects there). Verify after deploy:
`curl -s http://<transmission-host>:9091/transmission/web/index.html` (Basic auth is also required; set it under
Settings → RPC). `release/install-new-ui.sh` is an alternative that copies `dist/` into an auto-detected
Transmission web dir and offers a revert option.

> Lab-host credentials (<lab-host> / <transmission-host>) are known to the user — ask rather than invent, and
> never commit them.

## Working Notes

- CLI sessions may start in the parent repo directory — `cd ~/projects/transmission-web-control-ng` first,
  or use absolute paths.
- A GateGuard "Fact-Forcing Gate" hook may block the first Edit/Write per file; when it does, present the
  four facts (Grep callers / affected functions / data structure / verbatim instruction) and retry.
