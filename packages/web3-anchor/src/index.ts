import express from 'express';
import { TrafficAttestation } from '@adult-ad-net/shared';
import { MerkleTreeBuilder } from './merkle';
import { AnchorWorker } from './anchor';
import { VerifiableCredentialExporter } from './vc';
import { KafkaManager } from './kafka';

const app = express();
app.use(express.json());

// In-memory store (In production, use Redis or DB)
const attestations: Map<string, TrafficAttestation> = new Map();
const batches: Map<string, TrafficAttestation[]> = new Map();
const pendingAttestations: TrafficAttestation[] = [];

const anchorWorker = new AnchorWorker();
const kafkaManager = new KafkaManager();

/**
 * Process pending attestations, build Merkle tree, and anchor root.
 */
async function anchorBatch() {
  if (pendingAttestations.length === 0) return;

  const batch = [...pendingAttestations];
  pendingAttestations.length = 0;

  console.log(`[web3-anchor] Anchoring batch of ${batch.length} attestations`);

  try {
    const tree = MerkleTreeBuilder.buildTree(batch);
    const root = tree.getRoot().toString('hex');

    const anchorResult = await anchorWorker.anchorRoot(root);

    const anchoredBatch = batch.map((a) => ({
      ...a,
      merkleRoot: root,
    }));

    for (const a of anchoredBatch) {
      attestations.set(a.id, a);
    }
    batches.set(root, anchoredBatch);
    
    console.log(`[web3-anchor] Successfully anchored batch root: ${root}`);
  } catch (error) {
    console.error('[web3-anchor] Failed to anchor batch:', error);
    // Re-add to pending if failed
    pendingAttestations.push(...batch);
  }
}

// Start Kafka consumer
kafkaManager.connect().then(() => {
  kafkaManager.subscribeToAttestations(async (attestation: any) => {
    // Map internal payload to shared TrafficAttestation type if needed
    const mapped: TrafficAttestation = {
      id: attestation.id,
      impressionId: attestation.impressionId,
      publisherId: attestation.publisherId,
      campaignId: attestation.campaignId,
      timestamp: attestation.timestamp,
      complianceHash: attestation.complianceHash || String(attestation.complianceScore), // Fallback if score is used
      signature: attestation.signature,
    };
    
    attestations.set(mapped.id, mapped);
    pendingAttestations.push(mapped);
  });
});

// Periodically anchor batches (e.g., every 1 minute)
// Reduced to 10 seconds for easier demonstration/testing
setInterval(anchorBatch, 10000);

/**
 * GET /v1/attestations/:id
 * Retrieve an attestation.
 */
app.get('/v1/attestations/:id', (req, res) => {
  const attestation = attestations.get(req.params.id);
  if (!attestation) {
    return res.status(404).json({ error: 'Attestation not found' });
  }

  const format = req.query.format;
  if (format === 'vc') {
    return res.json(VerifiableCredentialExporter.export(attestation));
  }

  res.json(attestation);
});

/**
 * GET /v1/attestations/:id/proof
 * Retrieve a Merkle proof for an anchored attestation.
 */
app.get('/v1/attestations/:id/proof', (req, res) => {
  const attestation = attestations.get(req.params.id);
  if (!attestation) {
    return res.status(404).json({ error: 'Attestation not found' });
  }

  if (!attestation.merkleRoot) {
    return res.status(400).json({ error: 'Attestation not yet anchored' });
  }

  const batch = batches.get(attestation.merkleRoot);
  if (!batch) {
    return res.status(500).json({ error: 'Batch data missing for root' });
  }

  const proof = MerkleTreeBuilder.getProof(batch, attestation.id);
  if (!proof) {
    return res.status(500).json({ error: 'Failed to generate proof' });
  }

  res.json({
    root: attestation.merkleRoot,
    proof,
    attestation,
  });
});

/**
 * POST /v1/internal/anchor-audit-log
 * Trigger anchoring of Audit Log hash-chain.
 */
app.post('/v1/internal/anchor-audit-log', async (req, res) => {
  const { lastHash } = req.body;
  if (!lastHash) {
    return res.status(400).json({ error: 'lastHash is required' });
  }

  const anchorResult = await anchorWorker.anchorRoot(lastHash);
  res.json(anchorResult);
});

const PORT = process.env.PORT || 3006;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Web3 Anchor service listening on port ${PORT}`);
  });
}

export { app, anchorBatch };
