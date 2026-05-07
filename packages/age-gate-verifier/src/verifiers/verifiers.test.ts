import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrawlerVerifier } from './crawler.js';
import { ScreenshotVerifier } from './screenshot.js';
import { VCVerifier } from './vc.js';

// Mock playwright
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        goto: vi.fn().mockResolvedValue(null),
        content: vi.fn().mockResolvedValue('<html><body>18+ adults only enter</body></html>'),
        innerText: vi.fn().mockResolvedValue('18+ adults only'),
        $$: vi.fn().mockResolvedValue([
          { innerText: vi.fn().mockResolvedValue('Enter') }
        ]),
        close: vi.fn().mockResolvedValue(null),
      }),
      close: vi.fn().mockResolvedValue(null),
    }),
  },
}));

describe('Verifiers', () => {
  describe('CrawlerVerifier', () => {
    it('should verify a domain with age gate keywords', async () => {
      const verifier = new CrawlerVerifier();
      const result = await verifier.verify('pub-1', 'example.com');
      
      expect(result.status).toBe('verified');
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.method).toBe('crawler');
    });

    it('should reject a domain without age gate keywords', async () => {
      const { chromium } = await import('playwright');
      const mockPage = await (await chromium.launch()).newPage();
      vi.mocked(mockPage.content).mockResolvedValueOnce('<html><body>welcome to my blog</body></html>');
      vi.mocked(mockPage.innerText).mockResolvedValueOnce('welcome to my blog');
      vi.mocked(mockPage.$$).mockResolvedValueOnce([]);

      const verifier = new CrawlerVerifier();
      const result = await verifier.verify('pub-2', 'clean.com');
      
      expect(result.status).toBe('rejected');
      expect(result.score).toBe(0);
    });
  });

  describe('ScreenshotVerifier', () => {
    it('should always verify (mock)', async () => {
      const verifier = new ScreenshotVerifier();
      const result = await verifier.verify('pub-1', 'example.com');
      
      expect(result.status).toBe('verified');
      expect(result.score).toBe(100);
      expect(result.method).toBe('screenshot');
      expect(result.evidenceUrl).toBeDefined();
    });
  });

  describe('VCVerifier', () => {
    const verifier = new VCVerifier();

    it('should verify a valid VC', async () => {
      const vcData = {
        type: ['VerifiableCredential', 'AgeGateCredential'],
        credentialSubject: {
          id: 'did:web:example.com',
          ageGatePresent: true,
        },
        issuer: 'did:web:trust-provider.com',
        issuanceDate: '2024-01-01T00:00:00Z',
      };

      const result = await verifier.verify('pub-1', 'example.com', vcData);
      
      expect(result.status).toBe('verified');
      expect(result.score).toBe(100);
      expect(result.method).toBe('VC');
    });

    it('should reject when no VC is provided', async () => {
      const result = await verifier.verify('pub-1', 'example.com');
      expect(result.status).toBe('rejected');
      expect(result.score).toBe(0);
    });

    it('should reject an invalid VC', async () => {
      const vcData = {
        type: ['InvalidType'],
        credentialSubject: {
          id: 'did:web:wrong-domain.com',
        },
      };

      const result = await verifier.verify('pub-1', 'example.com', vcData);
      expect(result.status).toBe('rejected');
    });
  });
});
