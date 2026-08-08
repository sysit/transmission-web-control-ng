// FilesTab — torrent file list with priority/wanted controls
// Called by TorrentDetailPanel when the "Files" tab is active

import { useState, useMemo, useCallback } from 'react';
import { Table, Button, Progress, Input, Dropdown, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TorrentFile, TorrentFileStat } from '@/core/rpc/rpc-types';
import { exec as rpcExec } from '@/core/rpc/transmission-client';
import { formatSize } from '@/lib/format';
import LegacyIcon from '@/components/LegacyIcon';

interface FileRow {
  index: number;
  name: string;
  length: number;
  bytesCompleted: number;
  percentDone: number;
  wanted: boolean;
  priority: number;
}

interface Props {
  torrentId: number;
  torrentName: string;
  files?: TorrentFile[];
  fileStats?: TorrentFileStat[];
}

const PRIORITY_LABELS: Record<number, string> = {
  1: 'High',
  0: 'Normal',
  [-1]: 'Low',
};

export default function FilesTab({ torrentId, torrentName, files, fileStats }: Props) {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filterText, setFilterText] = useState('');
  const [saving, setSaving] = useState(false);

  const dataSource = useMemo<FileRow[]>(() => {
    if (!files || !fileStats) return [];
    const nameLen = torrentName ? torrentName.length + 1 : 0;
    return files.map((file, i) => {
      const stats = fileStats[i];
      if (!stats) return null;
      const pct = file.length > 0
        ? parseFloat((stats.bytesCompleted / file.length * 100).toFixed(2))
        : 0;
      return {
        index: i,
        name: i === 0 || file.name === torrentName
          ? file.name
          : file.name.substring(nameLen) || file.name,
        length: file.length,
        bytesCompleted: stats.bytesCompleted,
        percentDone: pct,
        wanted: stats.wanted,
        priority: stats.priority,
      };
    }).filter(Boolean) as FileRow[];
  }, [files, fileStats, torrentName]);

  const filteredData = useMemo(() => {
    if (!filterText) return dataSource;
    const re = new RegExp(filterText, 'i');
    return dataSource.filter((f) => re.test(f.name));
  }, [dataSource, filterText]);

  const callSetFiles = useCallback(async (args: Record<string, unknown>) => {
    setSaving(true);
    try {
      await rpcExec({ method: 'torrent-set', arguments: { ids: [torrentId], ...args } });
    } catch {
      message.error('Operation failed');
    } finally {
      setSaving(false);
    }
  }, [torrentId]);

  const handleAllow = () => {
    const indices = selectedRowKeys.map(Number);
    if (indices.length === 0) return;
    callSetFiles({ 'files-wanted': indices });
  };

  const handleDeny = () => {
    const indices = selectedRowKeys.map(Number);
    if (indices.length === 0) return;
    callSetFiles({ 'files-unwanted': indices });
  };

  const handlePriority = (priority: number) => {
    const indices = selectedRowKeys.map(Number);
    if (indices.length === 0) return;
    const key = priority === 1 ? 'priority-high'
      : priority === -1 ? 'priority-low'
        : 'priority-normal';
    callSetFiles({ [key]: indices });
  };

  const columns: ColumnsType<FileRow> = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 300, ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (v: string) => <span>{v}</span>,
    },
    { title: 'Size', dataIndex: 'length', key: 'length', width: 80, align: 'right',
      sorter: (a, b) => a.length - b.length,
      render: (v: number) => <span>{formatSize(v)}</span>,
    },
    { title: 'Progress', dataIndex: 'percentDone', key: 'percentDone', width: 70, align: 'center',
      sorter: (a, b) => a.percentDone - b.percentDone,
      render: (v: number) => (
        <Progress percent={v} size="small" showInfo={false}
          style={{ margin: 0 }} strokeLinecap="butt" />
      ),
    },
    { title: 'Downloaded', dataIndex: 'bytesCompleted', key: 'bytesCompleted', width: 80, align: 'right',
      sorter: (a, b) => a.bytesCompleted - b.bytesCompleted,
      render: (v: number) => <span>{formatSize(v)}</span>,
    },
    { title: 'Wanted', dataIndex: 'wanted', key: 'wanted', width: 60, align: 'center',
      render: (v: boolean) => v
        ? <LegacyIcon name="ok" size={12} style={{ color: '#52c41a' }} />
        : <LegacyIcon name="cancel" size={12} style={{ color: '#ff4d4f' }} />,
    },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 60,
      render: (v: number) => {
        const colors: Record<number, string> = { 1: '#52c41a', 0: '#999', [-1]: '#faad14' };
        return <span style={{ color: colors[v] ?? '#999' }}>
          <LegacyIcon name="flag-normal" size={12} style={{ marginRight: 2 }} />{PRIORITY_LABELS[v] ?? v}
        </span>;
      },
    },
  ];

  if (!files) return <span className="text-muted">Loading files…</span>;

  return (
    <div style={{ padding: 0 }}>
      <Space size={4} style={{ marginBottom: 4 }}>
        <Button size="small" icon={<LegacyIcon name="allow" size={14} />} loading={saving}
          disabled={selectedRowKeys.length === 0} onClick={handleAllow}>Allow</Button>
        <Button size="small" icon={<LegacyIcon name="deny" size={14} />} loading={saving}
          disabled={selectedRowKeys.length === 0} onClick={handleDeny}>Deny</Button>
        <Dropdown menu={{
          items: [
            { key: 'high', label: 'High Priority', onClick: () => handlePriority(1) },
            { key: 'normal', label: 'Normal Priority', onClick: () => handlePriority(0) },
            { key: 'low', label: 'Low Priority', onClick: () => handlePriority(-1) },
          ],
        }} disabled={selectedRowKeys.length === 0}>
          <Button size="small" icon={<LegacyIcon name="flag-normal" size={14} />}>Priority</Button>
        </Dropdown>
        <Input size="small" placeholder="Filter…" prefix={<LegacyIcon name="filter" size={14} />}
          style={{ width: 120 }} value={filterText}
          onChange={(e) => setFilterText(e.target.value)} allowClear />
      </Space>
      <div className="torrent-table-wrapper">
        <Table<FileRow>
          columns={columns} dataSource={filteredData} rowKey="index"
          size="small" pagination={{ defaultPageSize: 30, size: 'small', showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '50', '100', '200', '5000'] }}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          scroll={{ y: 350 }}
        />
      </div>
    </div>
  );
}
