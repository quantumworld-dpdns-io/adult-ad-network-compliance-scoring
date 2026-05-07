import { chromium } from 'playwright';
import { AgeGateVerifier, VerificationResult } from '../types.js';

export class CrawlerVerifier implements AgeGateVerifier {
  private ageGateKeywords = [
    '18+',
    'adults only',
    'age restricted',
    'over 18',
    'confirm your age',
    'birth date',
    'are you 18',
  ];

  async verify(publisherId: string, domain: string): Promise<VerificationResult> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    let score = 0;
    let status: 'verified' | 'rejected' = 'rejected';
    const metadata: Record<string, any> = {};

    try {
      const url = domain.startsWith('http') ? domain : `https://${domain}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const content = (await page.content()).toLowerCase();
      const textContent = (await page.innerText('body')).toLowerCase();

      let matchedKeywords = 0;
      for (const keyword of this.ageGateKeywords) {
        if (content.includes(keyword) || textContent.includes(keyword)) {
          matchedKeywords++;
        }
      }

      // Check for common age gate button patterns
      const buttons = await page.$$('button, a[role="button"]');
      let hasAgeButton = false;
      for (const button of buttons) {
        const text = (await button.innerText()).toLowerCase();
        if (text.includes('enter') || text.includes('i am 18') || text.includes('yes')) {
          hasAgeButton = true;
          break;
        }
      }

      // Basic scoring logic
      if (matchedKeywords > 0) score += 40;
      if (matchedKeywords > 2) score += 20;
      if (hasAgeButton) score += 40;

      metadata.matchedKeywords = matchedKeywords;
      metadata.hasAgeButton = hasAgeButton;

      if (score >= 60) {
        status = 'verified';
      }

      return {
        publisherId,
        domain,
        method: 'crawler',
        status,
        score,
        metadata,
      };
    } catch (error) {
      console.error(`Crawler verification failed for ${domain}:`, error);
      return {
        publisherId,
        domain,
        method: 'crawler',
        status: 'rejected',
        score: 0,
        metadata: { error: (error as Error).message },
      };
    } finally {
      await browser.close();
    }
  }
}
