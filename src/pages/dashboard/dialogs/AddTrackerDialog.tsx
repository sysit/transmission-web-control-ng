// AddTrackerDialog — modal for adding tracker URLs to a torrent

import { useState } from 'react';
import { Modal, Input, message } from 'antd';
import { exec as rpcExec } from '@/core/rpc/transmission-client';

interface Props {
  open: boolean;
  torrentId: number;
  onClose: () => void;
}

export default function AddTrackerDialog({ open, torrentId, onClose }: Props) {
  const [urls, setUrls] = useState('');
  const [saving, setSaving] = useState(false);

  const handleOk = async () => {
    const lines = urls.split('\n').map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) { message.warning('Enter at least one tracker URL'); return; }
    setSaving(true);
    try {
      await rpcExec({ method: 'torrent-set', arguments: { ids: [torrentId], trackerAdd: lines } });
      message.success('Tracker(s) added');
      setUrls('');
      onClose();
    } catch { message.error('Failed to add tracker(s)'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Add Tracker" open={open} onOk={handleOk} onCancel={onClose}
      confirmLoading={saving} destroyOnClose okText="Add" cancelText="Cancel">
      <Input.TextArea rows={6} value={urls} onChange={(e) => setUrls(e.target.value)}
        placeholder="Enter tracker URLs, one per line…"
        style={{ fontFamily: 'monospace', fontSize: 12 }} />
    </Modal>
  );
}
