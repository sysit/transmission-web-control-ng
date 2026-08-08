// Format utilities — migrated from public.js, no prototype pollution

export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

export function formatSpeed(bytesPerSecond: number, unit?: 'bits' | 'bytes'): string {
  if (unit === 'bits') return formatSize(bytesPerSecond * 8) + 'ps';
  return formatSize(bytesPerSecond) + '/s';
}

export function formatRemainingTime(etaMs: number): string {
  if (!etaMs || etaMs <= 0) return '∞';
  if (etaMs >= 3153600000) return '∞';
  const s = Math.floor(etaMs / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(d + 'd');
  if (h > 0) parts.push(h + 'h');
  if (m > 0) parts.push(m + 'm');
  if (sec > 0 || parts.length === 0) parts.push(sec + 's');
  return parts.join(' ');
}

export function formatPercent(ratio: number): string {
  return (ratio * 100).toFixed(1) + '%';
}

export function formatRatio(ratio: number): string {
  if (ratio < 0) return '∞';
  return ratio.toFixed(2);
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleString();
}
