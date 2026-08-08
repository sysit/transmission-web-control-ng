export const APP_NAME = 'Transmission Web Control';

export const TORRENT_STATUS_LABELS: Record<number, string> = {
  0: 'Stopped', 1: 'Check Wait', 2: 'Checking',
  3: 'Download Wait', 4: 'Downloading', 5: 'Seed Wait', 6: 'Seeding',
};

export const CATEGORY_KEYS = ['all', 'downloading', 'actively', 'paused', 'error', 'warning'] as const;
export type CategoryKey = typeof CATEGORY_KEYS[number];

export const CATEGORY_LABELS: Record<string, string> = {
  all: 'All', downloading: 'Downloading', actively: 'Active',
  paused: 'Paused', error: 'Error', warning: 'Warning',
};
