// SetLabelsDialog — two-pane label picker replicating old dialog-torrent-setLabels.html
// Left: available labels (config.labels UserLabel[]), Right: currently selected.
// Click a badge to move it between panes.

import { useState, useEffect } from 'react';
import { Modal, App } from 'antd';
import { exec as rpcExec } from '@/core/rpc/transmission-client';
import { useConfigStore } from '@/core/config/config-store';
import type { UserLabel } from '@/core/config/config-store';

interface Props {
  open: boolean;
  ids: number[];
  currentLabels: string[];
  onClose: () => void;
}

/** Luminance-based text color — matches old getGrayLevel()>0.5 → white text */
function textColor(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#000';
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const gray = 0.299 * r + 0.587 * g + 0.114 * b;
  return gray > 0.5 ? '#000' : '#fff';
}

export default function SetLabelsDialog({ open, ids, currentLabels, onClose }: Props) {
  const labels = useConfigStore((s) => s.labels);
  const { message } = App.useApp();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setSelected(currentLabels);
  }, [open, currentLabels]);

  const available = labels.filter((l) => !selected.includes(l.name));
  const selectedLabels = labels.filter((l) => selected.includes(l.name));

  const renderBadge = (l: UserLabel, onSelect: () => void) => (
    <div key={l.name}
      onClick={onSelect}
      style={{
        display: 'inline-block', margin: 4, padding: '3px 10px', borderRadius: 2,
        background: l.color, color: textColor(l.color), cursor: 'pointer',
        fontSize: 12, userSelect: 'none',
      }}>
      {l.name}
    </div>
  );

  const handleOk = async () => {
    setSaving(true);
    try {
      await rpcExec({ method: 'torrent-set', arguments: { ids, labels: selected } });
      message.success('Labels updated');
      onClose();
    } catch { message.error('Failed to update labels'); }
    finally { setSaving(false); }
  };

  return (
    <Modal title="Set Labels" open={open} onOk={handleOk} onCancel={onClose}
      confirmLoading={saving} destroyOnClose okText="Apply" cancelText="Cancel"
      width={560}>
      {labels.length === 0 && (
        <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>
          No labels defined yet. Add them in Settings → User Labels.
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1, border: '1px solid #d0d0d0', borderRadius: 2, padding: 8, minHeight: 160 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Available</div>
          <div>
            {available.length === 0 ? (
              <div style={{ fontSize: 12, color: '#aaa' }}>—</div>
            ) : available.map((l) => renderBadge(l, () => setSelected([...selected, l.name])))}
          </div>
        </div>
        <div style={{ flex: 1, border: '1px solid #d0d0d0', borderRadius: 2, padding: 8, minHeight: 160 }}>
          <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Selected</div>
          <div>
            {selectedLabels.length === 0 ? (
              <div style={{ fontSize: 12, color: '#aaa' }}>—</div>
            ) : selectedLabels.map((l) => renderBadge(l, () => setSelected(selected.filter((n) => n !== l.name))))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
