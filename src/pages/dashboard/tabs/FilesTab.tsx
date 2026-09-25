// FilesTab — torrent file list with priority/wanted controls
// Called by TorrentDetailPanel when the "Files" tab is active

import { useState, useMemo, useCallback } from 'react';
import { Table, Button, Progress, Input, Dropdown, Space } from 'antd';
import { App } from 'antd';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
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

// i18n keys, resolved via t() in the render cell
const PRIORITY_LABELS: Record<number, string> = {
  1: 'files.high',
  0: 'files.normal',
  [-1]: 'files.low',
};

export default function FilesTab({ torrentId, torrentName, files, fileStats }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const qc = useQueryClient();
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
    // Regex on raw user input throws on metacharacters ("(", "[", "+") —
    // fall back to a plain substring match instead of crashing the app.
    try {
      const re = new RegExp(filterText, 'i');
      return dataSource.filter((f) => re.test(f.name));
    } catch {
      const kw = filterText.toLowerCase();
      return dataSource.filter((f) => f.name.toLowerCase().includes(kw));
    }
  }, [dataSource, filterText]);

  const callSetFiles = useCallback(async (args: Record<string, unknown>) => {
    setSaving(true);
    try {
      await rpcExec({ method: 'torrent-set', arguments: { ids: [torrentId], ...args } });
      qc.invalidateQueries({ queryKey: ['torrent', 'detail', torrentId] });
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('files.failed'));
    } finally {
      setSaving(false);
    }
  }, [torrentId, message, qc, t]);

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
    { title: t('files.name'), dataIndex: 'name', key: 'name', width: 300, ellipsis: true,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (v: string) => <span>{v}</span>,
    },
    { title: t('files.size'), dataIndex: 'length', key: 'length', width: 80, align: 'right',
      sorter: (a, b) => a.length - b.length,
      render: (v: number) => <span>{formatSize(v)}</span>,
    },
    { title: t('files.progress'), dataIndex: 'percentDone', key: 'percentDone', width: 70, align: 'center',
      sorter: (a, b) => a.percentDone - b.percentDone,
      render: (v: number) => (
        <Progress percent={v} size="small" showInfo={false}
          style={{ margin: 0 }} strokeLinecap="butt" />
      ),
    },
    { title: t('files.downloaded'), dataIndex: 'bytesCompleted', key: 'bytesCompleted', width: 80, align: 'right',
      sorter: (a, b) => a.bytesCompleted - b.bytesCompleted,
      render: (v: number) => <span>{formatSize(v)}</span>,
    },
    { title: t('files.wanted'), dataIndex: 'wanted', key: 'wanted', width: 60, align: 'center',
      render: (v: boolean) => v
        ? <LegacyIcon name="ok" size={12} style={{ color: '#52c41a' }} />
        : <LegacyIcon name="cancel" size={12} style={{ color: '#ff4d4f' }} />,
    },
    { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 60,
      render: (v: number) => {
        const colors: Record<number, string> = { 1: '#52c41a', 0: '#999', [-1]: '#faad14' };
        return <span style={{ color: colors[v] ?? '#999' }}>
          <LegacyIcon name="flag-normal" size={12} style={{ marginRight: 2 }} />{t(PRIORITY_LABELS[v] ?? '') ?? v}
        </span>;
      },
    },
  ];

  if (!files) return <span className="text-muted">Loading files…</span>;

  return (
    <div style={{ padding: 0 }}>
      <Space size={4} style={{ marginBottom: 4 }}>
        <Button size="small" icon={<LegacyIcon name="allow" size={14} />} loading={saving}
          disabled={selectedRowKeys.length === 0} onClick={handleAllow}>{t('files.allow')}</Button>
        <Button size="small" icon={<LegacyIcon name="deny" size={14} />} loading={saving}
          disabled={selectedRowKeys.length === 0} onClick={handleDeny}>{t('files.deny')}</Button>
        <Dropdown menu={{
          items: [
            { key: 'high', label: t('files.high'), onClick: () => handlePriority(1) },
            { key: 'normal', label: t('files.normal'), onClick: () => handlePriority(0) },
            { key: 'low', label: t('files.low'), onClick: () => handlePriority(-1) },
          ],
        }} disabled={selectedRowKeys.length === 0}>
          <Button size="small" icon={<LegacyIcon name="flag-normal" size={14} />}>{t('files.priorityLabel')}</Button>
        </Dropdown>
        <Input size="small" placeholder={t('files.filter')} prefix={<LegacyIcon name="filter" size={14} />}
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
