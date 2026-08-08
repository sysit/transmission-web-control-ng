import { describe, it, expect } from 'vitest';
import {
  formatSize,
  formatSpeed,
  formatRemainingTime,
  formatPercent,
  formatRatio,
  formatDate,
} from '../format';

describe('formatSize', () => {
  it('returns 0 B for zero', () => {
    expect(formatSize(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatSize(512)).toBe('512 B');
  });

  it('formats KB', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
  });

  it('formats MB', () => {
    expect(formatSize(1048576)).toBe('1.0 MB');
  });

  it('formats GB', () => {
    expect(formatSize(1073741824)).toBe('1.0 GB');
  });

  it('formats TB', () => {
    expect(formatSize(1099511627776)).toBe('1.0 TB');
  });

  it('handles partial units', () => {
    expect(formatSize(2560)).toBe('2.5 KB');
  });
});

describe('formatSpeed', () => {
  it('formats bytes per second', () => {
    expect(formatSpeed(0)).toBe('0 B/s');
    expect(formatSpeed(1024)).toBe('1.0 KB/s');
  });

  it('formats bits per second', () => {
    expect(formatSpeed(1, 'bits')).toBe('8 Bps');
  });
});

describe('formatRemainingTime', () => {
  it('returns ∞ for zero', () => {
    expect(formatRemainingTime(0)).toBe('∞');
  });

  it('returns ∞ for negative', () => {
    expect(formatRemainingTime(-100)).toBe('∞');
  });

  it('returns ∞ for very large values', () => {
    expect(formatRemainingTime(3153600000)).toBe('∞');
  });

  it('formats seconds only', () => {
    expect(formatRemainingTime(30000)).toBe('30s');
  });

  it('formats minutes and seconds', () => {
    expect(formatRemainingTime(125000)).toBe('2m 5s');
  });

  it('formats hours and minutes', () => {
    expect(formatRemainingTime(7200000)).toBe('2h');
  });

  it('formats days', () => {
    expect(formatRemainingTime(172800000)).toBe('2d');
  });

  it('formats full duration', () => {
    const ms = (1 * 86400 + 2 * 3600 + 3 * 60 + 4) * 1000;
    expect(formatRemainingTime(ms)).toBe('1d 2h 3m 4s');
  });
});

describe('formatPercent', () => {
  it('formats 0%', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('formats 50%', () => {
    expect(formatPercent(0.5)).toBe('50.0%');
  });

  it('formats 100%', () => {
    expect(formatPercent(1)).toBe('100.0%');
  });

  it('formats fractional percent', () => {
    expect(formatPercent(0.123)).toBe('12.3%');
  });
});

describe('formatRatio', () => {
  it('returns ∞ for negative ratio', () => {
    expect(formatRatio(-1)).toBe('∞');
  });

  it('formats zero', () => {
    expect(formatRatio(0)).toBe('0.00');
  });

  it('formats ratio with 2 decimals', () => {
    expect(formatRatio(1.5)).toBe('1.50');
    expect(formatRatio(2.345)).toBe('2.35');
  });
});

describe('formatDate', () => {
  it('returns empty string for 0 timestamp', () => {
    expect(formatDate(0)).toBe('');
  });

  it('formats a valid Unix timestamp', () => {
    const result = formatDate(1609459200); // 2021-01-01 00:00:00 UTC
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(5);
  });
});
