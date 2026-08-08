// InfoTab — displays torrent metadata in a key-value layout
// Called by TorrentDetailPanel when the "Info" tab is active

import { Button, Descriptions, Tooltip, message, Typography } from 'antd';
import LegacyIcon from '@/components/LegacyIcon';
import type { Torrent } from '@/core/rpc/rpc-types';
import { TorrentStatus } from '@/core/rpc/rpc-types';
import { formatSize, formatSpeed, formatRemainingTime, formatDate } from '@/lib/format';
import PiecesBar from './PiecesBar';

const { Text } = Typography;

interface Props {
  torrent: Torrent | undefined;
  onChangeDownloadDir?: () => void;
}

const STATUS_TEXT: Record<number, string> = {
  [TorrentStatus.STOPPED]: 'Stopped',
  [TorrentStatus.CHECK_WAIT]: 'Check Wait',
  [TorrentStatus.CHECK]: 'Checking',
  [TorrentStatus.DOWNLOAD_WAIT]: 'Download Wait',
  [TorrentStatus.DOWNLOAD]: 'Downloading',
  [TorrentStatus.SEED_WAIT]: 'Seed Wait',
  [TorrentStatus.SEED]: 'Seeding',
};

export default function InfoTab({ torrent, onChangeDownloadDir }: Props) {
  if (!torrent) {
    return <Text type="secondary">Select a torrent to view details</Text>;
  }

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(torrent.downloadDir ?? '');
      message.success('Path copied to clipboard');
    } catch {
      message.error('Failed to copy');
    }
  };

  const hasPieces = !!torrent.pieces && (torrent.pieceCount ?? 0) > 0;
  const errorText = torrent.error !== 0 ? `${torrent.errorString} (${torrent.error})` : null;
  const remainingTime = torrent.remainingTime != null
    ? formatRemainingTime(torrent.remainingTime)
    : '';
  const ratioStr = torrent.uploadRatio < 0 ? '∞' : torrent.uploadRatio.toFixed(2);

  const items = [
    { key: 'name', label: 'Name', children: <strong>{torrent.name}</strong>, span: 3 },
    {
      key: 'downloadDir', label: 'Download Dir', span: 3,
      children: (
        <span>
          <Text code style={{ fontSize: 11 }}>{torrent.downloadDir}</Text>
          <Tooltip title="Change download directory">
            <Button type="link" size="small" icon={<LegacyIcon name="change-dir" size={14} />}
              onClick={onChangeDownloadDir} style={{ padding: '0 4px' }} />
          </Tooltip>
          <Tooltip title="Copy path">
            <Button type="link" size="small" icon={<LegacyIcon name="copy-path" size={14} />}
              onClick={copyPath} style={{ padding: '0 4px' }} />
          </Tooltip>
        </span>
      ),
    },
    { key: 'status', label: 'Status', children: STATUS_TEXT[torrent.status] ?? torrent.status },
    {
      key: 'hashString', label: 'Hash',
      children: <Text copyable style={{ fontSize: 11 }}>{torrent.hashString}</Text>,
    },
    ...(errorText ? [{
      key: 'error', label: <span style={{ color: 'red' }}>Error</span>,
      children: <span style={{ color: 'red' }}>{errorText}</span>, span: 3,
    }] : []),
    { key: 'totalSize', label: 'Total Size', children: formatSize(torrent.totalSize) },
    { key: 'addedDate', label: 'Added', children: formatDate(torrent.addedDate) },
    {
      key: 'leftUntilDone', label: 'Remaining',
      children: `${formatSize(torrent.leftUntilDone)} (${remainingTime})`,
    },
    {
      key: 'completeSize', label: 'Downloaded',
      children: formatSize(torrent.completeSize ?? (torrent.totalSize - torrent.leftUntilDone)),
    },
    { key: 'rateDownload', label: '↓ Speed', children: formatSpeed(torrent.rateDownload) },
    { key: 'rateUpload', label: '↑ Speed', children: formatSpeed(torrent.rateUpload) },
    { key: 'leecherCount', label: 'Leechers', children: torrent.leecher ?? torrent.leecherCount },
    { key: 'seederCount', label: 'Seeders', children: torrent.seeder ?? torrent.seederCount },
    { key: 'uploadedEver', label: 'Uploaded', children: formatSize(torrent.uploadedEver) },
    { key: 'uploadRatio', label: 'Ratio', children: ratioStr },
    { key: 'creator', label: 'Creator', children: torrent.creator || '—' },
    { key: 'dateCreated', label: 'Created', children: torrent.dateCreated ? formatDate(torrent.dateCreated) : '—' },
    {
      key: 'comment', label: 'Comment', span: 3,
      children: <span style={{ wordBreak: 'break-all' }}>{torrent.comment || '—'}</span>,
    },
  ];

  return (
    <div style={{ padding: 2 }}>
      <Descriptions bordered size="small" column={2}
        colon={false}
        style={{ fontSize: 11 }}
        styles={{
          label: {
            fontSize: 11, fontWeight: 'normal', color: 'var(--eui-item-text)',
            textAlign: 'right', padding: '1px 6px', width: 100,
            background: 'var(--eui-content-bg)',
          },
          content: { fontSize: 11, padding: '1px 6px' },
        }}
        items={items.map(({ key, ...rest }) => ({
          key,
          ...rest,
          label: <span style={{ fontSize: 11, fontWeight: 'normal' }}>{rest.label}:</span>,
          children: <span style={{ fontSize: 11 }}>{rest.children}</span>,
        }) as never)}
      />
      {hasPieces && (
        <div style={{ marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>Pieces:</Text>
          <PiecesBar
            pieces={torrent.pieces!}
            pieceCount={torrent.pieceCount!}
            pieceSize={torrent.pieceSize!}
          />
        </div>
      )}
    </div>
  );
}
