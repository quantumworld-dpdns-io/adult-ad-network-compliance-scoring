export interface Publisher {
  id: string;
  name: string;
  domain: string;
  scores: {
    overall: number;
    ageGate: number;
    consent: number;
    safety: number;
    traffic: number;
  };
}

export const publishers: Publisher[] = [
  {
    id: "pub-1",
    name: "Premium Adult Portal",
    domain: "premium-portal.com",
    scores: {
      overall: 95,
      ageGate: 98,
      consent: 92,
      safety: 96,
      traffic: 94,
    },
  },
  {
    id: "pub-2",
    name: "Independent Creator Hub",
    domain: "creators-hub.net",
    scores: {
      overall: 72,
      ageGate: 85,
      consent: 65,
      safety: 70,
      traffic: 78,
    },
  },
  {
    id: "pub-3",
    name: "Unverified Content Network",
    domain: "unverified-net.com",
    scores: {
      overall: 35,
      ageGate: 40,
      consent: 20,
      safety: 45,
      traffic: 35,
    },
  },
];

export type AdRequestResult = 
  | { status: "success"; attestation: any; ad: any }
  | { status: "blocked"; reason: string };

export function simulateAdRequest(publisherId: string): AdRequestResult {
  const publisher = publishers.find((p) => p.id === publisherId);
  
  if (!publisher) {
    return { status: "blocked", reason: "Unknown Publisher" };
  }

  if (publisher.scores.overall < 70) {
    const reasons = [];
    if (publisher.scores.ageGate < 70) reasons.push("Age Gate Quality (Fail-Closed)");
    if (publisher.scores.consent < 70) reasons.push("Incomplete Consent Records");
    if (publisher.scores.safety < 70) reasons.push("Content Safety Risk");
    
    return { 
      status: "blocked", 
      reason: reasons.length > 0 ? reasons[0] : "Aggregated Compliance Score Too Low" 
    };
  }

  return {
    status: "success",
    ad: {
      title: "Premium Wellness Brand",
      description: "High-quality products for adult wellness.",
      image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop",
    },
    attestation: {
      id: "att_" + Math.random().toString(36).substr(2, 9),
      publisherId: publisher.id,
      timestamp: new Date().toISOString(),
      complianceScore: publisher.scores.overall,
      signature: "ed25519_sig_" + Math.random().toString(36).substr(2, 32),
      merkleRoot: "0x" + Math.random().toString(36).substr(2, 64),
    },
  };
}

// Support for Publisher Dashboard
export const mockComplianceData = {
  overallScore: 88,
  breakdown: [
    { label: 'Age Gate Quality', score: 92, status: 'Healthy' },
    { label: 'Consent Status', score: 75, status: 'Warning' },
    { label: 'Content Safety', score: 98, status: 'Healthy' },
    { label: 'Traffic Quality', score: 85, status: 'Healthy' },
  ],
  alerts: [
    { id: 1, type: 'warning', message: '5 consent records expiring in 14 days', date: '2023-11-01' },
    { id: 2, type: 'info', message: 'Traffic audit completed for Oct 2023', date: '2023-10-31' },
  ]
};

// Support for Advertiser Dashboard
export const mockCampaigns = [
  { id: '1', name: 'Summer High-Yield', status: 'Active', impressions: 125000, valid: 118000, discarded: 7000, minScore: 80 },
  { id: '2', name: 'Premium Brand Safety', status: 'Paused', impressions: 45000, valid: 44500, discarded: 500, minScore: 95 },
  { id: '3', name: 'Broad Reach v2', status: 'Active', impressions: 890000, valid: 750000, discarded: 140000, minScore: 60 },
];

export const mockAggregatedMetrics = {
  totalValidImpressions: 912500,
  totalDiscardedImpressions: 147500,
};
