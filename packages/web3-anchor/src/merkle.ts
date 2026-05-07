import { MerkleTree } from 'merkletreejs';
import crypto from 'crypto';
import { TrafficAttestation } from '@adult-ad-net/shared';

export interface MerkleProof {
  leaf: string;
  proof: {
    position: 'left' | 'right';
    data: Buffer;
  }[];
  root: string;
}

export class MerkleTreeBuilder {
  /**
   * Hashes a TrafficAttestation record to be used as a leaf in the Merkle tree.
   */
  static hashAttestation(attestation: TrafficAttestation): Buffer {
    const data = JSON.stringify({
      id: attestation.id,
      impressionId: attestation.impressionId,
      publisherId: attestation.publisherId,
      campaignId: attestation.campaignId,
      timestamp: attestation.timestamp,
      complianceHash: attestation.complianceHash,
      signature: attestation.signature,
    });
    return crypto.createHash('sha256').update(data).digest();
  }

  /**
   * Hash function compatible with merkletreejs — receives a Buffer and returns a Buffer.
   */
  private static sha256(data: Buffer): Buffer {
    return crypto.createHash('sha256').update(data).digest();
  }

  /**
   * Builds a Merkle tree from a batch of attestations.
   */
  static buildTree(attestations: TrafficAttestation[]): MerkleTree {
    const leaves = attestations.map((a) => this.hashAttestation(a));
    return new MerkleTree(leaves, this.sha256, { sortPairs: true });
  }

  /**
   * Gets a Merkle proof for a specific attestation in a batch.
   */
  static getProof(attestations: TrafficAttestation[], targetId: string): MerkleProof | null {
    const leaves = attestations.map((a) => this.hashAttestation(a));
    const tree = new MerkleTree(leaves, this.sha256, { sortPairs: true });
    
    const targetIndex = attestations.findIndex((a) => a.id === targetId);
    if (targetIndex === -1) return null;

    const leaf = leaves[targetIndex];
    const proof = tree.getProof(leaf);
    const root = tree.getRoot().toString('hex');

    return {
      leaf: leaf.toString('hex'),
      proof: proof.map((p) => ({
        position: p.position as 'left' | 'right',
        data: p.data,
      })),
      root,
    };
  }
}
