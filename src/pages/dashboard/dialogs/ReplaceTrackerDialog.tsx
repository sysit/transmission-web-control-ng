// ReplaceTrackerDialog — replace a tracker URL on selected torrents
// Replicates old dialog-system-replaceTracker.html: old-url + new-url + tip

import { useState } from 'react';
import { Modal, Input, App } from 'antd';
import { exec as rpcExec } from '@/core/rpc/transmission-client';

interface Props {
  open: boolean;
  ids: number[];
  onClose: () => void;
}

export default function ReplaceTrackerDialog({ open, ids, onClose }: Props) {
  const { message } = App.useApp();
  const [oldUrl, setOldUrl] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOk = async () => {
    const oldU = oldUrl.trim();
    const newU = newUrl.trim();
    if (!oldU) { message.warning('Enter the tracker URL to replace'); return; }
    if (!newU) { message.warning('Enter the new tracker URL'); return; }
    setSaving(true);
    try {
      await rpcExec({ method: 'torrent-set', arguments: { ids, trackerReplace: [oldU, newU] } });
      message.success('Tracker replaced');
      setOldUrl(''); setNewUrl('');
      onClose();
    } catch { message.error('Failed to replace tracker'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Replace Tracker" open={open} onOk={handleOk} onCancel={onClose}
      confirmLoading={saving} destroyOnClose okText="Replace" cancelText="Cancel"
      width={480}>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
        Replaces a tracker announce URL with a new one on all selected torrents.
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Old tracker URL</div>
        <Input size="small" value={oldUrl} onChange={(e) => setOldUrl(e.target.value)}
          placeholder="https://tracker.example.com/announce"
          style={{ fontFamily: 'monospace', fontSize: 12 }} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>New tracker URL</div>
        <Input size="small" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://new-tracker.example.com/announce"
          style={{ fontFamily: 'monospace', fontSize: 12 }} />
      </div>
    </Modal>
  );
}
