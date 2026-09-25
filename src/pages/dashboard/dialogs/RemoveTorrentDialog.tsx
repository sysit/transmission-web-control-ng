// RemoveTorrentDialog — delete confirmation with "delete local data" option
// Replicates old dialog-torrent-remove-confirm.html

import { useEffect, useState } from 'react';
import { Modal, Checkbox, message } from 'antd';
import { useTranslation } from 'react-i18next';
import { useRemoveTorrent } from '@/hooks/useTorrents';

interface Props {
  open: boolean;
  ids: number[];
  initialDeleteData?: boolean;
  onClose: () => void;
}

export default function RemoveTorrentDialog({ open, ids, initialDeleteData = false, onClose }: Props) {
  const { t } = useTranslation();
  const removeTorrent = useRemoveTorrent();
  const [deleteData, setDeleteData] = useState(initialDeleteData);

  useEffect(() => {
    if (open) setDeleteData(initialDeleteData);
  }, [open, initialDeleteData]);

  const handleOk = () => {
    removeTorrent.mutate(
      { ids, deleteData },
      {
        onSuccess: onClose,
        onError: () => message.error(t('dialog.remove.remove-error')),
      },
    );
  };

  return (
    <Modal title={t('dialog.remove.title')} open={open} onOk={handleOk}
      onCancel={onClose} confirmLoading={removeTorrent.isPending}
      okText={t('dialog.remove.ok')} cancelText={t('dialog.remove.cancel')} okButtonProps={{ danger: true }}>
      <div style={{ marginBottom: 12, fontSize: 12 }}>
        {ids.length > 1
          ? t('dialog.remove.confirm-text-multi', { count: ids.length })
          : t('dialog.remove.confirm-text')}
      </div>
      <Checkbox checked={deleteData} onChange={(e) => setDeleteData(e.target.checked)}>
        {t('dialog.remove.remove-data')}
      </Checkbox>
    </Modal>
  );
}
