import { describe, it, expect, vi, beforeEach } from 'vitest';

// Reset module state between tests
let sessionModule: typeof import('../session');

beforeEach(async () => {
  vi.resetModules();
  sessionModule = await import('../session');
});

describe('Session', () => {
  it('creates with default config', () => {
    const s = sessionModule.createSession({ rpcPath: '../rpc' });
    expect(s.getRpcPath()).toBe('../rpc');
    expect(s.getSessionId()).toBe('');
  });

  it('adds Basic auth header when credentials provided', () => {
    const s = sessionModule.createSession({
      rpcPath: '../rpc',
      username: 'admin',
      password: 'secret',
    });
    expect(s.getHeaders()['Authorization']).toMatch(/^Basic /);
  });

  it('throws before creation', () => {
    expect(() => sessionModule.getSession()).toThrow(
      'Session not initialized. Call createSession() first.'
    );
  });

  it('handles 409 challenge and stores session id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 409,
      headers: { get: vi.fn().mockReturnValue('sid-12345') },
    });
    const s = sessionModule.createSession({ rpcPath: '../rpc' });
    await s.init();
    expect(s.getSessionId()).toBe('sid-12345');
  });

  it('handles non-409 response with session id header', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      headers: { get: vi.fn().mockReturnValue('sid-67890') },
    });
    const s = sessionModule.createSession({ rpcPath: '../rpc' });
    await s.init();
    expect(s.getSessionId()).toBe('sid-67890');
  });
});
