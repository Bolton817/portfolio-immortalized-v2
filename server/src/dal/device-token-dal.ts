import { DeviceTokenRecord } from '@portfolio-immortalized/domain';
import { assertOwnerAccess } from './tenancy.js';
import { AuditService } from '../audit/logger.js';
import crypto from 'crypto';

export class DeviceTokenDal {
  private tokens: Map<string, DeviceTokenRecord> = new Map();
  private auditService: AuditService;

  constructor(auditService: AuditService = new AuditService()) {
    this.auditService = auditService;
  }

  async registerToken(
    session: { userId: string; role?: string },
    input: { token: string; platform: 'ios' | 'android' | 'web'; deviceModel?: string; appVersion?: string }
  ): Promise<DeviceTokenRecord> {
    assertOwnerAccess(session.userId, session.userId);

    // Deactivate any existing record with the exact same token to avoid duplicate push
    for (const rec of this.tokens.values()) {
      if (rec.token === input.token) {
        rec.isActive = false;
        rec.updatedAt = new Date();
      }
    }

    const id = `tok_${crypto.randomBytes(8).toString('hex')}`;
    const record: DeviceTokenRecord = {
      id,
      userId: session.userId,
      token: input.token,
      platform: input.platform,
      deviceModel: input.deviceModel,
      appVersion: input.appVersion,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tokens.set(id, record);

    await this.auditService.record({
      actorType: 'USER',
      actorId: session.userId,
      action: 'device_token.registered',
      targetType: 'DeviceToken',
      targetId: id,
      outcome: 'SUCCESS',
      requestId: `req_${Date.now()}`,
      metadata: {
        platform: input.platform,
        deviceModel: input.deviceModel,
      },
    });

    return record;
  }

  async getActiveTokensForUser(userId: string): Promise<DeviceTokenRecord[]> {
    const list: DeviceTokenRecord[] = [];
    for (const rec of this.tokens.values()) {
      if (rec.userId === userId && rec.isActive) {
        list.push({ ...rec });
      }
    }
    return list;
  }

  async deactivateToken(session: { userId: string; role?: string }, tokenId: string): Promise<boolean> {
    const record = this.tokens.get(tokenId);
    if (!record) return false;

    assertOwnerAccess(session.userId, record.userId);
    record.isActive = false;
    record.updatedAt = new Date();
    return true;
  }
}
