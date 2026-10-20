/**
 * Allowlisted AI tasks supported by the AI Gateway (ADR-009, AI-001)
 */
export enum AITaskName {
  DOCUMENT_CLASSIFICATION = 'DOCUMENT_CLASSIFICATION',
  BLUR_LEGIBILITY_ASSESSMENT = 'BLUR_LEGIBILITY_ASSESSMENT',
  METADATA_EXTRACTION = 'METADATA_EXTRACTION',
  CASE_SUMMARY_DRAFTING = 'CASE_SUMMARY_DRAFTING',
  ESTATE_ONBOARDING_GUIDANCE = 'ESTATE_ONBOARDING_GUIDANCE',
}

/**
 * Supported AI model provider adapters
 */
export enum AIProviderName {
  GEMINI = 'GEMINI',
  CLAUDE = 'CLAUDE',
  MOCK = 'MOCK',
}

/**
 * Processing status of an AI job
 */
export enum AITaskStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REJECTED_POLICY = 'REJECTED_POLICY',
}

/**
 * Permitted data classification levels for AI processing (ADR-009, Appendix I.1)
 */
export enum AIDataClassification {
  C0_PUBLIC = 'C0_PUBLIC',
  C1_INTERNAL = 'C1_INTERNAL',
  C2_PRIVATE_PERSONAL = 'C2_PRIVATE_PERSONAL',
  C3_HIGH_CONFIDENTIAL = 'C3_HIGH_CONFIDENTIAL',
}

/**
 * Custom error thrown when a non-allowlisted task is requested (AI-001)
 */
export class TaskNotAllowlistedError extends Error {
  public readonly taskName: string;

  constructor(taskName: string) {
    super(`Task '${taskName}' is not permitted. Only allowlisted AI tasks are allowed (AI-001).`);
    this.name = 'TaskNotAllowlistedError';
    this.taskName = taskName;
  }
}

/**
 * Custom error thrown when a prompt attempts to usurp human authority (AI-002)
 */
export class AIAuthorityViolationError extends Error {
  public readonly reason: string;

  constructor(reason: string) {
    super(`AI authority violation: ${reason}. AI models have zero decision authority (AI-002).`);
    this.name = 'AIAuthorityViolationError';
    this.reason = reason;
  }
}

/**
 * Set of allowlisted task names
 */
const ALLOWLISTED_TASKS = new Set<string>(Object.values(AITaskName));

/**
 * Prohibited high-risk action phrases that violate Invariant AI-002
 */
const PROHIBITED_AUTHORITY_PATTERNS: RegExp[] = [
  /\b(approve|authorize|grant)\s+(case|death|release)\b/i,
  /\bconfirm\s+death\b/i,
  /\bverify\s+death\b/i,
  /\bissue\s+release\s+grant\b/i,
  /\bdelete\s+(account|user|vault)\b/i,
  /\bpurge\s+(account|user|vault)\b/i,
  /\boverride\s+human\s+reviewer\b/i,
  /\bbypass\s+two[- ]person\b/i,
  /\blift\s+hold\b/i,
];

/**
 * Asserts that the task is in the explicit allowlist (AI-001)
 */
export function assertAllowedAITask(taskName: string): asserts taskName is AITaskName {
  if (!ALLOWLISTED_TASKS.has(taskName)) {
    throw new TaskNotAllowlistedError(taskName);
  }
}

/**
 * Asserts that the instruction/prompt does not attempt to confer authoritative decision-making
 * power to the AI model (AI-002, ADR-009).
 */
export function assertAILacksAuthority(instruction: string): void {
  for (const pattern of PROHIBITED_AUTHORITY_PATTERNS) {
    if (pattern.test(instruction)) {
      throw new AIAuthorityViolationError(
        `Prompt contains prohibited decision-making instruction matching pattern: ${pattern.source}`
      );
    }
  }
}
