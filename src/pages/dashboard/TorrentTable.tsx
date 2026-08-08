import { useMemo, useState, useCallback } from 'react';
import { Table, Checkbox } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ResizeCallbackData } from 'react-resizable';
import type { Torrent } from '@/core/rpc/rpc-types';
import { TorrentStatus } from '@/core/rpc/rpc-types';
import {
  formatSize, formatSpeed, formatRemainingTime, formatDate,
} from '@/lib/format';
import ResizableTitle from '@/components/ResizableTitle';
import LegacyIcon from '@/components/LegacyIcon';
import { useConfigStore } from '@/core/config/config-store';

interface Props {
  torrents: Torrent[];
  loading: boolean;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onContextMenu: (torrent: Torrent, e: React.MouseEvent) => void;
  onRowSelect?: (torrent: Torrent) => void;
  selectedTorrentId?: number;
}

const STATUS_MAP: Record<number, [string, string]> = {
  [TorrentStatus.STOPPED]: ['Stopped', '#999'],
  [TorrentStatus.CHECK_WAIT]: ['ChkWait', '#fa0'],
  [TorrentStatus.CHECK]: ['Checking', '#fa0'],
  [TorrentStatus.DOWNLOAD_WAIT]: ['DlWait', '#2db7f5'],
  [TorrentStatus.DOWNLOAD]: ['Download', '#2db7f5'],
  [TorrentStatus.SEED_WAIT]: ['SdWait', '#87d068'],
  [TorrentStatus.SEED]: ['Seeding', '#87d068'],
};

/** Map torrent status to the icon name used before the torrent name */
function statusIconName(status: number): string {
  switch (status) {
    case TorrentStatus.DOWNLOAD:
    case TorrentStatus.DOWNLOAD_WAIT:
      return 'status-download';
    case TorrentStatus.SEED:
    case TorrentStatus.SEED_WAIT:
      return 'status-seeding';
    case TorrentStatus.STOPPED:
      return 'status-paused';
    case TorrentStatus.CHECK:
    case TorrentStatus.CHECK_WAIT:
      return 'status-checking';
    default:
      return 'tree-home';
  }
}

function progressBarClass(status: number): string {
  switch (status) {
    case TorrentStatus.DOWNLOAD:
    case TorrentStatus.DOWNLOAD_WAIT: return 'torrent-progress-download';
    case TorrentStatus.SEED:
    case TorrentStatus.SEED_WAIT: return 'torrent-progress-seed';
    case TorrentStatus.STOPPED: return 'torrent-progress-stop';
    case TorrentStatus.CHECK:
    case TorrentStatus.CHECK_WAIT: return 'torrent-progress-check';
    default: return '';
  }
}

// Default column widths — match old template/torrent-fields.json exactly
const COL_DEFAULTS: Record<string, number> = {
  '#': 30,
  checkbox: 30,
  name: 300,
  totalSize: 80,
  percentDone: 100,
  eta: 100,
  uploadRatio: 60,
  statusCol: 60,
  seederCount: 60,
  leecherCount: 60,
  rateDownload: 80,
  rateUpload: 80,
  completeSize: 80,
  uploadedEver: 80,
  addedDate: 130,
  idCol: 30,
  queuePosition: 30,
  trackersCol: 100,
  downloadDir: 200,
  activityDate: 130,
  labels: 130,
  doneDate: 130,
};

// Column keys in display order (all toggleable except # and checkbox)
const ALL_COLUMN_KEYS = [
  '#', 'checkbox', 'name', 'totalSize', 'percentDone', 'eta',
  'uploadRatio', 'statusCol', 'seederCount', 'leecherCount',
  'rateDownload', 'rateUpload', 'completeSize', 'uploadedEver',
  'addedDate', 'idCol', 'queuePosition', 'trackersCol', 'downloadDir',
  'activityDate', 'labels', 'doneDate',
];

const LS_KEY = 'tr-web-control-columns';

function loadVisibleColumns(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return ALL_COLUMN_KEYS;
}

function saveVisibleColumns(cols: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cols)); } catch { /* ignore */ }
}

export default function TorrentTable({
  torrents, loading, selectedIds, onSelectionChange, onContextMenu,
  onRowSelect, selectedTorrentId,
}: Props) {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [visibleColumns, setVisibleColumns] = useState<string[]>(loadVisibleColumns);
  const [colMenuState, setColMenuState] = useState<{ x: number; y: number } | null>(null);
  // User label palette (name → color/description) for rendering the Labels column
  const labelPalette = useConfigStore((s) => s.labels);
  const labelColorMap = useMemo(() =>
    Object.fromEntries(labelPalette.map((l) => [l.name, l])),
  [labelPalette]);

  const handleResize = useCallback((key: string) =>
    (_e: React.SyntheticEvent, { size }: ResizeCallbackData) => {
      setColumnWidths((prev) => ({ ...prev, [key]: Math.max(24, size.width) }));
    }, []);

  // Resolve current width (user-resized or default)
  const getWidth = useCallback((key: string) =>
    columnWidths[key] ?? COL_DEFAULTS[key] ?? 80,
  [columnWidths]);

  // Header cell props (resize + context menu)
  const getOnHeaderCell = useCallback((key: string) =>
    () => ({
      width: getWidth(key),
      onResize: handleResize(key),
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        setColMenuState({ x: e.clientX, y: e.clientY });
      },
    } as Record<string, unknown>),
  [getWidth, handleResize]);

  const toggleColumn = useCallback((key: string) => {
    setVisibleColumns((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : (() => {
            // Insert at its original position
            const idx = ALL_COLUMN_KEYS.indexOf(key);
            const result = [...prev];
            let insertAt = result.length;
            for (let i = idx + 1; i < ALL_COLUMN_KEYS.length; i++) {
              const pos = result.indexOf(ALL_COLUMN_KEYS[i]);
              if (pos !== -1) { insertAt = pos; break; }
            }
            result.splice(insertAt, 0, key);
            return result;
          })();
      saveVisibleColumns(next);
      return next;
    });
  }, []);

  // Select-all / select-one
  const allSelected = torrents.length > 0 && torrents.every((t) => selectedIds.includes(t.id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = useCallback((checked: boolean) => {
    onSelectionChange(checked ? torrents.map((t) => t.id) : []);
  }, [torrents, onSelectionChange]);

  const handleSelectOne = useCallback((id: number, checked: boolean) => {
    onSelectionChange(checked
      ? [...selectedIds, id]
      : selectedIds.filter((i) => i !== id));
  }, [selectedIds, onSelectionChange]);

  const hc = useCallback((key: string) =>
    ({ onHeaderCell: getOnHeaderCell(key) }),
  [getOnHeaderCell]);

  // Build all columns — visibility is controlled by visibleColumns filter
  const columns = useMemo<ColumnsType<Torrent>>(
    () => {
      const allCols: ColumnsType<Torrent> = [
        // # Row number — always visible, always first
        {
          title: '#', key: '#', width: getWidth('#'), align: 'center',
          className: 'col-row-num',
          ...hc('#'),
          render: (_: unknown, __: Torrent, index: number) => (
            <span>{index + 1}</span>
          ),
        },
        // Checkbox column — custom, not using rowSelection so we can place it 2nd
        {
          title: (
            <Checkbox checked={allSelected} indeterminate={someSelected}
              onChange={(e) => handleSelectAll(e.target.checked)} />
          ),
          key: 'checkbox', width: getWidth('checkbox'), align: 'center',
          className: 'col-row-checkbox',
          ...hc('checkbox'),
          render: (_: unknown, record: Torrent) => (
            <Checkbox checked={selectedIds.includes(record.id)}
              onChange={(e) => handleSelectOne(record.id, e.target.checked)}
              onClick={(e) => e.stopPropagation()} />
          ),
        },
        {
          title: 'Name', dataIndex: 'name', key: 'name', width: getWidth('name'), ellipsis: true,
          sorter: (a, b) => a.name.localeCompare(b.name),
          ...hc('name'),
          render: (name: string, record: Torrent) => (
            <span className="torrent-name-link"
              onContextMenu={(e) => { e.preventDefault(); onContextMenu(record, e); }}>
              <LegacyIcon name={statusIconName(record.status)} size={14}
                style={{ marginRight: 4 }} />
              {name}
            </span>
          ),
        },
        {
          title: 'Size', dataIndex: 'totalSize', key: 'totalSize', width: getWidth('totalSize'), align: 'right',
          sorter: (a, b) => a.totalSize - b.totalSize,
          ...hc('totalSize'),
          render: (v: number) => <span>{formatSize(v)}</span>,
        },
        {
          title: 'Progress', dataIndex: 'percentDone', key: 'percentDone', width: getWidth('percentDone'), align: 'center',
          sorter: (a, b) => a.percentDone - b.percentDone,
          ...hc('percentDone'),
          render: (v: number, record: Torrent) => {
            const pct = Math.round(v * 100);
            const pctStr = `${pct}%`;
            const barCls = progressBarClass(record.status);
            return (
              <div className="torrent-progress" title={pctStr}>
                <div className="torrent-progress-text">{pctStr}</div>
                <div className={`torrent-progress-bar ${barCls}`} style={{ width: pctStr }} />
              </div>
            );
          },
        },
        {
          title: 'ETA', key: 'eta', width: getWidth('eta'), align: 'right',
          sorter: (a, b) => (a.remainingTime ?? Infinity) - (b.remainingTime ?? Infinity),
          ...hc('eta'),
          render: (_: unknown, r: Torrent) => (
            <span>
              {r.remainingTime != null && r.remainingTime < 3153600000000
                ? (r.remainingTime > 0 ? formatRemainingTime(r.remainingTime) : 'Done')
                : ''}
            </span>
          ),
        },
        {
          title: 'Ratio', dataIndex: 'uploadRatio', key: 'uploadRatio', width: getWidth('uploadRatio'), align: 'right',
          sorter: (a, b) => a.uploadRatio - b.uploadRatio,
          ...hc('uploadRatio'),
          render: (v: number) => (
            <span style={v >= 0 && v < 1 ? { color: '#cc9900' } : undefined}>
              {v === -1 ? '∞' : v}
            </span>
          ),
        },
        {
          title: 'Status', key: 'statusCol', width: getWidth('statusCol'), align: 'center',
          sorter: (a, b) => a.status - b.status,
          ...hc('statusCol'),
          render: (_: unknown, r: Torrent) => {
            const s = STATUS_MAP[r.status];
            if (!s) return null;
            // Old UI renders status as plain text; error→red, warning→#cc9900
            const color = r.error ? 'red' : r.warning ? '#cc9900' : undefined;
            return <span style={color ? { color } : undefined}>{s[0]}</span>;
          },
        },
        {
          title: 'Seeds', dataIndex: 'seederCount', key: 'seederCount', width: getWidth('seederCount'), align: 'center',
          ...hc('seederCount'),
          render: (v: number | undefined) => v != null ? <span>{v}</span> : null,
        },
        {
          title: 'Peers', dataIndex: 'leecherCount', key: 'leecherCount', width: getWidth('leecherCount'), align: 'center',
          ...hc('leecherCount'),
          render: (v: number | undefined) => v != null ? <span>{v}</span> : null,
        },
        {
          title: '↓ Speed', dataIndex: 'rateDownload', key: 'rateDownload', width: getWidth('rateDownload'), align: 'right',
          sorter: (a, b) => a.rateDownload - b.rateDownload,
          ...hc('rateDownload'),
          render: (v: number) => (
            <span>{v > 0 ? formatSpeed(v) : ''}</span>
          ),
        },
        {
          title: '↑ Speed', dataIndex: 'rateUpload', key: 'rateUpload', width: getWidth('rateUpload'), align: 'right',
          sorter: (a, b) => a.rateUpload - b.rateUpload,
          ...hc('rateUpload'),
          render: (v: number) => (
            <span>{v > 0 ? formatSpeed(v) : ''}</span>
          ),
        },
        {
          title: 'Downloaded', dataIndex: 'completeSize', key: 'completeSize', width: getWidth('completeSize'), align: 'right',
          sorter: (a, b) => (a.completeSize ?? 0) - (b.completeSize ?? 0),
          ...hc('completeSize'),
          render: (v: number | undefined) => <span>{v != null ? formatSize(v) : ''}</span>,
        },
        {
          title: 'Uploaded', dataIndex: 'uploadedEver', key: 'uploadedEver', width: getWidth('uploadedEver'), align: 'right',
          sorter: (a, b) => a.uploadedEver - b.uploadedEver,
          ...hc('uploadedEver'),
          render: (v: number) => <span>{formatSize(v)}</span>,
        },
        {
          title: 'Added', dataIndex: 'addedDate', key: 'addedDate', width: getWidth('addedDate'), align: 'center',
          sorter: (a, b) => a.addedDate - b.addedDate,
          ...hc('addedDate'),
          render: (v: number) => <span>{formatDate(v)}</span>,
        },
        {
          title: 'ID', dataIndex: 'id', key: 'idCol', width: getWidth('idCol'), align: 'center',
          sorter: (a, b) => a.id - b.id,
          ...hc('idCol'),
          render: (v: number) => <span>{v}</span>,
        },
        {
          title: 'Queue', dataIndex: 'queuePosition', key: 'queuePosition', width: getWidth('queuePosition'), align: 'center',
          sorter: (a, b) => a.queuePosition - b.queuePosition,
          ...hc('queuePosition'),
          render: (v: number) => <span>{v}</span>,
        },
        {
          title: 'Trackers', dataIndex: 'trackers', key: 'trackersCol', width: getWidth('trackersCol'), ellipsis: true,
          ...hc('trackersCol'),
          render: (v: string | undefined) => <span style={{ fontSize: 11 }}>{v ?? ''}</span>,
        },
        {
          title: 'Path', dataIndex: 'downloadDir', key: 'downloadDir', width: getWidth('downloadDir'), ellipsis: true,
          ...hc('downloadDir'),
          render: (v: string) => <span style={{ fontSize: 11 }} title={v}>{v}</span>,
        },
        {
          title: 'Last Activity', dataIndex: 'activityDate', key: 'activityDate', width: getWidth('activityDate'), align: 'center',
          sorter: (a, b) => a.activityDate - b.activityDate,
          ...hc('activityDate'),
          render: (v: number) => <span>{v > 0 ? formatDate(v) : ''}</span>,
        },
        {
          title: 'Labels', dataIndex: 'labels', key: 'labels', width: getWidth('labels'), ellipsis: true,
          ...hc('labels'),
          render: (v: string[] | undefined) => {
            const names = v ?? [];
            if (names.length === 0) return <span />;
            return (
              <span style={{ display: 'inline-flex', gap: 3, flexWrap: 'wrap' }}>
                {names.map((name) => {
                  const def = labelColorMap[name];
                  return (
                    <span key={name} title={def?.description || name}
                      style={{
                        display: 'inline-block', padding: '0 5px', borderRadius: 3,
                        fontSize: 11, lineHeight: '16px', color: '#fff',
                        background: def?.color ?? '#999',
                      }}>{name}</span>
                  );
                })}
              </span>
            );
          },
        },
        {
          title: 'Done', dataIndex: 'doneDate', key: 'doneDate', width: getWidth('doneDate'), align: 'center',
          sorter: (a, b) => a.doneDate - b.doneDate,
          ...hc('doneDate'),
          render: (v: number) => <span>{v > 0 ? formatDate(v) : ''}</span>,
        },
      ];
      return allCols.filter((c) => visibleColumns.includes(c.key as string));
    },
    [getWidth, hc, visibleColumns, allSelected, someSelected, handleSelectAll, handleSelectOne, selectedIds, onContextMenu, labelColorMap],
  );

  const toggleableColumns = ALL_COLUMN_KEYS.filter((k) => k !== '#' && k !== 'checkbox');

  return (
    <>
      <Table<Torrent>
        columns={columns} dataSource={torrents} rowKey="id"
        loading={loading} size="small"
        pagination={false}
        components={{
          header: { cell: ResizableTitle },
        }}
        rowSelection={undefined}
        onRow={(record) => ({
          onContextMenu: (e) => { e.preventDefault(); onContextMenu(record, e); },
          onClick: () => { if (onRowSelect) onRowSelect(record); },
          style: record.id === selectedTorrentId
            ? { background: 'var(--eui-row-active-bg)' }
            : undefined,
        })}
        style={{ flex: 1 }}
        scroll={{ y: typeof window !== 'undefined' ? window.innerHeight - 280 : 500 }}
      />

      {/* Column header context menu */}
      {colMenuState && (
        <>
          <div className="context-menu-overlay"
            onClick={() => setColMenuState(null)}
            onContextMenu={(e) => { e.preventDefault(); setColMenuState(null); }}
          />
          <div className="context-menu-popup"
            style={{ left: colMenuState.x, top: colMenuState.y }}>
            {toggleableColumns.map((key) => {
              const title = key === 'statusCol' ? 'Status' :
                key === 'idCol' ? 'ID' :
                key === 'trackersCol' ? 'Trackers' :
                key === 'downloadDir' ? 'Path' :
                key === 'totalSize' ? 'Size' :
                key === 'percentDone' ? 'Progress' :
                key === 'eta' ? 'ETA' :
                key === 'uploadRatio' ? 'Ratio' :
                key === 'seederCount' ? 'Seeds' :
                key === 'leecherCount' ? 'Peers' :
                key === 'rateDownload' ? '↓ Speed' :
                key === 'rateUpload' ? '↑ Speed' :
                key === 'completeSize' ? 'Downloaded' :
                key === 'uploadedEver' ? 'Uploaded' :
                key === 'addedDate' ? 'Added' :
                key === 'queuePosition' ? 'Queue' :
                key === 'activityDate' ? 'Last Activity' :
                key === 'labels' ? 'Labels' :
                key === 'doneDate' ? 'Done' :
                key;
              return (
                <div className="context-menu-item" key={key}
                  onClick={() => { toggleColumn(key); /* keep menu open */ }}>
                  <span style={{ width: 18, textAlign: 'center', fontSize: 11 }}>
                    {visibleColumns.includes(key) ? '✓' : ''}
                  </span>
                  <span>{title}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
