import { AITaskName, AIProviderName, AITaskStatus } from '@portfolio-immortalized/domain';

export interface AITaskExecutionOptions {
  temperature?: number;
  timeoutMs?: number;
  maxTokens?: number;
  systemPromptOverride?: string;
}

export interface AIProviderResponse<T = unknown> {
  output: T;
  tokenCount: number;
  modelId: string;
  rawOutput?: string;
}

export interface AIProviderAdapter {
  readonly name: AIProviderName;
  readonly isConfigured: boolean;
  executeTask<TInput, TOutput>(
    task: AITaskName,
    input: TInput,
    options?: AITaskExecutionOptions
  ): Promise<AIProviderResponse<TOutput>>;
}

export interface AIGatewayJobRecord {
  id: string;
  taskName: string;
  purpose: string;
  dataClass: string;
  provider: string;
  modelId: string;
  status: string;
  tokenCount?: number | null;
  latencyMs?: number | null;
  createdAt: Date;
}

export interface AIGatewayResult<T = unknown> {
  jobId: string;
  taskName: AITaskName;
  provider: AIProviderName;
  modelId: string;
  output: T;
  tokenCount: number;
  latencyMs: number;
  status: AITaskStatus;
}
