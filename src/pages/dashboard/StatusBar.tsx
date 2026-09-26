import { useTranslation } from 'react-i18next';
import type { SessionStats, SessionGetResponse, TorrentCollection } from '@/core/rpc/rpc-types';
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

export default function StatusBar({ stats, sessionConfig, freeSpaceBytes }: Props) {
  const { t } = useTranslation();



  return (
    <div className="dashboard-statusbar">
      {stats ? (
        <>
          <span>↓ {t('status.dlSpeed')}: <strong>{formatSpeed(stats.downloadSpeed)}</strong></span>
          <span className="stat-sep">|</span>
          <span>↑ {t('status.ulSpeed')}: <strong>{formatSpeed(stats.uploadSpeed)}</strong></span>
        </>
      ) : null}
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
