// ImportConfigDialog — restore configuration from an exported JSON file
// Replicates old dialog-import-config.html: pick a file, choose sections to apply.
// Sections:
//   system  → useConfigStore.setState (local web-control config, AppConfig fields)
//   server  → session-set RPC (daemon session settings)

import { useState } from 'react';
import { Modal, Checkbox, App } from 'antd';
import { exec as rpcExec } from '@/core/rpc/transmission-client';
import { useConfigStore } from '@/core/config/config-store';
import type { AppConfig } from '@/core/config/config-store';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ParsedConfig {
  configVersion?: number;
  system?: Record<string, unknown>;
  server?: Record<string, unknown>;
}

export default function ImportConfigDialog({ open, onClose }: Props) {
  const { message } = App.useApp();
  const [parsed, setParsed] = useState<ParsedConfig | null>(null);
  const [fileName, setFileName] = useState('');
  const [applySystem, setApplySystem] = useState(true);
  const [applyServer, setApplyServer] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setParsed(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text) as ParsedConfig;
      setParsed(data);
      setApplySystem(!!data.system);
      setApplyServer(!!data.server);
    } catch {
      message.error('Invalid JSON config file');
      setFileName('');
    }
  };

  const handleOk = async () => {
    if (!parsed) { message.warning('Select a config file first'); return; }
    setSaving(true);
    try {
      if (applySystem && parsed.system) {
        // Only copy fields that exist in AppConfig — ignore unknown keys.
        const current = useConfigStore.getState();
        const patch: Partial<AppConfig> = {};
        for (const key of Object.keys(current) as (keyof AppConfig)[]) {
          if (key in parsed.system) {
            (patch as Record<string, unknown>)[key] = parsed.system[key];
          }
        }
        useConfigStore.setState(patch);
      }
      if (applyServer && parsed.server) {
        await rpcExec({ method: 'session-set', arguments: parsed.server });
      }
      message.success('Configuration imported');
      setParsed(null); setFileName('');
      onClose();
    } catch {
      message.error('Failed to import configuration');
    } finally {
      setSaving(false);
    }
  };

  const hasAny = !!(parsed?.system || parsed?.server);

  return (
    <Modal title="Import Configuration" open={open} onOk={handleOk} onCancel={() => {
      setParsed(null); setFileName('');
      onClose();
    }} confirmLoading={saving} destroyOnClose okText="Import" cancelText="Cancel"
      width={480}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ cursor: 'pointer' }}>
          <input type="file" accept=".json" style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }} />
          <span style={{ fontSize: 12, color: 'var(--eui-accent)' }}>Choose config file…</span>
        </label>
        {fileName && <span style={{ fontSize: 12, color: '#666', marginLeft: 8 }}>{fileName}</span>}
      </div>

      {parsed && (
        <>
          {parsed.configVersion != null && (
            <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
              Config version: {parsed.configVersion}
            </div>
          )}
          {hasAny ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {parsed.system && (
                <Checkbox checked={applySystem} onChange={(e) => setApplySystem(e.target.checked)}>
                  App configuration (labels, folders dictionary, display options)
                </Checkbox>
              )}
              {parsed.server && (
                <Checkbox checked={applyServer} onChange={(e) => setApplyServer(e.target.checked)}>
                  Transmission daemon settings
                </Checkbox>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#999' }}>
              This file does not contain any recognized config sections.
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
