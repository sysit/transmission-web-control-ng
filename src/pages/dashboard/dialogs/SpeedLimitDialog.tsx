// SpeedLimitDialog — per-torrent speed limit editor
// Replicates old dialog-torrent-changeSpeedLimit.html:
// downloadLimited☑ + downloadLimit (KB/s), uploadLimited☑ + uploadLimit (KB/s), peer-limit

import { useState, useEffect } from 'react';
import { Modal, Checkbox, InputNumber, Row, Col, App } from 'antd';
import { useTranslation } from 'react-i18next';
import { exec as rpcExec } from '@/core/rpc/transmission-client';

/** Prefill snapshot taken when the dialog opens — never seed from live
 *  torrent props: their identity churns every 5s poll and would wipe input. */
export interface SpeedLimitInitial {
  downloadLimited: boolean;
  downloadLimit: number | null;
  uploadLimited: boolean;
  uploadLimit: number | null;
  peerLimit: number | null;
}

interface Props {
  open: boolean;
  ids: number[];
  initial?: SpeedLimitInitial;
  onClose: () => void;
}

export default function SpeedLimitDialog({ open, ids, initial, onClose }: Props) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const [downloadLimited, setDownloadLimited] = useState(false);
  const [downloadLimit, setDownloadLimit] = useState<number | null>(null);
  const [uploadLimited, setUploadLimited] = useState(false);
  const [uploadLimit, setUploadLimit] = useState<number | null>(null);
  const [peerLimit, setPeerLimit] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && initial) {
      setDownloadLimited(initial.downloadLimited);
      setDownloadLimit(initial.downloadLimit);
      setUploadLimited(initial.uploadLimited);
      setUploadLimit(initial.uploadLimit);
      setPeerLimit(initial.peerLimit);
    } else if (open) {
      setDownloadLimited(false); setDownloadLimit(null);
      setUploadLimited(false); setUploadLimit(null);
      setPeerLimit(null);
    }
    // `initial` is a stable snapshot object created at open time
  }, [open, initial]);

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
      message.success(t('speedLimit.done'));
      onClose();
    } catch (e) { message.error(e instanceof Error ? e.message : t('speedLimit.failed')); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={t('speedLimit.title')} open={open} onOk={handleOk} onCancel={onClose}
      confirmLoading={saving} destroyOnHidden okText={t('speedLimit.apply')} cancelText={t('speedLimit.cancel')}
      width={420}>
      <div style={{ marginTop: 8 }}>
        <Row align="middle" style={{ marginBottom: 8 }}>
          <Col span={11}>
            <Checkbox checked={downloadLimited} onChange={(e) => setDownloadLimited(e.target.checked)}>
              {t('speedLimit.dl')}
            </Checkbox>
          </Col>
          <Col span={13}>
            <InputNumber size="small" min={0} style={{ width: 160 }}
              value={downloadLimit}
              onChange={(v) => setDownloadLimit(v)}
              disabled={!downloadLimited}
              suffix="KB/s" />
          </Col>
        </Row>
        <Row align="middle" style={{ marginBottom: 8 }}>
          <Col span={11}>
            <Checkbox checked={uploadLimited} onChange={(e) => setUploadLimited(e.target.checked)}>
              {t('speedLimit.ul')}
            </Checkbox>
          </Col>
          <Col span={13}>
            <InputNumber size="small" min={0} style={{ width: 160 }}
              value={uploadLimit}
              onChange={(v) => setUploadLimit(v)}
              disabled={!uploadLimited}
              suffix="KB/s" />
          </Col>
        </Row>
        <Row align="middle">
          <Col span={11}>
            <span style={{ fontSize: 12 }}>{t('speedLimit.peerLimit')}</span>
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
