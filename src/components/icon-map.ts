/**
 * Map semantic icon names to old Transmission Web Control iconfont CSS classes.
 * The iconfont.css file defines .tr-icon-* classes with @font-face glyphs.
 * Using <i className="iconfont tr-icon-xxx" /> gives the authentic industrial look.
 *
 * iconfont glyph reference:
 *   tr-icon-upload       \e72c    tr-icon-start        \e62e
 *   tr-icon-start-all    \e63e    tr-icon-pause        \e62f
 *   tr-icon-pause-all    \e7a9    tr-icon-pause2       \e63a
 *   tr-icon-delete       \e614    tr-icon-rename       \ea44
 *   tr-icon-recheck-torrent \e604 tr-icon-more-peers   \e603
 *   tr-icon-folder-change \e696   tr-icon-speedlimit   \eada
 *   tr-icon-clippy       \e60d    tr-icon-rocket       \e68b
 *   tr-icon-system-config \e625   tr-icon-plugin       \e61e
 *   tr-icon-help         \e605    tr-icon-reload       \e622
 *   tr-icon-search       \e720    tr-icon-home         \e62a
 *   tr-icon-download     \e6c2    tr-icon-actively     \e609
 *   tr-icon-warning      \e680    tr-icon-cuowu1       \e674
 *   tr-icon-wait         \e846    tr-icon-server       \e60c
 *   tr-icon-servers      \e607    tr-icon-server-error \ea05
 *   tr-icon-folder       \e61d    tr-icon-shuju        \e639
 *   tr-icon-queue-move   \ea18    tr-icon-plus         \e600
 *   tr-icon-replace      \e7a4    tr-icon-label        \e706
 *   tr-icon-labels       \e6bc    tr-icon-data-check   \e6d2
 *   tr-icon-cancel-checked \e662  tr-icon-down         \ea45
 *   tr-icon-shang        \e610    tr-icon-file         \e62c
 */
export interface IconDef {
  className: string;
  alt: string;
}

export const ICON_MAP: Record<string, IconDef> = {
  // ── Toolbar buttons ──
  'add-torrent':       { className: 'tr-icon-upload',        alt: 'Add Torrent' },
  'start':             { className: 'tr-icon-start',         alt: 'Start' },
  'start-all':         { className: 'tr-icon-start-all',      alt: 'Start All' },
  'pause':             { className: 'tr-icon-pause',         alt: 'Pause' },
  'pause-all':         { className: 'tr-icon-pause-all',      alt: 'Pause All' },
  'remove':            { className: 'tr-icon-delete',        alt: 'Remove' },
  'rename':            { className: 'tr-icon-rename',        alt: 'Rename' },
  'verify':            { className: 'tr-icon-recheck-torrent', alt: 'Verify' },
  'more-peers':        { className: 'tr-icon-more-peers',    alt: 'More Peers' },
  'change-dir':        { className: 'tr-icon-folder-change', alt: 'Change Directory' },
  'speed-limit':       { className: 'tr-icon-speedlimit',    alt: 'Speed Limit' },
  'copy-path':         { className: 'tr-icon-clippy',        alt: 'Copy Path' },
  'alt-speed-on':      { className: 'tr-icon-woniu',         alt: 'Alt Speed On' },
  'alt-speed-off':     { className: 'tr-icon-rocket',        alt: 'Alt Speed Off' },
  'woniu':             { className: 'tr-icon-woniu',         alt: 'Alt Speed' },
  'settings':          { className: 'tr-icon-system-config', alt: 'Settings' },
  'plugins':           { className: 'tr-icon-plugin',        alt: 'Plugins' },
  'about':             { className: 'tr-icon-help',          alt: 'About' },
  'refresh':           { className: 'tr-icon-reload',        alt: 'Refresh' },
  'mobile':            { className: 'tr-icon-bt',            alt: 'Mobile Version' },
  'transmission':      { className: 'tr-icon-bt',            alt: 'Transmission' },
  'github':            { className: 'tr-icon-github',        alt: 'GitHub' },

  // ── Queue actions ──
  'queue-move':        { className: 'tr-icon-queue-move',    alt: 'Queue' },
  'queue-move-top':    { className: 'tr-icon-top',           alt: 'Move to Top' },
  'queue-move-up':     { className: 'tr-icon-shang',         alt: 'Move Up' },
  'queue-move-down':   { className: 'tr-icon-down',          alt: 'Move Down' },
  'queue-move-bottom': { className: 'tr-icon-bottom',        alt: 'Move to Bottom' },

  // ── General actions ──
  'close':             { className: 'tr-icon-cuowu1',        alt: 'Close' },
  'allow':             { className: 'tr-icon-data-check',    alt: 'Allow' },
  'deny':              { className: 'tr-icon-cancel-checked', alt: 'Deny' },
  'search':            { className: 'tr-icon-search',        alt: 'Search' },
  'reload':            { className: 'tr-icon-reload',        alt: 'Reload' },
  'ok':                { className: 'tr-icon-data-check',    alt: 'OK' },
  'cancel':            { className: 'tr-icon-cancel-checked', alt: 'Cancel' },
  'help':              { className: 'tr-icon-help',          alt: 'Help' },
  'filter':            { className: 'tr-icon-label',         alt: 'Filter' },
  'back':              { className: 'tr-icon-home',          alt: 'Back' },
  'plus':              { className: 'tr-icon-plus',          alt: 'Add' },

  // ── Status indicators ──
  'status-download':   { className: 'tr-icon-download',      alt: 'Download' },
  'status-upload':     { className: 'tr-icon-upload',        alt: 'Upload' },
  'status-warning':    { className: 'tr-icon-warning',       alt: 'Warning' },
  'status-error':      { className: 'tr-icon-cuowu1',        alt: 'Error' },
  'status-paused':     { className: 'tr-icon-pause2',        alt: 'Paused' },
  'status-checking':   { className: 'tr-icon-wait',          alt: 'Checking' },
  'status-seeding':    { className: 'tr-icon-upload',        alt: 'Seeding' },

  // ── Sidebar tree icons ──
  'tree-home':         { className: 'tr-icon-home',          alt: 'All' },
  'tree-download':     { className: 'tr-icon-download',      alt: 'Downloading' },
  'tree-seed':         { className: 'tr-icon-upload',        alt: 'Seeding' },
  'tree-pause':        { className: 'tr-icon-pause2',        alt: 'Paused' },
  'tree-check':        { className: 'tr-icon-wait',          alt: 'Checking' },
  'tree-actively':     { className: 'tr-icon-actively',      alt: 'Active' },
  'tree-error':        { className: 'tr-icon-errors',        alt: 'Error' },
  'tree-errors':       { className: 'tr-icon-errors',        alt: 'Errors' },
  'tree-warning':      { className: 'tr-icon-warning',       alt: 'Warning' },
  'tree-server':       { className: 'tr-icon-server',        alt: 'Server' },
  'tree-servers':      { className: 'tr-icon-servers',       alt: 'Servers' },
  'tree-server-error': { className: 'tr-icon-server-error',  alt: 'Server Error' },
  'tree-chart':        { className: 'tr-icon-shuju',         alt: 'Statistics' },
  'tree-filter':       { className: 'tr-icon-label',         alt: 'Filter' },
  'tree-folder':       { className: 'tr-icon-folder',        alt: 'Folder' },
  'tree-file':         { className: 'tr-icon-file',          alt: 'File' },
  'tree-stat-leaf':    { className: 'tr-icon-empty',         alt: 'Statistic' },

  // ── Tracker actions ──
  'tracker-add':       { className: 'tr-icon-plus',          alt: 'Add Tracker' },
  'tracker-edit':      { className: 'tr-icon-replace',       alt: 'Edit Tracker' },
  'tracker-remove':    { className: 'tr-icon-delete',        alt: 'Remove Tracker' },
  'tracker-replace':   { className: 'tr-icon-replace',       alt: 'Replace Tracker' },

  // ── Priority flags ──
  'flag-low':          { className: 'tr-icon-labels',        alt: 'Low Priority' },
  'flag-normal':       { className: 'tr-icon-labels',        alt: 'Normal Priority' },
  'flag-high':         { className: 'tr-icon-labels',        alt: 'High Priority' },

  // ── Direction arrows ──
  'arrow-down':        { className: 'tr-icon-down',          alt: 'Down' },
  'arrow-up':          { className: 'tr-icon-shang',         alt: 'Up' },
};

export function getIcon(name: string): IconDef | null {
  return ICON_MAP[name] ?? null;
}
