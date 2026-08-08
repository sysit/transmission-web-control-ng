// UserLabelsTab — per-user label palette (name/description/color), stored in local config.
// Matches old config-user-labels-fields.json datagrid (system.config.labels).

import { useState } from 'react';
import { App, Button, Input, Space, Table, Typography } from 'antd';
import { useConfigStore } from '@/core/config/config-store';
import type { UserLabel } from '@/core/config/config-store';

const { Text } = Typography;

const PALETTE = [
  '#ff9800', '#f44336', '#e91e63', '#9c27b0', '#3f51b5',
  '#2196f3', '#009688', '#4caf50', '#ffc107', '#795548',
];

export default function UserLabelsTab() {
  const labels = useConfigStore((s) => s.labels);
  const { message } = App.useApp();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState(PALETTE[0]);

  const addLabel = () => {
    const n = name.trim();
    if (!n) { message.warning('Label name is required'); return; }
    if (labels.some((l) => l.name === n)) { message.warning(`Label "${n}" already exists`); return; }
    useConfigStore.setState({ labels: [...labels, { name: n, description: desc.trim(), color }] });
    setName(''); setDesc('');
  };

  const removeLabel = (i: number) =>
    useConfigStore.setState({ labels: labels.filter((_, idx) => idx !== i) });

  const updateLabel = (i: number, patch: Partial<UserLabel>) =>
    useConfigStore.setState({ labels: labels.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) });

  return (
    <div className="settings-dialog-pane">
      <Table<UserLabel>
        size="small"
        rowKey={(_, i) => String(i)}
        dataSource={labels}
        pagination={false}
        locale={{ emptyText: 'No labels yet' }}
        columns={[
          {
            title: 'Name', dataIndex: 'name', key: 'name',
            render: (v: string, _r, i) => (
              <Input size="small" defaultValue={v}
                onBlur={(e) => {
                  const t = e.target.value.trim();
                  if (t && t !== v) updateLabel(i, { name: t });
                }} />
            ),
          },
          {
            title: 'Description', dataIndex: 'description', key: 'description',
            render: (v: string, _r, i) => (
              <Input size="small" defaultValue={v}
                onBlur={(e) => { if (e.target.value !== v) updateLabel(i, { description: e.target.value }); }} />
            ),
          },
          {
            title: 'Color', dataIndex: 'color', key: 'color', width: 90,
            render: (v: string, _r, i) => (
              <input type="color" value={v}
                style={{ width: 56, height: 24, border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' }}
                onChange={(e) => updateLabel(i, { color: e.target.value })} />
            ),
          },
          {
            title: '', key: 'action', width: 64,
            render: (_v, _r, i) => (
              <Button size="small" type="link" danger onClick={() => removeLabel(i)}>Delete</Button>
            ),
          },
        ]}
      />

      <Space size="small" wrap style={{ marginTop: 8 }}>
        <Input size="small" placeholder="New label name" value={name}
          onChange={(e) => setName(e.target.value)} style={{ width: 160 }} />
        <Input size="small" placeholder="Description" value={desc}
          onChange={(e) => setDesc(e.target.value)} style={{ width: 160 }} />
        <input type="color" value={color}
          onChange={(e) => setColor(e.target.value)}
          style={{ width: 40, height: 24, border: 'none', padding: 0, cursor: 'pointer', background: 'transparent' }} />
        <Button size="small" type="primary" onClick={addLabel}>Add Label</Button>
      </Space>

      <div style={{ marginTop: 8 }}>
        <Text type="secondary" className="settings-dialog-hint">
          Labels are saved in your browser config. Apply them to torrents via right-click → Set labels.
        </Text>
      </div>
    </div>
  );
}
