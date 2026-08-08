// AddTorrentDialog — modal dialog for adding torrents by URL or file upload
// Matches old version's dialog-torrent-add.html behavior

import { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Select, Checkbox, Input, Upload, Typography, App } from 'antd';
import LegacyIcon from '@/components/LegacyIcon';
import type { UploadFile } from 'antd/es/upload';
import {
  readTorrentFile,
  addTorrentFromFile,
  addTorrentFromUrl,
  exec as rpcExec,
} from '@/core/rpc/transmission-client';
import { useSessionConfig } from '@/hooks/useTorrents';
import { useQueryClient } from '@tanstack/react-query';

const { TextArea } = Input;
const { Dragger } = Upload;
const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  downloadDirs: string[];
  defaultDownloadDir: string;
}

export default function AddTorrentDialog({
  open, onClose, downloadDirs, defaultDownloadDir,
}: Props) {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [progress, setProgress] = useState('');
  const { message } = App.useApp();
  const { data: sessionConfig } = useSessionConfig();
  const qc = useQueryClient();

  const dirOptions = [...new Set([
    defaultDownloadDir,
    ...downloadDirs,
  ])].filter(Boolean).map((d) => ({
    value: d, label: d,
  }));

  useEffect(() => {
    if (open) {
      form.resetFields();
      setFileList([]);
      setProgress('');
      form.setFieldsValue({
        downloadDir: defaultDownloadDir,
        autoStart: sessionConfig?.['start-added-torrents'] ?? true,
        setDefaultDir: false,
      });
    }
  }, [open, form, defaultDownloadDir, sessionConfig]);

  const applyDefaultDir = useCallback(async (dir: string) => {
    if (form.getFieldValue('setDefaultDir') && dir) {
      try {
        await rpcExec({ method: 'session-set', arguments: { 'download-dir': dir } });
        qc.invalidateQueries({ queryKey: ['session-config'] });
      } catch { /* non-fatal: default dir not persisted */ }
    }
  }, [form, qc]);

  const handleUploadFile = useCallback(async () => {
    if (fileList.length === 0) return;
    const dir = form.getFieldValue('downloadDir') || defaultDownloadDir;
    const paused = !form.getFieldValue('autoStart');

    setUploading(true);
    let uploaded = 0;
    const total = fileList.length;

    for (const file of fileList) {
      try {
        const originFile = file.originFileObj;
        if (!originFile) continue;
        const metainfo = await readTorrentFile(originFile);
        await addTorrentFromFile(metainfo, dir, paused);
        uploaded++;
        setProgress(`${uploaded}/${total}`);
      } catch {
        message.error(`Failed to upload: ${file.name}`);
      }
    }

    await applyDefaultDir(dir);
    setUploading(false);
    setProgress('');
    qc.invalidateQueries({ queryKey: ['torrents'] });
    onClose();
  }, [fileList, form, defaultDownloadDir, message, qc, onClose, applyDefaultDir]);

  const handleSubmitUrl = useCallback(async () => {
    const url = form.getFieldValue('url');
    if (!url || !url.trim()) return;
    const dir = form.getFieldValue('downloadDir') || defaultDownloadDir;
    const paused = !form.getFieldValue('autoStart');

    const urls = url.split('\n').filter((u: string) => u.trim());
    setUploading(true);
    let done = 0;

    for (const u of urls) {
      try {
        await addTorrentFromUrl(u.trim(), dir, paused);
      } catch {
        message.error(`Failed to add: ${u.trim().substring(0, 60)}...`);
      }
      done++;
      setProgress(`${done}/${urls.length}`);
    }

    await applyDefaultDir(dir);
    setUploading(false);
    setProgress('');
    qc.invalidateQueries({ queryKey: ['torrents'] });
    onClose();
  }, [form, defaultDownloadDir, message, qc, onClose, applyDefaultDir]);

  const handleOk = useCallback(async () => {
    const url = form.getFieldValue('url');
    if (fileList.length > 0) {
      await handleUploadFile();
    } else if (url && url.trim()) {
      await handleSubmitUrl();
    } else {
      message.warning('Please provide a torrent URL or select a file to upload.');
    }
  }, [form, fileList, handleUploadFile, handleSubmitUrl, message]);

  return (
    <Modal
      title="Add Torrent"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={uploading}
      okText="Add"
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
        <Form.Item name="downloadDir" label="Download Directory">
          <Select
            showSearch
            options={dirOptions}
            placeholder="Select download directory"
          />
        </Form.Item>

        <Form.Item name="setDefaultDir" valuePropName="checked" style={{ marginBottom: 8 }}>
          <Checkbox>Set as default directory</Checkbox>
        </Form.Item>

        <Form.Item label="Upload Torrent File(s)">
          <Dragger
            multiple
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
            beforeUpload={() => false}
            accept=".torrent"
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <LegacyIcon name="add-torrent" size={36} />
            </p>
            <p className="ant-upload-text">Click or drag .torrent files to this area</p>
          </Dragger>
        </Form.Item>

        <Form.Item name="url" label="Or Enter Torrent URL / Magnet Link">
          <TextArea
            rows={5}
            placeholder={'Enter one or more torrent URLs or magnet links, one per line.\n\nExamples:\nhttps://example.com/file.torrent\nmagnet:?xt=urn:btih:...'}
            disabled={uploading}
          />
        </Form.Item>

        <Form.Item name="autoStart" valuePropName="checked" label="Start when added">
          <Checkbox>Start when added</Checkbox>
        </Form.Item>

        {progress && (
          <div style={{ textAlign: 'center', marginTop: -8, marginBottom: 8 }}>
            <Text type="secondary">Uploading: {progress}</Text>
          </div>
        )}
      </Form>
    </Modal>
  );
}
