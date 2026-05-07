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

export const mockCampaigns = [
  { id: '1', name: 'Summer High-Yield', status: 'Active', impressions: 125000, valid: 118000, discarded: 7000, minScore: 80 },
  { id: '2', name: 'Premium Brand Safety', status: 'Paused', impressions: 45000, valid: 44500, discarded: 500, minScore: 95 },
  { id: '3', name: 'Broad Reach v2', status: 'Active', impressions: 890000, valid: 750000, discarded: 140000, minScore: 60 },
];

export const mockAggregatedMetrics = {
  totalValidImpressions: 912500,
  totalDiscardedImpressions: 147500,
};
