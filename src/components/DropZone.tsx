import { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import LegacyIcon from '@/components/LegacyIcon';
import { useAddTorrentFile } from '@/hooks/useTorrents';
import { readTorrentFile } from '@/core/rpc/transmission-client';

/**
 * Full-page drag-and-drop overlay for adding .torrent files.
 * Shows when user drags files over the page, matching the old #dropArea behavior.
 */
export default function DropZone() {
  const [hovering, setHovering] = useState(false);
  const counter = useRef(0);
  const addTorrent = useAddTorrentFile();

  // Track dragEnter/dragLeave count to handle nested element hover
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counter.current++;
    if (e.dataTransfer?.types.includes('Files')) {
      setHovering(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counter.current--;
    if (counter.current <= 0) {
      counter.current = 0;
      setHovering(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counter.current = 0;
    setHovering(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const torrentFiles = Array.from(files).filter((f) => f.name.endsWith('.torrent'));
    if (torrentFiles.length === 0) {
      message.warning('No .torrent files found');
      return;
    }

    const hide = message.loading(`Adding ${torrentFiles.length} torrent(s)...`, 0);

    let failed = 0;
    Promise.all(
      torrentFiles.map(async (file) => {
        try {
          const metainfo = await readTorrentFile(file);
          await addTorrent.mutateAsync({ metainfo, paused: false });
        } catch {
          failed++;
          message.error(`Failed to add: ${file.name}`);
        }
      }),
    ).finally(() => {
      setTimeout(() => {
        hide();
        const ok = torrentFiles.length - failed;
        if (ok > 0 && failed > 0) {
          message.warning(`Added ${ok}/${torrentFiles.length} torrent(s) — ${failed} failed`);
        } else if (ok > 0) {
          message.success(`Added ${ok} torrent(s)`);
        } else {
          message.error('Failed to add all torrents');
        }
      }, 300);
    });
  }, [addTorrent]);

  useEffect(() => {
    document.body.addEventListener('dragenter', handleDragEnter);
    document.body.addEventListener('dragleave', handleDragLeave);
    document.body.addEventListener('dragover', handleDragOver);
    document.body.addEventListener('drop', handleDrop);
    return () => {
      document.body.removeEventListener('dragenter', handleDragEnter);
      document.body.removeEventListener('dragleave', handleDragLeave);
      document.body.removeEventListener('dragover', handleDragOver);
      document.body.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  if (!hovering) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0, 0, 0, 0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'var(--eui-panel-bg)', borderRadius: 12,
        padding: '48px 80px', textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        border: '3px dashed var(--eui-accent-hover)',
      }}>
        <LegacyIcon name="add-torrent" size={64} style={{ marginBottom: 16 }} />
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--eui-body-text)' }}>
          Drop .torrent files here to add them
        </div>
        <div style={{ fontSize: 13, color: 'var(--eui-item-text)', marginTop: 8 }}>
          Press Esc to cancel
        </div>
      </div>
    </div>
  );
}
