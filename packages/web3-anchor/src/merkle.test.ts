import { describe, it, expect } from 'vitest';
import { MerkleTreeBuilder } from './merkle';
import { TrafficAttestation } from '@adult-ad-net/shared';
import { v4 as uuidv4 } from 'uuid';
import { MerkleTree } from 'merkletreejs';
import crypto from 'crypto';

describe('MerkleTreeBuilder', () => {
  const createMockAttestation = (id?: string): TrafficAttestation => ({
    id: id || uuidv4(),
    impressionId: uuidv4(),
    publisherId: uuidv4(),
    campaignId: uuidv4(),
    timestamp: Date.now(),
    complianceHash: '0x' + crypto.randomBytes(32).toString('hex'),
    signature: '0x' + crypto.randomBytes(64).toString('hex'),
  });

  it('should build a Merkle tree from a batch of attestations', () => {
    const attestations = [
      createMockAttestation(),
      createMockAttestation(),
      createMockAttestation(),
    ];

    const tree = MerkleTreeBuilder.buildTree(attestations);
    expect(tree).toBeInstanceOf(MerkleTree);
    expect(tree.getLeafCount()).toBe(3);
    expect(tree.getRoot()).toBeDefined();
  });

  it('should generate a valid Merkle proof', () => {
    const targetId = uuidv4();
    const attestations = [
      createMockAttestation(),
      createMockAttestation(targetId),
      createMockAttestation(),
    ];

    const proof = MerkleTreeBuilder.getProof(attestations, targetId);
    expect(proof).not.toBeNull();
    if (proof) {
      expect(proof.leaf).toBeDefined();
      expect(proof.proof.length).toBeGreaterThan(0);
      expect(proof.root).toBe(MerkleTreeBuilder.buildTree(attestations).getRoot().toString('hex'));

      // Verify proof manually
      const tree = MerkleTreeBuilder.buildTree(attestations);
      const leaf = MerkleTreeBuilder.hashAttestation(attestations[1]);
      const isValid = tree.verify(proof.proof, leaf, tree.getRoot());
      expect(isValid).toBe(true);
    }
  });

  it('should return null for non-existent attestation in proof generation', () => {
    const attestations = [createMockAttestation()];
    const proof = MerkleTreeBuilder.getProof(attestations, 'non-existent');
    expect(proof).toBeNull();
  });
});
