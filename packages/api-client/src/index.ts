import {
  ApiErrorEnvelope,
  DocumentClassificationInput,
  DocumentClassificationOutput,
  BlurLegibilityInput,
  BlurLegibilityOutput,
  MetadataExtractionInput,
  MetadataExtractionOutput,
  CaseSummaryInput,
  CaseSummaryOutput,
  EstateGuidanceInput,
  EstateGuidanceOutput,
  ListAIJobsQuery,
  ListAdminUsersQueryInput,
  UpdateUserStatusInput,
  RevokeUserSessionsInput,
  AccountDeletionDryRunInput,
  ListAuditEventsQueryInput,
  ToggleSystemHoldInput,
  BeneficiaryVerificationInput,
  TrusteeConflictReportInput,
  WorkerTickInput,
} from '@portfolio-immortalized/validation';

export class PortfolioApiError extends Error {
  public readonly code: string;
  public readonly requestId: string;
  public readonly details?: Array<{ field?: string; issue: string }>;
  public readonly statusCode: number;

  constructor(statusCode: number, envelope: ApiErrorEnvelope['error']) {
    super(envelope.message);
    this.name = 'PortfolioApiError';
    this.statusCode = statusCode;
    this.code = envelope.code;
    this.requestId = envelope.requestId;
    this.details = envelope.details;
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  getAuthToken?: () => Promise<string | null>;
}

export class PortfolioApiClient {
  private baseUrl: string;
  private getAuthToken?: () => Promise<string | null>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getAuthToken = config.getAuthToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { idempotencyKey?: string } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers);

    headers.set('Content-Type', 'application/json');
    headers.set('X-Request-Id', `req_${Math.random().toString(36).substring(2, 12)}`);

    if (options.idempotencyKey) {
      headers.set('Idempotency-Key', options.idempotencyKey);
    }

    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorEnvelope: ApiErrorEnvelope['error'];
      try {
        const body = await response.json();
        errorEnvelope = body.error ?? {
          code: 'UNKNOWN_ERROR',
          message: response.statusText,
          requestId: headers.get('X-Request-Id') || 'unknown',
        };
      } catch {
        errorEnvelope = {
          code: 'NETWORK_OR_PARSING_ERROR',
          message: response.statusText || 'Unable to parse server error',
          requestId: headers.get('X-Request-Id') || 'unknown',
        };
      }
      throw new PortfolioApiError(response.status, errorEnvelope);
    }

    return (await response.json()) as T;
  }

  // --- Auth & Profile ---
  public async getMe(): Promise<unknown> {
    return this.request('/me');
  }

  // --- Vault ---
  public async listVaultAssets(query?: { category?: string; search?: string }): Promise<any> {
    const params = new URLSearchParams();
    if (query?.category) params.set('category', query.category);
    if (query?.search) params.set('search', query.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/vault/assets${qs}`);
  }

  public async getVaultAsset(assetId: string): Promise<any> {
    return this.request(`/vault/assets/${assetId}`);
  }

  public async createVaultUploadIntent(payload: unknown, idempotencyKey?: string): Promise<any> {
    return this.request('/vault/intent', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    });
  }

  public async commitVaultUpload(payload: unknown, idempotencyKey?: string): Promise<any> {
    return this.request('/vault/commit', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    });
  }

  public async deleteVaultAsset(assetId: string): Promise<any> {
    return this.request(`/vault/assets/${assetId}`, {
      method: 'DELETE',
    });
  }

  // --- Legacy Plan & Directives ---
  public async getLegacyPlan(): Promise<any> {
    return this.request('/legacy/plan');
  }

  public async upsertLegacyInstruction(payload: unknown, idempotencyKey?: string): Promise<any> {
    return this.request('/legacy/instructions', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    });
  }

  public async deleteLegacyInstruction(instructionId: string): Promise<any> {
    return this.request(`/legacy/instructions/${instructionId}`, {
      method: 'DELETE',
    });
  }

  public async publishLegacyPlan(payload: unknown, idempotencyKey?: string): Promise<any> {
    return this.request('/legacy/publish', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    });
  }

  public async getLegacyRecipientPreview(beneficiaryId?: string): Promise<any> {
    const qs = beneficiaryId ? `?beneficiaryId=${encodeURIComponent(beneficiaryId)}` : '';
    return this.request(`/legacy/preview${qs}`);
  }

  // --- People ---
  public async inviteTrustee(payload: unknown, idempotencyKey?: string): Promise<unknown> {
    return this.request('/people/trustees/invitations', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    });
  }

  // --- Cases & Verification ---
  public async listCases(filter?: { state?: string; ownerId?: string }): Promise<unknown> {
    const params = new URLSearchParams();
    if (filter?.state) params.set('state', filter.state);
    if (filter?.ownerId) params.set('ownerId', filter.ownerId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/cases${qs}`);
  }

  public async getCaseDetails(caseId: string): Promise<unknown> {
    return this.request(`/cases/${caseId}`);
  }

  public async submitDeathReport(payload: unknown, idempotencyKey?: string): Promise<unknown> {
    return this.request('/cases', {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    });
  }

  public async submitCaseEvidence(caseId: string, payload: unknown, idempotencyKey?: string): Promise<unknown> {
    return this.request(`/cases/${caseId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    });
  }

  public async coSignCase(caseId: string, payload: unknown, idempotencyKey?: string): Promise<unknown> {
    return this.request(`/cases/${caseId}/co-sign`, {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    });
  }

  public async submitReviewRecommendation(caseId: string, payload: unknown, idempotencyKey?: string): Promise<unknown> {
    return this.request(`/cases/${caseId}/recommend`, {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    });
  }

  public async submitFinalApproval(caseId: string, payload: unknown, idempotencyKey?: string): Promise<unknown> {
    return this.request(`/cases/${caseId}/approve`, {
      method: 'POST',
      body: JSON.stringify(payload),
      idempotencyKey,
    });
  }

  public async placeEmergencyHold(caseId: string, payload: unknown): Promise<unknown> {
    return this.request(`/cases/${caseId}/hold`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async resolveEmergencyHold(caseId: string, payload: unknown): Promise<unknown> {
    return this.request(`/cases/${caseId}/hold`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  public async triggerInactivitySweep(payload?: unknown): Promise<unknown> {
    return this.request('/inactivity/sweep', {
      method: 'POST',
      body: payload ? JSON.stringify(payload) : undefined,
    });
  }

  // --- AI Gateway & Estate Assistance (Stage 6, ADR-009) ---
  public async classifyDocument(payload: DocumentClassificationInput): Promise<{ success: boolean; data: DocumentClassificationOutput }> {
    return this.request('/ai/classify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async assessScanQuality(payload: BlurLegibilityInput): Promise<{ success: boolean; data: BlurLegibilityOutput }> {
    return this.request('/ai/scan-quality', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async extractDocumentMetadata(payload: MetadataExtractionInput): Promise<{ success: boolean; data: MetadataExtractionOutput }> {
    return this.request('/ai/extract-metadata', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async generateCaseSummaryDraft(payload: CaseSummaryInput): Promise<{ success: boolean; data: CaseSummaryOutput }> {
    return this.request('/ai/case-summary', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async askEstateGuidance(payload: EstateGuidanceInput): Promise<{ success: boolean; data: EstateGuidanceOutput }> {
    return this.request('/ai/guidance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listAIJobs(query?: ListAIJobsQuery): Promise<{ success: boolean; data: unknown[] }> {
    const params = new URLSearchParams();
    if (query?.taskName) params.set('taskName', query.taskName);
    if (query?.status) params.set('status', query.status);
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/ai/jobs${qs}`);
  }

  // --- Administrative Console & Security Operations (Stage 7, ADR-007, ADR-010) ---

  public async listAdminUsers(query?: ListAdminUsersQueryInput): Promise<{ success: boolean; data: { users: unknown[]; total: number } }> {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.status) params.set('status', query.status);
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.cursor) params.set('cursor', query.cursor);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/admin/users${qs}`);
  }

  public async getAdminUser(id: string): Promise<{ success: boolean; data: unknown }> {
    return this.request(`/admin/users/${id}`);
  }

  public async updateAdminUserStatus(id: string, payload: UpdateUserStatusInput): Promise<{ success: boolean; data: unknown }> {
    return this.request(`/admin/users/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async revokeAdminUserSessions(id: string, payload: RevokeUserSessionsInput): Promise<{ success: boolean; data: { revokedCount: number } }> {
    return this.request(`/admin/users/${id}/revoke-sessions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async evaluateUserDeletionDryRun(id: string, payload?: Partial<AccountDeletionDryRunInput>): Promise<{ success: boolean; data: unknown }> {
    return this.request(`/admin/users/${id}/deletion-dryrun`, {
      method: 'POST',
      body: JSON.stringify({ userId: id, reasonCode: payload?.reasonCode ?? 'ADMIN_COMPLIANCE_REVIEW' }),
    });
  }

  public async getAdminSecurityStatus(): Promise<{ success: boolean; data: unknown }> {
    return this.request('/admin/security/status');
  }

  public async toggleAdminSystemHold(payload: ToggleSystemHoldInput): Promise<{ success: boolean; data: unknown }> {
    return this.request('/admin/security/hold', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listAdminAuditEvents(query?: ListAuditEventsQueryInput): Promise<{ success: boolean; data: { events: unknown[]; total: number; offset: number; limit: number } }> {
    const params = new URLSearchParams();
    if (query?.actorId) params.set('actorId', query.actorId);
    if (query?.actorType) params.set('actorType', query.actorType);
    if (query?.action) params.set('action', query.action);
    if (query?.targetType) params.set('targetType', query.targetType);
    if (query?.targetId) params.set('targetId', query.targetId);
    if (query?.outcome) params.set('outcome', query.outcome);
    if (query?.startDate) params.set('startDate', query.startDate);
    if (query?.endDate) params.set('endDate', query.endDate);
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.offset) params.set('offset', String(query.offset));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/admin/audit${qs}`);
  }

  public async exportAdminAuditCsv(query?: ListAuditEventsQueryInput): Promise<string> {
    const params = new URLSearchParams();
    if (query?.actorId) params.set('actorId', query.actorId);
    if (query?.action) params.set('action', query.action);
    if (query?.outcome) params.set('outcome', query.outcome);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const url = `${this.baseUrl}/admin/audit/export${qs}`;
    const headers = new Headers();
    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to export audit CSV: ${res.statusText}`);
    }
    return res.text();
  }

  // --- Beneficiary Portal & Delivery (WEB-BEN-01, 02, 03) ---

  public async verifyBeneficiaryToken(payload: BeneficiaryVerificationInput): Promise<{
    success: boolean;
    data: { verified: boolean; sessionGrantToken: string; beneficiary: { id: string; name: string; email: string } };
  }> {
    return this.request('/beneficiary/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  public async listBeneficiaryGrants(sessionGrantToken?: string): Promise<{
    success: boolean;
    data: {
      grants: Array<{
        id: string;
        caseId: string;
        status: string;
        expiresAt: string;
        ownerName: string;
        assets: Array<{
          id: string;
          assetId: string;
          title: string;
          assetType: string;
          fileSizeBytes: number;
          mimeType: string;
        }>;
      }>;
    };
  }> {
    const headers: Record<string, string> = {};
    if (sessionGrantToken) {
      headers['X-Beneficiary-Token'] = sessionGrantToken;
    }
    return this.request('/beneficiary/grants', { headers });
  }

  public async getBeneficiaryAssetStream(
    grantId: string,
    assetId: string,
    sessionGrantToken?: string
  ): Promise<Response> {
    const url = `${this.baseUrl}/beneficiary/grants/${grantId}/assets/${assetId}/view`;
    const headers = new Headers();
    if (sessionGrantToken) {
      headers.set('X-Beneficiary-Token', sessionGrantToken);
    }
    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch watermarked asset: ${res.statusText}`);
    }
    return res;
  }

  // --- Trustee Conflict & Fraud Freeze (WEB-TRS-05, OD-18) ---

  public async reportTrusteeConflict(payload: TrusteeConflictReportInput): Promise<{
    success: boolean;
    data: { caseId: string; holdPlaced: boolean; state: string };
  }> {
    return this.request('/trustee/conflict', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Background Worker Tick Trigger ---

  public async triggerWorkerTick(payload?: WorkerTickInput): Promise<{
    success: boolean;
    data: { sweptCases: number; processedOutbox: number; expiredGrants: number };
  }> {
    return this.request('/worker/tick', {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  }
}

