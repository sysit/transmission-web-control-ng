import { Dropdown, App } from 'antd';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Torrent } from '@/core/rpc/rpc-types';
import { TorrentStatus } from '@/core/rpc/rpc-types';
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
      key: 'start', label: t('context.start'),
      disabled: isRunning,
      onClick: () => rpc('torrent-start', { ids }),
    },
    {
      key: 'stop', label: t('context.stop'),
      disabled: isStopped,
      onClick: () => rpc('torrent-stop', { ids }),
    },
    { type: 'divider' },
    {
      key: 'rename', label: t('context.rename'),
      onClick: () => onRename(ids, torrent.name),
    },
    {
      key: 'remove', label: t('context.remove'), danger: true,
      onClick: () => (onRemove
        ? onRemove(ids, false)
        : removeTorrent.mutate({ ids, deleteData: false })),
    },
    {
      key: 'removeData', label: t('context.removeData'), danger: true,
      onClick: () => (onRemove
        ? onRemove(ids, true)
        : removeTorrent.mutate({ ids, deleteData: true })),
    },
    {
      key: 'recheck', label: t('context.recheck'),
      onClick: () => rpc('torrent-verify', { ids }),
    },
    { type: 'divider' },
    {
      key: 'morePeers', label: t('context.morePeers'),
      onClick: () => rpc('torrent-reannounce', { ids }),
    },
    {
      key: 'changeDownloadDir', label: t('context.changeDownloadDir'),
      onClick: () => onChangeDir(ids, torrent.downloadDir ?? ''),
    },
    {
      key: 'copyPath', label: t('context.copyPath'),
      onClick: () => copyToClipboard(torrent.downloadDir ?? '', t('context.copyPath'), message, t),
    },
    { type: 'divider' },
    {
      key: 'queue', label: t('context.queue'),
      children: [
        {
          key: 'moveToTop', label: t('context.moveToTop'),
          onClick: () => rpc('queue-move-top', { ids }),
        },
        {
          key: 'moveUp', label: t('context.moveUp'),
          onClick: () => rpc('queue-move-up', { ids }),
        },
        {
          key: 'moveDown', label: t('context.moveDown'),
          onClick: () => rpc('queue-move-down', { ids }),
        },
        {
          key: 'moveToBottom', label: t('context.moveToBottom'),
          onClick: () => rpc('queue-move-bottom', { ids }),
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'magnetLink', label: t('context.magnetLink'),
      onClick: () => copyToClipboard(torrent.magnetLink ?? '', t('context.magnetLink'), message, t),
    },
    {
      key: 'setLabels', label: t('context.setLabels'),
      onClick: () => onSetLabels(ids, torrent.labels ?? []),
    },
    {
      key: 'setSpeedLimit', label: t('context.setSpeedLimit'),
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
