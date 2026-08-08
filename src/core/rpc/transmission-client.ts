// Transmission RPC Client
// Migrated from transmission.js — modernized with async/await and type safety

import { getSession } from './session';
import type {
  RpcResponse,
  SessionStats,
  SessionGetResponse,
  TorrentGetArguments,
  TorrentGetResponseData,
  TorrentAddResponseData,
  FreeSpaceResult,
} from './rpc-types';

let lastTag = 0;
function nextTag(): number {
  return ++lastTag;
}

/**
 * Execute a Transmission RPC call.
 * Handles 409 Session-Id renewal transparently.
 */
export async function exec<TArgs = Record<string, unknown>, TResult = Record<string, unknown>>(
  config: {
    method: string;
    arguments?: TArgs;
  },
): Promise<RpcResponse<TResult>> {
  const session = getSession();
  const body = {
    method: config.method,
    arguments: config.arguments || {},
    tag: nextTag(),
  };

  let response = await fetch(session.getRpcPath(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...session.getHeaders(),
    },
    body: JSON.stringify(body),
  });

  // Handle 409 — renew Session-Id and retry once
  if (response.status === 409) {
    const sid = response.headers.get('X-Transmission-Session-Id');
    if (sid) {
      session.setSessionId(sid);
    }
    response = await fetch(session.getRpcPath(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...session.getHeaders(),
      },
      body: JSON.stringify(body),
    });
  }

  if (!response.ok) {
    throw new Error(`RPC error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<RpcResponse<TResult>>;
}

// ---- High-level API methods ----

/** Get session statistics (torrent count, speeds, cumulative) */
export async function getSessionStats(): Promise<SessionStats> {
  const resp = await exec<Record<string, never>, SessionStats>({ method: 'session-stats' });
  return resp.arguments;
}

/** Get full session configuration */
export async function getSessionConfig(): Promise<SessionGetResponse> {
  const resp = await exec<Record<string, never>, SessionGetResponse>({ method: 'session-get' });
  return resp.arguments;
}

/** Close the session */
export async function closeSession(): Promise<void> {
  await exec({ method: 'session-close' });
}

/** Get torrents by IDs or 'recently-active' */
export async function getTorrents(args: TorrentGetArguments): Promise<TorrentGetResponseData> {
  const resp = await exec<TorrentGetArguments, TorrentGetResponseData>({
    method: 'torrent-get',
    arguments: args,
  });
  return resp.arguments;
}

/** Add torrent by URL or magnet link */
export async function addTorrentFromUrl(
  url: string,
  savePath?: string,
  paused?: boolean,
): Promise<TorrentAddResponseData> {
  if (/^[0-9a-f]{40}$/i.test(url)) {
    url = 'magnet:?xt=urn:btih:' + url;
  }

  const resp = await exec<
    { filename: string; paused?: boolean; 'download-dir'?: string },
    TorrentAddResponseData
  >({
    method: 'torrent-add',
    arguments: {
      filename: url,
      paused: paused ?? false,
      ...(savePath ? { 'download-dir': savePath } : {}),
    },
  });
  return resp.arguments;
}

/** Add torrent from base64-encoded .torrent file content */
export async function addTorrentFromFile(
  metainfo: string,
  savePath?: string,
  paused?: boolean,
): Promise<TorrentAddResponseData> {
  const resp = await exec<
    { metainfo: string; 'download-dir'?: string; paused?: boolean },
    TorrentAddResponseData
  >({
    method: 'torrent-add',
    arguments: {
      metainfo,
      paused: paused ?? false,
      ...(savePath ? { 'download-dir': savePath } : {}),
    },
  });
  return resp.arguments;
}

/** Remove torrents by IDs */
export async function removeTorrent(
  ids: number[],
  deleteLocalData?: boolean,
): Promise<string> {
  const resp = await exec<{ ids: number[]; 'delete-local-data'?: boolean }>({
    method: 'torrent-remove',
    arguments: {
      ids,
      'delete-local-data': deleteLocalData ?? false,
    },
  });
  return resp.result;
}

/** Set torrent properties */
export async function setTorrent(
  ids: number[],
  args: Record<string, unknown>,
): Promise<void> {
  await exec<{ ids: number[] } & Record<string, unknown>>({
    method: 'torrent-set',
    arguments: { ids, ...args },
  });
}

/** Move a torrent's data to a new download location */
export async function setTorrentLocation(
  ids: number[],
  location: string,
  move: boolean = false,
): Promise<void> {
  await exec<{ ids: number[]; location: string; move: boolean }>({
    method: 'torrent-set-location',
    arguments: { ids, location, move },
  });
}

/** Start torrents */
export async function startTorrent(ids: number[]): Promise<void> {
  await exec<{ ids: number[] }>({ method: 'torrent-start', arguments: { ids } });
}

/** Stop torrents */
export async function stopTorrent(ids: number[]): Promise<void> {
  await exec<{ ids: number[] }>({ method: 'torrent-stop', arguments: { ids } });
}

/** Rename a torrent's file or directory */
export async function renameTorrentPath(
  id: number,
  path: string,
  name: string,
): Promise<RpcResponse<{ id: number; path: string; name: string }>> {
  return exec<{ ids: number[]; path: string; name: string }, { id: number; path: string; name: string }>({
    method: 'torrent-rename-path',
    arguments: { ids: [id], path, name },
  });
}

/** Get free space at a given path */
export async function getFreeSpace(path: string): Promise<FreeSpaceResult> {
  const resp = await exec<{ path: string }, FreeSpaceResult>({
    method: 'free-space',
    arguments: { path },
  });
  return resp.arguments;
}

/** Update the blocklist */
export async function updateBlocklist(): Promise<string> {
  const resp = await exec({ method: 'blocklist-update' });
  return resp.result;
}

/** Read .torrent file as base64 metainfo */
export function readTorrentFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const contents = e.target?.result as string;
      const key = 'base64,';
      const index = contents.indexOf(key);
      if (index === -1) {
        reject(new Error('Invalid file data URL'));
        return;
      }
      resolve(contents.substring(index + key.length));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
