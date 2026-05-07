import express from 'express';
import { TrafficAttestation } from '@adult-ad-net/shared';
import { MerkleTreeBuilder } from './merkle';
import { AnchorWorker } from './anchor';
import { VerifiableCredentialExporter } from './vc';

const app = express();
app.use(express.json());

// In-memory store for demonstration
const attestations: Map<string, TrafficAttestation> = new Map();
const batches: Map<string, TrafficAttestation[]> = new Map();
const anchorWorker = new AnchorWorker();

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

  res.json(proof);
});

/**
 * POST /v1/internal/attestations
 * Internal endpoint to ingest attestations and trigger anchoring (simplified).
 */
app.post('/v1/internal/attestations', async (req, res) => {
  const batch = req.body as TrafficAttestation[];
  if (!Array.isArray(batch) || batch.length === 0) {
    return res.status(400).json({ error: 'Invalid batch' });
  }

  // Build Merkle tree
  const tree = MerkleTreeBuilder.buildTree(batch);
  const root = tree.getRoot().toString('hex');

  // Anchor root on-chain
  const anchorResult = await anchorWorker.anchorRoot(root);

  // Update attestations with root and store them
  const anchoredBatch = batch.map((a) => ({
    ...a,
    merkleRoot: root,
  }));

  for (const a of anchoredBatch) {
    attestations.set(a.id, a);
  }
  batches.set(root, anchoredBatch);

  res.json({
    root,
    txHash: anchorResult.txHash,
    count: anchoredBatch.length,
  });
});

const PORT = process.env.PORT || 3006;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Web3 Anchor service listening on port ${PORT}`);
  });
}

export { app };
