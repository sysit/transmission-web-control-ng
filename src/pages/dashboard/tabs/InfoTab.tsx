// InfoTab — displays torrent metadata in a key-value layout
// Called by TorrentDetailPanel when the "Info" tab is active

import { Button, Descriptions, Tooltip, Typography, App } from 'antd';
import LegacyIcon from '@/components/LegacyIcon';
import { useTranslation } from 'react-i18next';
import type { Torrent } from '@/core/rpc/rpc-types';
import { TorrentStatus } from '@/core/rpc/rpc-types';
import { formatSize, formatSpeed, formatRemainingTime, formatDate } from '@/lib/format';
import PiecesBar from './PiecesBar';

const { Text } = Typography;

interface Props {
  torrent: Torrent | undefined;
  onChangeDownloadDir?: () => void;
}

// i18n keys — resolved via t() at render time (same keys as the table)
const TABLE_STATUS_KEYS: Record<number, string> = {
  [TorrentStatus.STOPPED]: 'statusStopped',
  [TorrentStatus.CHECK_WAIT]: 'statusChkWait',
  [TorrentStatus.CHECK]: 'statusChecking',
  [TorrentStatus.DOWNLOAD_WAIT]: 'statusDlWait',
  [TorrentStatus.DOWNLOAD]: 'statusDownloading',
  [TorrentStatus.SEED_WAIT]: 'statusSdWait',
  [TorrentStatus.SEED]: 'statusSeeding',
};

export default function InfoTab({ torrent, onChangeDownloadDir }: Props) {
  const { message } = App.useApp();
  const { t } = useTranslation();
  if (!torrent) {
    return <Text type="secondary">{t('info.selectPrompt')}</Text>;
  }

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(torrent.downloadDir ?? '');
      message.success(t('info.copied'));
    } catch {
      message.error(t('info.copyFailed'));
    }
  };

  const hasPieces = !!torrent.pieces && (torrent.pieceCount ?? 0) > 0;
  const errorText = torrent.error !== 0 ? `${torrent.errorString} (${torrent.error})` : null;
  const remainingTime = torrent.remainingTime != null
    ? formatRemainingTime(torrent.remainingTime)
    : '';
  const ratioStr = torrent.uploadRatio < 0 ? '∞' : torrent.uploadRatio.toFixed(2);

  const items = [
    { key: 'name', label: t('info.name'), children: <strong>{torrent.name}</strong>, span: 3 },
    {
      key: 'downloadDir', label: t('info.downloadDir'), span: 3,
      children: (
        <span>
          <Text code style={{ fontSize: 11 }}>{torrent.downloadDir}</Text>
          <Tooltip title={t('info.changeDirTip')}>
            <Button type="link" size="small" icon={<LegacyIcon name="change-dir" size={14} />}
              onClick={onChangeDownloadDir} style={{ padding: '0 4px' }} />
          </Tooltip>
          <Tooltip title={t('info.copyPathTip')}>
            <Button type="link" size="small" icon={<LegacyIcon name="copy-path" size={14} />}
              onClick={copyPath} style={{ padding: '0 4px' }} />
          </Tooltip>
        </span>
      ),
    },
    { key: 'status', label: t('info.status'), children: t(TABLE_STATUS_KEYS[torrent.status] ?? '') ?? torrent.status },
    {
      key: 'hashString', label: t('info.hash'),
      children: <Text copyable style={{ fontSize: 11 }}>{torrent.hashString}</Text>,
    },
    ...(errorText ? [{
      key: 'error', label: <span style={{ color: 'red' }}>{t('info.error')}</span>,
      children: <span style={{ color: 'red' }}>{errorText}</span>, span: 3,
    }] : []),
    { key: 'totalSize', label: t('info.totalSize'), children: formatSize(torrent.totalSize) },
    { key: 'addedDate', label: t('info.added'), children: formatDate(torrent.addedDate) },
    {
      key: 'leftUntilDone', label: t('info.remaining'),
      children: `${formatSize(torrent.leftUntilDone)} (${remainingTime})`,
    },
    {
      key: 'completeSize', label: t('info.downloaded'),
      children: formatSize(torrent.completeSize ?? (torrent.totalSize - torrent.leftUntilDone)),
    },
    { key: 'rateDownload', label: t('info.dlSpeed'), children: formatSpeed(torrent.rateDownload) },
    { key: 'rateUpload', label: t('info.ulSpeed'), children: formatSpeed(torrent.rateUpload) },
    { key: 'leecherCount', label: t('info.leechers'), children: torrent.leecher ?? torrent.leecherCount },
    { key: 'seederCount', label: t('info.seeders'), children: torrent.seeder ?? torrent.seederCount },
    { key: 'uploadedEver', label: t('info.uploaded'), children: formatSize(torrent.uploadedEver) },
    { key: 'uploadRatio', label: t('info.ratio'), children: ratioStr },
    { key: 'creator', label: t('info.creator'), children: torrent.creator || '—' },
    { key: 'dateCreated', label: t('info.created'), children: torrent.dateCreated ? formatDate(torrent.dateCreated) : '—' },
    {
      key: 'comment', label: t('info.comment'), span: 3,
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
          <Text type="secondary" style={{ fontSize: 11 }}>{t('info.pieces')}:</Text>
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
