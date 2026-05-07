# Requirements Document

## Introduction

The Adult Ad Network with Compliance Scoring is an advertising network platform for legal adult brands. It connects advertisers (adult brands, creators, legal platforms, sexual wellness e-commerce) with publishers (adult content sites, creator pages, legal platforms) while enforcing compliance at every layer: publisher age-gate quality, consent-compliant content inventory, traffic authenticity, fraud detection, and affiliate tracking.

The platform's defining capability is a multi-dimensional compliance scoring engine that lets advertisers set hard requirements — such as "only serve ads on publishers with a verified age-gate and consent-compliant content inventory" — and enforces those requirements in real time during ad serving. Campaign settlement is transparent and traffic attestations are verifiable via Web3 primitives.

---

## Glossary

- **Ad_Network**: The platform system that connects advertisers to publishers and manages campaign delivery.
- **Advertiser**: A legal adult brand, creator, platform, or sexual wellness e-commerce operator that purchases ad inventory.
- **Publisher**: A website, app, or creator page that hosts ad inventory and is registered with the Ad_Network.
- **Campaign**: A set of ad creatives, targeting rules, compliance requirements, budget, and schedule configured by an Advertiser.
- **Compliance_Score**: A numeric score (0–100) assigned to a Publisher representing the aggregate quality of its age-gate, consent status, content category safety, and traffic authenticity.
- **Age_Gate**: A mechanism on a Publisher's site that verifies a visitor is of legal adult age before granting access to adult content.
- **Consent_Record**: A documented, verifiable record that a Publisher's content inventory was produced or collected with appropriate consent.
- **Traffic_Source**: The origin channel (organic, affiliate, paid, bot) of a visitor impression delivered to a Publisher.
- **Traffic_Quality_Score**: A numeric score (0–100) assigned to a Traffic_Source representing its authenticity and fraud risk.
- **Affiliate**: A third-party referral partner that drives traffic to a Publisher or Advertiser and earns a commission on qualifying conversions.
- **Blocked_Category**: A content category that an Advertiser has explicitly excluded from ad delivery.
- **Impression**: A single instance of an ad being served to a visitor on a Publisher's page.
- **Conversion**: A visitor action (click, sign-up, purchase) attributed to an ad Impression.
- **Settlement**: The financial reconciliation of campaign spend between Advertisers and Publishers.
- **Traffic_Attestation**: A cryptographically signed record asserting the authenticity and compliance status of a traffic event.
- **Fraud_Signal**: An indicator that an Impression or Conversion may be fraudulent (bot traffic, click farms, invalid referrers).
- **Scoring_Engine**: The subsystem that computes and maintains Compliance_Score and Traffic_Quality_Score values.
- **Publisher_Dashboard**: The UI through which Publishers manage their profile, view scores, and access earnings.
- **Advertiser_Dashboard**: The UI through which Advertisers manage campaigns, set compliance requirements, and view reporting.
- **Ad_Server**: The subsystem responsible for real-time ad selection and delivery.
- **Audit_Log**: An append-only, tamper-evident record of compliance-relevant events.
- **On_Chain_Settlement**: Settlement executed via a smart contract on a public blockchain.
- **Verifiable_Credential**: A cryptographically signed attestation conforming to the W3C Verifiable Credentials standard.

---

## Requirements

### Requirement 1: Publisher Registration and Compliance Onboarding

**User Story:** As a Publisher, I want to register my site and submit compliance documentation, so that I can be approved to serve ads and receive a Compliance_Score.

#### Acceptance Criteria

1. THE Ad_Network SHALL require each Publisher to submit during registration: a domain URL; contact information including legal entity name, email address, and phone number; content category declarations; and age-gate implementation details including mechanism type, gate URL, and implementation method.
2. WHEN a Publisher submits registration information, THE Scoring_Engine SHALL initiate an automated compliance assessment within 60 seconds.
3. WHEN the automated compliance assessment completes, THE Ad_Network SHALL assign an initial Compliance_Score between 0 and 100 to the Publisher.
4. IF a Publisher's initial Compliance_Score is below 50, THEN THE Ad_Network SHALL place the Publisher in a pending-review state and notify the Publisher with a list enumerating each assessed compliance factor that scored below its passing threshold.
5. IF a Publisher has not provided a verifiable Age_Gate implementation — where "verifiable" means a functional check confirms the Age_Gate blocks access to content without age confirmation — THEN THE Ad_Network SHALL cap the Publisher's Compliance_Score at 60.
6. WHEN a Publisher's registration is approved, THE Ad_Network SHALL issue a Publisher credential containing the Publisher ID, approval timestamp, and approved content categories, and SHALL activate the Publisher's inventory for ad serving.
7. THE Ad_Network SHALL store all Publisher registration submissions in the Audit_Log with a timestamp and a SHA-256 hash of the submission payload.
8. WHEN a Publisher submits registration information that is missing any required field defined in criterion 1, THE Ad_Network SHALL reject the submission and return an error response identifying each missing or invalid field before initiating any compliance assessment.

---

### Requirement 2: Compliance Scoring Engine

**User Story:** As an Advertiser, I want each Publisher to have a continuously updated Compliance_Score, so that I can trust that my ads only appear on compliant inventory.

#### Acceptance Criteria

1. THE Scoring_Engine SHALL compute a Publisher's Compliance_Score as a weighted aggregate of four sub-scores: Age_Gate_Quality (30%), Consent_Record_Status (30%), Content_Category_Safety (20%), and Traffic_Quality_Score (20%), clamped to the range [0, 100].
2. WHEN any sub-score input changes, THE Scoring_Engine SHALL recompute the affected Publisher's Compliance_Score within 5 minutes.
3. THE Scoring_Engine SHALL compute the Age_Gate_Quality sub-score using the formula: (age_gate_present × 50) + (bypass_resistance × 0.40) + audit_recency_points, floored at 0 and capped at 100, where age_gate_present is 1 if a verified age-gate exists and 0 otherwise, bypass_resistance is a value in [0, 100], and audit_recency_points decay by 1 point per 30 days since the last verification audit.
4. IF any active Consent_Record for the Publisher is expired or absent, THEN THE Scoring_Engine SHALL assign a Consent_Record_Status sub-score of 0. ELSE IF any active Consent_Record is within 30 days of its expiration date, THEN THE Scoring_Engine SHALL assign a Consent_Record_Status sub-score of 50. ELSE THE Scoring_Engine SHALL assign a Consent_Record_Status sub-score of 100. An "active Consent_Record" is one that has been submitted, not revoked, and covers a currently declared content category.
5. THE Scoring_Engine SHALL assign a Content_Category_Safety sub-score using a four-tier risk taxonomy: low-risk categories map to 100, medium-risk to 66, high-risk to 33, and prohibited categories to 0. When a Publisher declares multiple categories, the sub-score SHALL equal the minimum score across all declared categories.
6. THE Scoring_Engine SHALL incorporate the Publisher's rolling 30-day Traffic_Quality_Score into the Compliance_Score computation as defined in criterion 1.
7. WHEN a Publisher's Compliance_Score drops below 40, THE Ad_Network SHALL suspend new ad serving requests for that Publisher and notify the Publisher within 60 seconds. In-flight impressions already dispatched at the moment of suspension SHALL NOT be recalled.
8. WHEN a request is made to the Scoring_Engine's read-only API endpoint for a Publisher's Compliance_Score, THE Scoring_Engine SHALL return the current Compliance_Score and all four sub-scores within 200ms. IF the Publisher ID is unknown, THE Scoring_Engine SHALL return a 404 error response within 200ms.
9. THE Scoring_Engine SHALL produce a Compliance_Score in the range [0, 100] inclusive for all valid inputs.

---

### Requirement 3: Age-Gate Verification

**User Story:** As an Advertiser, I want to verify that a Publisher's age-gate is genuine and effective, so that my ads are not served to underage audiences.

#### Acceptance Criteria

1. THE Ad_Network SHALL support three age-gate verification methods: automated crawler-based verification, Publisher-submitted screenshot evidence with manual review, and integration with a third-party Verifiable_Credential age-gate provider.
2. WHEN an automated crawler-based verification is executed, THE Ad_Network SHALL test the Publisher's age-gate for bypass via direct URL access, referrer spoofing, and cookie manipulation. Any successful bypass attempt SHALL constitute a verification failure. THE Ad_Network SHALL record the result, including which bypass methods were tested and the outcome of each, in the Audit_Log.
3. WHEN a Publisher's age-gate verification passes, THE Ad_Network SHALL record a signed verification attestation with a validity period of 90 days.
4. WHEN a Publisher's age-gate verification fails, THE Ad_Network SHALL reduce the Publisher's Age_Gate_Quality sub-score to 0 and notify the Publisher within 5 minutes with a failure report that includes: which bypass method(s) failed, the observed behavior for each failure, and remediation guidance.
5. IF a Publisher's age-gate verification attestation expires without renewal, THEN THE Ad_Network SHALL immediately reduce the Publisher's Age_Gate_Quality sub-score to 0 and suspend ad serving for that Publisher with no grace period.
6. WHEN a Publisher's age-gate verification attestation is within 14 days of expiry, THE Ad_Network SHALL initiate a re-verification attempt and notify the Publisher.
7. WHERE a Publisher integrates a third-party Verifiable_Credential age-gate provider and the provider's credential is current and valid, THE Ad_Network SHALL accept the credential as proof of age-gate compliance without requiring a separate crawler verification.
8. IF a Publisher's third-party Verifiable_Credential age-gate provider credential is expired or revoked, THEN THE Ad_Network SHALL treat the Publisher's age-gate as unverified, reduce the Age_Gate_Quality sub-score to 0, and suspend ad serving for that Publisher until a valid credential is presented or an alternative verification method passes.

---

### Requirement 4: Consent Record Management

**User Story:** As an Advertiser, I want to confirm that a Publisher's content inventory is consent-compliant, so that my brand is not associated with non-consensual content.

#### Acceptance Criteria

1. WHEN a Publisher declares a content category in their profile, THE Ad_Network SHALL block ad serving for that category until a valid Consent_Record covering that category has been submitted and accepted.
2. WHEN a Publisher submits a Consent_Record, THE Ad_Network SHALL store a SHA-256 cryptographic hash of the record in the Audit_Log without storing the underlying private document.
3. WHEN a Publisher submits a Consent_Record, THE Ad_Network SHALL assign it an expiration date exactly 12 months from the submission date.
4. WHEN a Consent_Record is within 30 days of its expiration date, THE Ad_Network SHALL notify the Publisher via email and in-platform alert. THE Ad_Network SHALL repeat this notification at 14 days and again at 7 days before expiration.
5. WHEN a Consent_Record expires, THE Ad_Network SHALL set the Publisher's Consent_Record_Status sub-score to 0 within 60 seconds and suspend ad serving for all content categories covered by the expired record.
6. IF a Publisher disputes a Consent_Record rejection, THEN THE Ad_Network SHALL acknowledge the dispute within 24 hours and SHALL provide a resolution within 5 business days. The resolution SHALL either reinstate the Consent_Record or confirm the rejection with a written explanation.
7. WHEN a Consent_Record submission is rejected by the Ad_Network, THE Ad_Network SHALL set the Consent_Record_Status sub-score for the affected content categories to 0 and block ad serving for those categories until a valid replacement Consent_Record is accepted.
8. WHEN an Advertiser configures a Campaign, THE Ad_Network SHALL allow the Advertiser to specify a minimum Consent_Record_Status sub-score in the range [0, 100] as a targeting condition, and SHALL only serve the Campaign on Publishers whose current Consent_Record_Status sub-score meets or exceeds the specified minimum.

---

### Requirement 5: Traffic Quality Scoring and Fraud Detection

**User Story:** As an Advertiser, I want fraudulent and low-quality traffic to be detected and excluded, so that my campaign budget is spent on genuine human impressions.

#### Acceptance Criteria

1. THE Ad_Network SHALL evaluate every Impression against a set of Fraud_Signals including: bot user-agent patterns, datacenter IP ranges, click-through rates exceeding 10% over any 1-hour rolling window for a given Publisher, and invalid referrer chains.
2. WHEN an Impression is evaluated, THE Ad_Network SHALL assign a per-impression fraud probability score between 0.0 and 1.0 within 50ms of the impression event.
3. WHEN a per-impression fraud probability score exceeds 0.7, THE Ad_Network SHALL discard the Impression, exclude it from billing, and record the Fraud_Signal details in the Audit_Log.
4. THE Scoring_Engine SHALL compute a Publisher's rolling 30-day Traffic_Quality_Score as 100 minus the percentage of discarded Impressions over the rolling window, rounded to the nearest integer, provided the Publisher has received at least 100 Impressions in the rolling window. IF fewer than 100 Impressions have been received, THE Scoring_Engine SHALL assign a Traffic_Quality_Score of 50 as a neutral default.
5. IF a Publisher's Traffic_Quality_Score drops below 30 for 7 consecutive days, THEN THE Ad_Network SHALL suspend the Publisher's account and notify the Publisher with a fraud report that includes: the daily Traffic_Quality_Score for each of the 7 days, the top Fraud_Signal types detected, and the total number of discarded Impressions.
6. THE Ad_Network SHALL generate a Traffic_Attestation for each valid (non-discarded) Impression, signed with the Ad_Network's private key, containing the impression ID, timestamp, Publisher ID, Traffic_Quality_Score at time of serving, and Compliance_Score at time of serving.
7. THE Ad_Network SHALL expose an API endpoint that allows Advertisers to retrieve Traffic_Attestations for any Impression within their campaigns, with a response time under 500ms.
8. THE Scoring_Engine SHALL produce a Traffic_Quality_Score in the range [0, 100] inclusive for all valid inputs.
9. IF the fraud evaluation for an Impression does not complete within 50ms, THEN THE Ad_Network SHALL treat the Impression as fraudulent, discard it, exclude it from billing, and record a timeout Fraud_Signal in the Audit_Log.

---

### Requirement 6: Campaign Creation and Compliance Targeting

**User Story:** As an Advertiser, I want to create campaigns with compliance-based targeting rules, so that my ads only appear on publishers that meet my brand-safety standards.

#### Acceptance Criteria

1. THE Ad_Network SHALL allow Advertisers to create a Campaign with the following required fields: campaign name, ad creatives, daily budget, total budget, start date, end date, and at least one targeting rule. THE Ad_Network SHALL reject Campaign creation requests that are missing any required field and return an error identifying each missing field.
2. THE Ad_Network SHALL allow Advertisers to set a minimum Compliance_Score threshold (0–100) as a Campaign targeting rule, and SHALL only serve the Campaign on Publishers whose current Compliance_Score meets or exceeds the threshold.
3. THE Ad_Network SHALL allow Advertisers to require verified age-gate as a Campaign targeting condition, and SHALL only serve the Campaign on Publishers that have a current, non-expired age-gate verification attestation at the time of each ad request.
4. THE Ad_Network SHALL allow Advertisers to require a minimum Consent_Record_Status sub-score as a Campaign targeting condition, and SHALL only serve the Campaign on Publishers whose current Consent_Record_Status sub-score meets or exceeds the specified minimum at the time of each ad request.
5. THE Ad_Network SHALL allow Advertisers to define a list of Blocked_Categories for a Campaign, and SHALL not serve the Campaign on any Publisher whose declared content categories include any Blocked_Category.
6. WHEN an Advertiser saves a Campaign, THE Ad_Network SHALL validate all targeting rules and return a list of currently eligible Publishers within 3 seconds. IF no Publishers are currently eligible due to targeting rule conflicts, THE Ad_Network SHALL return an empty list and display the specific targeting rule(s) causing the conflict.
7. WHEN a Publisher's Compliance_Score drops below a Campaign's minimum threshold during an active Campaign, THE Ad_Network SHALL stop serving that Campaign on the affected Publisher within 60 seconds without requiring Advertiser intervention.
8. THE Ad_Network SHALL allow Advertisers to require that Traffic_Attestations for their Campaign's Impressions be anchored on-chain as a Campaign option. IF on-chain anchoring fails for a batch, THE Ad_Network SHALL retry anchoring up to 3 times before recording the failure in the Audit_Log and notifying the Advertiser.

---

### Requirement 7: Ad Serving and Real-Time Compliance Enforcement

**User Story:** As an Advertiser, I want the ad server to enforce compliance rules at the moment of serving, so that no non-compliant impression is ever billed to my campaign.

#### Acceptance Criteria

1. WHEN an ad request is received from a Publisher, THE Ad_Server SHALL retrieve the Publisher's current Compliance_Score and the active targeting rules for all eligible Campaigns — where "eligible" means the Campaign is active, within its scheduled date range, not paused, and has remaining budget greater than zero — within 30ms.
2. WHEN an ad request is received, THE Ad_Server SHALL select the highest-bid eligible Campaign whose compliance targeting rules are satisfied by the Publisher's current scores. IF two or more eligible Campaigns have equal bids, THE Ad_Server SHALL select the Campaign with the earliest creation timestamp.
3. IF no eligible Campaign satisfies the Publisher's current compliance scores, THEN THE Ad_Server SHALL return a no-fill response and SHALL NOT serve a fallback ad that violates any Campaign's compliance requirements.
4. WHEN an Impression is served, THE Ad_Server SHALL record the Impression in the Audit_Log with the Impression ID, Publisher ID, Campaign ID, Compliance_Score at time of serving, Traffic_Quality_Score at time of serving, and a UTC timestamp.
5. WHEN an Impression is served, THE Ad_Server SHALL generate a Traffic_Attestation and make it available for retrieval within 1 second of the impression event.
6. THE Ad_Server SHALL achieve a p99 ad decision latency of under 100ms, measured from the moment the ad request is received to the moment the ad response is transmitted, under a load of 10,000 concurrent ad requests per second.
7. IF the Publisher's current Compliance_Score cannot be retrieved within 30ms, THEN THE Ad_Server SHALL return a no-fill response and SHALL NOT serve any ad for that request.

---

### Requirement 8: Affiliate Tracking

**User Story:** As an Advertiser, I want to track affiliate-driven conversions accurately, so that I can pay commissions only for legitimate, non-fraudulent conversions.

#### Acceptance Criteria

1. THE Ad_Network SHALL assign each Affiliate a unique tracking identifier.
2. THE Ad_Network SHALL generate a unique tracking link per Campaign per Affiliate, incorporating the Affiliate's tracking identifier and the Campaign ID.
3. WHEN a visitor arrives via an Affiliate tracking link, THE Ad_Network SHALL record the Affiliate ID, Traffic_Source, UTC timestamp, and referring domain in the Audit_Log.
4. WHEN a Conversion is attributed to an Affiliate, THE Ad_Network SHALL verify that the originating Impression was not discarded as fraudulent before crediting the Conversion to the Affiliate.
5. IF a Conversion's originating Impression was discarded as fraudulent, THEN THE Ad_Network SHALL reject the Conversion, exclude it from commission calculation, and record the rejection in the Audit_Log.
6. THE Ad_Network SHALL compute Affiliate commission amounts based on Advertiser-defined commission rules (cost-per-click, cost-per-acquisition, or revenue-share) applied only to verified, non-fraudulent Conversions that occur within the Advertiser-defined attribution lookback window, which SHALL be configurable between 1 and 90 days.
7. THE Ad_Network SHALL provide Affiliates with a dashboard showing clicks, conversions, commission earned, and fraud-rejection rate, updated with a maximum delay of 60 seconds.
8. IF a Publisher's Traffic_Quality_Score for the traffic originating from an Affiliate falls below the Advertiser-defined minimum threshold (a value in [0, 100]), THEN THE Ad_Network SHALL automatically reject Conversions from that Affiliate and record the rejection in the Audit_Log.
9. THE Ad_Network SHALL deduplicate Conversions by Impression ID, rejecting any Conversion where a Conversion for the same Impression ID has already been credited, and recording the duplicate rejection in the Audit_Log.

---

### Requirement 9: Transparent Campaign Settlement

**User Story:** As an Advertiser and Publisher, I want campaign settlement to be transparent and verifiable, so that I can independently confirm that billing reflects only compliant, non-fraudulent impressions.

#### Acceptance Criteria

1. WHEN a Campaign's billing period ends, THE Ad_Network SHALL generate a Settlement_Report itemizing: total Impressions served, total discarded Impressions, total valid Impressions billed, total spend, and per-Publisher breakdowns of each metric.
2. THE Ad_Network SHALL make Settlement_Reports available to Advertisers and Publishers within 24 hours of the billing period end timestamp.
3. WHERE an Advertiser has enabled on-chain settlement for a Campaign, THE Ad_Network SHALL execute settlement via a smart contract on a supported public blockchain, with the settlement transaction hash recorded in the Audit_Log.
4. WHEN a Settlement_Report is generated, THE Ad_Network SHALL anchor a SHA-256 cryptographic hash of the report in the Audit_Log within 1 hour of report generation, allowing any party to verify that the report has not been altered after generation.
5. WHEN an Advertiser or Publisher disputes a Settlement_Report, THE Ad_Network SHALL provide a dispute resolution workflow that grants access to the underlying Traffic_Attestations and Audit_Log entries for the disputed period, and SHALL deliver a resolution within 5 business days. The resolution SHALL either confirm the original Settlement_Report or issue a corrected report.
6. THE Ad_Network SHALL retain Settlement_Reports and associated Traffic_Attestations for a minimum of 36 months.
7. THE Ad_Network SHALL allow Advertisers to export Settlement_Reports in CSV and JSON formats, with the export completing within 30 seconds for reports covering a single billing period.
8. THE Ad_Network SHALL allow Advertisers to configure the billing period for each Campaign as one of: daily, weekly, or monthly, with the billing period start date set at Campaign creation.

---

### Requirement 10: Blocked-Category Controls

**User Story:** As an Advertiser, I want to define and enforce blocked content categories at the campaign and account level, so that my ads never appear alongside content that conflicts with my brand values.

#### Acceptance Criteria

1. THE Ad_Network SHALL maintain a predefined taxonomy of content categories applicable to adult publisher inventory, including at minimum: explicit content, fetish content, escort/companion services, AI-generated content, user-generated content, and gambling.
2. THE Ad_Network SHALL allow Advertisers to define Blocked_Categories at the account level, which apply as defaults to all Campaigns created under that account.
3. THE Ad_Network SHALL allow Advertisers to override account-level Blocked_Categories at the Campaign level by explicitly adding or removing specific categories. A Campaign-level override applies only to that Campaign and does not modify the account-level defaults. An empty Campaign-level override list means no categories are blocked at the Campaign level beyond the account-level defaults.
4. THE Ad_Network SHALL determine whether a Publisher matches a Campaign's Blocked_Categories using exact string matching against the Publisher's declared content category identifiers.
5. WHEN a Publisher's declared content categories are updated, THE Ad_Network SHALL re-evaluate all active Campaigns against the updated categories within 5 minutes.
6. WHEN a re-evaluation determines that a Publisher now matches a Campaign's Blocked_Categories, THE Ad_Network SHALL suspend serving of that Campaign on that Publisher within 60 seconds. In-flight impressions already dispatched at the moment of suspension SHALL NOT be recalled.
7. IF an Advertiser attempts to save a Campaign whose Blocked_Category configuration results in zero eligible Publishers, THEN THE Ad_Network SHALL reject the save, display the specific Blocked_Category or categories causing the conflict, and not activate the Campaign.
8. THE Ad_Network SHALL log all Blocked_Category enforcement actions in the Audit_Log with the Campaign ID, Publisher ID, blocked category identifier, and UTC timestamp.

---

### Requirement 11: Advertiser and Publisher Dashboards

**User Story:** As an Advertiser or Publisher, I want a dashboard that shows real-time performance and compliance data, so that I can monitor my campaigns and inventory health.

#### Acceptance Criteria

1. THE Advertiser_Dashboard SHALL display for each active Campaign: total Impressions, valid Impressions, discarded Impressions, spend to date, remaining budget, Conversions, and cost-per-conversion, with data updated at a maximum delay of 60 seconds.
2. THE Advertiser_Dashboard SHALL display the current Compliance_Score and Traffic_Quality_Score for each Publisher serving the Advertiser's Campaigns.
3. THE Publisher_Dashboard SHALL display the Publisher's current Compliance_Score, all four sub-scores (Age_Gate_Quality, Consent_Record_Status, Content_Category_Safety, Traffic_Quality_Score), and the daily historical trend of each sub-score over the past 90 calendar days.
4. WHEN any sub-score for a Publisher is below 70, THE Publisher_Dashboard SHALL display a remediation section for that sub-score containing at minimum: the current sub-score value, the specific factor(s) causing the low score, and step-by-step instructions for improving the sub-score.
5. THE Advertiser_Dashboard SHALL allow Advertisers to pause, resume, or terminate a Campaign. WHEN an Advertiser requests termination of a Campaign, THE Ad_Network SHALL require explicit confirmation before executing the termination.
6. THE Publisher_Dashboard SHALL display the Publisher's total earnings for the current billing period, pending settlement amounts, and a transaction history covering the past 12 months, updated with a maximum delay of 60 seconds.
7. WHEN a Publisher's Compliance_Score changes by more than 10 points within a single rolling 24-hour window, THE Ad_Network SHALL send an alert to the Publisher via email and in-platform notification within 5 minutes of the score change.

---

### Requirement 12: Audit Log and Tamper-Evidence

**User Story:** As a compliance officer or legal representative, I want all compliance-relevant events to be recorded in a tamper-evident audit log, so that I can produce verifiable evidence of platform compliance.

#### Acceptance Criteria

1. THE Audit_Log SHALL record all compliance-relevant events including: Publisher registrations, Compliance_Score changes, age-gate verifications, Consent_Record submissions and expirations, Impression evaluations, Fraud_Signal detections, Campaign targeting rule changes, Settlement_Report generations, and on-chain settlement transactions. Each entry SHALL include: event type, UTC timestamp at millisecond precision, actor ID (the entity that triggered the event), affected entity ID, and a before/after snapshot of any changed compliance state.
2. THE Audit_Log SHALL be append-only; no existing Audit_Log entry SHALL be modifiable or deletable after creation.
3. WHEN an Audit_Log entry is created, THE Ad_Network SHALL compute and store a SHA-256 hash of the entry content and the hash of the immediately preceding entry, forming a hash chain, before acknowledging the entry as successfully written.
4. WHEN an authorized party — defined as a user holding the Compliance_Officer or Legal_Representative role — requests Audit_Log entries by event type, Publisher ID, Campaign ID, or time range, THE Ad_Network SHALL return matching entries within 1 second for queries spanning up to 30 days, paginated at a maximum of 1,000 entries per page.
5. THE Ad_Network SHALL retain Audit_Log entries for a minimum of 36 months.
6. WHEN an authorized party requests hash chain integrity verification, THE Ad_Network SHALL return a verification result containing: pass or fail status, total entry count verified, the index and event type of the first mismatched entry (if any), and the verification timestamp.
7. IF hash chain integrity verification detects a mismatch, THEN THE Ad_Network SHALL immediately alert all users holding the Compliance_Officer role and suspend write access to the Audit_Log pending investigation.
8. WHERE on-chain settlement is enabled, THE Ad_Network SHALL anchor Audit_Log hash-chain checkpoints — defined as the SHA-256 hash of the most recent entry concatenated with the total entry count — to the blockchain at intervals not exceeding 24 hours.

---

### Requirement 13: Verifiable Traffic Attestations (Web3 Primitive)

**User Story:** As an Advertiser, I want traffic attestations to be cryptographically verifiable and optionally anchored on-chain, so that I can independently prove the authenticity of every impression I paid for.

#### Acceptance Criteria

1. THE Ad_Network SHALL generate a Traffic_Attestation for every valid Impression — where "valid" means the Impression has completed Traffic_Quality evaluation and was not discarded — containing: impression ID, Publisher ID, Campaign ID, UTC timestamp, Compliance_Score at time of serving, Traffic_Quality_Score at time of serving, the signing key ID, and a digital signature using the Ad_Network's signing key.
2. THE Ad_Network SHALL publish its signing public key at a well-known URL, allowing any party to independently verify Traffic_Attestation signatures.
3. WHERE an Advertiser has enabled on-chain attestation for a Campaign, THE Ad_Network SHALL batch Traffic_Attestations in groups of up to 10,000 and anchor a Merkle root of each batch to a supported blockchain within 1 hour of the earliest impression in the batch.
4. WHEN a request is made for the Merkle proof of a Traffic_Attestation, THE Ad_Network SHALL return the Merkle proof for that attestation within 500ms.
5. IF a Merkle proof is requested for an attestation ID that is unknown or has not yet been anchored on-chain, THEN THE Ad_Network SHALL return a 404 error response within 500ms indicating the attestation is not found or not yet anchored.
6. FOR ALL Traffic_Attestations, verifying the digital signature using the published public key SHALL confirm the attestation's authenticity and integrity.
7. THE Ad_Network SHALL support Traffic_Attestation export in JSON-LD format conformant with the W3C Verifiable Credentials specification.

---

### Requirement 14: Publisher Compliance Score Parser and Serializer

**User Story:** As a developer integrating with the Ad_Network, I want to parse and serialize Compliance_Score data structures, so that I can reliably exchange compliance data between systems.

#### Acceptance Criteria

1. WHEN a valid Compliance_Score JSON payload is provided, THE Compliance_Score_Parser SHALL parse it into a ComplianceScore object with the following fields populated: publisher_id, aggregate score, Age_Gate_Quality sub-score, Consent_Record_Status sub-score, Content_Category_Safety sub-score, Traffic_Quality_Score sub-score, and timestamp.
2. WHEN an invalid or malformed Compliance_Score JSON payload is provided, THE Compliance_Score_Parser SHALL return an error object that identifies the field name and the violation type (e.g., missing required field, out-of-range value, wrong data type).
3. WHEN a ComplianceScore object is provided to the Compliance_Score_Serializer, THE Compliance_Score_Serializer SHALL produce a JSON payload that is parseable by the Compliance_Score_Parser without error.
4. FOR ALL valid ComplianceScore objects, parsing then serializing then parsing SHALL produce a ComplianceScore object where each field is equal to the corresponding field in the original object, with sub-score values matching to within 0.01.
5. WHEN a Compliance_Score JSON payload contains a sub-score value outside the range [0, 100], THE Compliance_Score_Parser SHALL return an error object identifying the field name and the out-of-range value.
