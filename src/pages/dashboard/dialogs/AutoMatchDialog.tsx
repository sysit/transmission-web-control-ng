// AutoMatchDialog — port of old dialog-auto-match-data-folder.html
// Re-locates stopped, 0%-complete torrents by trying each folder in the
// dictionary (Settings → Folders Dictionary): set-location(move:false) →
// verify → poll percentDone. A torrent "matches" once percentDone > 0.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Select, InputNumber, Button, Progress, App } from 'antd';
import { useTranslation } from 'react-i18next';
import { exec as rpcExec } from '@/core/rpc/transmission-client';
import { TorrentStatus, type Torrent } from '@/core/rpc/rpc-types';
import { useConfigStore } from '@/core/config/config-store';

interface Props {
  open: boolean;
  ids: number[];
  torrents: Record<number, Torrent>;
  onClose: () => void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function AutoMatchDialog({ open, ids, torrents, onClose }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const dictionary = useConfigStore((s) => s.folderDictionary);

  const folders = useMemo(
    () => dictionary.split('\n').map((l) => l.trim()).filter(Boolean),
    [dictionary],
  );
  // Candidates: stopped + 0% — i.e. torrents whose data can't be found yet.
  const candidates = useMemo(
    () => ids.filter((id) => {
      const tor = torrents[id];
      return tor && tor.status === TorrentStatus.STOPPED && tor.percentDone === 0;
    }),
    [ids, torrents],
  );

  const [mode, setMode] = useState<number>(1);
  const [intervalSec, setIntervalSec] = useState<number>(3);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [statusText, setStatusText] = useState('');
  const runIdRef = useRef(0);

  useEffect(() => {
    if (open) {
      setRunning(false);
      setProgress(null);
      setStatusText('');
      const savedMode = Number(localStorage.getItem('auto-match-mode') ?? '1');
      const savedInterval = Number(localStorage.getItem('auto-match-interval') ?? '3');
      if (savedMode === 1 || savedMode === 2) setMode(savedMode);
      if (savedInterval >= 0.5) setIntervalSec(savedInterval);
    }
  }, [open]);

  const pollPercentDone = async (id: number): Promise<number> => {
    const res = await rpcExec({
      method: 'torrent-get',
      arguments: { ids: [id], fields: ['percentDone'] },
    });
    const list = (res as { arguments?: { torrents?: { percentDone: number }[] } }).arguments?.torrents;
    return list?.[0]?.percentDone ?? 0;
  };

  /** set-location(move:false) → verify → wait → matched? */
  const tryTorrentInFolder = async (id: number, dir: string): Promise<boolean> => {
    const tor = torrents[id];
    if (tor && tor.downloadDir === dir) return false; // already there, skip
    await rpcExec({ method: 'torrent-set-location', arguments: { ids: [id], location: dir, move: false } });
    await rpcExec({ method: 'torrent-verify', arguments: { ids: [id] } });
    await sleep(intervalSec * 1000);
    return (await pollPercentDone(id)) > 0;
  };

  const handleCancel = () => {
    if (running) {
      runIdRef.current += 1; // signal the running loop to stop
      setRunning(false);
    }
    onClose();
  };

  const handleOk = async () => {
    if (candidates.length === 0) {
      message.warning(t('dialog.autoMatch.noCandidates'));
      return;
    }
    if (folders.length === 0) {
      message.warning(t('dialog.autoMatch.noFolders'));
      return;
    }

    const myRun = ++runIdRef.current;
    const alive = () => runIdRef.current === myRun;
    setRunning(true);

    let matched = 0;
    try {
      if (mode === 1) {
        // Mode 1: each torrent × every folder until one matches.
        for (let i = 0; i < candidates.length && alive(); i++) {
          const id = candidates[i];
          setStatusText(t('dialog.autoMatch.checkingTorrent', {
            name: torrents[id]?.name ?? `#${id}`,
            current: i + 1,
            total: candidates.length,
          }));
          let hit = false;
          for (let f = 0; f < folders.length && alive() && !hit; f++) {
            setStatusText(t('dialog.autoMatch.tryingFolder', { folder: folders[f], current: f + 1, total: folders.length }));
            hit = await tryTorrentInFolder(id, folders[f]);
          }
          if (hit) matched++;
          setProgress({ done: i + 1, total: candidates.length });
        }
      } else {
        // Mode 2: all remaining torrents → folder, verify, keep the unmatched.
        let remaining = [...candidates];
        for (let f = 0; f < folders.length && alive() && remaining.length > 0; f++) {
          setStatusText(t('dialog.autoMatch.tryingFolder', { folder: folders[f], current: f + 1, total: folders.length }));
          const stillThere = remaining.filter((id) => torrents[id]?.downloadDir === folders[f]);
          const toTry = remaining.filter((id) => torrents[id]?.downloadDir !== folders[f]);
          if (toTry.length > 0) {
            await rpcExec({
              method: 'torrent-set-location',
              arguments: { ids: toTry, location: folders[f], move: false },
            });
            await rpcExec({ method: 'torrent-verify', arguments: { ids: toTry } });
            await sleep(intervalSec * 1000);
            const next: number[] = [];
            for (let i = 0; i < toTry.length && alive(); i++) {
              if ((await pollPercentDone(toTry[i])) > 0) matched++;
              else next.push(toTry[i]);
            }
            remaining = [...stillThere, ...next];
          }
          setProgress({ done: candidates.length - remaining.length, total: candidates.length });
        }
      }
      if (alive()) {
        setStatusText(t('dialog.autoMatch.finished', { matched, total: candidates.length }));
        message.success(t('dialog.autoMatch.finished', { matched, total: candidates.length }));
      }
    } catch {
      message.error(t('dialog.autoMatch.failed'));
    } finally {
      if (alive()) setRunning(false);
    }
  };

  return (
    <Modal
      title={t('dialog.autoMatch.title')}
      open={open}
      onCancel={handleCancel}
      width={530}
      destroyOnHidden
      footer={[
        <Button key="cancel" size="small" onClick={handleCancel}>
          {running ? t('dialog.autoMatch.stop') : t('dialog.cancel')}
        </Button>,
        <Button key="ok" size="small" type="primary" loading={running} onClick={handleOk}
          disabled={folders.length === 0 || candidates.length === 0}>
          {t('dialog.autoMatch.start')}
        </Button>,
      ]}
    >
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ width: '30%', padding: 4 }}>{t('dialog.autoMatch.torrentCount')}</td>
            <td>{candidates.length} / {ids.length}</td>
          </tr>
          <tr>
            <td style={{ padding: 4 }}>{t('dialog.autoMatch.folderCount')}</td>
            <td>{folders.length}</td>
          </tr>
          <tr>
            <td style={{ padding: 4 }}>{t('dialog.autoMatch.workMode')}</td>
            <td>
              <Select size="small" style={{ width: 220 }} value={mode}
                onChange={(v) => { setMode(v); localStorage.setItem('auto-match-mode', String(v)); }}
                options={[
                  { value: 1, label: t('dialog.autoMatch.modeTorrent') },
                  { value: 2, label: t('dialog.autoMatch.modeFolder') },
                ]}
              />
            </td>
          </tr>
          <tr>
            <td style={{ padding: 4 }}>{t('dialog.autoMatch.timeInterval')}</td>
            <td>
              <InputNumber size="small" style={{ width: 120 }} min={0.5} step={0.5} value={intervalSec}
                onChange={(v) => {
                  const n = v ?? 3;
                  setIntervalSec(n);
                  localStorage.setItem('auto-match-interval', String(n));
                }}
                suffix="s"
              />
            </td>
          </tr>
        </tbody>
      </table>

      {(progress || statusText) && (
        <div style={{ marginTop: 8 }}>
          {progress && (
            <Progress percent={Math.round((progress.done / progress.total) * 100)} size="small"
              status={running ? 'active' : undefined} />
          )}
          <div style={{ fontSize: 11, color: 'var(--eui-item-text, #666)', wordBreak: 'break-all' }}>
            {statusText}
          </div>
        </div>
      )}

      {folders.length === 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#c00' }}>
          {t('dialog.autoMatch.noFoldersHint')}
        </div>
      )}
    </Modal>
  );
}
