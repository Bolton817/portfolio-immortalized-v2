import { z } from 'zod';
import { MaritalStatus, BequestCategory, WillStatus } from '@portfolio-immortalized/domain';

export const ExecutorNominationSchema = z.object({
  fullName: z.string().min(2, 'Executor full name is required'),
  nationalIdNumber: z.string().min(5, 'Valid national ID number is required'),
  relationship: z.string().min(2, 'Relationship is required'),
  email: z.string().email().optional(),
  phoneNumber: z.string().min(9, 'Phone number is required'),
  address: z.string().min(3, 'Physical or postal address is required'),
  isAlternate: z.boolean().default(false),
});

export const GuardianNominationSchema = z.object({
  fullName: z.string().min(2, 'Guardian full name is required'),
  nationalIdNumber: z.string().min(5, 'Valid national ID is required'),
  relationship: z.string().min(2, 'Relationship is required'),
  phoneNumber: z.string().min(9, 'Phone number is required'),
  minorChildrenNames: z.array(z.string().min(2)).min(1, 'At least one minor child must be designated'),
});

export const SpecificBequestSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.nativeEnum(BequestCategory),
  assetDescription: z.string().min(3, 'Asset description is required'),
  identifierOrTitleNumber: z.string().optional(),
  beneficiaryName: z.string().min(2, 'Beneficiary name is required'),
  beneficiaryNationalId: z.string().optional(),
  relationship: z.string().min(2, 'Relationship is required'),
  conditionsOrInstructions: z.string().optional(),
});

export const ResiduaryShareSchema = z.object({
  beneficiaryName: z.string().min(2, 'Beneficiary name is required'),
  beneficiaryNationalId: z.string().optional(),
  relationship: z.string().min(2, 'Relationship is required'),
  sharePercentage: z.number().min(1).max(100),
});

export const WitnessNominationSchema = z.object({
  fullName: z.string().min(2, 'Witness full name is required'),
  nationalIdNumber: z.string().min(5, 'Witness national ID is required'),
  address: z.string().min(3, 'Witness address is required'),
  occupation: z.string().min(2, 'Witness occupation is required'),
  phoneNumber: z.string().optional(),
});

export const PhysicalCustodySchema = z.object({
  custodyType: z.enum(['SAFE_DEPOSIT_BOX', 'ADVOCATE_OFFICE', 'HIGH_COURT_REGISTRY', 'HOME_SAFE']),
  institutionName: z.string().min(2, 'Institution name is required'),
  referenceOrBoxNumber: z.string().min(1, 'Box or safe reference is required'),
  advocateName: z.string().optional(),
  advocatePhone: z.string().optional(),
  advocateFirm: z.string().optional(),
  depositDate: z.coerce.date(),
  notes: z.string().optional(),
});

export const CreateWillDraftSchema = z.object({
  testatorFullName: z.string().min(2, 'Testator full legal name is required'),
  testatorNationalId: z.string().min(5, 'Testator national ID number is required'),
  testatorDomicile: z.string().min(3, 'Domicile / residence is required'),
  maritalStatus: z.nativeEnum(MaritalStatus),
  revocationOfPriorWills: z.boolean().default(true),
  executors: z.array(ExecutorNominationSchema).min(1, 'At least one primary executor is required'),
  guardians: z.array(GuardianNominationSchema).default([]),
  specificBequests: z.array(SpecificBequestSchema).default([]),
  residuaryShares: z.array(ResiduaryShareSchema).min(1, 'At least one residuary share recipient is required'),
  digitalVaultInstructions: z.string().optional(),
  witnesses: z.array(WitnessNominationSchema).max(3).default([]),
  physicalCustody: PhysicalCustodySchema.optional(),
});

export const UpdateWillDraftSchema = CreateWillDraftSchema.partial().extend({
  status: z.nativeEnum(WillStatus).optional(),
});
