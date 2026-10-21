import {
  WillDocument,
  WillStatus,
  PhysicalCustodyRecord,
} from '@portfolio-immortalized/domain';
import { assertOwnerAccess } from './tenancy.js';
import { AuditService } from '../audit/logger.js';
import { Cap160WillValidator, Cap160ValidationResult } from '../will/cap160-validator.js';
import { StatutoryWillBuilder } from '../will/builder.js';
import crypto from 'crypto';

export class WillDal {
  private wills: Map<string, WillDocument> = new Map(); // key = userId
  private auditService: AuditService;

  constructor(auditService: AuditService = new AuditService()) {
    this.auditService = auditService;
  }

  async getWill(session: { userId: string; role?: string }, userId: string): Promise<WillDocument | null> {
    assertOwnerAccess(session.userId, userId);
    const will = this.wills.get(userId);
    return will ? { ...will } : null;
  }

  async createOrUpdateDraft(
    session: { userId: string; role?: string },
    input: any
  ): Promise<{ will: WillDocument; validation: Cap160ValidationResult }> {
    assertOwnerAccess(session.userId, session.userId);

    const validation = Cap160WillValidator.validate(input);
    const existing = this.wills.get(session.userId);
    const now = new Date();

    const will: WillDocument = {
      id: existing ? existing.id : `will_${crypto.randomBytes(8).toString('hex')}`,
      userId: session.userId,
      version: existing ? existing.version + 1 : 1,
      testatorFullName: input.testatorFullName,
      testatorNationalId: input.testatorNationalId,
      testatorDomicile: input.testatorDomicile,
      maritalStatus: input.maritalStatus,
      revocationOfPriorWills: input.revocationOfPriorWills ?? true,
      executors: input.executors || [],
      guardians: input.guardians || [],
      specificBequests: input.specificBequests || [],
      residuaryShares: input.residuaryShares || [],
      digitalVaultInstructions: input.digitalVaultInstructions,
      witnesses: input.witnesses || [],
      status: validation.isValid ? WillStatus.READY_FOR_EXECUTION : WillStatus.DRAFT,
      physicalCustody: input.physicalCustody || existing?.physicalCustody,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    this.wills.set(session.userId, will);

    await this.auditService.record({
      actorType: 'USER',
      actorId: session.userId,
      action: 'will.draft_committed',
      targetType: 'WillDocument',
      targetId: will.id,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        version: will.version,
        isValid: validation.isValid,
        errors: validation.errors,
      },
    });

    return { will, validation };
  }

  async recordPhysicalCustody(
    session: { userId: string; role?: string },
    custody: PhysicalCustodyRecord
  ): Promise<WillDocument> {
    assertOwnerAccess(session.userId, session.userId);

    const existing = this.wills.get(session.userId);
    if (!existing) {
      throw new Error('No will draft found. Please create a will draft before recording physical custody.');
    }

    existing.physicalCustody = custody;
    existing.status = WillStatus.EXECUTED_DEPOSITED;
    existing.updatedAt = new Date();

    this.wills.set(session.userId, existing);

    await this.auditService.record({
      actorType: 'USER',
      actorId: session.userId,
      action: 'will.physical_custody.registered',
      targetType: 'WillDocument',
      targetId: existing.id,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        custodyType: custody.custodyType,
        institution: custody.institutionName,
      },
    });

    return { ...existing };
  }

  async getLegalText(session: { userId: string; role?: string }, userId: string): Promise<string> {
    assertOwnerAccess(session.userId, userId);
    const will = this.wills.get(userId);
    if (!will) {
      throw new Error('No will document found for user');
    }
    return StatutoryWillBuilder.compileLegalText(will);
  }
}
