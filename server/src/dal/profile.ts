import { UserId } from '@portfolio-immortalized/domain';
import { UpdateProfileInput } from '@portfolio-immortalized/validation';

export interface UserProfileRecord {
  id: string;
  userId: UserId;
  displayName: string;
  legalName: string | null;
  dateOfBirth: Date | null;
  nationality: string | null;
  residenceCountry: string | null;
  identityStatus: string;
  lastMeaningfulActivityAt: Date;
  profileVersion: number;
  updatedAt: Date;
}

export interface ProfileReadinessScore {
  percentage: number;
  isComplete: boolean;
  hasLegalIdentity: boolean;
  hasTrusteeQuorum: boolean;
  hasBeneficiaries: boolean;
  missingTasks: string[];
}

export class ProfileVersionConflictError extends Error {
  public readonly code = 'VERSION_CONFLICT';
  public readonly statusCode = 409;

  constructor(message: string = 'The profile was modified concurrently. Please refresh and try again.') {
    super(message);
    this.name = 'ProfileVersionConflictError';
  }
}

/**
 * Calculates progressive profile and legacy readiness based on TDD Chapter 6 & 7.
 */
export function calculateProfileReadiness(
  profile: UserProfileRecord,
  activeTrusteeCount: number,
  beneficiaryCount: number
): ProfileReadinessScore {
  let score = 20; // Base score for registration and email verification
  const missingTasks: string[] = [];

  const hasLegalIdentity = !!(profile.legalName && profile.dateOfBirth && profile.residenceCountry);
  if (hasLegalIdentity) {
    score += 30;
  } else {
    missingTasks.push('Complete legal identity fields (Legal name, DOB, country)');
  }

  const hasTrusteeQuorum = activeTrusteeCount >= 2;
  if (hasTrusteeQuorum) {
    score += 30;
  } else if (activeTrusteeCount === 1) {
    score += 15;
    missingTasks.push('Appoint a second trustee to satisfy independent quorum');
  } else {
    missingTasks.push('Appoint at least two trustees to protect your legacy plan');
  }

  const hasBeneficiaries = beneficiaryCount >= 1;
  if (hasBeneficiaries) {
    score += 20;
  } else {
    missingTasks.push('Add at least one designated beneficiary');
  }

  return {
    percentage: Math.min(100, score),
    isComplete: score === 100,
    hasLegalIdentity,
    hasTrusteeQuorum,
    hasBeneficiaries,
    missingTasks,
  };
}

/**
 * In-memory / abstracted store for profile operations.
 * Works seamlessly with Prisma in production and isolated tests.
 */
export class ProfileDal {
  private profiles: Map<string, UserProfileRecord> = new Map();

  async getProfile(userId: UserId): Promise<UserProfileRecord | null> {
    return this.profiles.get(userId) || null;
  }

  async createProfile(userId: UserId, displayName: string): Promise<UserProfileRecord> {
    const record: UserProfileRecord = {
      id: `prof_${userId}`,
      userId,
      displayName,
      legalName: null,
      dateOfBirth: null,
      nationality: null,
      residenceCountry: null,
      identityStatus: 'NOT_REQUIRED',
      lastMeaningfulActivityAt: new Date(),
      profileVersion: 1,
      updatedAt: new Date(),
    };
    this.profiles.set(userId, record);
    return record;
  }

  /**
   * Applies partial updates with optimistic locking check.
   */
  async updateProfile(
    userId: UserId,
    input: UpdateProfileInput,
    expectedVersion: number
  ): Promise<UserProfileRecord> {
    const current = this.profiles.get(userId);
    if (!current) {
      throw new Error(`PROFILE_NOT_FOUND: Profile for user ${userId} does not exist.`);
    }

    if (current.profileVersion !== expectedVersion) {
      throw new ProfileVersionConflictError(
        `Optimistic lock failed: current version is ${current.profileVersion}, but expected ${expectedVersion}.`
      );
    }

    const updated: UserProfileRecord = {
      ...current,
      displayName: input.displayName ?? current.displayName,
      legalName: input.legalName !== undefined ? input.legalName : current.legalName,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : current.dateOfBirth,
      nationality: input.nationality !== undefined ? input.nationality : current.nationality,
      residenceCountry: input.residenceCountry !== undefined ? input.residenceCountry : current.residenceCountry,
      profileVersion: current.profileVersion + 1,
      lastMeaningfulActivityAt: new Date(), // Updating profile counts as meaningful owner activity
      updatedAt: new Date(),
    };

    this.profiles.set(userId, updated);
    return updated;
  }
}
