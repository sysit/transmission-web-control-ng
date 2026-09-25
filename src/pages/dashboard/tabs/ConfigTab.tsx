// ConfigTab — per-torrent configuration form
// Called by TorrentDetailPanel when the "Config" tab is active

import { useState, useCallback, useEffect } from 'react';
import { Checkbox, InputNumber, Button, Typography, Space, App } from 'antd';
import { useTranslation } from 'react-i18next';
import type { Torrent } from '@/core/rpc/rpc-types';
import { exec as rpcExec } from '@/core/rpc/transmission-client';

const { Text } = Typography;

interface Props {
  torrent: Torrent | undefined;
}

interface ConfigState {
  downloadLimited: boolean;
  downloadLimit: number | null;
  uploadLimited: boolean;
  uploadLimit: number | null;
  seedRatioMode: number;
  seedRatioLimit: number | null;
  seedIdleMode: number;
  seedIdleLimit: number | null;
  'peer-limit': number | null;
}

function getInitState(t: Torrent): ConfigState {
  return {
    downloadLimited: t.downloadLimited ?? false,
    downloadLimit: t.downloadLimit ?? null,
    uploadLimited: t.uploadLimited ?? false,
    uploadLimit: t.uploadLimit ?? null,
    seedRatioMode: t.seedRatioMode ?? 0,
    seedRatioLimit: t.seedRatioLimit ?? null,
    seedIdleMode: t.seedIdleMode ?? 0,
    seedIdleLimit: t.seedIdleLimit ?? null,
    'peer-limit': t['peer-limit'] ?? null,
  };
}

/** Tri-state: 0=global(indeterminate), 1=enabled(checked), 2=disabled(unchecked) */
function TriStateCheckbox({ value, onChange }: {
  value: number;
  onChange: (v: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <Checkbox
      checked={value === 1}
      indeterminate={value === 0}
      onChange={() => onChange(value === 0 ? 1 : value === 1 ? 2 : 0)}
    >
      {value === 0 ? t('configTab.global') : value === 1 ? t('configTab.enabled') : t('configTab.disabled')}
    </Checkbox>
  );
}

export default function ConfigTab({ torrent }: Props) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [config, setConfig] = useState<ConfigState | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<'saved' | 'nochange' | null>(null);

  useEffect(() => {
    if (torrent) { setConfig(getInitState(torrent)); setFeedback(null); }
    else { setConfig(null); }
    // Seed only when switching torrents — the torrent object identity churns
    // every 5s poll, and re-seeding here would silently wipe in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [torrent?.id]);

  const handleSave = useCallback(async () => {
    if (!torrent || !config) return;
    const changes: Record<string, unknown> = {};
    const tor = torrent;
    if (config.downloadLimited !== (tor.downloadLimited ?? false)) changes.downloadLimited = config.downloadLimited;
    if (config.downloadLimit !== (tor.downloadLimit ?? null)) changes.downloadLimit = config.downloadLimit;
    if (config.uploadLimited !== (tor.uploadLimited ?? false)) changes.uploadLimited = config.uploadLimited;
    if (config.uploadLimit !== (tor.uploadLimit ?? null)) changes.uploadLimit = config.uploadLimit;
    if (config.seedRatioMode !== (tor.seedRatioMode ?? 0)) changes.seedRatioMode = config.seedRatioMode;
    if (config.seedRatioLimit !== (tor.seedRatioLimit ?? null)) changes.seedRatioLimit = config.seedRatioLimit;
    if (config.seedIdleMode !== (tor.seedIdleMode ?? 0)) changes.seedIdleMode = config.seedIdleMode;
    if (config.seedIdleLimit !== (tor.seedIdleLimit ?? null)) changes.seedIdleLimit = config.seedIdleLimit;
    if (config['peer-limit'] !== (tor['peer-limit'] ?? null)) changes['peer-limit'] = config['peer-limit'];

    if (Object.keys(changes).length === 0) { setFeedback('nochange'); return; }
    setSaving(true);
    try {
      await rpcExec({ method: 'torrent-set', arguments: { ids: [torrent.id], ...changes } });
      setFeedback('saved');
    } catch (e) { message.error(e instanceof Error ? e.message : t('configTab.failed')); }
    finally { setSaving(false); }
  }, [torrent, config, message, t]);

  if (!torrent) return <Text type="secondary">{t('configTab.selectPrompt')}</Text>;
  if (!config) return <Text type="secondary">{t('configTab.loading')}</Text>;

  const update = (key: keyof ConfigState, value: number | boolean | null) => {
    setConfig((prev) => prev ? { ...prev, [key]: value } : prev);
    setFeedback(null);
  };

  return (
    <div style={{ padding: 4 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ width: '30%', padding: 4, borderBottom: '1px solid #f0f0f0' }}>
              <Checkbox checked={config.downloadLimited}
                onChange={(e) => update('downloadLimited', e.target.checked)}>
                {t('configTab.dlLimit')}
              </Checkbox>
            </td>
            <td style={{ width: '20%', padding: 4, borderBottom: '1px solid #f0f0f0' }}>
              <InputNumber size="small" value={config.downloadLimit}
                disabled={!config.downloadLimited}
                onChange={(v) => update('downloadLimit', v ?? 0)} style={{ width: 80 }} /> KB/s
            </td>
            <td style={{ width: '30%', padding: 4, borderBottom: '1px solid #f0f0f0' }}>
              <TriStateCheckbox value={config.seedRatioMode}
                onChange={(v) => update('seedRatioMode', v)} />
              <Text type="secondary" style={{ fontSize: 10 }}>{t('configTab.seedRatioMode')}</Text>
            </td>
            <td style={{ width: '20%', padding: 4, borderBottom: '1px solid #f0f0f0' }}>
              <InputNumber size="small" value={config.seedRatioLimit}
                disabled={config.seedRatioMode !== 1}
                onChange={(v) => update('seedRatioLimit', v ?? 0)} style={{ width: 80 }}
                step={0.1} min={0} />
            </td>
          </tr>
          <tr>
            <td style={{ padding: 4, borderBottom: '1px solid #f0f0f0' }}>
              <Checkbox checked={config.uploadLimited}
                onChange={(e) => update('uploadLimited', e.target.checked)}>
                {t('configTab.ulLimit')}
              </Checkbox>
            </td>
            <td style={{ padding: 4, borderBottom: '1px solid #f0f0f0' }}>
              <InputNumber size="small" value={config.uploadLimit}
                disabled={!config.uploadLimited}
                onChange={(v) => update('uploadLimit', v ?? 0)} style={{ width: 80 }} /> KB/s
            </td>
            <td style={{ padding: 4, borderBottom: '1px solid #f0f0f0' }}>
              <TriStateCheckbox value={config.seedIdleMode}
                onChange={(v) => update('seedIdleMode', v)} />
              <Text type="secondary" style={{ fontSize: 10 }}>{t('configTab.seedIdleMode')}</Text>
            </td>
            <td style={{ padding: 4, borderBottom: '1px solid #f0f0f0' }}>
              <InputNumber size="small" value={config.seedIdleLimit}
                disabled={config.seedIdleMode !== 1}
                onChange={(v) => update('seedIdleLimit', v ?? 0)} style={{ width: 80 }} /> min
            </td>
          </tr>
          <tr>
            <td style={{ padding: 4 }}>
              <Text style={{ fontSize: 12 }}>{t('configTab.peerLimit')}</Text>
            </td>
            <td style={{ padding: 4 }}>
              <InputNumber size="small" value={config['peer-limit']}
                onChange={(v) => update('peer-limit', v ?? null)} style={{ width: 80 }} min={0} />
            </td>
            <td /><td />
          </tr>
        </tbody>
      </table>
      <div style={{ marginTop: 8 }}>
        <Space>
          <Button size="small" type="primary" loading={saving} onClick={handleSave}>{t('configTab.save')}</Button>
          {feedback === 'saved' && <Text type="success" style={{ fontSize: 12 }}>{t('configTab.savedShort')}</Text>}
          {feedback === 'nochange' && <Text type="secondary" style={{ fontSize: 12 }}>{t('configTab.noChangeShort')}</Text>}
        </Space>
      </div>
    </div>
  );
}
