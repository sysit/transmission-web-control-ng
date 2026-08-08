// SettingsDialog — modal popup matching old dialog-system-config.html
// 680x500 resizable dialog with tabs

import { useState, useEffect, useCallback } from 'react';
import {
  Modal, Tabs, Form, Select, InputNumber, Switch, Button, Input,
  Typography, Space, Divider, Row, Col, App,
} from 'antd';
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
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form] = Form.useForm();
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
      message.info('No changes to save');
      return;
    }

    setSaving(true);
    try {
      await rpcExec({ method: 'session-set', arguments: changes });
      message.success('Settings saved');
      onClose();
    } catch {
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [form, sessionConfig, message, onClose]);

  const handleTestPort = useCallback(async () => {
    try {
      const result = await rpcExec({ method: 'port-test' });
      if (result) {
        message.success('Port is open');
      } else {
        message.warning('Port is closed');
      }
    } catch {
      message.error('Port test failed');
    }
  }, [message]);

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
      label: 'Basic',
      children: (
        <div className="settings-dialog-pane">
          <Form.Item name="download-dir" label="Download Directory">
            <Select size="small" showSearch options={(
              sessionConfig?.['download-dir']
                ? [{ value: sessionConfig['download-dir'], label: sessionConfig['download-dir'] }]
                : []
            )} />
          </Form.Item>

          <Form.Item name="incomplete-dir-enabled" label="Incomplete Dir" valuePropName="checked">
            <Switch size="small" />
          </Form.Item>
          <Form.Item name="incomplete-dir" label="Path">
            <Input size="small" disabled={!form.getFieldValue('incomplete-dir-enabled')} />
          </Form.Item>

          <Form.Item name="rename-partial-files" label='Append ".part" to files' valuePropName="checked">
            <Switch size="small" />
          </Form.Item>
          <Form.Item name="start-added-torrents" label="Start when added" valuePropName="checked">
            <Switch size="small" />
          </Form.Item>

          <Form.Item name="cache-size-mb" label="Disk Cache (MB)">
            <InputNumber size="small" min={0} max={9999} />
          </Form.Item>

          <Form.Item name="script-torrent-done-enabled" label="Script on completion" valuePropName="checked">
            <Switch size="small" />
          </Form.Item>
          <Form.Item name="script-torrent-done-filename" label="Script Path">
            <Input size="small" disabled={!form.getFieldValue('script-torrent-done-enabled')} />
          </Form.Item>

          <Form.Item label="Config Directory">
            <Input size="small" value={(sessionConfig?.['config-dir'] as string) ?? ''} disabled />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'network',
      label: 'Network',
      children: (
        <div className="settings-dialog-pane">
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="download-queue-enabled" label="Download Queue" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="download-queue-size" label="Size">
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!form.getFieldValue('download-queue-enabled')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="seed-queue-enabled" label="Seed Queue" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="seed-queue-size" label="Size">
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!form.getFieldValue('seed-queue-enabled')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="encryption" label="Encryption">
            <Select size="small" options={[
              { value: 'required', label: 'Required' },
              { value: 'preferred', label: 'Preferred' },
              { value: 'tolerated', label: 'Tolerated' },
            ]} />
          </Form.Item>

          <Row gutter={8}>
            <Col span={16}>
              <Form.Item name="peer-port-random-on-start" label="Random port on start" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="peer-port" label="Port">
                <InputNumber size="small" min={1} max={65535} className="settings-dialog-full"
                  disabled={form.getFieldValue('peer-port-random-on-start')} />
              </Form.Item>
            </Col>
          </Row>
          <div className="settings-dialog-actions-right">
            <Button size="small" onClick={handleTestPort}>Test Port</Button>
          </div>

          <Form.Item name="port-forwarding-enabled" label="Port Forwarding (UPnP)" valuePropName="checked">
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

          <Form.Item name="blocklist-enabled" label="Blocklist" valuePropName="checked">
            <Switch size="small" />
          </Form.Item>
          <Form.Item name="blocklist-url" label="URL">
            <Input size="small" disabled={!form.getFieldValue('blocklist-enabled')}
              suffix={
                <Button size="small" type="link" onClick={handleBlocklistUpdate}
                  disabled={!form.getFieldValue('blocklist-enabled')}
                  className="settings-dialog-link-btn">Update</Button>
              } />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'limit',
      label: 'Limit',
      children: (
        <div className="settings-dialog-pane">
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="speed-limit-down-enabled" label="DL Limit" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="speed-limit-down" label="KB/s">
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!form.getFieldValue('speed-limit-down-enabled')} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="speed-limit-up-enabled" label="UL Limit" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="speed-limit-up" label="KB/s">
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!form.getFieldValue('speed-limit-up-enabled')} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="peer-limit-global" label="Global Peer Limit">
            <InputNumber size="small" min={0} max={99999} />
          </Form.Item>
          <Form.Item name="peer-limit-per-torrent" label="Per-Torrent Peer Limit">
            <InputNumber size="small" min={0} max={99999} />
          </Form.Item>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="seedRatioLimited" label="Seed Ratio" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="seedRatioLimit" label="Ratio">
                <InputNumber size="small" min={0} step={0.1} className="settings-dialog-full"
                  disabled={!form.getFieldValue('seedRatioLimited')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="idle-seeding-limit-enabled" label="Idle Seeding" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="idle-seeding-limit" label="Minutes">
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!form.getFieldValue('idle-seeding-limit-enabled')} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={8}>
            <Col span={12}>
              <Form.Item name="queue-stalled-enabled" label="Stalled Queue" valuePropName="checked">
                <Switch size="small" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="queue-stalled-minutes" label="Minutes">
                <InputNumber size="small" min={0} className="settings-dialog-full"
                  disabled={!form.getFieldValue('queue-stalled-enabled')} />
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'altspeed',
      label: 'Alt Speeds',
      children: (
        <div className="settings-dialog-pane">
          <Form.Item name="alt-speed-enabled" label="Alt Speed Limits" valuePropName="checked">
            <Switch size="small" />
          </Form.Item>

          <Form.Item name="alt-speed-down" label="Download (KB/s)">
            <InputNumber size="small" min={0} />
          </Form.Item>
          <Form.Item name="alt-speed-up" label="Upload (KB/s)">
            <InputNumber size="small" min={0} />
          </Form.Item>

          <Divider className="settings-dialog-divider" />

          <Form.Item name="alt-speed-time-enabled" label="Schedule" valuePropName="checked">
            <Switch size="small" />
          </Form.Item>

          <Form.Item label="Time Range">
            <Space>
              <Form.Item name="alt-speed-time-begin" noStyle>
                <InputNumber size="small" min={0} max={1439} className="settings-dialog-input-70"
                  disabled={!form.getFieldValue('alt-speed-time-enabled')} />
              </Form.Item>
              <Text>—</Text>
              <Form.Item name="alt-speed-time-end" noStyle>
                <InputNumber size="small" min={0} max={1439} className="settings-dialog-input-70"
                  disabled={!form.getFieldValue('alt-speed-time-enabled')} />
              </Form.Item>
              <Text type="secondary" className="settings-dialog-hint">(minutes from midnight)</Text>
            </Space>
          </Form.Item>

          <Form.Item label="Days">
            <Space wrap>
              {weekdays.map((day, i) => (
                <Button key={i} size="small"
                  type={(altSpeedTimeDay & (1 << i)) ? 'primary' : 'default'}
                  disabled={!form.getFieldValue('alt-speed-time-enabled')}
                  onClick={async () => {
                    const newDay = altSpeedTimeDay ^ (1 << i);
                    try {
                      await rpcExec({ method: 'session-set', arguments: { 'alt-speed-time-day': newDay } });
                      message.success(`Saved: ${day}`);
                    } catch { message.error('Failed'); }
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
      label: 'Folders Dictionary',
      children: (
        <div className="settings-dialog-pane" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Text type="secondary" className="settings-dialog-hint">
            One data folder path per line. Used to auto-match torrents to their data folders.
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
      label: 'More',
      children: (
        <div className="settings-dialog-pane">
          <Form.Item label="Show Servers in Sidebar">
            <Switch size="small" checked={localConfig.showTrackerFilter}
              onChange={(v) => useConfigStore.setState({ showTrackerFilter: v })} />
          </Form.Item>
          <Form.Item label="Show Free Space">
            <Switch size="small" checked={localConfig.showFreeSpace}
              onChange={(v) => useConfigStore.setState({ showFreeSpace: v })} />
          </Form.Item>
          <Form.Item label="Allow Edit Path">
            <Switch size="small" checked={localConfig.allowEditPath}
              onChange={(v) => useConfigStore.setState({ allowEditPath: v })} />
          </Form.Item>

          <Divider className="settings-dialog-divider" />

          <Form.Item label="Language">
            <Select size="small" value={localConfig.language} className="settings-dialog-input-140"
              onChange={(v) => useConfigStore.setState({ language: v })}
              options={[
                { value: 'zh_CN', label: '简体中文' },
                { value: 'en', label: 'English' },
              ]} />
          </Form.Item>

          <Divider className="settings-dialog-divider" />

          <Form.Item label="Auto Refresh Interval (s)">
            <InputNumber size="small" value={localConfig.autoReloadInterval}
              onChange={(v) => useConfigStore.setState({ autoReloadInterval: v ?? 5 })}
              min={1} max={300} />
          </Form.Item>
          <Form.Item label="Delete Local Data by Default">
            <Switch size="small" checked={localConfig.deleteLocalDataByDefault}
              onChange={(v) => useConfigStore.setState({ deleteLocalDataByDefault: v })} />
          </Form.Item>
          <Form.Item label="RPC Path">
            <Select size="small" value={localConfig.rpcPath} className="settings-dialog-input-200"
              onChange={(v) => useConfigStore.setState({ rpcPath: v })}
              options={[{ value: '../rpc', label: '../rpc (default)' }]} />
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'labels',
      label: 'User Labels',
      children: <UserLabelsTab />,
    },
  ];

  return (
    <Modal
      title="Transmission Preferences"
      open={open}
      onCancel={onClose}
      width={680}
      style={{ top: 40 }}
      styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflow: 'auto' } }}
      footer={
        <div className="settings-dialog-footer">
          <Space size="small">
            <Button size="small" onClick={() => {
              if (confirm('Reset all settings to defaults?')) {
                resetConfig();
                onClose();
              }
            }}>Restore Defaults</Button>
            <Button size="small" onClick={() => {
              const json = JSON.stringify({
                configVersion: 1,
                system: useConfigStore.getState(),
                server: sessionConfig ?? {},
              }, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'tr-web-control-config.json';
              a.click(); URL.revokeObjectURL(url);
            }}>Export</Button>
            <Button size="small" onClick={() => setImportOpen(true)}>Import</Button>
          </Space>
          <Space size="small">
            <Button size="small" onClick={onClose}>Cancel</Button>
            <Button type="primary" size="small" loading={saving} onClick={handleSave}>Save</Button>
          </Space>
        </div>
      }
      destroyOnClose
    >
      {isLoading ? (
        <div className="settings-dialog-loading">
          <Text type="secondary">Loading session configuration…</Text>
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
