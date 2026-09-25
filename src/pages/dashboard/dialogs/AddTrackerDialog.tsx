// AddTrackerDialog — modal for adding tracker URLs to a torrent

import { useState, useEffect } from 'react';
import { Modal, Input, App } from 'antd';
import { useTranslation } from 'react-i18next';
import { exec as rpcExec } from '@/core/rpc/transmission-client';

interface Props {
  open: boolean;
  torrentId: number;
  onClose: () => void;
}

export default function AddTrackerDialog({ open, torrentId, onClose }: Props) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [urls, setUrls] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset stale input whenever the dialog is (re)opened
  useEffect(() => {
    if (open) setUrls('');
  }, [open]);

  const handleOk = async () => {
    const lines = urls.split('\n').map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) { message.warning(t('addTracker.enterUrl')); return; }
    setSaving(true);
    try {
      await rpcExec({ method: 'torrent-set', arguments: { ids: [torrentId], trackerAdd: lines } });
      message.success(t('addTracker.done'));
      setUrls('');
      onClose();
    } catch (e) { message.error(e instanceof Error ? e.message : t('addTracker.failed')); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={t('addTracker.title')} open={open} onOk={handleOk} onCancel={onClose}
      confirmLoading={saving} destroyOnHidden okText={t('addTracker.ok')} cancelText={t('addTracker.cancel')}>
      <Input.TextArea rows={6} value={urls} onChange={(e) => setUrls(e.target.value)}
        placeholder={t('addTracker.placeholder')}
        style={{ fontFamily: 'monospace', fontSize: 12 }} />
    </Modal>
  );
}
