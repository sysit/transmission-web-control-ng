// ============================================================
// Transmission RPC Protocol Type Definitions
// Based on: https://github.com/transmission/transmission/blob/main/extras/rpc-spec.txt
// ============================================================

// ---- Torrent Status ----
export const TorrentStatus = {
  STOPPED: 0,
  CHECK_WAIT: 1,
  CHECK: 2,
  DOWNLOAD_WAIT: 3,
  DOWNLOAD: 4,
  SEED_WAIT: 5,
  SEED: 6,
} as const;

export type TorrentStatusCode = (typeof TorrentStatus)[keyof typeof TorrentStatus];

// ---- Tracker Announce State ----
export const TrackerAnnounceState = {
  INACTIVE: 0,
  WAITING: 1,
  QUEUED: 2,
  ACTIVE: 3,
} as const;

export type TrackerAnnounceStateCode =
  (typeof TrackerAnnounceState)[keyof typeof TrackerAnnounceState];

// ---- Torrent Fields ----
export interface Torrent {
  id: number;
  name: string;
  status: TorrentStatusCode;
  hashString: string;
  totalSize: number;
  percentDone: number;
  addedDate: number;
  leftUntilDone: number;
  rateDownload: number;
  rateUpload: number;
  recheckProgress: number;
  peersGettingFromUs: number;
  peersSendingToUs: number;
  uploadRatio: number;
  uploadedEver: number;
  downloadedEver: number;
  downloadDir: string;
  labels?: string[];
  completeSize?: number;
  error: number;
  errorString: string;
  doneDate: number;
  queuePosition: number;
  activityDate: number;
  trackerStats: TrackerStat[];
  files?: TorrentFile[];
  fileStats?: TorrentFileStat[];
  peers?: Peer[];
  magnetLink?: string;
  downloadLimit?: number;
  downloadLimited?: boolean;
  uploadLimit?: number;
  uploadLimited?: boolean;
  'peer-limit'?: number;
  seedIdleLimit?: number;
  seedIdleMode?: number;
  seedRatioLimit?: number;
  seedRatioMode?: number;

  // Extended fields loaded on demand (torrent-get with extra fields)
  pieces?: string;
  pieceCount?: number;
  pieceSize?: number;
  comment?: string;
  creator?: string;
  dateCreated?: number;

  // Computed fields (added by torrent-model)
  remainingTime?: number;
  leecherCount?: number;
  seederCount?: number;
  leecher?: string;
  seeder?: string;
  trackers?: string;
  warning?: string;
  nextAnnounceTime?: number;
  infoIsLoading?: boolean;
  moreInfosTag?: boolean;
}

export interface TrackerStat {
  announce: string;
  announceState: TrackerAnnounceStateCode;
  downloadCount: number;
  hasAnnounced: boolean;
  hasScraped: boolean;
  host: string;
  id: number;
  isBackup: boolean;
  lastAnnouncePeerCount: number;
  lastAnnounceResult: string;
  lastAnnounceStartTime: number;
  lastAnnounceSucceeded: boolean;
  lastAnnounceTime: number;
  lastAnnounceTimedOut: boolean;
  lastScrapeResult: string;
  lastScrapeStartTime: number;
  lastScrapeSucceeded: boolean;
  lastScrapeTime: number;
  lastScrapeTimedOut: boolean;
  leecherCount: number;
  nextAnnounceTime: number;
  nextScrapeTime: number;
  scrapeState: number;
  seederCount: number;
  tier: number;
}

export interface TorrentFile {
  bytesCompleted: number;
  length: number;
  name: string;
}

export interface TorrentFileStat {
  bytesCompleted: number;
  wanted: boolean;
  priority: number;
}

export interface Peer {
  address: string;
  clientName: string;
  clientIsChoked: boolean;
  clientIsInterested: boolean;
  flagStr: string;
  isDownloadingFrom: boolean;
  isEncrypted: boolean;
  isUploadingTo: boolean;
  isUTP: boolean;
  peerIsChoked: boolean;
  peerIsInterested: boolean;
  port: number;
  progress: number;
  rateToClient: number;
  rateToPeer: number;
}

// ---- Session Stats ----
export interface SessionStats {
  activeTorrentCount: number;
  downloadSpeed: number;
  pausedTorrentCount: number;
  torrentCount: number;
  uploadSpeed: number;
  'cumulative-stats': CumulativeStats;
  'current-stats': CurrentStats;
}

export interface CumulativeStats {
  uploadedBytes: number;
  downloadedBytes: number;
  filesAdded: number;
  sessionCount: number;
  secondsActive: number;
}

export interface CurrentStats {
  uploadedBytes: number;
  downloadedBytes: number;
  filesAdded: number;
  sessionCount: number;
  secondsActive: number;
}

// ---- Session Settings ----
export interface SessionGetResponse {
  'alt-speed-down': number;
  'alt-speed-enabled': boolean;
  'alt-speed-time-begin': number;
  'alt-speed-time-day': number;
  'alt-speed-time-enabled': boolean;
  'alt-speed-time-end': number;
  'alt-speed-up': number;
  'blocklist-enabled': boolean;
  'blocklist-url': string;
  'cache-size-mb': number;
  'config-dir': string;
  'dht-enabled': boolean;
  'download-dir': string;
  'download-queue-enabled': boolean;
  'download-queue-size': number;
  encryption: string;
  'idle-seeding-limit': number;
  'idle-seeding-limit-enabled': boolean;
  'incomplete-dir': string;
  'incomplete-dir-enabled': boolean;
  'lpd-enabled': boolean;
  'peer-limit-global': number;
  'peer-limit-per-torrent': number;
  'pex-enabled': boolean;
  'peer-port': number;
  'peer-port-random-on-start': boolean;
  'port-forwarding-enabled': boolean;
  'queue-stalled-enabled': boolean;
  'queue-stalled-minutes': number;
  'rename-partial-files': boolean;
  'rpc-version': number;
  'rpc-version-minimum': number;
  'script-torrent-done-enabled': boolean;
  'script-torrent-done-filename': string;
  'seed-queue-enabled': boolean;
  'seed-queue-size': number;
  'speed-limit-down': number;
  'speed-limit-down-enabled': boolean;
  'speed-limit-up': number;
  'speed-limit-up-enabled': boolean;
  'start-added-torrents': boolean;
  'trash-original-torrent-files': boolean;
  units: Units;
  'utp-enabled': boolean;
  version: string;
}

export interface Units {
  'speed-units': string[];
  'speed-bytes': number;
  'size-units': string[];
  'size-bytes': number;
  'memory-units': string[];
  'memory-bytes': number;
}

// ---- Free Space ----
export interface FreeSpaceResult {
  path: string;
  'size-bytes': number;
  total_size: number;
}

// ---- RPC Request/Response Envelope ----
export interface RpcRequest<T = Record<string, unknown>> {
  method: string;
  arguments: T;
  tag?: number | string;
}

export interface RpcResponse<T = Record<string, unknown>> {
  result: 'success' | string;
  arguments: T;
  tag?: number | string;
}

export interface TorrentGetArguments {
  fields: string[];
  ids?: number[] | 'recently-active';
}

export interface TorrentGetResponseData {
  torrents: Torrent[];
  removed?: number[];
}

export interface TorrentAddResponseData {
  'torrent-added'?: Torrent;
  'torrent-duplicate'?: Torrent;
}

// ---- Categorized Torrent Lists ----
export interface TorrentCollection {
  all: Record<number, Torrent>;
  downloading: Torrent[];
  paused: Torrent[];
  actively: Torrent[];
  error: Torrent[];
  warning: Torrent[];
  btItems: Torrent[];
  count: number;
  totalSize: number;
  folders: Record<string, TorrentFolder>;
  status: Record<number, Torrent[]>;
}

export interface TorrentFolder {
  count: number;
  torrents: Torrent[];
  size: number;
  nodeid: string;
  dirPath: string;
}

export interface TrackerInfo {
  count: number;
  torrents: Torrent[];
  size: number;
  connected: boolean;
  isBT: boolean;
  name: string;
  nodeid: string;
  host: string;
}
