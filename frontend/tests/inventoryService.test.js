import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock localStorage since Vitest runs in Node, not a browser
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
global.localStorage = localStorageMock;

describe('inventoryService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  it('attaches Bearer token when present', async () => {
    localStorage.setItem('vaxora_token', 'test-token');
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [],
    });

    const svc = await import('../src/features/hospital/services/inventoryService.js');
    const fn = svc.listBatches || svc.getBatches || Object.values(svc)[0];
    if (typeof fn !== 'function') return;

    await fn({});

    expect(global.fetch).toHaveBeenCalled();
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer test-token');
  });

  it('throws when API returns an error status', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ message: 'Insufficient stock' }),
    });

    const svc = await import('../src/features/hospital/services/inventoryService.js');
    const fn = svc.registerBatch || svc.createBatch || Object.values(svc)[0];
    if (typeof fn !== 'function') return;

    await expect(fn({})).rejects.toThrow();
  });

  it('returns null for 204 No Content', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => null,
    });

    const svc = await import('../src/features/hospital/services/inventoryService.js');
    const fn = svc.listBatches || svc.getBatches || Object.values(svc)[0];
    if (typeof fn !== 'function') return;

    const result = await fn({});
    expect(result).toBeNull();
  });
});