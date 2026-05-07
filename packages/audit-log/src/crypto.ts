import { createHash } from 'node:crypto';

export function calculateHash(content: string, prevHash: string | null): string {
  const data = content + (prevHash || '');
  return createHash('sha256').update(data).digest('hex');
}
