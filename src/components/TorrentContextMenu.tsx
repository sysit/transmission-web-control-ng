import { Dropdown, message } from 'antd';
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
  onRename?: (ids: number[], name: string) => void;
  onChangeDir?: (ids: number[], dir: string) => void;
  onSetLabels?: (ids: number[], labels: string[]) => void;
  onSpeedLimit?: (ids: number[]) => void;
}

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success(`${label} copied`);
  } catch {
    message.error(`Failed to copy ${label}`);
  }
}

export default function TorrentContextMenu({
  torrent, selectedIds, visible, x, y, onClose,
  onRename, onChangeDir, onSetLabels, onSpeedLimit,
}: Props) {
  const { t } = useTranslation();
  const removeTorrent = useRemoveTorrent();
  const ids = selectedIds.includes(torrent.id) ? selectedIds : [torrent.id];
  const isRunning = torrent.status === TorrentStatus.DOWNLOAD || torrent.status === TorrentStatus.SEED;
  const isStopped = torrent.status === TorrentStatus.STOPPED;

  const rpc = (method: string, args: Record<string, unknown>) =>
    rpcExec({ method, arguments: args }).catch(() => {});

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
      onClick: () => {
        if (onRename) { onRename(ids, torrent.name); return; }
        const newName = prompt('New name:', torrent.name);
        if (newName && newName !== torrent.name) {
          rpc('torrent-set', { ids, name: newName });
        }
      },
    },
    {
      key: 'remove', label: t('context.remove'), danger: true,
      onClick: () => removeTorrent.mutate({ ids, deleteData: false }),
    },
    {
      key: 'removeData', label: t('context.removeData'), danger: true,
      onClick: () => removeTorrent.mutate({ ids, deleteData: true }),
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
      onClick: () => {
        if (onChangeDir) { onChangeDir(ids, torrent.downloadDir ?? ''); return; }
        const dir = prompt('New download directory:', torrent.downloadDir ?? '');
        if (dir) {
          rpc('torrent-set-location', { ids, location: dir });
        }
      },
    },
    {
      key: 'copyPath', label: t('context.copyPath'),
      onClick: () => copyToClipboard(torrent.downloadDir ?? '', 'Path'),
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
      onClick: () => copyToClipboard(torrent.magnetLink ?? '', 'Magnet link'),
    },
    {
      key: 'setLabels', label: t('context.setLabels'),
      onClick: () => {
        if (onSetLabels) { onSetLabels(ids, torrent.labels ?? []); return; }
        const current = (torrent.labels ?? []).join(', ');
        const input = prompt('Set labels (comma-separated). Leave blank to clear:', current);
        if (input !== null) {
          const labels = input.split(',').map((s) => s.trim()).filter(Boolean);
          rpc('torrent-set', { ids, labels });
        }
      },
    },
    {
      key: 'setSpeedLimit', label: t('context.setSpeedLimit'),
      onClick: () => {
        if (onSpeedLimit) { onSpeedLimit(ids); return; }
        const downloadLimit = prompt('Download speed limit (KB/s). Leave blank for no limit:');
        if (downloadLimit !== null) {
          const uploadLimit = prompt('Upload speed limit (KB/s). Leave blank for no limit:');
          if (uploadLimit !== null) {
            const args: Record<string, unknown> = { ids };
            if (downloadLimit) args.downloadLimit = Number(downloadLimit);
            if (uploadLimit) args.uploadLimit = Number(uploadLimit);
            if (downloadLimit === '' && uploadLimit === '') {
              args.honorsSessionLimits = false;
            }
            rpc('torrent-set', args);
          }
        }
      },
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
