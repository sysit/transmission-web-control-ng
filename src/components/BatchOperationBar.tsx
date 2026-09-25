import { App, Space, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import LegacyIcon from '@/components/LegacyIcon';
import { useRemoveTorrent } from '@/hooks/useTorrents';
import { exec as rpcExec } from '@/core/rpc/transmission-client';

interface Props {
  selectedIds: number[];
  onReplaceTracker?: () => void;
  onRemove?: () => void;
  onChangeDir?: () => void;
  onSpeedLimit?: () => void;
}

export default function BatchOperationBar({ selectedIds, onReplaceTracker, onRemove, onChangeDir, onSpeedLimit }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const removeTorrent = useRemoveTorrent();

  if (selectedIds.length === 0) return null;

  const onError = (e: unknown) => message.error(e instanceof Error ? e.message : String(e));
  const startAll = () => rpcExec({ method: 'torrent-start', arguments: { ids: selectedIds } }).catch(onError);
  const stopAll = () => rpcExec({ method: 'torrent-stop', arguments: { ids: selectedIds } }).catch(onError);
  const removeAll = () => {
    if (onRemove) { onRemove(); return; }
    removeTorrent.mutate({ ids: selectedIds, deleteData: false });
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '4px 12px', background: 'var(--eui-hover-bg)',
      borderBottom: '1px solid var(--eui-hover-border)', fontSize: 12,
    }}>
      <span style={{ fontWeight: 600 }}>{t('batch.selected', { count: selectedIds.length })}</span>
      <Space size={4} style={{ marginLeft: 8 }}>
        <Button size="small" icon={<LegacyIcon name="start" size={14} />} onClick={startAll}>{t('batch.startAll')}</Button>
        <Button size="small" icon={<LegacyIcon name="pause" size={14} />} onClick={stopAll}>{t('batch.stopAll')}</Button>
        <Button size="small" icon={<LegacyIcon name="tracker-replace" size={14} />} onClick={onReplaceTracker}>{t('batch.replaceTracker')}</Button>
        <Button size="small" icon={<LegacyIcon name="change-dir" size={14} />} onClick={onChangeDir}>{t('batch.changeDir')}</Button>
        <Button size="small" icon={<LegacyIcon name="speed-limit" size={14} />} onClick={onSpeedLimit}>{t('batch.speedLimit')}</Button>
        <Button size="small" danger icon={<LegacyIcon name="remove" size={14} />}
          onClick={removeAll}>{t('batch.remove')}</Button>
      </Space>
    </div>
  );
}
