import crypto from 'crypto';

export interface AnchorResult {
  txHash: string;
  blockNumber: number;
  root: string;
  timestamp: number;
}

export class AnchorWorker {
  /**
   * Mocks publishing a Merkle root to an EVM-compatible blockchain.
   */
  async anchorRoot(root: string): Promise<AnchorResult> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    const txHash = '0x' + crypto.randomBytes(32).toString('hex');
    const blockNumber = Math.floor(Math.random() * 1000000) + 10000000;
    
    console.log(`[AnchorWorker] Anchored root ${root} at tx ${txHash}`);

    return {
      txHash,
      blockNumber,
      root,
      timestamp: Date.now(),
    };
  }
}
