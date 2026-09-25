// RenameDialog — rename torrent name, replicating old dialog-torrent-rename.html
// Shows current (read-only) name + input prefilled with current name

import { useState, useEffect } from 'react';
import { Modal, Input, App } from 'antd';
import { useTranslation } from 'react-i18next';
import { renameTorrentPath } from '@/core/rpc/transmission-client';

const { TextArea } = Input;

interface Props {
  open: boolean;
  ids: number[];
  currentName: string;
  onClose: () => void;
}

export default function RenameDialog({ open, ids, currentName, onClose }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();
  const { t } = useTranslation();

  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const handleOk = async () => {
    const newName = name.trim();
    if (!newName) { message.warning(t('rename.enterName')); return; }
    if (newName === currentName) { message.info(t('rename.noChange')); return; }
    setSaving(true);
    try {
      // torrent-set has no `name` mutator — renaming requires torrent-rename-path
      await renameTorrentPath(ids[0], currentName, newName);
      message.success(t('rename.renamed'));
      onClose();
    } catch (e) { message.error(e instanceof Error ? e.message : t('rename.failed')); }
    finally { setSaving(false); }
  };

  return (
    <Modal title={t('rename.title')} open={open} onOk={handleOk} onCancel={onClose}
      confirmLoading={saving} destroyOnHidden okText={t('rename.ok')} cancelText={t('rename.cancel')}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{t('rename.oldName')}</div>
        <div style={{ fontSize: 12, color: 'var(--eui-body-text)', wordBreak: 'break-all' }}>{currentName}</div>
      </div>
      <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{t('rename.newName')}</div>
      <TextArea rows={2} value={name} onChange={(e) => setName(e.target.value)} />
    </Modal>
  );
}
