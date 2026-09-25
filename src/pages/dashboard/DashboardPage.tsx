import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button, Select, Space, Tooltip, Dropdown, Input, Pagination, App } from 'antd';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import LegacyIcon from '@/components/LegacyIcon';
import {
  useTorrents, useSessionStats, useSessionConfig, useFreeSpace,
  useStartTorrent, useStopTorrent,
} from '@/hooks/useTorrents';
import { exec as rpcExec } from '@/core/rpc/transmission-client';
import { TorrentStatus } from '@/core/rpc/rpc-types';
import SidebarTree from './SidebarTree';
import SidebarSelectedPanel from './SidebarSelectedPanel';
import TorrentTable from './TorrentTable';
import type { SortState } from './TorrentTable';
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
import type { SpeedLimitInitial } from './dialogs/SpeedLimitDialog';
import RemoveTorrentDialog from './dialogs/RemoveTorrentDialog';
import ReplaceTrackerDialog from './dialogs/ReplaceTrackerDialog';
import AutoMatchDialog from './dialogs/AutoMatchDialog';

const REFRESH_OPTIONS = [
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 30, label: '30s' },
  { value: 60, label: '60s' },
  { value: 120, label: '120s' },
];

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50, 100, 150, 200, 250, 300, 5000];

// Column key → torrent field for global sorting (column keys that differ
// from the underlying data field)
const SORT_FIELD_ALIAS: Record<string, string> = {
  eta: 'remainingTime', statusCol: 'status', idCol: 'id',
};

export default function DashboardPage() {
  const { t } = useTranslation();
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
  // Alt-speed state syncs from the session poll (old UI read it on load too);
  // null until the first session-get resolves.
  const [altSpeedEnabled, setAltSpeedEnabled] = useState<boolean | null>(null);
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
  // Snapshot prefills at open time — the torrent object identity churns every
  // 5s poll, so dialogs must never seed themselves from live props.
  const [speedLimitTarget, setSpeedLimitTarget] = useState<{
    ids: number[];
    initial: SpeedLimitInitial;
  } | null>(null);
  const [replaceTrackerTarget, setReplaceTrackerTarget] = useState<{ ids: number[] } | null>(null);
  const [autoMatchTarget, setAutoMatchTarget] = useState<{ ids: number[] } | null>(null);
  const [setLabelsTarget, setSetLabelsTarget] = useState<{ ids: number[]; labels: string[] } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ ids: number[]; deleteData: boolean } | null>(null);

  // Pagination state
  const [pageSize, setPageSize] = useState(30);
  const [currentPage, setCurrentPage] = useState(1);
  const prevFilterKey = useRef(selectedKey + (selectedTrackerId ?? ''));

  const { data: torrentData, isLoading, refetch } = useTorrents({
    interval: refreshInterval,
    autoRefresh,
  });
  const { data: sessionStats } = useSessionStats({ interval: refreshInterval, autoRefresh });
  const { data: sessionConfig } = useSessionConfig();
  const startTorrentAction = useStartTorrent();
  const stopTorrentAction = useStopTorrent();

  // Keep the toolbar alt-speed button in sync with the real session state
  const rpcAltSpeed = sessionConfig?.['alt-speed-enabled'];
  useEffect(() => {
    if (typeof rpcAltSpeed === 'boolean') setAltSpeedEnabled(rpcAltSpeed);
  }, [rpcAltSpeed]);

  const collection = torrentData?.collection;
  const downloadDir = sessionConfig?.['download-dir'];
  const { data: freeSpace } = useFreeSpace(downloadDir);

  const filteredTorrents = useMemo(() => {
    if (!collection) return [];
    let list: Torrent[];
    if (selectedKey.startsWith('folders-')) {
      // Sidebar folder node — model precomputes the torrent list per dirPath
      const folder = collection.folders[selectedKey];
      list = folder ? folder.torrents : [];
    } else if (selectedKey.startsWith('label-')) {
      // Sidebar user-label node — RPC `labels` field holds label names
      const labelName = selectedKey.slice('label-'.length);
      list = Object.values(collection.all).filter((tor) => tor.labels?.includes(labelName));
    } else {
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

  // Global sort — applied to the FULL filtered list before pagination
  // (sorting only the visible page made the sort look broken past page 1).
  const [sortState, setSortState] = useState<SortState | null>(null);
  const sortedTorrents = useMemo(() => {
    if (!sortState) return filteredTorrents;
    const field = SORT_FIELD_ALIAS[sortState.key] ?? sortState.key;
    const dir = sortState.order === 'ascend' ? 1 : -1;
    return [...filteredTorrents].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[field];
      const bv = (b as unknown as Record<string, unknown>)[field];
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
    });
  }, [filteredTorrents, sortState]);

  const totalCount = filteredTorrents.length;
  // Clamp to the last valid page — filtering (search) or external removals
  // can shrink the list below the current page, which would show an empty table.
  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, maxPage);
  const pagedTorrents = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedTorrents.slice(start, start + pageSize);
  }, [sortedTorrents, safePage, pageSize]);

  const selectedTorrent = selectedTorrentId > 0
    ? collection?.all[selectedTorrentId] : undefined;

  const firstSelected = selectedIds.length > 0 && collection
    ? collection.all[selectedIds[0]] : undefined;

  const { message } = App.useApp();

  // Drop selected ids that no longer exist (removed here or from another client)
  useEffect(() => {
    if (!collection) return;
    setSelectedIds((prev) => {
      const next = prev.filter((id) => collection.all[id]);
      return next.length === prev.length ? prev : next;
    });
  }, [collection]);

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
    if (selectedIds.length > 0) {
      startTorrentAction.mutate(selectedIds, {
        onError: (e) => message.error(e instanceof Error ? e.message : String(e)),
      });
    }
  }, [selectedIds, startTorrentAction, message]);

  const handlePause = useCallback(() => {
    if (selectedIds.length > 0) {
      stopTorrentAction.mutate(selectedIds, {
        onError: (e) => message.error(e instanceof Error ? e.message : String(e)),
      });
    }
  }, [selectedIds, stopTorrentAction, message]);

  const handleDelete = useCallback(() => {
    if (selectedIds.length > 0) {
      setRemoveTarget({ ids: selectedIds, deleteData: useConfigStore.getState().deleteLocalDataByDefault });
    }
  }, [selectedIds]);

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
      rpcExec({ method: 'torrent-verify', arguments: { ids: selectedIds } })
        .catch((e) => message.error(e instanceof Error ? e.message : String(e)));
    }
  }, [selectedIds, message]);

  const handleMorePeers = useCallback(() => {
    if (selectedIds.length > 0) {
      rpcExec({ method: 'torrent-reannounce', arguments: { ids: selectedIds } })
        .catch((e) => message.error(e instanceof Error ? e.message : String(e)));
    }
  }, [selectedIds, message]);

  const handleChangeDir = useCallback(() => {
    if (!firstSelected) return;
    setChangeDirTarget({ ids: [firstSelected.id], dir: firstSelected.downloadDir ?? '' });
  }, [firstSelected]);

  // Snapshot prefills at open time — the torrent object identity churns every
  // 5s poll, so dialogs must never seed themselves from live props.
  const openSpeedLimit = useCallback((ids: number[]) => {
    const src = collection?.all[ids[0]];
    setSpeedLimitTarget({
      ids,
      initial: {
        downloadLimited: !!src?.downloadLimited,
        downloadLimit: src?.downloadLimit ?? null,
        uploadLimited: !!src?.uploadLimited,
        uploadLimit: src?.uploadLimit ?? null,
        peerLimit: src?.['peer-limit'] ?? null,
      },
    });
  }, [collection]);

  const handleSpeedLimit = useCallback(() => {
    if (selectedIds.length === 0 || !firstSelected) return;
    openSpeedLimit(selectedIds);
  }, [selectedIds, firstSelected, openSpeedLimit]);

  const handleCopyPath = useCallback(async () => {
    if (!firstSelected) return;
    try {
      await navigator.clipboard.writeText(firstSelected.downloadDir ?? '');
    } catch { /* clipboard denied */ }
  }, [firstSelected]);

  const handleQueueMove = useCallback((direction: 'top' | 'up' | 'down' | 'bottom') => {
    if (selectedIds.length === 0) return;
    const method = `queue-move-${direction}`;
    rpcExec({ method, arguments: { ids: selectedIds } })
      .catch((e) => message.error(e instanceof Error ? e.message : String(e)));
  }, [selectedIds, message]);

  const handleAltSpeedToggle = useCallback(() => {
    const newVal = !(altSpeedEnabled ?? false);
    setAltSpeedEnabled(newVal);
    rpcExec({ method: 'session-set', arguments: { 'alt-speed-enabled': newVal } })
      .catch((e) => {
        setAltSpeedEnabled(!newVal); // revert on failure
        message.error(e instanceof Error ? e.message : String(e));
      });
  }, [altSpeedEnabled, message]);

  const queueItems: MenuProps['items'] = [
    { key: 'top', label: t('toolbar.moveToTop'), onClick: () => handleQueueMove('top') },
    { key: 'up', label: t('toolbar.moveUp'), onClick: () => handleQueueMove('up') },
    { key: 'down', label: t('toolbar.moveDown'), onClick: () => handleQueueMove('down') },
    { key: 'bottom', label: t('toolbar.moveToBottom'), onClick: () => handleQueueMove('bottom') },
  ];

  const pluginItems: MenuProps['items'] = [
    {
      key: 'replaceTracker', label: t('toolbar.replaceTracker'),
      onClick: () => {
        if (selectedIds.length === 0) return;
        setReplaceTrackerTarget({ ids: selectedIds });
      },
    },
    {
      key: 'autoMatchDir', label: t('toolbar.autoMatchDir'),
      onClick: () => {
        // Old plugin.js: requires checked rows; dialog itself filters to
        // stopped + 0% candidates against the folder dictionary.
        if (selectedIds.length === 0) return;
        setAutoMatchTarget({ ids: selectedIds });
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
            <span style={{ fontSize: 11, color: 'var(--eui-item-text)' }}>{t('toolbar.theme')}</span>
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
            <Tooltip title={t('toolbar.about')}>
              <Button size="small" type="text" style={{ fontSize: 12 }}
                onClick={() => setAboutOpen(true)}>
                <LegacyIcon name="about" size={16} />
              </Button>
            </Tooltip>
          </Space>
        </div>

        {/* Toolbar — 28px compact */}
        <div className="dashboard-toolbar">
          <Tooltip title={t('toolbar.addTorrent')}>
            <Button size="small" icon={<LegacyIcon name="add-torrent" size={16} />} type="text"
              onClick={() => setAddTorrentOpen(true)} />
          </Tooltip>
          <div className="toolbar-divider" />
          <Tooltip title={altSpeedEnabled ? t('toolbar.altSpeedOn') : t('toolbar.altSpeedOff')}>
            <Button size="small"
              icon={<LegacyIcon name={altSpeedEnabled ? 'alt-speed-on' : 'alt-speed-off'} size={16} />}
              type="text"
              style={{ color: altSpeedEnabled ? '#0E2D5F' : undefined }}
              onClick={handleAltSpeedToggle} />
          </Tooltip>
          <div className="toolbar-divider" />
          <Tooltip title={t('toolbar.refresh')}>
            <Button size="small" icon={<LegacyIcon name="refresh" size={16} />} type="text"
              onClick={() => refetch()} />
          </Tooltip>
          <Tooltip title={t('toolbar.settings')}>
            <Button size="small" icon={<LegacyIcon name="settings" size={16} />} type="text"
              onClick={() => setSettingsOpen(true)} />
          </Tooltip>
          <Dropdown menu={{ items: pluginItems }}>
            <Tooltip title={t('toolbar.plugins')}>
              <Button size="small" icon={<LegacyIcon name="plugins" size={16} />} type="text">{t('toolbar.plugins')}</Button>
            </Tooltip>
          </Dropdown>
          <div className="toolbar-divider" />

          <Tooltip title={t('toolbar.start')}>
            <Button size="small" icon={<LegacyIcon name="start" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handleStart} />
          </Tooltip>
          <Tooltip title={t('toolbar.pause')}>
            <Button size="small" icon={<LegacyIcon name="pause" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handlePause} />
          </Tooltip>
          <Tooltip title={t('toolbar.rename')}>
            <Button size="small" icon={<LegacyIcon name="rename" size={16} />} type="text"
              disabled={selectedIds.length !== 1} onClick={handleRename} />
          </Tooltip>
          <Tooltip title={t('toolbar.remove')}>
            <Button size="small" icon={<LegacyIcon name="remove" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handleDelete} />
          </Tooltip>
          <Tooltip title={t('toolbar.verify')}>
            <Button size="small" icon={<LegacyIcon name="verify" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handleVerify} />
          </Tooltip>
          <Tooltip title={t('toolbar.morePeers')}>
            <Button size="small" icon={<LegacyIcon name="more-peers" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handleMorePeers} />
          </Tooltip>
          <Tooltip title={t('toolbar.changeDir')}>
            <Button size="small" icon={<LegacyIcon name="change-dir" size={16} />} type="text"
              disabled={selectedIds.length !== 1} onClick={handleChangeDir} />
          </Tooltip>
          <Tooltip title={t('toolbar.speedLimit')}>
            <Button size="small" icon={<LegacyIcon name="speed-limit" size={16} />} type="text"
              disabled={selectedIds.length === 0} onClick={handleSpeedLimit} />
          </Tooltip>
          <Tooltip title={t('toolbar.copyPath')}>
            <Button size="small" icon={<LegacyIcon name="copy-path" size={16} />} type="text"
              disabled={selectedIds.length !== 1} onClick={handleCopyPath} />
          </Tooltip>
          <Dropdown menu={{ items: queueItems }}>
            <Tooltip title={t('toolbar.queue')}>
              <Button size="small" icon={<LegacyIcon name="queue-move" size={16} />} type="text">{t('toolbar.queue')}</Button>
            </Tooltip>
          </Dropdown>
          <div className="toolbar-divider" />

          <Tooltip title={t('toolbar.startAll')}>
            <Button size="small" icon={<LegacyIcon name="start-all" size={16} />} type="text"
              onClick={handleStartAll}>All</Button>
          </Tooltip>
          <Tooltip title={t('toolbar.pauseAll')}>
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
          <Tooltip title={autoRefresh ? t('toolbar.autoReloadOn') : t('toolbar.autoReloadOff')}>
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

          <Input size="small" placeholder={t('toolbar.searchPlaceholder')} prefix={<LegacyIcon name="search" size={14} />}
            style={{ width: 180 }} value={searchText}
            onChange={(e) => setSearchText(e.target.value)} allowClear
          />
        </div>
      </div>

      {/* ════ Batch Operation Bar ════ */}
      <BatchOperationBar
        selectedIds={selectedIds}
        onReplaceTracker={() => { if (selectedIds.length > 0) setReplaceTrackerTarget({ ids: selectedIds }); }}
        onRemove={handleDelete}
        onChangeDir={() => { if (selectedIds.length > 0 && firstSelected) setChangeDirTarget({ ids: selectedIds, dir: firstSelected.downloadDir ?? '' }); }}
        onSpeedLimit={() => { if (selectedIds.length > 0) openSpeedLimit(selectedIds); }}
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
                sortState={sortState}
                onSortChange={setSortState}
              />
            </div>
            {/* Pagination bar */}
            <div className="dashboard-pagination">
              <Pagination
                size="small"
                current={safePage}
                pageSize={pageSize}
                total={totalCount}
                showSizeChanger
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onChange={(page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                  if (size !== pageSize) setCurrentPage(1);
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
              <span className="detail-toggle-text">
                {t('detail.selectPrompt')}
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
          onRemove={(ids, deleteData) => setRemoveTarget({ ids, deleteData })}
          onChangeDir={(ids, dir) => setChangeDirTarget({ ids, dir })}
          onSetLabels={(ids, labels) => setSetLabelsTarget({ ids, labels })}
          onSpeedLimit={(ids) => openSpeedLimit(ids)}
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
        initial={speedLimitTarget?.initial} onClose={() => setSpeedLimitTarget(null)} />
      <ReplaceTrackerDialog open={!!replaceTrackerTarget} ids={replaceTrackerTarget?.ids ?? []}
        onClose={() => setReplaceTrackerTarget(null)} />
      <AutoMatchDialog open={!!autoMatchTarget} ids={autoMatchTarget?.ids ?? []}
        torrents={collection?.all ?? {}} onClose={() => setAutoMatchTarget(null)} />
      <SetLabelsDialog open={!!setLabelsTarget} ids={setLabelsTarget?.ids ?? []}
        currentLabels={setLabelsTarget?.labels ?? []} onClose={() => setSetLabelsTarget(null)} />
      <RemoveTorrentDialog open={!!removeTarget} ids={removeTarget?.ids ?? []}
        initialDeleteData={removeTarget?.deleteData ?? false} onClose={() => setRemoveTarget(null)} />
    </div>
  );
}
