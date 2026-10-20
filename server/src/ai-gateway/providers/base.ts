import { AITaskName, AIProviderName } from '@portfolio-immortalized/domain';
import { AIProviderAdapter, AIProviderResponse, AITaskExecutionOptions } from '../types.js';

export abstract class BaseAIProvider implements AIProviderAdapter {
  public abstract readonly name: AIProviderName;
  public abstract readonly isConfigured: boolean;

  public abstract executeTask<TInput, TOutput>(
    task: AITaskName,
    input: TInput,
    options?: AITaskExecutionOptions
  ): Promise<AIProviderResponse<TOutput>>;

  protected cleanJsonResponse(raw: string): string {
    // Strip markdown code block wrappers if present (e.g. ```json ... ```)
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    return cleaned.trim();
  }
}
