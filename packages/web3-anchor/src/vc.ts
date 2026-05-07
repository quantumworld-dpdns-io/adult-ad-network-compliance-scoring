import { TrafficAttestation } from '@adult-ad-net/shared';

export interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  validFrom: string;
  credentialSubject: {
    id: string;
    impressionId: string;
    publisherId: string;
    campaignId: string;
    complianceHash: string;
  };
  proof?: {
    type: string;
    created: string;
    proofPurpose: string;
    verificationMethod: string;
    jws: string;
  };
}

export class VerifiableCredentialExporter {
  static export(attestation: TrafficAttestation): VerifiableCredential {
    return {
      '@context': [
        'https://www.w3.org/ns/credentials/v2',
        'https://www.w3.org/ns/credentials/examples/v2', // Placeholder for actual context
      ],
      id: `urn:uuid:${attestation.id}`,
      type: ['VerifiableCredential', 'TrafficAttestationCredential'],
      issuer: 'did:web:adult-ad-net.example',
      validFrom: new Date(attestation.timestamp).toISOString(),
      credentialSubject: {
        id: `urn:uuid:${attestation.publisherId}`,
        impressionId: attestation.impressionId,
        publisherId: attestation.publisherId,
        campaignId: attestation.campaignId,
        complianceHash: attestation.complianceHash,
      },
      proof: {
        type: 'DataIntegrityProof',
        created: new Date().toISOString(),
        proofPurpose: 'assertionMethod',
        verificationMethod: 'did:web:adult-ad-net.example#key-1',
        jws: attestation.signature,
      },
    };
  }
}
