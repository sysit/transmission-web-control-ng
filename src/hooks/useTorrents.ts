// TanStack Query hooks for Transmission RPC data

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTorrents,
  getSessionStats,
  getSessionConfig,
  getFreeSpace,
  addTorrentFromUrl,
  addTorrentFromFile,
  removeTorrent,
  setTorrent,
  setTorrentLocation,
  startTorrent,
  stopTorrent,
} from '@/core/rpc/transmission-client';
import {
  categorizeTorrents,
  TORRENT_FIELDS_BASE,
  TORRENT_FIELDS_EXTENDED,
  TORRENT_FIELDS_FIRST_LOAD,
  TORRENT_FIELDS_CONFIG,
} from '@/core/rpc/torrent-model';
import type { Torrent, TorrentCollection, TrackerInfo } from '@/core/rpc/rpc-types';

export interface TorrentData {
  collection: TorrentCollection;
  trackers: Record<string, TrackerInfo>;
  downloadDirs: string[];
}

// Cached previous state for delta fetching
let previousAll: Record<number, Torrent> = {};

async function fetchAllTorrents(): Promise<TorrentData> {
  const result = await getTorrents({ fields: TORRENT_FIELDS_BASE });

  const trackers: Record<string, TrackerInfo> = {};
  const downloadDirs: string[] = [];

  const { collection } = categorizeTorrents(
    {}, previousAll, result.torrents, result.removed ?? [], trackers, downloadDirs,
  );

  previousAll = collection.all;
  return { collection, trackers, downloadDirs };
}

export interface TorrentsOptions {
  /** Refresh interval in seconds. Default: 5 */
  interval?: number;
  /** Enable auto-refresh polling. Default: true */
  autoRefresh?: boolean;
}

/** Poll at configurable interval — matches old autoReloadTimer behavior */
export function useTorrents(options?: TorrentsOptions) {
  const interval = options?.interval ?? 5;
  const autoRefresh = options?.autoRefresh ?? true;

  return useQuery({
    queryKey: ['torrents'],
    queryFn: fetchAllTorrents,
    refetchInterval: autoRefresh ? interval * 1000 : false,
    staleTime: Math.max(3000, interval * 500),
  });
}

export function useSessionStats() {
  return useQuery({
    queryKey: ['session', 'stats'],
    queryFn: getSessionStats,
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

export function useSessionConfig() {
  return useQuery({
    queryKey: ['session', 'config'],
    queryFn: getSessionConfig,
    staleTime: 30000,
  });
}

export function useFreeSpace(path: string | undefined) {
  return useQuery({
    queryKey: ['session', 'free-space', path],
    queryFn: () => getFreeSpace(path!),
    enabled: !!path,
    staleTime: 60000,
  });
}

// ---- Mutations ----

export function useAddTorrentUrl() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ url, savePath, paused }: { url: string; savePath?: string; paused?: boolean }) =>
      addTorrentFromUrl(url, savePath, paused),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torrents'] }),
  });
}

export function useAddTorrentFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ metainfo, savePath, paused }: { metainfo: string; savePath?: string; paused?: boolean }) =>
      addTorrentFromFile(metainfo, savePath, paused),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torrents'] }),
  });
}

export function useRemoveTorrent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, deleteData }: { ids: number[]; deleteData?: boolean }) =>
      removeTorrent(ids, deleteData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torrents'] }),
  });
}

export function useSetTorrent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, args }: { ids: number[]; args: Record<string, unknown> }) =>
      setTorrent(ids, args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torrents'] }),
  });
}

export function useSetTorrentLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, location, move }: { ids: number[]; location: string; move?: boolean }) =>
      setTorrentLocation(ids, location, move ?? false),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torrents'] }),
  });
}

export function useStartTorrent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => startTorrent(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torrents'] }),
  });
}

export function useStopTorrent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => stopTorrent(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['torrents'] }),
  });
}

// ---- Detail Panel Data ----

/** Extended data returned by useTorrentDetail */
export interface TorrentDetailData {
  torrent: Torrent;
  hasLoadedBefore: boolean;
}

// Track which torrents have had their first load completed
const loadedTorrents = new Set<number>();

/**
 * Fetch extended torrent data on demand for the detail panel.
 * Only fetches when enabled && id > 0.
 * First load requests the full field set (files, trackers, metadata).
 * Subsequent loads request only dynamic fields (fileStats, peers, etc.).
 */
export function useTorrentDetail(id: number, enabled: boolean) {
  const qc = useQueryClient();

  return useQuery({
    queryKey: ['torrent', 'detail', id],
    queryFn: async () => {
      if (id === 0) return null;

      const hasLoadedBefore = loadedTorrents.has(id);
      const fields = hasLoadedBefore
        ? [...TORRENT_FIELDS_EXTENDED, ...TORRENT_FIELDS_CONFIG]
        : [...TORRENT_FIELDS_FIRST_LOAD, ...TORRENT_FIELDS_CONFIG];

      const result = await getTorrents({ fields, ids: [id] });
      const torrents = result.torrents;
      if (!torrents || torrents.length === 0) return null;

      const torrent = torrents[0];

      // Merge with cached base data
      const existing = qc.getQueryData<TorrentData>(['torrents']);
      const baseTorrent = existing?.collection.all[id];
      const merged: Torrent = { ...(baseTorrent ?? {}), ...torrent };

      // Mark first load complete
      if (!hasLoadedBefore) {
        loadedTorrents.add(id);
        merged.moreInfosTag = true;
      }

      // Compute completeSize
      merged.completeSize = (merged.totalSize ?? 0) - (merged.leftUntilDone ?? 0);

      return merged;
    },
    enabled: enabled && id > 0,
    staleTime: 3000,
    refetchOnWindowFocus: false,
    gcTime: 600000,
  });
}
