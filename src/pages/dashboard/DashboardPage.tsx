import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button, Select, Space, Tooltip, Dropdown, Input, Pagination } from 'antd';
import type { MenuProps } from 'antd';
import LegacyIcon from '@/components/LegacyIcon';
import {
  useTorrents, useSessionStats, useSessionConfig, useFreeSpace,
  useRemoveTorrent, useStartTorrent, useStopTorrent,
} from '@/hooks/useTorrents';
import { exec as rpcExec } from '@/core/rpc/transmission-client';
import { TorrentStatus } from '@/core/rpc/rpc-types';
import SidebarTree from './SidebarTree';
import SidebarSelectedPanel from './SidebarSelectedPanel';
import TorrentTable from './TorrentTable';
import StatusBar from './StatusBar';
import TorrentDetailPanel from './TorrentDetailPanel';
import TorrentContextMenu from '@/components/TorrentContextMenu';
import BatchOperationBar from '@/components/BatchOperationBar';
import SettingsDialog from './SettingsDialog';
import { useAppTheme } from '@/app/ThemeContext';
import { useConfigStore } from '@/core/config/config-store';
import type { Torrent } from '@/core/rpc/rpc-types';
import AddTorrentDialog from './dialogs/AddTorrentDialog';
import AboutDialog from './dialogs/AboutDialog';
import RenameDialog from './dialogs/RenameDialog';
import ChangeDownloadDirDialog from './dialogs/ChangeDownloadDirDialog';
import SetLabelsDialog from './dialogs/SetLabelsDialog';
import SpeedLimitDialog from './dialogs/SpeedLimitDialog';
import ReplaceTrackerDialog from './dialogs/ReplaceTrackerDialog';

const REFRESH_OPTIONS = [
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
  { value: 120, label: '120s' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100, 150, 200, 250, 300, 5000];

export default function DashboardPage() {
  const [selectedKey, setSelectedKey] = useState('all');
  const [selectedTrackerId, setSelectedTrackerId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchText, setSearchText] = useState('');
  const [selectedTorrentId, setSelectedTorrentId] = useState(0);
  const [panelExpanded, setPanelExpanded] = useState(false);
  // Initialize from persisted config so saved auto-reload settings are honored.
  const [autoRefresh, setAutoRefresh] = useState(() => useConfigStore.getState().autoReload);
  const [refreshInterval, setRefreshInterval] = useState(() => useConfigStore.getState().autoReloadInterval);
  const { themeName, setThemeName } = useAppTheme();
  const [altSpeedEnabled, setAltSpeedEnabled] = useState(false);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuTorrent, setContextMenuTorrent] = useState<Torrent | null>(null);
  // Sidebar collapse — persisted so it survives reloads (old EasyUI west split:true).
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('tr-sidebar-collapsed') === '1'
  );
  useEffect(() => {
    localStorage.setItem('tr-sidebar-collapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);
  // Selected-status panel collapse — re-expands on any selection change
  // (old showStatus() expands the south region whenever rows are checked).
  const [statusCollapsed, setStatusCollapsed] = useState(false);
  useEffect(() => {
    if (selectedIds.length > 0) setStatusCollapsed(false);
  }, [selectedIds]);
  const [addTorrentOpen, setAddTorrentOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // Target snapshots freeze ids + prefill values while a dialog is open,
  // so changing the table selection mid-edit cannot corrupt the dialog.
  const [renameTarget, setRenameTarget] = useState<{ ids: number[]; name: string } | null>(null);
  const [changeDirTarget, setChangeDirTarget] = useState<{ ids: number[]; dir: string } | null>(null);
  const [speedLimitTarget, setSpeedLimitTarget] = useState<{ ids: number[] } | null>(null);
  const [replaceTrackerTarget, setReplaceTrackerTarget] = useState<{ ids: number[] } | null>(null);
  const [setLabelsTarget, setSetLabelsTarget] = useState<{ ids: number[]; labels: string[] } | null>(null);

  // Pagination state
  const [pageSize, setPageSize] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const prevFilterKey = useRef(selectedKey + (selectedTrackerId ?? ''));

  const { data: torrentData, isLoading, refetch } = useTorrents({
    interval: refreshInterval,
    autoRefresh,
  });
  const { data: sessionStats } = useSessionStats();
  const { data: sessionConfig } = useSessionConfig();
  const removeTorrent = useRemoveTorrent();
  const startTorrentAction = useStartTorrent();
  const stopTorrentAction = useStopTorrent();

  const collection = torrentData?.collection;
  const downloadDir = sessionConfig?.['download-dir'];
  const { data: freeSpace } = useFreeSpace(downloadDir);

  const filteredTorrents = useMemo(() => {
    if (!collection) return [];
    let list: Torrent[];
    switch (selectedKey) {
      case 'downloading':
        list = collection.status[TorrentStatus.DOWNLOAD] ?? []; break;
      case 'sending':
        list = collection.status[TorrentStatus.SEED] ?? []; break;
      case 'paused':
        list = collection.status[TorrentStatus.STOPPED] ?? []; break;
      case 'check':
        list = [...(collection.status[TorrentStatus.CHECK] ?? []),
               ...(collection.status[TorrentStatus.CHECK_WAIT] ?? [])]; break;
      case 'actively': list = collection.actively; break;
      case 'error': list = collection.error; break;
      case 'warning': list = collection.warning; break;
      default:
        if (selectedTrackerId && torrentData?.trackers[selectedTrackerId]) {
          list = torrentData.trackers[selectedTrackerId].torrents;
        } else {
          list = Object.values(collection.all);
        }
    }
    if (searchText) {
      const kw = searchText.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(kw));
    }
    return list;
  }, [collection, selectedKey, selectedTrackerId, searchText, torrentData]);

  // Reset page when filter changes
  useEffect(() => {
    const currentKey = selectedKey + (selectedTrackerId ?? '');
    if (currentKey !== prevFilterKey.current) {
      prevFilterKey.current = currentKey;
      setCurrentPage(1);
    }
  }, [selectedKey, selectedTrackerId]);

  const totalCount = filteredTorrents.length;
  const pagedTorrents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTorrents.slice(start, start + pageSize);
  }, [filteredTorrents, currentPage, pageSize]);

  const selectedTorrent = selectedTorrentId > 0
    ? collection?.all[selectedTorrentId] : undefined;

  const firstSelected = selectedIds.length > 0 && collection
    ? collection.all[selectedIds[0]] : undefined;

  const handleTreeSelect = useCallback((key: string, trackerId?: string) => {
    setSelectedKey(key);
    setSelectedTrackerId(trackerId ?? null);
    setSelectedIds([]);
  }, []);

  const handleRowSelect = useCallback((torrent: Torrent) => {
    setSelectedTorrentId(torrent.id);
    setPanelExpanded(true);
  }, []);

  const handleContextMenu = useCallback((torrent: Torrent, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuTorrent(torrent);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuVisible(false);
  }, []);

  const handleStart = useCallback(() => {
    if (selectedIds.length > 0) startTorrentAction.mutate(selectedIds);
  }, [selectedIds, startTorrentAction]);

  const handlePause = useCallback(() => {
    if (selectedIds.length > 0) stopTorrentAction.mutate(selectedIds);
  }, [selectedIds, stopTorrentAction]);

  const handleDelete = useCallback(() => {
    if (selectedIds.length > 0) {
      if (!confirm(`Delete ${selectedIds.length} torrent(s)?`)) return;
      removeTorrent.mutate({ ids: selectedIds, deleteData: false });
    }
  }, [selectedIds, removeTorrent]);

  const handleStartAll = useCallback(() => {
    const allIds = Object.keys(collection?.all ?? {}).map(Number);
    if (allIds.length > 0) startTorrentAction.mutate(allIds);
  }, [collection, startTorrentAction]);

  const handlePauseAll = useCallback(() => {
    const allIds = Object.keys(collection?.all ?? {}).map(Number);
    if (allIds.length > 0) stopTorrentAction.mutate(allIds);
  }, [collection, stopTorrentAction]);

  const handleRename = useCallback(() => {
    if (!firstSelected) return;
    setRenameTarget({ ids: [firstSelected.id], name: firstSelected.name });
  }, [firstSelected]);

  const handleVerify = useCallback(() => {
    if (selectedIds.length > 0) {
      rpcExec({ method: 'torrent-verify', arguments: { ids: selectedIds } }).catch(() => {});
    }
  }, [selectedIds]);

  const handleMorePeers = useCallback(() => {
    if (selectedIds.length > 0) {
      rpcExec({ method: 'torrent-reannounce', arguments: { ids: selectedIds } }).catch(() => {});
    }
  }, [selectedIds]);

  const handleChangeDir = useCallback(() => {
    if (!firstSelected) return;
    setChangeDirTarget({ ids: [firstSelected.id], dir: firstSelected.downloadDir ?? '' });
  }, [firstSelected]);

  const handleSpeedLimit = useCallback(() => {
    if (selectedIds.length === 0) return;
    setSpeedLimitTarget({ ids: selectedIds });
  }, [selectedIds]);

  const handleCopyPath = useCallback(async () => {
    if (!firstSelected) return;
    try {
      await navigator.clipboard.writeText(firstSelected.downloadDir ?? '');
    } catch { /* clipboard denied */ }
  }, [firstSelected]);

  const handleQueueMove = useCallback((direction: 'top' | 'up' | 'down' | 'bottom') => {
    if (selectedIds.length === 0) return;
    const method = `queue-move-${direction}`;
    rpcExec({ method, arguments: { ids: selectedIds } }).catch(() => {});
  }, [selectedIds]);

  const handleAltSpeedToggle = useCallback(() => {
    const newVal = !altSpeedEnabled;
    setAltSpeedEnabled(newVal);
    rpcExec({ method: 'session-set', arguments: { 'alt-speed-enabled': newVal } }).catch(() => {});
  }, [altSpeedEnabled]);

  const queueItems: MenuProps['items'] = [
    { key: 'top', label: 'Move to Top', onClick: () => handleQueueMove('top') },
    { key: 'up', label: 'Move Up', onClick: () => handleQueueMove('up') },
    { key: 'down', label: 'Move Down', onClick: () => handleQueueMove('down') },
    { key: 'bottom', label: 'Move to Bottom', onClick: () => handleQueueMove('bottom') },
  ];

  const pluginItems: MenuProps['items'] = [
    {
      key: 'replaceTracker', label: 'Replace Tracker',
      onClick: () => {
        if (selectedIds.length === 0) return;
        setReplaceTrackerTarget({ ids: selectedIds });
      },
    },
    {
      key: 'autoMatchDir', label: 'Auto Match Directory',
      onClick: () => {
        if (selectedIds.length === 0) {
          const allIds = Object.keys(collection?.all ?? {}).map(Number);
          if (allIds.length === 0) return;
          const pattern = prompt('Match pattern (e.g. "Movie" or regex):');
          if (!pattern) return;
          const targetDir = prompt('Target download directory:');
          if (!targetDir) return;
          try {
            const regex = new RegExp(pattern, 'i');
            const matched = allIds.filter((id) => {
              const t = collection?.all[id];
              return t && regex.test(t.name);
            });
            if (matched.length === 0) { alert('No torrents matched the pattern.'); return; }
            if (!confirm(`Move ${matched.length} torrent(s) to:\n${targetDir}?`)) return;
            matched.forEach((id) => {
              rpcExec({ method: 'torrent-set-location', arguments: { ids: [id], location: targetDir, move: true } }).catch(() => {});
            });
          } catch { alert('Invalid regex pattern'); }
        } else {
          const pattern = prompt('Match pattern for selected torrents (regex):');
          if (!pattern) return;
          const targetDir = prompt('Target download directory:');
          if (!targetDir) return;
          try {
            const regex = new RegExp(pattern, 'i');
            const matched = selectedIds.filter((id) => {
              const t = collection?.all[id];
              return t && regex.test(t.name);
            });
            if (matched.length === 0) { alert('No selected torrents matched the pattern.'); return; }
            if (!confirm(`Move ${matched.length} torrent(s) to:\n${targetDir}?`)) return;
            matched.forEach((id) => {
              rpcExec({ method: 'torrent-set-location', arguments: { ids: [id], location: targetDir, move: true } }).catch(() => {});
            });
          } catch { alert('Invalid regex pattern'); }
        }
      },
    },
  ];

  const handleClosePanel = useCallback(() => {
    setPanelExpanded(false);
  }, []);

  const handleTogglePanel = useCallback(() => {
    if (selectedTorrentId > 0) {
      setPanelExpanded((prev) => !prev);
    }
  }, [selectedTorrentId]);

  return (
    <div className="dashboard-layout">
      {/* ════ Top Section ════ */}
      <div className="dashboard-top">
        {/* Title bar */}
        <div className="dashboard-titlebar">
          <img
            src="tr-web-control/logo.png" alt="Transmission"
            style={{ height: 36, verticalAlign: 'middle' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <Space size="small">
            <span style={{ fontSize: 11, color: '#999' }}>Theme:</span>
            <Select size="small" value={themeName} style={{ width: 90 }}
              onChange={setThemeName}
              options={[
                { value: 'default', label: 'Default' },
                { value: 'gray', label: 'Gray' },
                { value: 'metro', label: 'Metro' },
                { value: 'bootstrap', label: 'Bootstrap' },
                { value: 'black', label: 'Black' },
              ]}
            />
            <Tooltip title="About">
              <Button size="small" type="text" style={{ fontSize: 12 }}
                onClick={() => setAboutOpen(true)}>
                <LegacyIcon name="about" size={16} />
              </Button>
            </Tooltip>
          </Space>
        </div>

        {/* Toolbar — 28px compact */}
        <div className="dashboard-toolbar">
          <Tooltip title="Add Torrent">
            <Button size="small" icon={<LegacyIcon name="add-torrent" size={16} />} type="text"
              onClick={() => setAddTorrentOpen(true)} />
          </Tooltip>
          <div className="toolbar-divider" />
          <Tooltip title={altSpeedEnabled ? 'Disable Alt Speed' : 'Enable Alt Speed'}>
            <Button size="small"
              icon={<LegacyIcon name={altSpeedEnabled ? 'alt-speed-on' : 'alt-speed-off'} size={16} />}
              type="text"
              style={{ color: altSpeedEnabled ? '#0E2D5F' : undefined }}
              onClick={handleAltSpeedToggle} />
          </Tooltip>
          <div className="toolbar-divider" />
          <Tooltip title="Refresh">
            <Button size="small" icon={<LegacyIcon name="refresh" size={16} />} type="text"
              onClick={() => refetch()} />
          </Tooltip>
          <Tooltip title="Settings">
            <Button size="small" icon={<LegacyIcon name="settings" size={16} />} type="text"
              onClick={() => setSettingsOpen(true)} />
          </Tooltip>
          <Dropdown menu={{ items: pluginItems }}>
            <Tooltip title="Plugins">
              <Button size="small" icon={<LegacyIcon name="plugins" size={16} />} type="text">Plugins</Button>
            </Tooltip>
          </Dropdown>
          <div className="toolbar-divider" />

          <Tooltip title="Start">
            <Button size="small" icon={<LegacyIcon name="start" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handleStart} />
          </Tooltip>
          <Tooltip title="Pause">
            <Button size="small" icon={<LegacyIcon name="pause" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handlePause} />
          </Tooltip>
          <Tooltip title="Rename">
            <Button size="small" icon={<LegacyIcon name="rename" size={16} />} type="text"
              disabled={selectedIds.length !== 1} onClick={handleRename} />
          </Tooltip>
          <Tooltip title="Remove">
            <Button size="small" icon={<LegacyIcon name="remove" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handleDelete} />
          </Tooltip>
          <Tooltip title="Verify">
            <Button size="small" icon={<LegacyIcon name="verify" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handleVerify} />
          </Tooltip>
          <Tooltip title="More Peers">
            <Button size="small" icon={<LegacyIcon name="more-peers" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handleMorePeers} />
          </Tooltip>
          <Tooltip title="Change Directory">
            <Button size="small" icon={<LegacyIcon name="change-dir" size={16} />} type="text"
              disabled={selectedIds.length !== 1} onClick={handleChangeDir} />
          </Tooltip>
          <Tooltip title="Speed Limit">
            <Button size="small" icon={<LegacyIcon name="speed-limit" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handleSpeedLimit} />
          </Tooltip>
          <Tooltip title="Copy Path">
            <Button size="small" icon={<LegacyIcon name="copy-path" size={16} />} type="text"
              disabled={selectedIds.length !== 1} onClick={handleCopyPath} />
          </Tooltip>
          <Dropdown menu={{ items: queueItems }}>
            <Tooltip title="Queue">
              <Button size="small" icon={<LegacyIcon name="queue-move" size={16} />} type="text">Queue</Button>
            </Tooltip>
          </Dropdown>
          <div className="toolbar-divider" />

          <Tooltip title="Start All">
            <Button size="small" icon={<LegacyIcon name="start-all" size={16} />} type="text"
              onClick={handleStartAll}>All</Button>
          </Tooltip>
          <Tooltip title="Pause All">
            <Button size="small" icon={<LegacyIcon name="pause-all" size={16} />} type="text"
              onClick={handlePauseAll}>All</Button>
          </Tooltip>

          <div style={{ flex: 1 }} />

          <Select size="small" value={refreshInterval} style={{ width: 65 }}
            onChange={(v) => {
              setRefreshInterval(v);
              useConfigStore.setState({ autoReloadInterval: v });
            }}
            options={REFRESH_OPTIONS}
          />
          <Tooltip title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}>
            <Button size="small" type="text"
              icon={<LegacyIcon name="refresh" size={16} />}
              style={{ color: autoRefresh ? '#0E2D5F' : '#999' }}
              onClick={() => {
                const next = !autoRefresh;
                setAutoRefresh(next);
                useConfigStore.setState({ autoReload: next });
              }}
            />
          </Tooltip>
          <div className="toolbar-divider" />

          <Input size="small" placeholder="Search…" prefix={<LegacyIcon name="search" size={14} />}
            style={{ width: 180 }} value={searchText}
            onChange={(e) => setSearchText(e.target.value)} allowClear
          />
        </div>
      </div>

      {/* ════ Batch Operation Bar ════ */}
      <BatchOperationBar
        selectedIds={selectedIds}
        onReplaceTracker={() => { if (selectedIds.length > 0) setReplaceTrackerTarget({ ids: selectedIds }); }}
        onChangeDir={() => { if (selectedIds.length > 0 && firstSelected) setChangeDirTarget({ ids: selectedIds, dir: firstSelected.downloadDir ?? '' }); }}
        onSpeedLimit={() => { if (selectedIds.length > 0) setSpeedLimitTarget({ ids: selectedIds }); }}
      />

      {/* ════ Body: Sidebar + Content ════ */}
      <div className="dashboard-body">
        <div className={`dashboard-sidebar${sidebarCollapsed ? ' dashboard-sidebar--collapsed' : ''}`}>
          <div className="sidebar-tree-wrap">
            <SidebarTree
              collection={collection ?? null}
              trackers={torrentData?.trackers ?? {}}
              sessionStats={sessionStats ?? null}
              selectedKey={selectedKey}
              onSelect={handleTreeSelect}
            />
          </div>
          {selectedIds.length > 0 && !statusCollapsed && (
            <SidebarSelectedPanel
              selectedIds={selectedIds}
              collection={collection ?? null}
              onClear={() => setSelectedIds([])}
              onCollapse={() => setStatusCollapsed(true)}
            />
          )}
        </div>
        <div
          className="sidebar-collapse-bar"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setSidebarCollapsed((prev) => !prev)}
        >
          <span className="sidebar-collapse-glyph">{sidebarCollapsed ? '›' : '‹'}</span>
        </div>
        <div className="dashboard-content">
          {/* Torrent table + pagination area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div className="torrent-table-wrapper" style={{ flex: 1, overflow: 'hidden' }}>
              <TorrentTable
                torrents={pagedTorrents}
                loading={isLoading}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onContextMenu={handleContextMenu}
                onRowSelect={handleRowSelect}
                selectedTorrentId={selectedTorrentId}
              />
            </div>
            {/* Pagination bar */}
            <div className="dashboard-pagination">
              <Pagination
                size="small"
                current={currentPage}
                pageSize={pageSize}
                total={totalCount}
                showSizeChanger
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                }}
                showTotal={(total, range) => `${range[0]}-${range[1]} / ${total}`}
              />
            </div>
          </div>

          {/* ════ Detail panel toggle bar (always visible, floating style) ════ */}
          {selectedTorrentId > 0 ? (
            <>
              <div className="detail-toggle-bar" onClick={handleTogglePanel}>
                <span className="detail-toggle-text">
                  Torrent #{selectedTorrentId}
                  {selectedTorrent && <span> — {selectedTorrent.name}</span>}
                </span>
                <span className="detail-toggle-icon">
                  {panelExpanded ? <LegacyIcon name="arrow-down" size={10} /> : <LegacyIcon name="arrow-up" size={10} />}
                </span>
              </div>
              {panelExpanded && (
                <TorrentDetailPanel
                  torrentId={selectedTorrentId}
                  torrent={selectedTorrent}
                  open={panelExpanded}
                  onClose={handleClosePanel}
                />
              )}
            </>
          ) : (
            <div className="detail-toggle-bar detail-toggle-bar--empty">
              <span className="detail-toggle-text" style={{ color: '#999' }}>
                Select a torrent to view details
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ════ Status Bar ════ */}
      <StatusBar
        stats={sessionStats ?? null}
        sessionConfig={sessionConfig ?? null}
        freeSpaceBytes={freeSpace?.['size-bytes'] ?? null}
        collection={collection}
      />

      {/* ════ Context Menu ════ */}
      {contextMenuTorrent && (
        <TorrentContextMenu
          torrent={contextMenuTorrent}
          selectedIds={selectedIds}
          visible={contextMenuVisible}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          onClose={handleCloseContextMenu}
          onRename={(ids, name) => setRenameTarget({ ids, name })}
          onChangeDir={(ids, dir) => setChangeDirTarget({ ids, dir })}
          onSetLabels={(ids, labels) => setSetLabelsTarget({ ids, labels })}
          onSpeedLimit={(ids) => setSpeedLimitTarget({ ids })}
        />
      )}

      {/* ════ Add Torrent Dialog ════ */}
      <AddTorrentDialog
        open={addTorrentOpen}
        onClose={() => setAddTorrentOpen(false)}
        downloadDirs={torrentData?.downloadDirs ?? []}
        defaultDownloadDir={downloadDir ?? ''}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <RenameDialog open={!!renameTarget} ids={renameTarget?.ids ?? []}
        currentName={renameTarget?.name ?? ''} onClose={() => setRenameTarget(null)} />
      <ChangeDownloadDirDialog open={!!changeDirTarget} torrentIds={changeDirTarget?.ids ?? []}
        currentDir={changeDirTarget?.dir ?? ''} onClose={() => setChangeDirTarget(null)} />
      <SpeedLimitDialog open={!!speedLimitTarget} ids={speedLimitTarget?.ids ?? []}
        torrent={firstSelected} onClose={() => setSpeedLimitTarget(null)} />
      <ReplaceTrackerDialog open={!!replaceTrackerTarget} ids={replaceTrackerTarget?.ids ?? []}
        onClose={() => setReplaceTrackerTarget(null)} />
      <SetLabelsDialog open={!!setLabelsTarget} ids={setLabelsTarget?.ids ?? []}
        currentLabels={setLabelsTarget?.labels ?? []} onClose={() => setSetLabelsTarget(null)} />
    </div>
  );
}
