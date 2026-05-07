import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as dotenv from 'dotenv';
import { AuditLogService } from './service.js';
import { buildApp } from './app.js';

export * from './schema.js';
export * from './service.js';
export * from './crypto.js';
export * from './app.js';

if (require.main === module) {
  dotenv.config();

  const run = async () => {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/audit_log',
    });
    const db = drizzle(pool);
    const service = new AuditLogService(db as any);
    
    const app = buildApp(service);
    const port = Number(process.env.PORT) || 3004;

    // Periodically anchor the latest hash to Web3
    const anchorInterval = setInterval(async () => {
      try {
        const latestHash = await service.getLatestHash();
        if (latestHash) {
          console.log(`[audit-log] Anchoring latest hash: ${latestHash}`);
          const web3AnchorUrl = process.env.WEB3_ANCHOR_URL || 'http://localhost:3006';
          const response = await fetch(`${web3AnchorUrl}/v1/internal/anchor-audit-log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lastHash: latestHash }),
          });
          if (response.ok) {
            const result = await response.json();
            console.log(`[audit-log] Successfully anchored on-chain. TX: ${result.txHash}`);
          } else {
            console.error(`[audit-log] Failed to anchor: ${response.statusText}`);
          }
        }
      } catch (error) {
        console.error('[audit-log] Error in anchoring job:', error);
      }
    }, 60000); // Every 1 minute
    
    app.listen({ port, host: '0.0.0.0' }, (err) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      console.log(`Audit Log Service listening on port ${port}`);
    });
  };
  
  run().catch(console.error);
}
