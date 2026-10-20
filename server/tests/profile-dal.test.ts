import { describe, it, expect, beforeEach } from 'vitest';
import {
  ProfileDal,
  calculateProfileReadiness,
  ProfileVersionConflictError,
} from '../src/index.js';
import { makeUserId } from '@portfolio-immortalized/domain';

describe('ProfileDal & Progressive Readiness (TDD Chapter 4 & 7)', () => {
  let profileDal: ProfileDal;
  const testUserId = makeUserId('user-owner-1');

  beforeEach(async () => {
    profileDal = new ProfileDal();
    await profileDal.createProfile(testUserId, 'Alex Johnson');
  });

  it('PROF-01: Successfully creates minimal profile on registration', async () => {
    const profile = await profileDal.getProfile(testUserId);
    expect(profile).not.toBeNull();
    expect(profile?.displayName).toBe('Alex Johnson');
    expect(profile?.profileVersion).toBe(1);
    expect(profile?.legalName).toBeNull();
  });

  it('Progressive Completion: Updates legal identity fields and increments profileVersion', async () => {
    const updated = await profileDal.updateProfile(
      testUserId,
      {
        legalName: 'Alexander Patrick Johnson',
        dateOfBirth: '1985-05-15',
        nationality: 'KE',
        residenceCountry: 'KE',
      },
      1 // expectedVersion
    );

    expect(updated.legalName).toBe('Alexander Patrick Johnson');
    expect(updated.profileVersion).toBe(2);
    expect(updated.residenceCountry).toBe('KE');
  });

  it('Optimistic Locking: Rejects update when expected version does not match', async () => {
    // First update moves version to 2
    await profileDal.updateProfile(
      testUserId,
      { legalName: 'Alex P. Johnson' },
      1
    );

    // Stale client tries to update with old version 1
    await expect(
      profileDal.updateProfile(
        testUserId,
        { displayName: 'Concurrent Edit' },
        1 // Stale expected version!
      )
    ).rejects.toThrow(ProfileVersionConflictError);
  });

  it('Readiness Scoring: Calculates completeness progression accurately', async () => {
    const initialProfile = (await profileDal.getProfile(testUserId))!;
    
    // Incomplete initial profile (no legal fields, 0 trustees, 0 beneficiaries)
    const initialScore = calculateProfileReadiness(initialProfile, 0, 0);
    expect(initialScore.percentage).toBe(20);
    expect(initialScore.isComplete).toBe(false);
    expect(initialScore.missingTasks).toContain('Complete legal identity fields (Legal name, DOB, country)');

    // Partially complete (legal identity added + 1 trustee + 1 beneficiary)
    const updatedProfile = await profileDal.updateProfile(
      testUserId,
      {
        legalName: 'Alexander Patrick Johnson',
        dateOfBirth: '1985-05-15',
        residenceCountry: 'KE',
      },
      1
    );

    const partialScore = calculateProfileReadiness(updatedProfile, 1, 1);
    expect(partialScore.percentage).toBe(85); // 20 base + 30 legal + 15 partial trustee + 20 beneficiary
    expect(partialScore.isComplete).toBe(false);
    expect(partialScore.missingTasks).toContain('Appoint a second trustee to satisfy independent quorum');

    // 100% complete (2 trustees satisfy quorum)
    const fullScore = calculateProfileReadiness(updatedProfile, 2, 1);
    expect(fullScore.percentage).toBe(100);
    expect(fullScore.isComplete).toBe(true);
    expect(fullScore.missingTasks.length).toBe(0);
  });
});
