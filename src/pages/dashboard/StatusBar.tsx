import { useTranslation } from 'react-i18next';
import type { SessionStats, SessionGetResponse, TorrentCollection } from '@/core/rpc/rpc-types';
import { TorrentStatus } from '@/core/rpc/rpc-types';
import { formatSpeed, formatSize } from '@/lib/format';
import pkg from '../../../package.json';

interface Props {
  stats: SessionStats | null;
  sessionConfig: SessionGetResponse | null;
  freeSpaceBytes: number | null;
  collection: TorrentCollection | undefined;
}

const APP_VERSION = pkg?.version ?? '2.0.0';
const APP_CODE_UPDATE = import.meta.env.VITE_BUILD_DATE ?? '20260626';

export default function StatusBar({ stats, sessionConfig, freeSpaceBytes, collection }: Props) {
  const { t } = useTranslation();

  const activeCount = collection?.actively.length ?? 0;
  const pausedCount = collection?.status[TorrentStatus.STOPPED]?.length ?? 0;
  const totalCount = collection?.count ?? 0;

  const uptime = stats?.['cumulative-stats']?.secondsActive
    ? (() => {
        const s = stats['cumulative-stats'].secondsActive;
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        if (d > 0) return `${d}d ${h}h`;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
      })()
    : null;

  return (
    <div className="dashboard-statusbar">
      {stats ? (
        <>
          <span>↓ <strong>{formatSpeed(stats.downloadSpeed)}</strong></span>
          <span className="stat-sep">|</span>
          <span>↑ <strong>{formatSpeed(stats.uploadSpeed)}</strong></span>
        </>
      ) : null}
      <span className="stat-sep">|</span>
      <span>{t('status.torrents')}: <strong>{totalCount}</strong></span>
      <span className="stat-sep">|</span>
      <span>{t('status.active')}: <strong>{activeCount}</strong></span>
      <span className="stat-sep">|</span>
      <span>{t('status.paused')}: <strong>{pausedCount}</strong></span>
      {uptime && (
        <>
          <span className="stat-sep">|</span>
          <span>Up: <strong>{uptime}</strong></span>
        </>
      )}
      <span className="stat-sep">|</span>
      <span>
        {t('status.free')}: {freeSpaceBytes != null && freeSpaceBytes >= 0
          ? formatSize(freeSpaceBytes) : '…'}
      </span>
      <span className="stat-right">
        {t('status.version')} {sessionConfig?.version ?? '…'}
        {sessionConfig ? `, RPC: ${sessionConfig['rpc-version']}` : ''}
        , {t('status.webControl')}: {APP_VERSION} ({APP_CODE_UPDATE})
      </span>
    </div>
  );
}
