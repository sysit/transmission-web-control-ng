// RenameDialog — rename torrent name, replicating old dialog-torrent-rename.html
// Shows current (read-only) name + input prefilled with current name

import { useState, useEffect } from 'react';
import { Modal, Input, App } from 'antd';
import { exec as rpcExec } from '@/core/rpc/transmission-client';

const { TextArea } = Input;

interface Props {
  open: boolean;
  ids: number[];
  currentName: string;
  onClose: () => void;
}

export default function RenameDialog({ open, ids, currentName, onClose }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const handleOk = async () => {
    const newName = name.trim();
    if (!newName) { message.warning('Enter a name'); return; }
    if (newName === currentName) { message.info('No change'); return; }
    setSaving(true);
    try {
      await rpcExec({ method: 'torrent-set', arguments: { ids, name: newName } });
      message.success('Renamed');
      onClose();
    } catch { message.error('Failed to rename'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Rename" open={open} onOk={handleOk} onCancel={onClose}
      confirmLoading={saving} destroyOnClose okText="Rename" cancelText="Cancel">
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Old name</div>
        <div style={{ fontSize: 12, color: 'var(--eui-body-text)', wordBreak: 'break-all' }}>{currentName}</div>
      </div>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>New name</div>
      <TextArea rows={2} value={name} onChange={(e) => setName(e.target.value)} />
    </Modal>
  );
}
