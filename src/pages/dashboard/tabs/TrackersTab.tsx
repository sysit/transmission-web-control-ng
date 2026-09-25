// TrackersTab — tracker list with add/replace/remove controls
// Called by TorrentDetailPanel when the "Trackers" tab is active

import { useState, useMemo, useCallback } from 'react';
import { Table, Button, Space, Tag } from 'antd';
import { App } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import LegacyIcon from '@/components/LegacyIcon';
import type { TrackerStat } from '@/core/rpc/rpc-types';
import { TrackerAnnounceState } from '@/core/rpc/rpc-types';
import { exec as rpcExec } from '@/core/rpc/transmission-client';
import { formatDate } from '@/lib/format';

interface Props {
  torrentId: number;
  trackerStats?: TrackerStat[];
  onAddTracker?: () => void;
}

// i18n keys — resolved via t() at render time
const ANNOUNCE_STATE_LABELS: Record<number, string> = {
  [TrackerAnnounceState.INACTIVE]: 'trackers.inactive',
  [TrackerAnnounceState.WAITING]: 'trackers.waiting',
  [TrackerAnnounceState.QUEUED]: 'trackers.queued',
  [TrackerAnnounceState.ACTIVE]: 'trackers.active',
};

const ANNOUNCE_STATE_COLORS: Record<number, string> = {
  [TrackerAnnounceState.INACTIVE]: 'default',
  [TrackerAnnounceState.WAITING]: 'processing',
  [TrackerAnnounceState.QUEUED]: 'warning',
  [TrackerAnnounceState.ACTIVE]: 'success',
};

export default function TrackersTab({ torrentId, trackerStats, onAddTracker }: Props) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedRow, setSelectedRow] = useState<TrackerStat | null>(null);
  const [saving, setSaving] = useState(false);

  const handleReplace = useCallback(async () => {
    if (!selectedRow) return;
    const url = prompt(t('trackers.newUrlPrompt'), selectedRow.announce);
    if (!url || url === selectedRow.announce) return;
    setSaving(true);
    try {
      await rpcExec({
        method: 'torrent-set',
        arguments: { ids: [torrentId], trackerReplace: [selectedRow.id, url] },
      });
      qc.invalidateQueries({ queryKey: ['torrent', 'detail', torrentId] });
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to replace tracker');
    } finally {
      setSaving(false);
    }
  }, [torrentId, selectedRow, qc, message, t]);

  const handleRemove = useCallback(async () => {
    if (!selectedRow) return;
    if (!confirm(t('trackers.removeConfirm', { url: selectedRow.announce }))) return;
    setSaving(true);
    try {
      await rpcExec({
        method: 'torrent-set',
        arguments: { ids: [torrentId], trackerRemove: [selectedRow.id] },
      });
      qc.invalidateQueries({ queryKey: ['torrent', 'detail', torrentId] });
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to remove tracker');
    } finally {
      setSaving(false);
    }
  }, [torrentId, selectedRow, qc, message, t]);

  const columns = useMemo<ColumnsType<TrackerStat>>(() => [
    { title: t('trackers.announce'), dataIndex: 'announce', key: 'announce', width: 250, ellipsis: true,
      render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span>,
    },
    { title: t('trackers.status'), dataIndex: 'announceState', key: 'announceState', width: 70,
      render: (v: number) => (
        <Tag color={ANNOUNCE_STATE_COLORS[v] ?? 'default'} style={{ fontSize: 10 }}>
          {t(ANNOUNCE_STATE_LABELS[v] ?? '') ?? v}
        </Tag>
      ),
    },
    { title: t('trackers.lastAnnounce'), dataIndex: 'lastAnnounceResult', key: 'lastAnnounceResult', width: 150,
      ellipsis: true,
      render: (v: string) => {
        const isSuccess = v?.toLowerCase() === 'success';
        return <span style={{ color: isSuccess ? '#52c41a' : '#ff4d4f', fontSize: 11 }}>{v}</span>;
      },
    },
    { title: t('trackers.dl'), dataIndex: 'downloadCount', key: 'downloadCount', width: 50, align: 'right',
      render: (v: number) => <span style={{ fontSize: 12 }}>{v === -1 ? '?' : v}</span>,
    },
    { title: t('trackers.leech'), dataIndex: 'leecherCount', key: 'leecherCount', width: 50, align: 'right',
      render: (v: number) => <span style={{ fontSize: 12 }}>{v === -1 ? '?' : v}</span>,
    },
    { title: t('trackers.seed'), dataIndex: 'seederCount', key: 'seederCount', width: 50, align: 'right',
      render: (v: number) => <span style={{ fontSize: 12 }}>{v === -1 ? '?' : v}</span>,
    },
    { title: t('trackers.succeeded'), dataIndex: 'lastAnnounceSucceeded', key: 'lastAnnounceSucceeded',
      width: 70, align: 'center',
      render: (v: boolean) => v
        ? <span style={{ color: '#52c41a' }}>Yes</span>
        : <span style={{ color: '#ff4d4f' }}>No</span>,
    },
    { title: t('trackers.lastTime'), dataIndex: 'lastAnnounceTime', key: 'lastAnnounceTime', width: 120,
      align: 'center',
      render: (v: number) => <span style={{ fontSize: 11 }}>{v ? formatDate(v) : ''}</span>,
    },
    { title: t('trackers.timedOut'), dataIndex: 'lastAnnounceTimedOut', key: 'lastAnnounceTimedOut',
      width: 70, align: 'center',
      render: (v: boolean) => v
        ? <span style={{ color: '#ff4d4f' }}>Yes</span>
        : <span style={{ color: '#52c41a' }}>No</span>,
    },
    { title: t('trackers.next'), dataIndex: 'nextAnnounceTime', key: 'nextAnnounceTime', width: 120,
      align: 'center',
      render: (v: number) => <span style={{ fontSize: 11 }}>{v ? formatDate(v) : ''}</span>,
    },
  ], [t]);

  if (!trackerStats) return <span style={{ fontSize: 12, color: '#999' }}>{t('trackers.loading')}</span>;

  return (
    <div style={{ padding: 0 }}>
      <Space size={4} style={{ marginBottom: 4 }}>
        <Button size="small" icon={<LegacyIcon name="tracker-add" size={14} />} onClick={onAddTracker}>{t('trackers.addBtn')}</Button>
        <Button size="small" icon={<LegacyIcon name="tracker-edit" size={14} />} loading={saving}
          disabled={!selectedRow} onClick={handleReplace}>{t('trackers.replace')}</Button>
        <Button size="small" danger icon={<LegacyIcon name="tracker-remove" size={14} />} loading={saving}
          disabled={!selectedRow} onClick={handleRemove}>{t('trackers.remove')}</Button>
      </Space>
      <Table<TrackerStat>
        columns={columns} dataSource={trackerStats} rowKey="id"
        size="small" pagination={{ defaultPageSize: 30, size: 'small',
          showSizeChanger: true, pageSizeOptions: ['10', '20', '30', '50', '100'] }}
        rowSelection={{
          type: 'radio',
          selectedRowKeys: selectedRow ? [selectedRow.id] : [],
          onChange: (_keys, rows) => setSelectedRow(rows[0] ?? null),
        }}
        scroll={{ y: 350 }}
      />
    </div>
  );
}
