// AboutDialog — about box replicating old dialog-about.html
// Shows Transmission version + RPC version, web-control version, and links

import { Modal, Typography, Space, Divider } from 'antd';
import { useSessionConfig } from '@/hooks/useTorrents';

const { Text } = Typography;

// Web Control version string shown in the About dialog
const WEB_CONTROL_VERSION = '2.0.0';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AboutDialog({ open, onClose }: Props) {
  const { data: sessionConfig } = useSessionConfig();

  const trVersion = sessionConfig?.version ?? '';
  const rpcVersion = sessionConfig?.['rpc-version'] ?? '';

  const links: { label: string; href: string }[] = [
    { label: 'Home', href: 'https://github.com/ronggang/transmission-web-control' },
    { label: 'Wiki', href: 'https://github.com/ronggang/transmission-web-control/wiki' },
    { label: 'Check Update', href: 'https://github.com/ronggang/transmission-web-control/releases' },
    { label: 'PT Plugin Plus', href: 'https://github.com/ronggang/PT-Plugin-Plus' },
    { label: 'Donate', href: 'https://github.com/ronggang/transmission-web-control/wiki/Donate' },
  ];

  const thanks: { label: string; href: string }[] = [
    { label: 'Transmission', href: 'https://transmissionbt.com/' },
    { label: 'jQuery', href: 'https://jquery.com/' },
    { label: 'jQuery EasyUI', href: 'https://www.jeasyui.com/' },
    { label: 'Iconfont', href: 'https://www.iconfont.cn/' },
  ];

  return (
    <Modal
      title="About"
      open={open}
      onCancel={onClose}
      footer={null}
      width={420}
      destroyOnClose
    >
      <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
        <img
          src="tr-web-control/logo.png" alt="Transmission"
          style={{ width: 64, height: 64 }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      <div style={{ textAlign: 'center', margin: '8px 0 4px' }}>
        <Text style={{ fontSize: 13 }}>Transmission Web Control</Text>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <Space direction="vertical" size={2} style={{ width: '100%', fontSize: 12 }}>
        {trVersion && (
          <div style={{ fontSize: 12 }}>
            <Text type="secondary">Transmission: </Text>
            <Text>{trVersion}{rpcVersion ? `, RPC: ${rpcVersion}` : ''}</Text>
          </div>
        )}
        <div style={{ fontSize: 12 }}>
          <Text type="secondary">Web Control: </Text>
          <Text>{WEB_CONTROL_VERSION}</Text>
        </div>
        <div style={{ fontSize: 12 }}>
          <Text type="secondary">Copyright (c) 2012-2019 栽培者</Text>
        </div>
      </Space>

      <Divider style={{ margin: '8px 0' }} />

      <Space size="small" wrap style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}>
        {links.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, color: '#0E2D5F' }}>{l.label}</a>
        ))}
      </Space>

      <Divider style={{ margin: '8px 0' }} />

      <div style={{ textAlign: 'center', fontSize: 12 }}>
        <Text type="secondary">Thanks to </Text>
        <Space size="small" wrap style={{ justifyContent: 'center', fontSize: 12 }}>
          {thanks.map((t) => (
            <a key={t.label} href={t.href} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: '#0E2D5F' }}>{t.label}</a>
          ))}
        </Space>
      </div>
    </Modal>
  );
}
