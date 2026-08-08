import { Space, Button } from 'antd';
import LegacyIcon from '@/components/LegacyIcon';
import { useRemoveTorrent } from '@/hooks/useTorrents';
import { exec as rpcExec } from '@/core/rpc/transmission-client';

interface Props {
  selectedIds: number[];
  onReplaceTracker?: () => void;
  onChangeDir?: () => void;
  onSpeedLimit?: () => void;
}

export default function BatchOperationBar({ selectedIds, onReplaceTracker, onChangeDir, onSpeedLimit }: Props) {
  const removeTorrent = useRemoveTorrent();

  if (selectedIds.length === 0) return null;

  const startAll = () => rpcExec({ method: 'torrent-start', arguments: { ids: selectedIds } });
  const stopAll = () => rpcExec({ method: 'torrent-stop', arguments: { ids: selectedIds } });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '4px 12px', background: '#e6f4ff',
      borderBottom: '1px solid #91caff', fontSize: 12,
    }}>
      <span style={{ fontWeight: 600 }}>{selectedIds.length} selected</span>
      <Space size={4} style={{ marginLeft: 8 }}>
        <Button size="small" icon={<LegacyIcon name="start" size={14} />} onClick={startAll}>Start</Button>
        <Button size="small" icon={<LegacyIcon name="pause" size={14} />} onClick={stopAll}>Stop</Button>
        <Button size="small" icon={<LegacyIcon name="tracker-replace" size={14} />} onClick={onReplaceTracker}>Replace Tracker</Button>
        <Button size="small" icon={<LegacyIcon name="change-dir" size={14} />} onClick={onChangeDir}>Change Dir</Button>
        <Button size="small" icon={<LegacyIcon name="speed-limit" size={14} />} onClick={onSpeedLimit}>Speed Limit</Button>
        <Button size="small" danger icon={<LegacyIcon name="remove" size={14} />}
          onClick={() => removeTorrent.mutate({ ids: selectedIds, deleteData: false })}>Remove</Button>
      </Space>
    </div>
  );
}
