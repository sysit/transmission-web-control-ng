import { useState, useMemo, useEffect, useRef } from 'react';
import { Tree } from 'antd';
import type { TreeDataNode } from 'antd';
import LegacyIcon from '@/components/LegacyIcon';
import { useTranslation } from 'react-i18next';
import type { TorrentCollection, SessionStats, TrackerInfo } from '@/core/rpc/rpc-types';
import { TorrentStatus } from '@/core/rpc/rpc-types';
import { formatSize } from '@/lib/format';

interface Props {
  collection: TorrentCollection | null;
  trackers: Record<string, TrackerInfo>;
  sessionStats: SessionStats | null;
  selectedKey: string;
  onSelect: (key: string, trackerId?: string) => void;
}

export default function SidebarTree({
  collection, trackers, sessionStats, selectedKey, onSelect,
}: Props) {
  const { t } = useTranslation();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const hasExpandedRef = useRef(false);

  const seededCount = collection?.status[TorrentStatus.SEED]?.length ?? 0;
  const downloadingCount = collection?.status[TorrentStatus.DOWNLOAD]?.length ?? 0;
  const pausedCount = collection?.status[TorrentStatus.STOPPED]?.length ?? 0;
  const checkingCount = (collection?.status[TorrentStatus.CHECK]?.length ?? 0) +
    (collection?.status[TorrentStatus.CHECK_WAIT]?.length ?? 0);
  const activeCount = collection?.actively.length ?? 0;
  const errorCount = collection?.error.length ?? 0;
  const warningCount = collection?.warning.length ?? 0;

  const treeData = useMemo<TreeDataNode[]>(() => {
    if (!collection) {
      return [{ title: t('detail.loading'), key: '__loading__' }];
    }

    const items: TreeDataNode[] = [
      {
        title: `${t('sidebar.all')} (${collection.count}) — ${formatSize(collection.totalSize)}`,
        key: 'all', icon: <LegacyIcon name="tree-home" size={14} />,
        children: [
          { title: `${t('sidebar.downloading')} (${downloadingCount})`, key: 'downloading', icon: <LegacyIcon name="tree-download" size={14} /> },
          { title: `${t('sidebar.seeding')} (${seededCount})`, key: 'sending', icon: <LegacyIcon name="tree-seed" size={14} /> },
          { title: `${t('sidebar.paused')} (${pausedCount})`, key: 'paused', icon: <LegacyIcon name="tree-pause" size={14} /> },
          { title: `${t('sidebar.checking')} (${checkingCount})`, key: 'check', icon: <LegacyIcon name="tree-check" size={14} /> },
          { title: `${t('sidebar.actively')} (${activeCount})`, key: 'actively', icon: <LegacyIcon name="tree-actively" size={14} /> },
          { title: `${t('sidebar.error')} (${errorCount})`, key: 'error', icon: <LegacyIcon name="tree-error" size={14} /> },
          { title: `${t('sidebar.warning')} (${warningCount})`, key: 'warning', icon: <LegacyIcon name="tree-warning" size={14} /> },
        ],
      },
    ];

    const trackerList = Object.values(trackers);
    if (trackerList.length > 0) {
      items.push({
        title: t('sidebar.servers'), key: 'servers', icon: <LegacyIcon name="tree-servers" size={14} />,
        children: trackerList.map((tr) => ({
          title: `${tr.name} (${tr.count})`, key: tr.nodeid, icon: <LegacyIcon name="tree-server" size={14} />,
        })),
      });
    }

    const folderList = Object.values(collection.folders ?? {});
    if (folderList.length > 0) {
      // Build a nested tree from flat folder entries.
      // Each folder's nodeid is like "folders-A" or "folders-A-B-C".
      // Parent of "folders-A-B" is "folders-A". Top-level children
      // (immediate children of "folders") become children of the root node.
      const folderNodeMap = new Map<string, TreeDataNode>();
      const topLevel: TreeDataNode[] = [];

      for (const f of folderList) {
        const normalized = (f.dirPath || '').replace(/\\/g, '/');
        const segments = normalized.split('/').filter(Boolean);
        const name = segments[segments.length - 1] || normalized || '?';
        const node: TreeDataNode = {
          title: `${name} (${f.count})`,
          key: f.nodeid,
          icon: <LegacyIcon name="tree-folder" size={14} />,
          children: [],
        };
        folderNodeMap.set(f.nodeid, node);

        const lastSep = f.nodeid.lastIndexOf('-');
        if (lastSep <= 0) {
          topLevel.push(node);
        } else {
          const parentKey = f.nodeid.substring(0, lastSep);
          if (parentKey === 'folders') {
            topLevel.push(node);
          } else {
            const parentNode = folderNodeMap.get(parentKey);
            if (parentNode && Array.isArray(parentNode.children)) {
              parentNode.children.push(node);
            } else {
              topLevel.push(node);
            }
          }
        }
      }

      // Remove empty children arrays from leaf nodes
      const cleanChildren = (nodes: TreeDataNode[]) => {
        for (const n of nodes) {
          if (Array.isArray(n.children) && n.children.length === 0) {
            delete n.children;
          } else if (Array.isArray(n.children)) {
            cleanChildren(n.children);
          }
        }
      };
      cleanChildren(topLevel);

      items.push({
        title: t('sidebar.folders'), key: 'folders', icon: <LegacyIcon name="tree-folder" size={14} />,
        children: topLevel,
      });
    }

    if (sessionStats) {
      const cs = sessionStats['cumulative-stats'];
      const cur = sessionStats['current-stats'];
      const fmtSecs = (s: number) => {
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        return d > 0 ? `${d}d ${h}h` : `${h}h`;
      };
      items.push({
        title: t('sidebar.statistics'), key: 'statistics', icon: <LegacyIcon name="tree-chart" size={14} />,
        children: [
          {
            title: t('sidebar.cumulative'), key: 'cumulative-stats', icon: <LegacyIcon name="tree-folder" size={14} />,
            children: [
              { title: `${t('sidebar.uploaded')}: ${formatSize(cs.uploadedBytes)}`, key: 'uploadedBytes', icon: <span style={{ width: 14, display: 'inline-block' }} /> },
              { title: `${t('sidebar.downloaded')}: ${formatSize(cs.downloadedBytes)}`, key: 'downloadedBytes', icon: <span style={{ width: 14, display: 'inline-block' }} /> },
              { title: `${t('sidebar.files')}: ${cs.filesAdded}`, key: 'filesAdded', icon: <span style={{ width: 14, display: 'inline-block' }} /> },
              { title: `${t('sidebar.sessions')}: ${cs.sessionCount}`, key: 'sessionCount', icon: <span style={{ width: 14, display: 'inline-block' }} /> },
              { title: `${t('sidebar.activeTime')}: ${fmtSecs(cs.secondsActive)}`, key: 'secondsActive', icon: <span style={{ width: 14, display: 'inline-block' }} /> },
            ],
          },
          {
            title: t('sidebar.current'), key: 'current-stats', icon: <LegacyIcon name="tree-folder" size={14} />,
            children: [
              { title: `${t('sidebar.uploaded')}: ${formatSize(cur.uploadedBytes)}`, key: 'current-uploadedBytes', icon: <span style={{ width: 14, display: 'inline-block' }} /> },
              { title: `${t('sidebar.downloaded')}: ${formatSize(cur.downloadedBytes)}`, key: 'current-downloadedBytes', icon: <span style={{ width: 14, display: 'inline-block' }} /> },
              { title: `${t('sidebar.files')}: ${cur.filesAdded}`, key: 'current-filesAdded', icon: <span style={{ width: 14, display: 'inline-block' }} /> },
              { title: `${t('sidebar.sessions')}: ${cur.sessionCount}`, key: 'current-sessionCount', icon: <span style={{ width: 14, display: 'inline-block' }} /> },
              { title: `${t('sidebar.activeTime')}: ${fmtSecs(cur.secondsActive)}`, key: 'current-secondsActive', icon: <span style={{ width: 14, display: 'inline-block' }} /> },
            ],
          },
        ],
      });
    }

    return items;
  }, [collection, trackers, sessionStats, t, downloadingCount, seededCount, pausedCount, checkingCount, activeCount, errorCount, warningCount]);

  useEffect(() => {
    if (collection && !hasExpandedRef.current) {
      hasExpandedRef.current = true;
      setExpandedKeys(['all']);
    }
  }, [collection]);

  return (
    <Tree showIcon showLine={{ showLeafIcon: false }}
      treeData={treeData} selectedKeys={[selectedKey]}
      expandedKeys={expandedKeys}
      onExpand={(keys) => setExpandedKeys(keys as string[])}
      onSelect={(keys) => {
        if (keys.length > 0) {
          const k = keys[0] as string;
          // Pass the tracker nodeid when a server node is selected
          if (k.startsWith('tracker-')) {
            onSelect(k, k);
          } else {
            onSelect(k);
          }
        }
      }}
      className="sidebar-tree"
      style={{ padding: '4px 2px', fontSize: 12 }} blockNode />
  );
}
