import { describe, it, expect } from 'vitest';
import {
  ADAPTER_REGISTRY,
  getAdapter,
  getAdapterSync,
  listAdapterIds,
} from './adapters';

describe('adapters', () => {
  it('ADAPTER_REGISTRY includes pediscreen_v1 and rop_detector_v1', () => {
    const ids = ADAPTER_REGISTRY.map((a) => a.id);
    expect(ids).toContain('pediscreen_v1');
    expect(ids).toContain('rop_detector_v1');
  });

  it('each adapter has required fields', () => {
    for (const a of ADAPTER_REGISTRY) {
      expect(a.id).toBeDefined();
      expect(a.hf_model).toBeDefined();
      expect(a.purpose).toBeDefined();
      expect(typeof a.validation_n).toBe('number');
      expect(typeof a.sensitivity).toBe('number');
      expect(typeof a.specificity).toBe('number');
    }
  });

  it('getAdapter resolves by id', async () => {
    const a = await getAdapter('pediscreen_v1');
    expect(a.id).toBe('pediscreen_v1');
    expect(a.hf_model).toContain('pediscreen');
  });

  it('getAdapter throws for unknown id', async () => {
    await expect(getAdapter('unknown_adapter')).rejects.toThrow('Unknown adapter');
  });

  it('getAdapterSync returns adapter or undefined', () => {
    expect(getAdapterSync('pediscreen_v1')?.id).toBe('pediscreen_v1');
    expect(getAdapterSync('nonexistent')).toBeUndefined();
  });

  it('listAdapterIds returns all ids', () => {
    const ids = listAdapterIds();
    expect(ids).toContain('pediscreen_v1');
    expect(ids.length).toBe(ADAPTER_REGISTRY.length);
  });
});
