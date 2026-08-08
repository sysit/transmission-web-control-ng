// Torrent Data Model
// Migrated from transmission.torrents.js

import { TorrentStatus, TrackerAnnounceState } from './rpc-types';
import type {
  Torrent,
  TorrentCollection,
  TorrentFolder,
  TrackerInfo,
} from './rpc-types';

// ---- Constants ----
export const TORRENT_FIELDS_BASE = [
  'id', 'name', 'status', 'hashString', 'totalSize', 'percentDone',
  'addedDate', 'trackerStats', 'leftUntilDone', 'rateDownload',
  'rateUpload', 'recheckProgress', 'peersGettingFromUs',
  'peersSendingToUs', 'uploadRatio', 'uploadedEver', 'downloadedEver',
  'downloadDir', 'error', 'errorString', 'doneDate', 'queuePosition',
  'activityDate', 'completeSize', 'magnetLink', 'labels',
];

export const TORRENT_FIELDS_CONFIG = [
  'id', 'name', 'downloadLimit', 'downloadLimited', 'peer-limit',
  'seedIdleLimit', 'seedIdleMode', 'seedRatioLimit', 'seedRatioMode',
  'uploadLimit', 'uploadLimited',
];

/** Extended fields for torrent detail panel (dynamic data) */
export const TORRENT_FIELDS_EXTENDED = [
  'id', 'name', 'fileStats', 'trackerStats', 'peers', 'leftUntilDone',
  'status', 'rateDownload', 'rateUpload', 'uploadedEver', 'uploadRatio',
  'error', 'errorString', 'pieces', 'pieceCount', 'pieceSize',
];

/** Extended fields for first-time load (includes one-time metadata) */
export const TORRENT_FIELDS_FIRST_LOAD = [
  ...TORRENT_FIELDS_EXTENDED,
  'files', 'trackers', 'comment', 'dateCreated', 'creator', 'downloadDir',
];

// ---- Helpers ----
function getHostName(host: string): string {
  try {
    const url = new URL(host.startsWith('http') ? host : 'http://' + host);
    return url.hostname || host;
  } catch {
    return host;
  }
}

function base64Encode(str: string): string {
  // Use native TextEncoder for UTF-8 → base64, avoiding the deprecated unescape()
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function extractTrackerName(host: string): string {
  const hostName = getHostName(host);
  const parts = hostName.split('.');
  const skipWords = ['www', 'tracker', 'announce'];
  while (parts.length > 1 && skipWords.includes(parts[0].toLowerCase())) {
    parts.shift();
  }
  return parts.join('.');
}

// ---- Tracker Info ----
export function addTrackerInfo(
  item: Torrent,
  trackers: Record<string, TrackerInfo>,
): void {
  const trackerStats = item.trackerStats;
  item.leecherCount = 0;
  item.seederCount = 0;

  const trackerNames: string[] = [];

  if (trackerStats.length > 0) {
    const warnings: string[] = [];
    for (const t of trackerStats) {
      const lastResult = t.lastAnnounceResult.toLowerCase();
      const name = extractTrackerName(t.host);
      const id = 'tracker-' + name.replace(/\./g, '-');

      let tracker = trackers[id];
      if (!tracker) {
        trackers[id] = {
          count: 0, torrents: [], size: 0, connected: true,
          isBT: trackerStats.length > 5, name, nodeid: id, host: t.host,
        };
        tracker = trackers[id];
      }

      if (
        !t.lastAnnounceSucceeded &&
        t.announceState !== TrackerAnnounceState.INACTIVE
      ) {
        warnings.push(t.lastAnnounceResult);
        if (lastResult === 'could not connect to tracker') {
          tracker.connected = false;
        }
      }

      if (!tracker.torrents.includes(item)) {
        tracker.torrents.push(item);
        tracker.count++;
        tracker.size += item.totalSize;
      }

      item.leecherCount += t.leecherCount;
      item.seederCount += t.seederCount;

      if (!trackerNames.includes(name)) trackerNames.push(name);
    }

    if (warnings.length === trackerStats.length) {
      const joined = warnings.join(';').replace(/;/g, '');
      item.warning = joined === '' ? '' : warnings.join(';');
      if (
        !item.nextAnnounceTime ||
        item.nextAnnounceTime > trackerStats[0].nextAnnounceTime
      ) {
        item.nextAnnounceTime = trackerStats[0].nextAnnounceTime;
      }
    }

    if (item.leecherCount < 0) item.leecherCount = 0;
    if (item.seederCount < 0) item.seederCount = 0;

    item.leecher = item.leecherCount + ' (' + item.peersGettingFromUs + ')';
    item.seeder = item.seederCount + ' (' + item.peersSendingToUs + ')';
    item.trackers = trackerNames.join(';');
  }
}

// ---- Core categorization ----
export function categorizeTorrents(
  datas: Record<number, Torrent>,
  previously: Record<number, Torrent>,
  recently: Torrent[],
  removed: number[],
  trackers: Record<string, TrackerInfo>,
  downloadDirs: string[],
): {
  collection: TorrentCollection;
  newIds: number[];
  trackers: Record<string, TrackerInfo>;
  downloadDirs: string[];
} {
  const newIds: number[] = [];
  const mergedDatas = { ...datas };
  for (const item of recently) mergedDatas[item.id] = item;

  const removedSet = new Set(removed);
  for (const id of removedSet) {
    delete mergedDatas[id];
    delete previously[id];
  }

  const downloading: Torrent[] = [];
  const paused: Torrent[] = [];
  const actively: Torrent[] = [];
  const error: Torrent[] = [];
  const warning: Torrent[] = [];
  const btItems: Torrent[] = [];
  const status: Record<number, Torrent[]> = {};
  const folders: Record<string, TorrentFolder> = {};
  const all: Record<number, Torrent> = {};

  let totalSize = 0;
  let count = 0;

  for (const id in mergedDatas) {
    let item = mergedDatas[id];
    if (!item) continue;

    if (!previously[id] && !removedSet.has(Number(id))) {
      newIds.push(item.id);
    }

    item = { ...previously[id], ...item };

    if (item.uploadedEver === 0 && item.downloadedEver === 0) {
      item.uploadRatio = -1;
    }

    // Remaining time
    if (item.leftUntilDone === 0) {
      item.remainingTime = 0;
    } else if (item.rateDownload > 0) {
      item.remainingTime = Math.floor((item.leftUntilDone / item.rateDownload) * 1000);
    } else {
      item.remainingTime = 3153600000000;
    }

    // Folder structure
    if (item.downloadDir) {
      const dirParts = item.downloadDir.replace(/\\/g, '/').split('/');
      let folderKey = 'folders-';
      let partialPath = '';
      for (const part of dirParts) {
        if (part === '') continue;
        // Add separator between encoded path segments so parent-child
        // relationships can be parsed from the nodeid (e.g., "folders-A" is
        // parent of "folders-A-B").
        if (folderKey !== 'folders-') folderKey += '-';
        folderKey += base64Encode(part).replace(/[+|/=]/g, '0');
        partialPath = partialPath ? `${partialPath}/${part}` : `/${part}`;
        const f = folders[folderKey];
        if (f) { f.torrents.push(item); f.count++; f.size += item.totalSize; }
        else {
          folders[folderKey] = { count: 1, torrents: [item], size: item.totalSize, nodeid: folderKey, dirPath: partialPath };
        }
      }
    }

    if (!downloadDirs.includes(item.downloadDir)) {
      downloadDirs.push(item.downloadDir);
    }

    addTrackerInfo(item, trackers);
    totalSize += item.totalSize;

    if (!status[item.status]) status[item.status] = [];
    status[item.status].push(item);

    if (item.error !== 0) error.push(item);
    if (item.warning) warning.push(item);
    if (item.rateUpload > 0 || item.rateDownload > 0) actively.push(item);

    switch (item.status) {
      case TorrentStatus.STOPPED: paused.push(item); break;
      case TorrentStatus.DOWNLOAD: downloading.push(item); break;
    }

    if (item.trackerStats && item.trackerStats.length > 5) btItems.push(item);
    all[item.id] = item;
    count++;
  }

  return {
    collection: { all, downloading, paused, actively, error, warning, btItems, count, totalSize, folders, status },
    newIds, trackers, downloadDirs: [...new Set(downloadDirs)].sort(),
  };
}

/** Search torrents by name keyword */
export function searchTorrents(
  keyword: string,
  source: Record<number, Torrent> | Torrent[],
): Torrent[] {
  if (!keyword) return [];
  const lowerKey = keyword.toLowerCase();
  const items = Array.isArray(source) ? source : Object.values(source);
  return items.filter((t) => t.name.toLowerCase().includes(lowerKey));
}

/** Get error/warning torrent IDs */
export function getErrorIds(items: Torrent[], needUpdateOnly?: boolean): number[] {
  const result: number[] = [];
  const now = needUpdateOnly ? Date.now() / 1000 : 0;
  for (const item of items) {
    if (item.error === 0 && !item.warning) continue;
    if (item.status === TorrentStatus.STOPPED) continue;
    if (needUpdateOnly && now < (item.nextAnnounceTime ?? 0)) continue;
    result.push(item.id);
  }
  return result;
}
