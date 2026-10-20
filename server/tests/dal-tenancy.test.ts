import { describe, it, expect } from 'vitest';
import {
  assertOwnerAccess,
  assertAdminRole,
  assertValidReleaseGrant,
  DalAuthorizationError,
} from '../src/index.js';
import { AdminRole, ReleaseGrantStatus } from '@portfolio-immortalized/domain';

describe('Data Access Layer Tenancy & Scoping (TDD Chapter 22)', () => {
  describe('assertOwnerAccess (IDOR prevention)', () => {
    it('allows owner to access their own resource', () => {
      expect(() => assertOwnerAccess('user-123', 'user-123')).not.toThrow();
    });

    it('denies cross-tenant resource access with ACCESS_DENIED', () => {
      expect(() => assertOwnerAccess('attacker-456', 'victim-123')).toThrow(
        DalAuthorizationError
      );
      try {
        assertOwnerAccess('attacker-456', 'victim-123');
      } catch (err) {
        expect((err as DalAuthorizationError).code).toBe('ACCESS_DENIED');
      }
    });
  });

  describe('assertAdminRole', () => {
    it('allows authorized admin role', () => {
      expect(() =>
        assertAdminRole(AdminRole.RELEASE_APPROVER, [
          AdminRole.RELEASE_APPROVER,
          AdminRole.SUPER_ADMIN,
        ])
      ).not.toThrow();
    });

    it('denies insufficient admin role', () => {
      expect(() =>
        assertAdminRole(AdminRole.SUPPORT_ADMIN, [
          AdminRole.RELEASE_APPROVER,
          AdminRole.SUPER_ADMIN,
        ])
      ).toThrow(DalAuthorizationError);
    });
  });

  describe('assertValidReleaseGrant', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // +24 hours
    const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24); // -24 hours

    it('validates active, unexpired, unrevoked grant', () => {
      const validGrant = {
        status: ReleaseGrantStatus.ACTIVE,
        expiresAt: futureDate,
        revokedAt: null,
      };
      expect(() => assertValidReleaseGrant(validGrant)).not.toThrow();
    });

    it('denies revoked grant', () => {
      const revokedGrant = {
        status: ReleaseGrantStatus.ACTIVE,
        expiresAt: futureDate,
        revokedAt: new Date(),
      };
      expect(() => assertValidReleaseGrant(revokedGrant)).toThrow(
        /revoked/i
      );
      try {
        assertValidReleaseGrant(revokedGrant);
      } catch (err) {
        expect((err as DalAuthorizationError).code).toBe('RELEASE_GRANT_REVOKED');
      }
    });

    it('denies expired grant', () => {
      const expiredGrant = {
        status: ReleaseGrantStatus.ACTIVE,
        expiresAt: pastDate,
        revokedAt: null,
      };
      expect(() => assertValidReleaseGrant(expiredGrant)).toThrow(
        /expired/i
      );
      try {
        assertValidReleaseGrant(expiredGrant);
      } catch (err) {
        expect((err as DalAuthorizationError).code).toBe('RELEASE_GRANT_EXPIRED');
      }
    });

    it('denies pending grant', () => {
      const pendingGrant = {
        status: ReleaseGrantStatus.PENDING,
        expiresAt: futureDate,
        revokedAt: null,
      };
      expect(() => assertValidReleaseGrant(pendingGrant)).toThrow(
        /cannot be accessed/i
      );
      try {
        assertValidReleaseGrant(pendingGrant);
      } catch (err) {
        expect((err as DalAuthorizationError).code).toBe('RELEASE_GRANT_INACTIVE');
      }
    });
  });
});
