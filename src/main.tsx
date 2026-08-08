import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createSession } from './core/rpc/session'
import { useConfigStore } from './core/config/config-store'
import App from './app/App.tsx'
import './styles/global.css'

// Apply persisted RPC settings (rpcPath / Basic-auth credentials) from the config store.
// Zustand persist hydrates synchronously from localStorage, so getState() at startup
// already reflects saved values.
const { rpcPath, rpcUsername, rpcPassword } = useConfigStore.getState()
const session = createSession({
  rpcPath,
  username: rpcUsername || undefined,
  password: rpcPassword || undefined,
})

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root element missing — check index.html')


session.init().then(
  () => {
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  },
  (err) => {
    rootEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:-apple-system,BlinkMacSystemFont,sans-serif"><div style="text-align:center;max-width:480px;padding:32px"><h2 style="color:#ff4d4f;margin-bottom:8px">Transmission Unreachable</h2><p style="color:#666;font-size:14px;line-height:1.6">Could not connect to the Transmission RPC server.<br/>Make sure Transmission is running and the web interface is enabled.</p><pre style="background:#fff2f0;padding:12px;border-radius:4px;font-size:11px;text-align:left;overflow:auto;max-height:120px;color:#cf1322">${err?.message ?? 'Connection timed out'}</pre><button onclick="location.reload()" style="margin-top:16px;padding:8px 24px;background:#1677ff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:14px">Retry</button></div></div>`;
  },
);
