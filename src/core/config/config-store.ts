// Zustand store for user config — replaces global system.config + localStorage mutation

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** A user-defined label (palette entry) — name + optional description + display color */
export interface UserLabel {
  name: string;
  description: string;
  color: string;
}

export interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  language: string;

  showInfinitySymbol: boolean;
  displayUnit: 'bits' | 'bytes';
  showTrackerFilter: boolean;
  showFreeSpace: boolean;
  serverMode: boolean;
  serializeTorrentAdd: boolean;
  allowEditPath: boolean;

  autoReload: boolean;
  autoReloadInterval: number;

  rpcPath: string;
  rpcUsername: string;
  rpcPassword: string;

  showCumulativeStats: boolean;
  deleteLocalDataByDefault: boolean;

  // User-defined label palette (old: config.labels)
  labels: UserLabel[];
  // Data-folder auto-match dictionary, one path per line (old: dictionary.folders)
  folderDictionary: string;
}

const defaultConfig: AppConfig = {
  theme: 'light',
  compactMode: true,
  language: 'zh_CN',

  showInfinitySymbol: true,
  displayUnit: 'bytes',
  showTrackerFilter: true,
  showFreeSpace: true,
  serverMode: false,
  serializeTorrentAdd: false,
  allowEditPath: true,

  autoReload: true,
  autoReloadInterval: 5,

  rpcPath: '../rpc',
  rpcUsername: '',
  rpcPassword: '',

  showCumulativeStats: false,
  deleteLocalDataByDefault: false,

  labels: [],
  folderDictionary: '',
};

export const useConfigStore = create<AppConfig>()(
  persist(() => defaultConfig, {
    name: 'tr-web-control-config',
    // Never persist the RPC password to localStorage — it's readable by any
    // script on the origin and survives on shared machines. Credentials are
    // runtime-only (there is currently no UI to set them anyway).
    partialize: (state) => {
      const { rpcPassword, ...rest } = state;
      void rpcPassword;
      return rest as AppConfig;
    },
  }),
);

export function resetConfig(): void {
  useConfigStore.setState(defaultConfig);
}
