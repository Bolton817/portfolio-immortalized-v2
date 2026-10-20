import { AITaskName, AIProviderName } from '@portfolio-immortalized/domain';
import { BaseAIProvider } from './base.js';
import { AIProviderResponse, AITaskExecutionOptions } from '../types.js';
import {
  buildDocumentClassificationPrompt,
  buildBlurLegibilityPrompt,
  buildMetadataExtractionPrompt,
  buildCaseSummaryPrompt,
  buildEstateGuidancePrompt,
} from '../prompts/templates.js';

export class ClaudeProvider extends BaseAIProvider {
  public readonly name = AIProviderName.CLAUDE;
  private apiKey?: string;
  private modelId: string;

  constructor(apiKey?: string, modelId = 'claude-3-5-sonnet-20241022') {
    super();
    this.apiKey = apiKey || process.env.CLAUDE_API_KEY;
    this.modelId = modelId;
  }

  public get isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  public async executeTask<TInput, TOutput>(
    task: AITaskName,
    input: TInput,
    options?: AITaskExecutionOptions
  ): Promise<AIProviderResponse<TOutput>> {
    if (!this.isConfigured) {
      throw new Error('Claude API key is not configured.');
    }

    const { system, user } = this.buildPromptForTask(task, input);
    const temperature = options?.temperature ?? (task === AITaskName.ESTATE_ONBOARDING_GUIDANCE ? 0.4 : 0.1);
    const maxTokens = options?.maxTokens ?? 2048;

    const endpoint = 'https://api.anthropic.com/v1/messages';

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.modelId,
        max_tokens: maxTokens,
        temperature,
        system: options?.systemPromptOverride || system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API error (status ${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    const rawContent = data.content?.[0]?.text;
    if (!rawContent) {
      throw new Error('Claude API returned empty message content.');
    }

    const cleaned = this.cleanJsonResponse(rawContent);
    const parsed = JSON.parse(cleaned) as TOutput;
    const tokenCount = ((data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)) || 250;

    return {
      output: parsed,
      tokenCount,
      modelId: this.modelId,
      rawOutput: cleaned,
    };
  }

  private buildPromptForTask(task: AITaskName, input: any): { system: string; user: string } {
    switch (task) {
      case AITaskName.DOCUMENT_CLASSIFICATION:
        return buildDocumentClassificationPrompt(input.fileName, input.mimeType, input.textSnippet);
      case AITaskName.BLUR_LEGIBILITY_ASSESSMENT:
        return buildBlurLegibilityPrompt(input.width, input.height, input.fileSizeBytes);
      case AITaskName.METADATA_EXTRACTION:
        return buildMetadataExtractionPrompt(input.documentType, input.textSnippet);
      case AITaskName.CASE_SUMMARY_DRAFTING:
        return buildCaseSummaryPrompt(input);
      case AITaskName.ESTATE_ONBOARDING_GUIDANCE:
        return buildEstateGuidancePrompt(input.question, input.currentReadinessScore);
      default:
        throw new Error(`Unsupported Claude task: ${task}`);
    }
  }
}
