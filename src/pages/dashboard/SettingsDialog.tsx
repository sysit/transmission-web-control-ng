// SettingsDialog — modal popup matching old dialog-system-config.html
// 680x500 resizable dialog with tabs

import { useState, useEffect, useCallback } from 'react';
import {
  Modal, Tabs, Form, Select, InputNumber, Switch, Button, Input,
  Typography, Space, Divider, Row, Col, App,
} from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSessionConfig } from '@/hooks/useTorrents';
import { exec as rpcExec } from '@/core/rpc/transmission-client';
import { useConfigStore, resetConfig } from '@/core/config/config-store';
import UserLabelsTab from './UserLabelsTab';
import ImportConfigDialog from './dialogs/ImportConfigDialog';

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsDialog({ open, onClose }: Props) {
  const { data: sessionConfig, isLoading } = useSessionConfig();
  const { message } = App.useApp();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form] = Form.useForm();
  // Reactive field watches — form.getFieldValue() in render does not
  // re-render on change, freezing all conditionally-disabled inputs.
  const incompleteDirEnabled = Form.useWatch('incomplete-dir-enabled', form);
  const scriptDoneEnabled = Form.useWatch('script-torrent-done-enabled', form);
  const downloadQueueEnabled = Form.useWatch('download-queue-enabled', form);
  const seedQueueEnabled = Form.useWatch('seed-queue-enabled', form);
  const randomPort = Form.useWatch('peer-port-random-on-start', form);
  const blocklistEnabled = Form.useWatch('blocklist-enabled', form);
  const dlLimitEnabled = Form.useWatch('speed-limit-down-enabled', form);
  const ulLimitEnabled = Form.useWatch('speed-limit-up-enabled', form);
  const seedRatioLimited = Form.useWatch('seedRatioLimited', form);
  const idleSeedEnabled = Form.useWatch('idle-seeding-limit-enabled', form);
  const stalledQueueEnabled = Form.useWatch('queue-stalled-enabled', form);
  const altSpeedTimeEnabled = Form.useWatch('alt-speed-time-enabled', form);
  const localConfig = useConfigStore();

  useEffect(() => {
    if (sessionConfig && open) {
      form.setFieldsValue(sessionConfig);
    }
  }, [sessionConfig, form, open]);

  const handleSave = useCallback(async () => {
    const values = form.getFieldsValue();
    const changes: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(values)) {
      if (sessionConfig && value !== (sessionConfig as unknown as Record<string, unknown>)[key]) {
        changes[key] = value;
      }
    }

    if (Object.keys(changes).length === 0) {
      message.info(t('settings.noChanges'));
      return;
    }

    setSaving(true);
    try {
      await rpcExec({ method: 'session-set', arguments: changes });
      // Refetch now, else reopening the dialog re-seeds the form with the
      // stale cached config (staleTime 30s) and re-saving reverts changes.
      await qc.invalidateQueries({ queryKey: ['session', 'config'] });
      message.success(t('settings.saved'));
      onClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [form, sessionConfig, message, onClose, qc, t]);

  const handleTestPort = useCallback(async () => {
    try {
      const resp = await rpcExec<Record<string, never>, { 'port-is-open'?: boolean }>({
        method: 'port-test',
      });
      if (resp.arguments['port-is-open']) {
        message.success(t('settings.portOpen'));
      } else {
        message.warning(t('settings.portClosed'));
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : t('settings.portTestFailed'));
    }
  }, [message, t]);

  const handleBlocklistUpdate = useCallback(async () => {
    try {
      await rpcExec({ method: 'blocklist-update' });
      message.success('Blocklist updated');
    } catch {
      message.error('Blocklist update failed');
    }
  }, [message]);

  const altSpeedTimeDay = sessionConfig?.['alt-speed-time-day'] ?? 0;
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const tabItems = [
    {
      key: 'basic',
      label: t('settings.tabs.basic'),
      children: (
        <div className="settings-dialog-pane">
          <Form.Item name="download-dir" label={t('settings.downloadDir')}>
            <Select size="small" showSearch options={(
              sessionConfig?.['download-dir']
                ? [{ value: sessionConfig['download-dir'], label: sessionConfig['download-dir'] }]
                : []
            )} />
          </Form.Item>

          <Form.Item name="incomplete-dir-enabled" label={t('settings.incompleteDir')} valuePropName="checked">
            <Switch size="small" />
          </Form.Item>
          <Form.Item name="incomplete-dir" label={t('settings.path')}>
            <Input size="small" disabled={!incompleteDirEnabled} />
          </Form.Item>

          <Form.Item name="rename-partial-files" label={t('settings.appendPart')} valuePropName="checked">
            <Switch size="small" />
          </Form.Item>
          <Form.Item name="start-added-torrents" label={t('settings.startAdded')} valuePropName="checked">
            <Switch size="small" />
          </Form.Item>

          <Form.Item name="cache-size-mb" label={t('settings.cacheSize')}>
            <InputNumber size="small" min={0} max={9999} />
          </Form.Item>

          <Form.Item name="script-torrent-done-enabled" label={t('settings.scriptDone')} valuePropName="checked">
            <Switch size="small" />
          </Form.Item>
          <Form.Item name="script-torrent-done-filename" label={t('settings.scriptPath')}>
            <Input size="small" disabled={!scriptDoneEnabled} />
          </Form.Item>

          <Form.Item label={t('settings.configDir')}>
            <Input size="small" value={(sessionConfig?.['config-dir'] as string) ?? ''} disabled />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'network',
      label: t('settings.tabs.network'),
      children: (
        <div className="settings-dialog-pane">
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="download-queue-enabled" label={t('settings.downloadQueue')} valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="download-queue-size" label={t('settings.size')}>
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!downloadQueueEnabled} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="seed-queue-enabled" label={t('settings.seedQueue')} valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="seed-queue-size" label={t('settings.size')}>
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!seedQueueEnabled} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="encryption" label={t('settings.encryption')}>
            <Select size="small" options={[
              { value: 'required', label: t('settings.encRequired') },
              { value: 'preferred', label: t('settings.encPreferred') },
              { value: 'tolerated', label: t('settings.encTolerated') },
            ]} />
          </Form.Item>

          <Row gutter={8}>
            <Col span={16}>
              <Form.Item name="peer-port-random-on-start" label={t('settings.randomPort')} valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="peer-port" label={t('settings.port')}>
                <InputNumber size="small" min={1} max={65535} className="settings-dialog-full"
                  disabled={randomPort} />
              </Form.Item>
            </Col>
          </Row>
          <div className="settings-dialog-actions-right">
            <Button size="small" onClick={handleTestPort}>{t('settings.testPort')}</Button>
          </div>

          <Form.Item name="port-forwarding-enabled" label={t('settings.portForwarding')} valuePropName="checked">
            <Switch size="small" />
          </Form.Item>

          <Form.Item label={(
            <span>
              <Form.Item name="utp-enabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
              {' '}<Text className="settings-dialog-hint">μTP</Text>
              {' '}<Form.Item name="dht-enabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
              {' '}<Text className="settings-dialog-hint">DHT</Text>
              {' '}<Form.Item name="lpd-enabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
              {' '}<Text className="settings-dialog-hint">LPD</Text>
              {' '}<Form.Item name="pex-enabled" valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
              {' '}<Text className="settings-dialog-hint">PEX</Text>
            </span>
          )} labelCol={{ span: 24 }} />

          <Form.Item name="blocklist-enabled" label={t('settings.blocklist')} valuePropName="checked">
            <Switch size="small" />
          </Form.Item>
          <Form.Item name="blocklist-url" label={t('settings.url')}>
            <Input size="small" disabled={!blocklistEnabled}
              suffix={
                <Button size="small" type="link" onClick={handleBlocklistUpdate}
                  disabled={!blocklistEnabled}
                  className="settings-dialog-link-btn">{t('settings.update')}</Button>
              } />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'limit',
      label: t('settings.tabs.limit'),
      children: (
        <div className="settings-dialog-pane">
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="speed-limit-down-enabled" label={t('settings.dlLimit')} valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="speed-limit-down" label={t('settings.kbs')}>
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!dlLimitEnabled} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="speed-limit-up-enabled" label={t('settings.ulLimit')} valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="speed-limit-up" label={t('settings.kbs')}>
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!ulLimitEnabled} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="peer-limit-global" label={t('settings.peerLimitGlobal')}>
            <InputNumber size="small" min={0} max={99999} />
          </Form.Item>
          <Form.Item name="peer-limit-per-torrent" label={t('settings.peerLimitPerTorrent')}>
            <InputNumber size="small" min={0} max={99999} />
          </Form.Item>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="seedRatioLimited" label={t('settings.seedRatio')} valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="seedRatioLimit" label={t('settings.ratio')}>
                <InputNumber size="small" min={0} step={0.1} className="settings-dialog-full"
                  disabled={!seedRatioLimited} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="idle-seeding-limit-enabled" label={t('settings.idleSeeding')} valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="idle-seeding-limit" label={t('settings.minutes')}>
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!idleSeedEnabled} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="queue-stalled-enabled" label={t('settings.stalledQueue')} valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="queue-stalled-minutes" label={t('settings.minutes')}>
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!stalledQueueEnabled} />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'altspeed',
      label: t('settings.tabs.altspeed'),
      children: (
        <div className="settings-dialog-pane">
          <Form.Item name="alt-speed-enabled" label={t('settings.altSpeedLimits')} valuePropName="checked">
            <Switch size="small" />
          </Form.Item>

          <Form.Item name="alt-speed-down" label={t('settings.altDown')}>
            <InputNumber size="small" min={0} />
          </Form.Item>
          <Form.Item name="alt-speed-up" label={t('settings.altUp')}>
            <InputNumber size="small" min={0} />
          </Form.Item>

          <Divider className="settings-dialog-divider" />

          <Form.Item name="alt-speed-time-enabled" label={t('settings.schedule')} valuePropName="checked">
            <Switch size="small" />
          </Form.Item>

          <Form.Item label={t('settings.timeRange')}>
            <Space>
              <Form.Item name="alt-speed-time-begin" noStyle>
                <InputNumber size="small" min={0} max={1439} className="settings-dialog-input-70"
                  disabled={!altSpeedTimeEnabled} />
              </Form.Item>
              <Text>—</Text>
              <Form.Item name="alt-speed-time-end" noStyle>
                <InputNumber size="small" min={0} max={1439} className="settings-dialog-input-70"
                  disabled={!altSpeedTimeEnabled} />
              </Form.Item>
              <Text type="secondary" className="settings-dialog-hint">{t('settings.minutesFromMidnight')}</Text>
            </Space>
          </Form.Item>

          <Form.Item label={t('settings.days')}>
            <Space wrap>
              {weekdays.map((day, i) => (
                <Button key={i} size="small"
                  type={(altSpeedTimeDay & (1 << i)) ? 'primary' : 'default'}
                  disabled={!altSpeedTimeEnabled}
                  onClick={async () => {
                    const newDay = altSpeedTimeDay ^ (1 << i);
                    try {
                      await rpcExec({ method: 'session-set', arguments: { 'alt-speed-time-day': newDay } });
                      message.success(t('settings.savedDay', { day }));
                    } catch { message.error(t('settings.failed')); }
                  }}
                  className="settings-dialog-day-btn">{day}</Button>
              ))}
            </Space>
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'folders',
      label: t('settings.tabs.folders'),
      children: (
        <div className="settings-dialog-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Text type="secondary" className="settings-dialog-hint">
            {t('settings.foldersHint')}
          </Text>
          <Input.TextArea
            rows={10}
            defaultValue={localConfig.folderDictionary}
            placeholder={'/volume1/downloads\n/volume1/downloads/movies\n/volume1/downloads/tv'}
            style={{ width: '100%', marginTop: 6 }}
            onBlur={(e) => useConfigStore.setState({ folderDictionary: e.target.value })}
          />
        </div>
      ),
    },
    {
      key: 'more',
      label: t('settings.tabs.more'),
      children: (
        <div className="settings-dialog-pane">
          <Form.Item label={t('settings.showServers')}>
            <Switch size="small" checked={localConfig.showTrackerFilter}
              onChange={(v) => useConfigStore.setState({ showTrackerFilter: v })} />
          </Form.Item>
          <Form.Item label={t('settings.showFreeSpace')}>
            <Switch size="small" checked={localConfig.showFreeSpace}
              onChange={(v) => useConfigStore.setState({ showFreeSpace: v })} />
          </Form.Item>
          <Form.Item label={t('settings.allowEditPath')}>
            <Switch size="small" checked={localConfig.allowEditPath}
              onChange={(v) => useConfigStore.setState({ allowEditPath: v })} />
          </Form.Item>

          <Divider className="settings-dialog-divider" />

          <Form.Item label={t('settings.language')}>
            <Select size="small" value={localConfig.language} className="settings-dialog-input-140"
              onChange={(v) => {
                useConfigStore.setState({ language: v });
                void i18n.changeLanguage(v);
              }}
              options={[
                { value: 'zh_CN', label: '简体中文' },
                { value: 'en', label: 'English' },
              ]} />
          </Form.Item>

          <Divider className="settings-dialog-divider" />

          <Form.Item label={t('settings.autoRefreshInterval')}>
            <InputNumber size="small" value={localConfig.autoReloadInterval}
              onChange={(v) => useConfigStore.setState({ autoReloadInterval: v ?? 5 })}
              min={1} max={300} />
          </Form.Item>
          <Form.Item label={t('settings.deleteDataDefault')}>
            <Switch size="small" checked={localConfig.deleteLocalDataByDefault}
              onChange={(v) => useConfigStore.setState({ deleteLocalDataByDefault: v })} />
          </Form.Item>
          <Form.Item label={t('settings.rpcPath')}>
            <Select size="small" value={localConfig.rpcPath} className="settings-dialog-input-200"
              onChange={(v) => useConfigStore.setState({ rpcPath: v })}
              options={[{ value: '../rpc', label: '../rpc (default)' }]} />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'labels',
      label: t('settings.tabs.labels'),
      children: <UserLabelsTab />,
    },
  ];

  return (
    <Modal
      title={t('settings.title')}
      open={open}
      onCancel={onClose}
      width={680}
      style={{ top: 40 }}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflow: 'auto' } }}
      footer={
        <div className="settings-dialog-footer">
          <Space size="small">
            <Button size="small" onClick={() => {
              if (confirm(t('settings.restoreConfirm'))) {
                resetConfig();
                onClose();
              }
            }}>{t('settings.restoreDefaults')}</Button>
            <Button size="small" onClick={() => {
              const { rpcPassword: _omit, ...restConfig } = useConfigStore.getState();
              const json = JSON.stringify({
                configVersion: 1,
                // never export the RPC password
                system: { ...restConfig, rpcPassword: '' },
                server: sessionConfig ?? {},
              }, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'tr-web-control-config.json';
              a.click(); URL.revokeObjectURL(url);
            }}>{t('settings.export')}</Button>
            <Button size="small" onClick={() => setImportOpen(true)}>{t('settings.import')}</Button>
          </Space>
          <Space size="small">
            <Button size="small" onClick={onClose}>{t('settings.cancel')}</Button>
            <Button type="primary" size="small" loading={saving} onClick={handleSave}>{t('settings.save')}</Button>
          </Space>
        </div>
      }
      destroyOnHidden
    >
      {isLoading ? (
        <div className="settings-dialog-loading">
          <Text type="secondary">{t('settings.loading')}</Text>
        </div>
      ) : (
        <Form form={form} layout="horizontal" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }}
          size="small">
          <Tabs defaultActiveKey="basic" items={tabItems} size="small" />
        </Form>
      )}
      <ImportConfigDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </Modal>
  );
}
