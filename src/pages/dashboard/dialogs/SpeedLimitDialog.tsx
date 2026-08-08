// SpeedLimitDialog — per-torrent speed limit editor
// Replicates old dialog-torrent-changeSpeedLimit.html:
// downloadLimited☑ + downloadLimit (KB/s), uploadLimited☑ + uploadLimit (KB/s), peer-limit

import { useState, useEffect } from 'react';
import { Modal, Checkbox, InputNumber, Row, Col, App } from 'antd';
import { exec as rpcExec } from '@/core/rpc/transmission-client';
import type { Torrent } from '@/core/rpc/rpc-types';

interface Props {
  open: boolean;
  ids: number[];
  torrent?: Torrent; // first selected, for prefilling current values
  onClose: () => void;
}

export default function SpeedLimitDialog({ open, ids, torrent, onClose }: Props) {
  const { message } = App.useApp();
  const [downloadLimited, setDownloadLimited] = useState(false);
  const [downloadLimit, setDownloadLimit] = useState<number | null>(null);
  const [uploadLimited, setUploadLimited] = useState(false);
  const [uploadLimit, setUploadLimit] = useState<number | null>(null);
  const [peerLimit, setPeerLimit] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && torrent) {
      setDownloadLimited(!!torrent.downloadLimited);
      setDownloadLimit(torrent.downloadLimit ?? null);
      setUploadLimited(!!torrent.uploadLimited);
      setUploadLimit(torrent.uploadLimit ?? null);
      setPeerLimit(torrent['peer-limit'] ?? null);
    } else if (open) {
      setDownloadLimited(false); setDownloadLimit(null);
      setUploadLimited(false); setUploadLimit(null);
      setPeerLimit(null);
    }
  }, [open, torrent]);

  const handleOk = async () => {
    const args: Record<string, unknown> = { ids };
    args.downloadLimited = downloadLimited;
    args.downloadLimit = downloadLimited ? (downloadLimit ?? 0) : 0;
    args.uploadLimited = uploadLimited;
    args.uploadLimit = uploadLimited ? (uploadLimit ?? 0) : 0;
    if (peerLimit != null) args['peer-limit'] = peerLimit;

    setSaving(true);
    try {
      await rpcExec({ method: 'torrent-set', arguments: args });
      message.success('Speed limits applied');
      onClose();
    } catch { message.error('Failed to apply speed limits'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Speed Limit" open={open} onOk={handleOk} onCancel={onClose}
      confirmLoading={saving} destroyOnClose okText="Apply" cancelText="Cancel"
      width={420}>
      <div style={{ marginTop: 8 }}>
        <Row align="middle" style={{ marginBottom: 8 }}>
          <Col span={11}>
            <Checkbox checked={downloadLimited} onChange={(e) => setDownloadLimited(e.target.checked)}>
              Download limit
            </Checkbox>
          </Col>
          <Col span={13}>
            <InputNumber size="small" min={0} style={{ width: 160 }}
              value={downloadLimit}
              onChange={(v) => setDownloadLimit(v)}
              disabled={!downloadLimited}
              addonAfter="KB/s" />
          </Col>
        </Row>
        <Row align="middle" style={{ marginBottom: 8 }}>
          <Col span={11}>
            <Checkbox checked={uploadLimited} onChange={(e) => setUploadLimited(e.target.checked)}>
              Upload limit
            </Checkbox>
          </Col>
          <Col span={13}>
            <InputNumber size="small" min={0} style={{ width: 160 }}
              value={uploadLimit}
              onChange={(v) => setUploadLimit(v)}
              disabled={!uploadLimited}
              addonAfter="KB/s" />
          </Col>
        </Row>
        <Row align="middle">
          <Col span={11}>
            <span style={{ fontSize: 12 }}>Peer limit</span>
          </Col>
          <Col span={13}>
            <InputNumber size="small" min={0} max={99999} style={{ width: 160 }}
              value={peerLimit}
              onChange={(v) => setPeerLimit(v)} />
          </Col>
        </Row>
      </div>
    </Modal>
  );
}
