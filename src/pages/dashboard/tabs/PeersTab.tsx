// PeersTab — connected peers list
// Called by TorrentDetailPanel when the "Peers" tab is active

import { useMemo } from 'react';
import { Table, Progress } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Peer } from '@/core/rpc/rpc-types';
import { formatSpeed } from '@/lib/format';

interface Props {
  peers?: Peer[];
}

export default function PeersTab({ peers }: Props) {
  const columns = useMemo<ColumnsType<Peer>>(() => [
    { title: 'Address', dataIndex: 'address', key: 'address', width: 180, ellipsis: true,
      render: (v: string) => <span>{v}</span> },
    { title: 'Port', dataIndex: 'port', key: 'port', width: 60, align: 'center',
      render: (v: number) => <span>{v}</span> },
    { title: 'uTP', dataIndex: 'isUTP', key: 'isUTP', width: 50, align: 'center',
      render: (v: boolean) => v
        ? <span style={{ color: '#52c41a' }}>Yes</span>
        : <span style={{ color: '#999' }}>No</span> },
    { title: 'Client', dataIndex: 'clientName', key: 'clientName', width: 120, ellipsis: true,
      render: (v: string) => <span>{v}</span> },
    { title: 'Flags', dataIndex: 'flagStr', key: 'flagStr', width: 60, ellipsis: true,
      render: (v: string) => <span style={{ fontSize: 11, fontFamily: 'monospace' }}>{v}</span> },
    { title: 'Progress', dataIndex: 'progress', key: 'progress', width: 70, align: 'center',
      render: (v: number) => (
        <Progress percent={Math.round(v * 100)} size="small" showInfo={false}
          style={{ margin: 0 }} strokeLinecap="butt" />) },
    { title: '↓ Speed', dataIndex: 'rateToClient', key: 'rateToClient', width: 80, align: 'right',
      sorter: (a, b) => a.rateToClient - b.rateToClient,
      render: (v: number) => <span>{v > 0 ? formatSpeed(v) : ''}</span> },
    { title: '↑ Speed', dataIndex: 'rateToPeer', key: 'rateToPeer', width: 80, align: 'right',
      sorter: (a, b) => a.rateToPeer - b.rateToPeer,
      render: (v: number) => <span>{v > 0 ? formatSpeed(v) : ''}</span> },
  ], []);

  if (!peers) return <span className="text-muted">Loading peers…</span>;

  return (
    <div className="torrent-table-wrapper">
      <Table<Peer> columns={columns} dataSource={peers}
        rowKey={(r) => `${r.address}:${r.port}`} size="small"
        pagination={{ defaultPageSize: 30, size: 'small', showSizeChanger: true,
          pageSizeOptions: ['10', '20', '30', '50', '100', '200'] }}
        scroll={{ y: 350 }} locale={{ emptyText: 'No peers connected' }} />
    </div>
  );
}
