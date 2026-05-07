import { generateKeyPairSync, sign, verify, createPrivateKey, createPublicKey } from 'node:crypto';

/**
 * Generates a new Ed25519 key pair.
 * @returns { publicKey: string, privateKey: string } base64-encoded DER keys
 */
export function generateEd25519KeyPair(): { publicKey: string; privateKey: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'der' },
    privateKeyEncoding: { type: 'pkcs8', format: 'der' },
  });

  return {
    publicKey: publicKey.toString('base64'),
    privateKey: privateKey.toString('base64'),
  };
}

/**
 * Signs a message using an Ed25519 private key.
 * @param message The message to sign
 * @param privateKeyBase64 The base64-encoded PKCS8 DER private key
 * @returns base64-encoded signature
 */
export function signMessage(message: string, privateKeyBase64: string): string {
  const keyObject = createPrivateKey({
    key: Buffer.from(privateKeyBase64, 'base64'),
    format: 'der',
    type: 'pkcs8',
  });
  const signature = sign(null, Buffer.from(message), keyObject);
  return signature.toString('base64');
}

/**
 * Verifies a signature using an Ed25519 public key.
 * @param message The message that was signed
 * @param signatureBase64 The base64-encoded signature
 * @param publicKeyBase64 The base64-encoded SPKI DER public key
 * @returns boolean indicating if the signature is valid
 */
export function verifySignature(
  message: string,
  signatureBase64: string,
  publicKeyBase64: string,
): boolean {
  const keyObject = createPublicKey({
    key: Buffer.from(publicKeyBase64, 'base64'),
    format: 'der',
    type: 'spki',
  });
  const signature = Buffer.from(signatureBase64, 'base64');
  return verify(null, Buffer.from(message), keyObject, signature);
}
