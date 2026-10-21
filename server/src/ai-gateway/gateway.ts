import crypto from 'node:crypto';
import {
  AITaskName,
  AIProviderName,
  AITaskStatus,
  AIDataClassification,
  assertAllowedAITask,
  assertAILacksAuthority,
} from '@portfolio-immortalized/domain';
import {
  DocumentClassificationOutputSchema,
  BlurLegibilityOutputSchema,
  MetadataExtractionOutputSchema,
  CaseSummaryOutputSchema,
  EstateGuidanceOutputSchema,
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
} from '@portfolio-immortalized/validation';
import {
  AIProviderAdapter,
  AITaskExecutionOptions,
  AIGatewayJobRecord,
  AIGatewayResult,
} from './types.js';
import { MockAIProvider } from './providers/mock.js';
import { GeminiProvider } from './providers/gemini.js';
import { ClaudeProvider } from './providers/claude.js';
import { AuditService } from '../audit/logger.js';

export interface ExecuteTaskParams<TInput> {
  taskName: AITaskName;
  input: TInput;
  preferredProvider?: AIProviderName;
  actorId?: string;
  purpose?: string;
  dataClass?: AIDataClassification;
  options?: AITaskExecutionOptions;
}

export class AIGatewayService {
  private providers: Map<AIProviderName, AIProviderAdapter> = new Map();
  private jobs: Map<string, AIGatewayJobRecord> = new Map();
  private auditService: AuditService;
  private disabledTasks: Set<string> = new Set();
  private globalKillswitch: boolean = false;

  constructor(auditService: AuditService = new AuditService()) {
    this.auditService = auditService;

    // Register standard adapters
    this.registerProvider(new MockAIProvider());
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new ClaudeProvider());
  }

  public registerProvider(provider: AIProviderAdapter): void {
    this.providers.set(provider.name, provider);
  }

  public getProvider(name: AIProviderName): AIProviderAdapter {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider '${name}' is not registered with the AI Gateway.`);
    }
    return provider;
  }

  public setKillswitch(disabled: boolean, taskName?: AITaskName): void {
    if (taskName) {
      if (disabled) this.disabledTasks.add(taskName);
      else this.disabledTasks.delete(taskName);
    } else {
      this.globalKillswitch = disabled;
    }
  }

  public isTaskDisabled(taskName: AITaskName): boolean {
    return this.globalKillswitch || this.disabledTasks.has(taskName);
  }

  /**
   * Dispatches an allowlisted task through the governed AI Gateway
   */
  public async executeTask<TInput, TOutput>(
    params: ExecuteTaskParams<TInput>
  ): Promise<AIGatewayResult<TOutput>> {
    const {
      taskName,
      input,
      preferredProvider,
      actorId = 'system',
      purpose = `Execution of allowlisted task ${taskName}`,
      dataClass = AIDataClassification.C3_HIGH_CONFIDENTIAL,
      options,
    } = params;

    // 0. Enforce Emergency Killswitch (Runbook 33.5)
    if (this.isTaskDisabled(taskName)) {
      throw new Error(`AI Gateway task '${taskName}' is disabled under emergency policy killswitch.`);
    }

    // 1. Enforce Task Allowlist (Invariant AI-001)
    assertAllowedAITask(taskName);

    // 2. Enforce Non-Authoritative Guardrail (Invariant AI-002)
    this.validateInputSafety(input);

    // 3. Resolve Provider
    const provider = this.resolveProvider(preferredProvider);

    // 4. Create and persist Job record (Initial state: QUEUED -> PROCESSING)
    const jobId = `job_${crypto.randomUUID()}`;
    const jobRecord: AIGatewayJobRecord = {
      id: jobId,
      taskName,
      purpose,
      dataClass,
      provider: provider.name,
      modelId: 'resolving',
      status: AITaskStatus.PROCESSING,
      tokenCount: null,
      latencyMs: null,
      createdAt: new Date(),
    };
    this.jobs.set(jobId, jobRecord);

    const startTime = Date.now();

    try {
      // 5. Execute with Provider
      const response = await provider.executeTask<TInput, TOutput>(taskName, input, options);
      const latencyMs = Date.now() - startTime;

      // 6. Enforce Schema Validation on Output
      const validatedOutput = this.validateTaskOutput<TOutput>(taskName, response.output);

      // 7. Update Job Status to COMPLETED
      jobRecord.status = AITaskStatus.COMPLETED;
      jobRecord.modelId = response.modelId;
      jobRecord.tokenCount = response.tokenCount;
      jobRecord.latencyMs = latencyMs;
      this.jobs.set(jobId, jobRecord);

      // 8. Commit Audit Event
      await this.auditService.record({
        actorType: actorId.startsWith('usr_') || actorId.startsWith('admin_') ? 'USER' : 'SYSTEM',
        actorId,
        action: 'ai.task.execute',
        targetType: 'AIProcessingJob',
        targetId: jobId,
        outcome: 'SUCCESS',
        requestId: `req_${crypto.randomUUID()}`,
        metadata: {
          taskName,
          provider: provider.name,
          modelId: response.modelId,
          latencyMs,
          tokenCount: response.tokenCount,
        },
      });

      return {
        jobId,
        taskName,
        provider: provider.name,
        modelId: response.modelId,
        output: validatedOutput,
        tokenCount: response.tokenCount,
        latencyMs,
        status: AITaskStatus.COMPLETED,
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      jobRecord.status = AITaskStatus.FAILED;
      jobRecord.latencyMs = latencyMs;
      this.jobs.set(jobId, jobRecord);

      await this.auditService.record({
        actorType: 'SYSTEM',
        actorId,
        action: 'ai.task.execute',
        targetType: 'AIProcessingJob',
        targetId: jobId,
        outcome: 'FAILED',
        requestId: `req_${crypto.randomUUID()}`,
        metadata: {
          taskName,
          provider: provider.name,
          error: (err as Error).message,
          latencyMs,
        },
      });

      throw err;
    }
  }

  // ==============================================================================
  // Convenience Typed Task Helpers
  // ==============================================================================

  public async classifyDocument(
    input: DocumentClassificationInput,
    options?: AITaskExecutionOptions
  ): Promise<AIGatewayResult<DocumentClassificationOutput>> {
    return this.executeTask<DocumentClassificationInput, DocumentClassificationOutput>({
      taskName: AITaskName.DOCUMENT_CLASSIFICATION,
      input,
      purpose: 'Categorizing uploaded document scan',
      options,
    });
  }

  public async assessScanQuality(
    input: BlurLegibilityInput,
    options?: AITaskExecutionOptions
  ): Promise<AIGatewayResult<BlurLegibilityOutput>> {
    return this.executeTask<BlurLegibilityInput, BlurLegibilityOutput>({
      taskName: AITaskName.BLUR_LEGIBILITY_ASSESSMENT,
      input,
      purpose: 'Assessing legibility and blur of document scan',
      options,
    });
  }

  public async extractDocumentMetadata(
    input: MetadataExtractionInput,
    options?: AITaskExecutionOptions
  ): Promise<AIGatewayResult<MetadataExtractionOutput>> {
    return this.executeTask<MetadataExtractionInput, MetadataExtractionOutput>({
      taskName: AITaskName.METADATA_EXTRACTION,
      input,
      purpose: 'Extracting candidate non-authoritative metadata from record',
      options,
    });
  }

  public async generateCaseSummaryDraft(
    input: CaseSummaryInput,
    options?: AITaskExecutionOptions
  ): Promise<AIGatewayResult<CaseSummaryOutput>> {
    return this.executeTask<CaseSummaryInput, CaseSummaryOutput>({
      taskName: AITaskName.CASE_SUMMARY_DRAFTING,
      input,
      purpose: 'Drafting triage case summary for human case reviewer',
      options,
    });
  }

  public async askEstateGuidance(
    input: EstateGuidanceInput,
    options?: AITaskExecutionOptions
  ): Promise<AIGatewayResult<EstateGuidanceOutput>> {
    return this.executeTask<EstateGuidanceInput, EstateGuidanceOutput>({
      taskName: AITaskName.ESTATE_ONBOARDING_GUIDANCE,
      input,
      purpose: 'Providing educational estate planning guidance',
      options,
    });
  }

  // ==============================================================================
  // Admin Operations & Job Audit Listing
  // ==============================================================================

  public async listJobs(query?: ListAIJobsQuery): Promise<AIGatewayJobRecord[]> {
    let result = Array.from(this.jobs.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    if (query?.taskName) {
      result = result.filter((j) => j.taskName === query.taskName);
    }
    if (query?.status) {
      result = result.filter((j) => j.status === query.status);
    }

    const limit = query?.limit ?? 20;
    return result.slice(0, limit);
  }

  public async getJob(id: string): Promise<AIGatewayJobRecord | null> {
    return this.jobs.get(id) ?? null;
  }

  // ==============================================================================
  // Internal Safety & Schema Verification
  // ==============================================================================

  private validateInputSafety(input: unknown): void {
    if (!input || typeof input !== 'object') return;

    for (const value of Object.values(input as Record<string, unknown>)) {
      if (typeof value === 'string') {
        assertAILacksAuthority(value);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          this.validateInputSafety(item);
        }
      } else if (typeof value === 'object') {
        this.validateInputSafety(value);
      }
    }
  }

  private resolveProvider(preferred?: AIProviderName): AIProviderAdapter {
    if (preferred && this.providers.has(preferred)) {
      const p = this.providers.get(preferred)!;
      if (p.isConfigured) return p;
    }

    // Check Gemini
    const gemini = this.providers.get(AIProviderName.GEMINI);
    if (gemini?.isConfigured) return gemini;

    // Check Claude
    const claude = this.providers.get(AIProviderName.CLAUDE);
    if (claude?.isConfigured) return claude;

    // Fallback to Mock
    return this.providers.get(AIProviderName.MOCK)!;
  }

  private validateTaskOutput<TOutput>(task: AITaskName, output: unknown): TOutput {
    let parsed: any;
    switch (task) {
      case AITaskName.DOCUMENT_CLASSIFICATION:
        parsed = DocumentClassificationOutputSchema.safeParse(output);
        break;
      case AITaskName.BLUR_LEGIBILITY_ASSESSMENT:
        parsed = BlurLegibilityOutputSchema.safeParse(output);
        break;
      case AITaskName.METADATA_EXTRACTION:
        parsed = MetadataExtractionOutputSchema.safeParse(output);
        break;
      case AITaskName.CASE_SUMMARY_DRAFTING:
        parsed = CaseSummaryOutputSchema.safeParse(output);
        break;
      case AITaskName.ESTATE_ONBOARDING_GUIDANCE:
        parsed = EstateGuidanceOutputSchema.safeParse(output);
        break;
      default:
        throw new Error(`Unknown task validation schema for: ${task}`);
    }

    if (!parsed.success) {
      throw new Error(`AI output failed schema validation: ${JSON.stringify(parsed.error.format())}`);
    }

    return parsed.data as TOutput;
  }
}

// Global singleton instance for the server runtime
export const aiGatewayService = new AIGatewayService();
