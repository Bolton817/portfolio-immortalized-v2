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

export class GeminiProvider extends BaseAIProvider {
  public readonly name = AIProviderName.GEMINI;
  private apiKey?: string;
  private modelId: string;

  constructor(apiKey?: string, modelId = 'gemini-1.5-flash') {
    super();
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
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
      throw new Error('Gemini API key is not configured.');
    }

    const { system, user } = this.buildPromptForTask(task, input);
    const temperature = options?.temperature ?? (task === AITaskName.ESTATE_ONBOARDING_GUIDANCE ? 0.4 : 0.1);
    const maxTokens = options?.maxTokens ?? 2048;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelId}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: options?.systemPromptOverride || system }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: user }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature,
        maxOutputTokens: maxTokens,
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (status ${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      throw new Error('Gemini API returned empty candidate response.');
    }

    const cleaned = this.cleanJsonResponse(rawContent);
    const parsed = JSON.parse(cleaned) as TOutput;
    const tokenCount = (data.usageMetadata?.totalTokenCount as number) || 200;

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
        throw new Error(`Unsupported Gemini task: ${task}`);
    }
  }
}
