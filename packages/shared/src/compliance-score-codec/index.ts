import { ComplianceScoreSchema, type ComplianceScore } from '../domain-types/index.js';

/**
 * Encodes a ComplianceScore object into a compact hex string representation.
 * Format: [overall(1B)][ageGate(1B)][consent(1B)][contentSafety(1B)][trafficQuality(1B)][lastUpdated(8B)]
 */
export function encodeComplianceScore(score: ComplianceScore): string {
  const buffer = new Uint8Array(13);
  const view = new DataView(buffer.buffer);

  view.setUint8(0, score.overall);
  view.setUint8(1, score.ageGate);
  view.setUint8(2, score.consent);
  view.setUint8(3, score.contentSafety);
  view.setUint8(4, score.trafficQuality);

  // Use BigInt for 64-bit timestamp
  view.setBigUint64(5, BigInt(score.lastUpdated), false); // big-endian

  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Decodes a hex string representation back into a ComplianceScore object.
 */
export function decodeComplianceScore(encoded: string): ComplianceScore {
  if (encoded.length !== 26) {
    throw new Error('Invalid encoded compliance score length');
  }

  const buffer = new Uint8Array(13);
  for (let i = 0; i < 13; i++) {
    const byte = parseInt(encoded.substring(i * 2, i * 2 + 2), 16);
    if (isNaN(byte)) {
      throw new Error('Invalid hex character in encoded compliance score');
    }
    buffer[i] = byte;
  }

  const view = new DataView(buffer.buffer);

  const score = {
    overall: view.getUint8(0),
    ageGate: view.getUint8(1),
    consent: view.getUint8(2),
    contentSafety: view.getUint8(3),
    trafficQuality: view.getUint8(4),
    lastUpdated: Number(view.getBigUint64(5, false)),
  };

  return ComplianceScoreSchema.parse(score);
}
