import { Click, Impression, FraudSignal } from '@adult-ad-net/shared';
import { Conversion, AttributionResult, Affiliate, CommissionRule } from './types.js';
import { AffiliateStore } from './redis.js';
import { KafkaManager } from './kafka.js';

export class AffiliateService {
  private attributionWindowDays = 30; // Default

  constructor(
    private store: AffiliateStore,
    private kafka: KafkaManager
  ) {}

  async handleImpression(impression: Impression) {
    // Store impression for later attribution (view-through)
    // We don't know the affiliateId yet unless it's passed in metadata
    // For now, we store it. If a click happens, it might link to this impression.
    await this.store.saveImpression(impression, undefined, this.attributionWindowDays * 24 * 3600);
  }

  async handleClick(click: Click & { affiliateId?: string }) {
    if (click.affiliateId) {
      await this.store.saveClick(click as Click & { affiliateId: string }, click.affiliateId, this.attributionWindowDays * 24 * 3600);
    }
  }

  async handleFraudSignal(signal: FraudSignal) {
    await this.store.saveFraudSignal(signal, this.attributionWindowDays * 24 * 3600);
  }

  async handleConversion(conversion: Conversion) {
    // Attribution logic:
    // 1. Look for a click in the last 30 days for this campaign and user (if we had user id, but we have clickId/impressionId usually)
    // In a real system, the conversion would carry a clickId or we'd use probabilistic attribution.
    // For this implementation, let's assume the conversion might have a clickId in metadata.
    
    const clickId = conversion.metadata?.clickId;
    const impressionId = conversion.metadata?.impressionId;

    let attributedClick = null;
    let attributedImpression = null;
    let affiliateId = null;

    if (clickId) {
      attributedClick = await this.store.getClick(clickId);
      if (attributedClick) {
        affiliateId = attributedClick.affiliateId;
      }
    }

    if (!affiliateId && impressionId) {
      attributedImpression = await this.store.getImpression(impressionId);
      if (attributedImpression) {
        affiliateId = attributedImpression.affiliateId;
      }
    }

    if (!affiliateId) {
      console.log(`Conversion ${conversion.id} could not be attributed`);
      return;
    }

    const affiliate = await this.store.getAffiliate(affiliateId);
    if (!affiliate) {
      console.error(`Affiliate ${affiliateId} not found for attributed conversion`);
      return;
    }

    // Check for fraud
    const fraudProb = attributedImpression ? await this.store.getFraudProbability(attributedImpression.id) : 0;
    if (fraudProb > 0.5) {
      console.warn(`Conversion ${conversion.id} attributed to suspicious impression ${attributedImpression?.id} (p=${fraudProb})`);
      // We might still attribute it but flag it, or reject it.
      // For now, let's continue but maybe reduce commission? Or just log.
    }

    // Calculate commission
    const rule = affiliate.commissionRules[conversion.campaignId];
    if (!rule) {
      console.error(`No commission rule found for affiliate ${affiliateId} and campaign ${conversion.campaignId}`);
      return;
    }

    const commissionAmount = this.calculateCommission(rule, conversion.value);

    const result: AttributionResult = {
      conversionId: conversion.id,
      clickId: attributedClick?.id,
      impressionId: attributedImpression?.id,
      affiliateId,
      campaignId: conversion.campaignId,
      commissionAmount,
      attributedAt: Date.now(),
    };

    await this.kafka.publishAttribution(result);
    console.log(`Attributed conversion ${conversion.id} to affiliate ${affiliateId}, commission: ${commissionAmount}`);
  }

  calculateCommission(rule: CommissionRule, conversionValue?: number): number {
    switch (rule.type) {
      case 'CPC':
        return rule.value; // Rule value is amount per click (though we are at conversion stage)
        // Wait, CPC usually pays on click, not conversion. 
        // But some systems might pay a fixed amount on conversion (CPA).
        // Let's assume CPC here means "amount per click that led to conversion" or just use CPA logic.
      case 'CPA':
        return rule.value;
      case 'RevShare':
        return ((conversionValue || 0) * rule.value) / 100;
      default:
        return 0;
    }
  }
}
