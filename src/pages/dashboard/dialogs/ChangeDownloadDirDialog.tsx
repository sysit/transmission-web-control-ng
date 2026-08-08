// ChangeDownloadDirDialog — modal for changing torrent download directory
// Generalized to support multiple torrent ids (single = pass [id]).
// Replicates old dialog-torrent-changeDownloadDir.html: new dir + move-data + recheck-data

import { useState, useEffect } from 'react';
import { Modal, Input, Checkbox, message } from 'antd';
import { exec as rpcExec } from '@/core/rpc/transmission-client';

interface Props {
  open: boolean;
  torrentIds: number[];
  currentDir: string;
  onClose: () => void;
}

export default function ChangeDownloadDirDialog({ open, torrentIds, currentDir, onClose }: Props) {
  const [dir, setDir] = useState(currentDir);
  const [moveData, setMoveData] = useState(false);
  const [recheckData, setRecheckData] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setDir(currentDir); setMoveData(false); setRecheckData(false); }
  }, [open, currentDir]);

  const handleOk = async () => {
    const location = dir.trim();
    if (!location) { message.warning('Enter a directory path'); return; }
    setSaving(true);
    try {
      const args: Record<string, unknown> = { ids: torrentIds, location };
      if (moveData) args.move = true;
      await rpcExec({ method: 'torrent-set-location', arguments: args });
      if (recheckData) {
        await rpcExec({ method: 'torrent-verify', arguments: { ids: torrentIds } });
      }
      message.success('Download directory changed');
      onClose();
    } catch { message.error('Failed to change directory'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Change Download Directory" open={open} onOk={handleOk}
      onCancel={onClose} confirmLoading={saving} destroyOnClose
      okText="Change" cancelText="Cancel">
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>Current directory</div>
        <div style={{ fontSize: 12, color: '#000', wordBreak: 'break-all' }}>{currentDir || '—'}</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>New directory</div>
        <Input value={dir} onChange={(e) => setDir(e.target.value)}
          placeholder="Enter new download directory path…"
          style={{ fontFamily: 'monospace', fontSize: 12 }} />
      </div>
      <Checkbox checked={moveData} onChange={(e) => setMoveData(e.target.checked)}>
        Move data from current location
      </Checkbox>
      <div style={{ marginTop: 6 }}>
        <Checkbox checked={recheckData} onChange={(e) => setRecheckData(e.target.checked)}>
          Recheck data after moving
        </Checkbox>
      </div>
    </Modal>
  );
}
