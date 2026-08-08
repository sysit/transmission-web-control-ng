// TorrentDetailPanel — collapsible bottom detail panel with 5 tabs
// Integrated into DashboardPage below the TorrentTable via a drag handle

import { useState } from 'react';
import { Tabs, Button, Typography, Space, Spin } from 'antd';
import LegacyIcon from '@/components/LegacyIcon';
import type { Torrent } from '@/core/rpc/rpc-types';
import { useTorrentDetail } from '@/hooks/useTorrents';
import InfoTab from './tabs/InfoTab';
import FilesTab from './tabs/FilesTab';
import TrackersTab from './tabs/TrackersTab';
import PeersTab from './tabs/PeersTab';
import ConfigTab from './tabs/ConfigTab';
import AddTrackerDialog from './dialogs/AddTrackerDialog';
import ChangeDownloadDirDialog from './dialogs/ChangeDownloadDirDialog';

const { Text } = Typography;

interface Props {
  torrentId: number;
  torrent: Torrent | undefined;
  open: boolean;
  onClose: () => void;
}

export default function TorrentDetailPanel({ torrentId, torrent, open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState('info');
  const [panelHeight] = useState(280);
  const [addTrackerOpen, setAddTrackerOpen] = useState(false);
  const [changeDirOpen, setChangeDirOpen] = useState(false);

  const { data: extendedTorrent } = useTorrentDetail(torrentId, open);
  const mergedTorrent: Torrent | undefined = extendedTorrent ?? torrent;
  const hasDetailData = !!extendedTorrent;

  if (!open) return null;

  const tabItems = [
    { key: 'info', label: 'Info',
      children: <InfoTab torrent={mergedTorrent}
        onChangeDownloadDir={() => setChangeDirOpen(true)} /> },
    { key: 'trackers', label: 'Trackers',
      children: <TrackersTab torrentId={torrentId}
        trackerStats={mergedTorrent?.trackerStats}
        onAddTracker={() => setAddTrackerOpen(true)} /> },
    { key: 'files', label: 'Files',
      children: <FilesTab torrentId={torrentId}
        torrentName={mergedTorrent?.name ?? ''}
        files={mergedTorrent?.files}
        fileStats={mergedTorrent?.fileStats} /> },
    { key: 'peers', label: 'Peers',
      children: <PeersTab peers={mergedTorrent?.peers} /> },
    { key: 'config', label: 'Config',
      children: <ConfigTab torrent={mergedTorrent} /> },
  ];

  const tabContentHeight = panelHeight - 55;

  return (
    <>
      {/* Panel body */}
      <div style={{ height: panelHeight, background: 'var(--eui-panel-bg)',
        borderTop: '1px solid var(--eui-border)', display: 'flex', flexDirection: 'column',
        overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '2px 8px', background: 'var(--eui-content-bg)', borderBottom: '1px solid var(--eui-toolbar-border-top)', height: 26 }}>
          <Space size={4}>
            <Text strong style={{ fontSize: 12 }}>Torrent #{torrentId}</Text>
            {torrent && <Text style={{ fontSize: 12, color: 'var(--eui-item-text)' }} ellipsis>— {torrent.name}</Text>}
          </Space>
          <Button type="text" size="small" icon={<LegacyIcon name="close" size={14} />} onClick={onClose}
            style={{ fontSize: 12 }} />
        </div>

        {/* Tabs — classic card-style, left-positioned, compact */}
        <Tabs activeKey={activeTab} onChange={setActiveTab} tabPosition="left" size="small"
          type="card"
          style={{ flex: 1, overflow: 'hidden' }}
          tabBarStyle={{ minWidth: 56, fontSize: 11 }}
          tabBarGutter={0}
          items={tabItems.map((item) => ({
            ...item,
            label: <span style={{ fontSize: 11, padding: '0 4px' }}>{item.label}</span>,
            children: (
              <div style={{ height: tabContentHeight, overflow: 'auto', padding: 2 }}>
                {item.key !== 'info' && item.key !== 'config'
                  ? (!hasDetailData ? (
                    <div style={{ display: 'flex', justifyContent: 'center',
                      alignItems: 'center', height: '100%', minHeight: 120 }}>
                      <Spin size="small" />
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--eui-item-text)' }}>
                        Loading {item.key}…
                      </span>
                    </div>
                  ) : item.children)
                  : item.children}
              </div>
            ),
          }))} />
      </div>

      <AddTrackerDialog open={addTrackerOpen} torrentId={torrentId}
        onClose={() => setAddTrackerOpen(false)} />
      {mergedTorrent && (
        <ChangeDownloadDirDialog open={changeDirOpen} torrentIds={[torrentId]}
          currentDir={mergedTorrent.downloadDir ?? ''}
          onClose={() => setChangeDirOpen(false)} />
      )}
    </>
  );
}
