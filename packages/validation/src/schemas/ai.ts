import { z } from 'zod';
import { AITaskName, AIProviderName, AITaskStatus } from '@portfolio-immortalized/domain';

// ==============================================================================
// 1. Document Classification Schemas (AI-01)
// ==============================================================================

export const DocumentClassificationInputSchema = z.object({
  assetId: z.string().optional(),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  textSnippet: z.string().max(4000).optional(),
  base64Preview: z.string().optional(),
});

export type DocumentClassificationInput = z.infer<typeof DocumentClassificationInputSchema>;

export const DocumentClassificationOutputSchema = z.object({
  suggestedCategory: z.enum(['WILL', 'IDENTITY', 'DOCUMENT', 'PHOTO', 'VIDEO', 'AUDIO', 'OTHER']),
  confidence: z.number().min(0).max(1),
  detectedDocumentType: z.string().min(1),
  rationale: z.string().min(1),
});

export type DocumentClassificationOutput = z.infer<typeof DocumentClassificationOutputSchema>;

// ==============================================================================
// 2. Blur & Legibility Assessment Schemas (AI-02)
// ==============================================================================

export const BlurLegibilityInputSchema = z.object({
  assetId: z.string().optional(),
  imageBase64: z.string().optional(),
  fileSizeBytes: z.number().nonnegative().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
});

export type BlurLegibilityInput = z.infer<typeof BlurLegibilityInputSchema>;

export const BlurLegibilityOutputSchema = z.object({
  isLegible: z.boolean(),
  blurScore: z.number().min(0).max(1), // 1.0 = crystal clear, 0.0 = completely blurred
  detectedResolution: z.string().optional(),
  recommendation: z.enum(['ACCEPT', 'RETAKE_BLURRY', 'RETAKE_POOR_LIGHTING', 'RETAKE_CROPPED']),
  feedback: z.string().min(1),
});

export type BlurLegibilityOutput = z.infer<typeof BlurLegibilityOutputSchema>;

// ==============================================================================
// 3. Metadata Extraction Schemas (AI-03)
// ==============================================================================

export const MetadataExtractionInputSchema = z.object({
  assetId: z.string().optional(),
  documentType: z.string().optional(),
  textSnippet: z.string().min(1).max(8000),
});

export type MetadataExtractionInput = z.infer<typeof MetadataExtractionInputSchema>;

export const MetadataExtractionOutputSchema = z.object({
  documentTitle: z.string().optional(),
  documentDate: z.string().optional(),
  issuingAuthority: z.string().optional(),
  jurisdiction: z.string().optional(),
  partiesMentioned: z.array(z.string()).default([]),
  referenceNumbers: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
});

export type MetadataExtractionOutput = z.infer<typeof MetadataExtractionOutputSchema>;

// ==============================================================================
// 4. Case Summary Drafting Schemas (AI-04)
// ==============================================================================

export const CaseSummaryInputSchema = z.object({
  caseId: z.string().min(1),
  deceasedName: z.string().min(1),
  evidenceItems: z.array(
    z.object({
      type: z.string(),
      issuingAuthority: z.string(),
      documentDate: z.string(),
      certificateNumber: z.string().optional(),
    })
  ).default([]),
  trusteeStatements: z.array(
    z.object({
      trusteeName: z.string(),
      date: z.string(),
      statement: z.string(),
    })
  ).default([]),
  timelineNotes: z.string().optional(),
});

export type CaseSummaryInput = z.infer<typeof CaseSummaryInputSchema>;

export const CaseSummaryOutputSchema = z.object({
  draftSummary: z.string().min(1),
  keyParties: z.object({
    deceased: z.string(),
    trustees: z.array(z.string()).default([]),
    beneficiaries: z.array(z.string()).default([]),
  }),
  evidenceChecklist: z.array(
    z.object({
      item: z.string(),
      verified: z.boolean(),
      discrepancyFlag: z.string().optional(),
    })
  ).default([]),
  criticalDiscrepancies: z.array(z.string()).default([]),
  suggestedNextSteps: z.array(z.string()).default([]),
  nonAuthoritativeDisclaimer: z.string().min(1),
});

export type CaseSummaryOutput = z.infer<typeof CaseSummaryOutputSchema>;

// ==============================================================================
// 5. Estate Onboarding Guidance Schemas (AI-05)
// ==============================================================================

export const EstateGuidanceInputSchema = z.object({
  question: z.string().min(2).max(1000),
  currentReadinessScore: z.number().min(0).max(100).optional(),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(2000),
    })
  ).optional(),
});

export type EstateGuidanceInput = z.infer<typeof EstateGuidanceInputSchema>;

export const EstateGuidanceOutputSchema = z.object({
  answer: z.string().min(1),
  suggestedActions: z.array(
    z.object({
      title: z.string(),
      route: z.string().optional(),
      reason: z.string(),
    })
  ).default([]),
  successionContextKenya: z.string().optional(),
  disclaimer: z.string().min(1),
});

export type EstateGuidanceOutput = z.infer<typeof EstateGuidanceOutputSchema>;

// ==============================================================================
// 6. Generic Execution & Job Query Schemas
// ==============================================================================

export const ExecuteAITaskSchema = z.object({
  taskName: z.nativeEnum(AITaskName),
  payload: z.record(z.any()),
  provider: z.nativeEnum(AIProviderName).optional(),
});

export type ExecuteAITaskRequest = z.infer<typeof ExecuteAITaskSchema>;

export const ListAIJobsSchema = z.object({
  taskName: z.string().optional(),
  status: z.nativeEnum(AITaskStatus).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export type ListAIJobsQuery = z.infer<typeof ListAIJobsSchema>;
