// ReplaceTrackerDialog — replace a tracker URL on selected torrents
// Replicates old dialog-system-replaceTracker.html: old-url + new-url + tip

import { useState, useEffect } from 'react';
import { Modal, Input, App } from 'antd';
import { useTranslation } from 'react-i18next';
import { exec as rpcExec } from '@/core/rpc/transmission-client';

interface Props {
  open: boolean;
  ids: number[];
  onClose: () => void;
}

export default function ReplaceTrackerDialog({ open, ids, onClose }: Props) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [oldUrl, setOldUrl] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset stale input whenever the dialog is (re)opened for a new selection
  useEffect(() => {
    if (open) { setOldUrl(''); setNewUrl(''); }
  }, [open]);

  const handleOk = async () => {
    const oldU = oldUrl.trim();
    const newU = newUrl.trim();
    if (!oldU) { message.warning(t('replaceTracker.enterOld')); return; }
    if (!newU) { message.warning(t('replaceTracker.enterNew')); return; }
    setSaving(true);
    try {
      await rpcExec({ method: 'torrent-set', arguments: { ids, trackerReplace: [oldU, newU] } });
      message.success(t('replaceTracker.done'));
      setOldUrl(''); setNewUrl('');
      onClose();
    } catch (e) { message.error(e instanceof Error ? e.message : t('replaceTracker.failed')); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={t('replaceTracker.title')} open={open} onOk={handleOk} onCancel={onClose}
      confirmLoading={saving} destroyOnHidden okText={t('replaceTracker.ok')} cancelText={t('replaceTracker.cancel')}
      width={480}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
        {t('replaceTracker.tip')}
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{t('replaceTracker.oldUrl')}</div>
        <Input size="small" value={oldUrl} onChange={(e) => setOldUrl(e.target.value)}
          placeholder="https://tracker.example.com/announce"
          style={{ fontFamily: 'monospace', fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{t('replaceTracker.newUrl')}</div>
        <Input size="small" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://new-tracker.example.com/announce"
          style={{ fontFamily: 'monospace', fontSize: 12 }} />
      </div>
    </Modal>
  );
}
