import { Dropdown, App } from 'antd';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Torrent } from '@/core/rpc/rpc-types';
import { TorrentStatus } from '@/core/rpc/rpc-types';
import LegacyIcon from '@/components/LegacyIcon';
import { useRemoveTorrent } from '@/hooks/useTorrents';
import { exec as rpcExec } from '@/core/rpc/transmission-client';

interface Props {
  torrent: Torrent;
  selectedIds: number[];
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onRename: (ids: number[], name: string) => void;
  onRemove: (ids: number[], deleteData: boolean) => void;
  onChangeDir: (ids: number[], dir: string) => void;
  onSetLabels: (ids: number[], labels: string[]) => void;
  onSpeedLimit: (ids: number[]) => void;
}

/** Clipboard helper — `message`/`t` come from the component scope. */
async function copyToClipboard(
  text: string,
  label: string,
  message: ReturnType<typeof App.useApp>['message'],
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  try {
    await navigator.clipboard.writeText(text);
    message.success(`${label} ${t("context.copied")}`);
  } catch {
    message.error(t("context.copyFailed", { label }));
  }
}

export default function TorrentContextMenu({
  torrent, selectedIds, visible, x, y, onClose,
  onRename, onRemove, onChangeDir, onSetLabels, onSpeedLimit,
}: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const removeTorrent = useRemoveTorrent();
  const ids = selectedIds.includes(torrent.id) ? selectedIds : [torrent.id];
  const isRunning = torrent.status === TorrentStatus.DOWNLOAD || torrent.status === TorrentStatus.SEED;
  const isStopped = torrent.status === TorrentStatus.STOPPED;

  const rpc = (method: string, args: Record<string, unknown>) =>
    rpcExec({ method, arguments: args }).catch((e) => {
      message.error(e instanceof Error ? e.message : String(e));
    });

  const items: MenuProps['items'] = [
    {
      key: 'start', label: t('context.start'), icon: <LegacyIcon name="start" size={14} />,
      disabled: isRunning,
      onClick: () => rpc('torrent-start', { ids }),
    },
    {
      key: 'stop', label: t('context.stop'), icon: <LegacyIcon name="pause" size={14} />,
      disabled: isStopped,
      onClick: () => rpc('torrent-stop', { ids }),
    },
    { type: 'divider' },
    {
      key: 'rename', label: t('context.rename'), icon: <LegacyIcon name="rename" size={14} />,
      onClick: () => onRename(ids, torrent.name),
    },
    {
      key: 'remove', label: t('context.remove'), danger: true, icon: <LegacyIcon name="remove" size={14} />,
      onClick: () => (onRemove
        ? onRemove(ids, false)
        : removeTorrent.mutate({ ids, deleteData: false })),
    },
    {
      key: 'removeData', label: t('context.removeData'), danger: true, icon: <LegacyIcon name="remove" size={14} />,
      onClick: () => (onRemove
        ? onRemove(ids, true)
        : removeTorrent.mutate({ ids, deleteData: true })),
    },
    {
      key: 'recheck', label: t('context.recheck'), icon: <LegacyIcon name="verify" size={14} />,
      onClick: () => rpc('torrent-verify', { ids }),
    },
    { type: 'divider' },
    {
      key: 'morePeers', label: t('context.morePeers'), icon: <LegacyIcon name="more-peers" size={14} />,
      onClick: () => rpc('torrent-reannounce', { ids }),
    },
    {
      key: 'changeDownloadDir', label: t('context.changeDownloadDir'), icon: <LegacyIcon name="change-dir" size={14} />,
      onClick: () => onChangeDir(ids, torrent.downloadDir ?? ''),
    },
    {
      key: 'copyPath', label: t('context.copyPath'), icon: <LegacyIcon name="copy-path" size={14} />,
      onClick: () => copyToClipboard(torrent.downloadDir ?? '', t('context.copyPath'), message, t),
    },
    { type: 'divider' },
    {
      key: 'queue', label: t('context.queue'), icon: <LegacyIcon name="queue-move" size={14} />,
      children: [
        {
          key: 'moveToTop', label: t('context.moveToTop'), icon: <LegacyIcon name="queue-move-top" size={12} />,
          onClick: () => rpc('queue-move-top', { ids }),
        },
        {
          key: 'moveUp', label: t('context.moveUp'), icon: <LegacyIcon name="queue-move-up" size={12} />,
          onClick: () => rpc('queue-move-up', { ids }),
        },
        {
          key: 'moveDown', label: t('context.moveDown'), icon: <LegacyIcon name="queue-move-down" size={12} />,
          onClick: () => rpc('queue-move-down', { ids }),
        },
        {
          key: 'moveToBottom', label: t('context.moveToBottom'), icon: <LegacyIcon name="queue-move-bottom" size={12} />,
          onClick: () => rpc('queue-move-bottom', { ids }),
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'magnetLink', label: t('context.magnetLink'), icon: <LegacyIcon name="copy-path" size={14} />,
      onClick: () => copyToClipboard(torrent.magnetLink ?? '', t('context.magnetLink'), message, t),
    },
    {
      key: 'setLabels', label: t('context.setLabels'), icon: <LegacyIcon name="tree-labels" size={14} />,
      onClick: () => onSetLabels(ids, torrent.labels ?? []),
    },
    {
      key: 'setSpeedLimit', label: t('context.setSpeedLimit'), icon: <LegacyIcon name="speed-limit" size={14} />,
      onClick: () => onSpeedLimit(ids),
    },
  ];

  if (!visible) return null;

  return (
    <Dropdown menu={{ items }} open={visible}
      onOpenChange={(open) => { if (!open) onClose(); }}>
      <div style={{ position: 'fixed', left: x, top: y, width: 1, height: 1, pointerEvents: 'none' }} />
    </Dropdown>
  );
}
