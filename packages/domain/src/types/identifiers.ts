/**
 * Branded nominal type helper ensuring IDs from different domains
 * cannot be accidentally interchanged (e.g. passing a UserId where an AssetId is required).
 */
declare const brand: unique symbol;

export type Branded<T, B> = T & { readonly [brand]: B };

export type UserId = Branded<string, 'UserId'>;
export type ProfileId = Branded<string, 'ProfileId'>;
export type AssetId = Branded<string, 'AssetId'>;
export type AssetVersionId = Branded<string, 'AssetVersionId'>;
export type StorageObjectId = Branded<string, 'StorageObjectId'>;
export type KeyEnvelopeId = Branded<string, 'KeyEnvelopeId'>;
export type CaseId = Branded<string, 'CaseId'>;
export type EvidenceId = Branded<string, 'EvidenceId'>;
export type CaseDecisionId = Branded<string, 'CaseDecisionId'>;
export type CaseHoldId = Branded<string, 'CaseHoldId'>;
export type ReleaseGrantId = Branded<string, 'ReleaseGrantId'>;
export type TrusteeId = Branded<string, 'TrusteeId'>;
export type BeneficiaryId = Branded<string, 'BeneficiaryId'>;
export type RelationshipId = Branded<string, 'RelationshipId'>;
export type LegacyPlanId = Branded<string, 'LegacyPlanId'>;
export type LegacyInstructionId = Branded<string, 'LegacyInstructionId'>;
export type AuditEventId = Branded<string, 'AuditEventId'>;
export type OutboxEventId = Branded<string, 'OutboxEventId'>;
export type AIJobId = Branded<string, 'AIJobId'>;

/** Helper constructor functions for casting validated UUID strings */
export const makeUserId = (id: string): UserId => id as UserId;
export const makeAssetId = (id: string): AssetId => id as AssetId;
export const makeAssetVersionId = (id: string): AssetVersionId => id as AssetVersionId;
export const makeCaseId = (id: string): CaseId => id as CaseId;
export const makeReleaseGrantId = (id: string): ReleaseGrantId => id as ReleaseGrantId;
export const makeRelationshipId = (id: string): RelationshipId => id as RelationshipId;
export const makeBeneficiaryId = (id: string): BeneficiaryId => id as BeneficiaryId;
export const makeLegacyPlanId = (id: string): LegacyPlanId => id as LegacyPlanId;
export const makeAuditEventId = (id: string): AuditEventId => id as AuditEventId;
export const makeOutboxEventId = (id: string): OutboxEventId => id as OutboxEventId;
export const makeEvidenceId = (id: string): EvidenceId => id as EvidenceId;
export const makeCaseDecisionId = (id: string): CaseDecisionId => id as CaseDecisionId;
export const makeCaseHoldId = (id: string): CaseHoldId => id as CaseHoldId;
export const makeTrusteeId = (id: string): TrusteeId => id as TrusteeId;
