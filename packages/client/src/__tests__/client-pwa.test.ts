import { describe, it, expect, vi, beforeEach } from 'vitest';
import manifest from '../../public/manifest.json';

describe('Phase 11 C3: Frontline Client Offline PWA Packaging', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates web app manifest metadata and icons for frontline installability', () => {
    expect(manifest.name).toBe('JeevaSetu Frontline');
    expect(manifest.short_name).toBe('JeevaSetu');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#1E293B');
    expect(manifest.background_color).toBe('#0F172A');
    expect(manifest.lang).toBe('kn');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const icon192 = manifest.icons.find((i) => i.sizes === '192x192');
    const icon512 = manifest.icons.find((i) => i.sizes === '512x512');

    expect(icon192).toBeDefined();
    expect(icon192?.src).toBe('/icon-192.svg');
    expect(icon512).toBeDefined();
    expect(icon512?.src).toBe('/icon-512.svg');
  });

  it('verifies service worker registration helper under supported navigator', async () => {
    const registerMock = vi.fn().mockResolvedValue({ scope: 'http://localhost:5173/' });
    const mockNavigator = {
      serviceWorker: {
        register: registerMock,
      },
    };

    // Simulate SW registration helper
    async function registerSW(nav: typeof mockNavigator) {
      if ('serviceWorker' in nav) {
        return nav.serviceWorker.register('/sw.js');
      }
      return null;
    }

    const reg = await registerSW(mockNavigator);
    expect(registerMock).toHaveBeenCalledWith('/sw.js');
    expect(reg?.scope).toBe('http://localhost:5173/');
  });
});
