import { describe, it, expect } from 'vitest';
import {
  categorizeTorrents,
  searchTorrents,
  getErrorIds,
  addTrackerInfo,
  TORRENT_FIELDS_BASE,
  TORRENT_FIELDS_CONFIG,
} from '../torrent-model';
import { TorrentStatus } from '../rpc-types';
import type { Torrent, TrackerInfo, TrackerStat } from '../rpc-types';

function makeTrackerStat(overrides: Partial<TrackerStat> = {}): TrackerStat {
  return {
    announce: '',
    announceState: 0,
    downloadCount: 0,
    hasAnnounced: false,
    hasScraped: false,
    host: '',
    id: 0,
    isBackup: false,
    lastAnnouncePeerCount: 0,
    lastAnnounceResult: '',
    lastAnnounceStartTime: 0,
    lastAnnounceSucceeded: false,
    lastAnnounceTime: 0,
    lastAnnounceTimedOut: false,
    lastScrapeResult: '',
    lastScrapeStartTime: 0,
    lastScrapeSucceeded: false,
    lastScrapeTime: 0,
    lastScrapeTimedOut: false,
    leecherCount: 0,
    nextAnnounceTime: 0,
    nextScrapeTime: 0,
    scrapeState: 0,
    seederCount: 0,
    tier: 0,
    ...overrides,
  };
}

function makeTorrent(overrides: Partial<Torrent> = {}): Torrent {
  return {
    id: 1,
    name: 'test.torrent',
    status: TorrentStatus.STOPPED,
    hashString: 'abc123',
    totalSize: 1073741824,
    percentDone: 0.5,
    addedDate: 1609459200,
    trackerStats: [],
    leftUntilDone: 536870912,
    rateDownload: 0,
    rateUpload: 0,
    recheckProgress: 0,
    peersGettingFromUs: 0,
    peersSendingToUs: 0,
    uploadRatio: 0,
    uploadedEver: 0,
    downloadedEver: 0,
    downloadDir: '/downloads/movies',
    error: 0,
    errorString: '',
    doneDate: 0,
    queuePosition: 0,
    activityDate: 1609459200,
    ...overrides,
  };
}

describe('TORRENT_FIELDS_BASE', () => {
  it('contains required fields', () => {
    expect(TORRENT_FIELDS_BASE).toContain('id');
    expect(TORRENT_FIELDS_BASE).toContain('name');
    expect(TORRENT_FIELDS_BASE).toContain('status');
    expect(TORRENT_FIELDS_BASE).toContain('totalSize');
    expect(TORRENT_FIELDS_BASE).toContain('percentDone');
  });
});

describe('TORRENT_FIELDS_CONFIG', () => {
  it('contains config-related fields', () => {
    expect(TORRENT_FIELDS_CONFIG).toContain('downloadLimit');
    expect(TORRENT_FIELDS_CONFIG).toContain('uploadLimit');
    expect(TORRENT_FIELDS_CONFIG).toContain('seedRatioLimit');
  });
});

describe('categorizeTorrents', () => {
  it('returns empty collection for empty input', () => {
    const result = categorizeTorrents({}, {}, [], [], {}, []);
    expect(result.collection.count).toBe(0);
    expect(result.newIds).toEqual([]);
  });

  it('detects new torrents', () => {
    const t = makeTorrent({ id: 1, name: 'new.torrent' });
    const result = categorizeTorrents({}, {}, [t], [], {}, []);
    expect(result.newIds).toContain(1);
    expect(result.collection.count).toBe(1);
    expect(result.collection.all[1].name).toBe('new.torrent');
  });

  it('does not flag existing torrents as new', () => {
    const t = makeTorrent({ id: 1 });
    const result = categorizeTorrents({}, { 1: t }, [t], [], {}, []);
    expect(result.newIds).toEqual([]);
  });

  it('removes torrents in the removed list', () => {
    const t = makeTorrent({ id: 1 });
    const result = categorizeTorrents({ 1: t }, { 1: t }, [], [1], {}, []);
    expect(result.collection.all[1]).toBeUndefined();
  });

  it('categorizes stopped torrent as paused', () => {
    const t = makeTorrent({ id: 1, status: TorrentStatus.STOPPED });
    const result = categorizeTorrents({}, {}, [t], [], {}, []);
    expect(result.collection.paused).toHaveLength(1);
    expect(result.collection.downloading).toHaveLength(0);
  });

  it('categorizes downloading torrent as active', () => {
    const t = makeTorrent({ id: 2, status: TorrentStatus.DOWNLOAD, rateDownload: 1024 });
    const result = categorizeTorrents({}, {}, [t], [], {}, []);
    expect(result.collection.downloading).toHaveLength(1);
    expect(result.collection.actively).toHaveLength(1);
  });

  it('categorizes seeding torrent as active', () => {
    const t = makeTorrent({ id: 3, status: TorrentStatus.SEED, rateUpload: 2048 });
    const result = categorizeTorrents({}, {}, [t], [], {}, []);
    expect(result.collection.actively).toHaveLength(1);
  });

  it('categorizes error torrents', () => {
    const t = makeTorrent({ id: 4, error: 1, errorString: 'Tracker error' });
    const result = categorizeTorrents({}, {}, [t], [], {}, []);
    expect(result.collection.error).toHaveLength(1);
  });

  it('calculates remaining time when downloading', () => {
    const t = makeTorrent({
      id: 5,
      status: TorrentStatus.DOWNLOAD,
      rateDownload: 1024 * 1024,
      leftUntilDone: 100 * 1024 * 1024,
    });
    const result = categorizeTorrents({}, {}, [t], [], {}, []);
    expect(result.collection.all[5].remainingTime).toBe(100000);
  });

  it('sets remainingTime to 0 when done', () => {
    const t = makeTorrent({ id: 6, rateDownload: 0, leftUntilDone: 0, totalSize: 1024 });
    const result = categorizeTorrents({}, {}, [t], [], {}, []);
    expect(result.collection.all[6].remainingTime).toBe(0);
  });

  it('sets uploadRatio to -1 for no-transfer torrents', () => {
    const t = makeTorrent({ id: 7, uploadedEver: 0, downloadedEver: 0 });
    const result = categorizeTorrents({}, {}, [t], [], {}, []);
    expect(result.collection.all[7].uploadRatio).toBe(-1);
  });

  it('builds and deduplicates download dirs', () => {
    const t1 = makeTorrent({ id: 1, downloadDir: '/dl/movies' });
    const t2 = makeTorrent({ id: 2, downloadDir: '/dl/movies' });
    const t3 = makeTorrent({ id: 3, downloadDir: '/dl/tv' });
    const result = categorizeTorrents({}, {}, [t1, t2, t3], [], {}, []);
    expect(result.downloadDirs).toEqual(['/dl/movies', '/dl/tv']);
  });

  it('adds tracker info to torrent', () => {
    const t = makeTorrent({
      id: 10,
      trackerStats: [makeTrackerStat({
        announce: 't.example.com',
        announceState: 3,
        downloadCount: 50,
        lastAnnounceResult: 'Success',
        lastAnnounceSucceeded: true,
        leecherCount: 10,
        seederCount: 100,
        host: 't.example.com',
        id: 1,
      })],
    });
    const result = categorizeTorrents({}, {}, [t], [], {}, []);
    expect(result.collection.all[10].leecherCount).toBe(10);
    expect(result.collection.all[10].seederCount).toBe(100);
  });
});

describe('addTrackerInfo', () => {
  it('handles empty tracker stats', () => {
    const trackers: Record<string, TrackerInfo> = {};
    const t = makeTorrent({ trackerStats: [] });
    addTrackerInfo(t, trackers);
    expect(t.leecherCount).toBe(0);
    expect(t.seederCount).toBe(0);
  });

  it('clamps negative counts to 0', () => {
    const trackers: Record<string, TrackerInfo> = {};
    const t = makeTorrent({
      trackerStats: [makeTrackerStat({
        announce: 't.example.com',
        announceState: 3,
        lastAnnounceResult: 'Success',
        lastAnnounceSucceeded: true,
        leecherCount: -5,
        seederCount: -3,
        host: 't.example.com',
        id: 1,
      })],
    });
    addTrackerInfo(t, trackers);
    expect(t.leecherCount).toBe(0);
    expect(t.seederCount).toBe(0);
  });
});

describe('searchTorrents', () => {
  const t1 = makeTorrent({ id: 1, name: 'Ubuntu Linux ISO' });
  const t2 = makeTorrent({ id: 2, name: 'Debian ISO' });
  const t3 = makeTorrent({ id: 3, name: 'Arch Linux' });

  it('returns empty array for empty keyword', () => {
    expect(searchTorrents('', [t1, t2])).toEqual([]);
  });

  it('returns matching torrents', () => {
    const results = searchTorrents('linux', [t1, t2, t3]);
    expect(results).toHaveLength(2);
  });

  it('is case-insensitive', () => {
    const results = searchTorrents('DEBIAN', [t1, t2, t3]);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(2);
  });

  it('accepts Record source', () => {
    const source = { 1: t1, 2: t2, 3: t3 };
    const results = searchTorrents('ubuntu', source);
    expect(results).toHaveLength(1);
  });
});

describe('getErrorIds', () => {
  it('returns ids of torrents with errors', () => {
    const t1 = makeTorrent({ id: 1, status: TorrentStatus.DOWNLOAD, error: 0 });
    const t2 = makeTorrent({ id: 2, status: TorrentStatus.DOWNLOAD, error: 1 });
    expect(getErrorIds([t1, t2])).toEqual([2]);
  });

  it('returns ids of torrents with warnings', () => {
    const t1 = makeTorrent({ id: 1, status: TorrentStatus.DOWNLOAD, warning: 'could not connect to tracker' });
    const t2 = makeTorrent({ id: 2, status: TorrentStatus.DOWNLOAD });
    expect(getErrorIds([t1, t2])).toEqual([1]);
  });

  it('excludes stopped torrents', () => {
    const t1 = makeTorrent({ id: 1, status: TorrentStatus.STOPPED, error: 1 });
    const t2 = makeTorrent({ id: 2, status: TorrentStatus.DOWNLOAD, error: 1 });
    expect(getErrorIds([t1, t2])).toEqual([2]);
  });

  it('returns empty when no torrent has error or warning', () => {
    const t = makeTorrent({ id: 1, status: TorrentStatus.DOWNLOAD, error: 0 });
    expect(getErrorIds([t])).toEqual([]);
  });

  it('filters by nextAnnounceTime when needUpdateOnly', () => {
    const future = Date.now() / 1000 + 3600;
    const past = Date.now() / 1000 - 3600;
    const t1 = makeTorrent({ id: 1, status: TorrentStatus.DOWNLOAD, error: 1, nextAnnounceTime: future });
    const t2 = makeTorrent({ id: 2, status: TorrentStatus.DOWNLOAD, error: 1, nextAnnounceTime: past });
    expect(getErrorIds([t1, t2], true)).toEqual([2]);
  });
});
