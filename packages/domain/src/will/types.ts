/**
 * Domain Types for Interactive Statutory Will Builder (Kenya Law of Succession Act Cap. 160)
 * References: TDD Appendix A (OD-20), Kenya Law of Succession Act (Cap. 160 Sections 11, 13, 21)
 */

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  WIDOWED = 'WIDOWED',
  DIVORCED = 'DIVORCED',
}

export enum BequestCategory {
  REAL_ESTATE = 'REAL_ESTATE', // Land parcels, Title deeds
  FINANCIAL = 'FINANCIAL',     // Bank accounts, SACCOs, M-Pesa, Shares
  CHATTELS = 'CHATTELS',       // Motor vehicles, jewelry, personal effects
  DIGITAL_VAULT = 'DIGITAL_VAULT', // Portfolio Immortalized encrypted vault assets
  BUSINESS = 'BUSINESS',       // Company shares, partnerships
}

export interface ExecutorNomination {
  fullName: string;
  nationalIdNumber: string;
  relationship: string;
  email?: string;
  phoneNumber: string;
  address: string;
  isAlternate: boolean;
}

export interface GuardianNomination {
  fullName: string;
  nationalIdNumber: string;
  relationship: string;
  phoneNumber: string;
  minorChildrenNames: string[];
}

export interface SpecificBequest {
  id: string;
  category: BequestCategory;
  assetDescription: string;
  identifierOrTitleNumber?: string; // e.g. "Title No. NAIROBI/BLOCK 104/KE"
  beneficiaryName: string;
  beneficiaryNationalId?: string;
  relationship: string;
  conditionsOrInstructions?: string;
}

export interface ResiduaryShare {
  beneficiaryName: string;
  beneficiaryNationalId?: string;
  relationship: string;
  sharePercentage: number; // e.g. 50%
}

export interface WitnessNomination {
  fullName: string;
  nationalIdNumber: string;
  address: string;
  occupation: string;
  phoneNumber?: string;
}

export enum WillStatus {
  DRAFT = 'DRAFT',
  READY_FOR_EXECUTION = 'READY_FOR_EXECUTION',
  EXECUTED_DEPOSITED = 'EXECUTED_DEPOSITED',
}

export interface PhysicalCustodyRecord {
  custodyType: 'SAFE_DEPOSIT_BOX' | 'ADVOCATE_OFFICE' | 'HIGH_COURT_REGISTRY' | 'HOME_SAFE';
  institutionName: string;
  referenceOrBoxNumber: string;
  advocateName?: string;
  advocatePhone?: string;
  advocateFirm?: string;
  depositDate: Date;
  notes?: string;
}

export interface WillDocument {
  id: string;
  userId: string;
  version: number;
  testatorFullName: string;
  testatorNationalId: string;
  testatorDomicile: string;
  maritalStatus: MaritalStatus;
  revocationOfPriorWills: boolean;
  executors: ExecutorNomination[];
  guardians: GuardianNomination[];
  specificBequests: SpecificBequest[];
  residuaryShares: ResiduaryShare[];
  digitalVaultInstructions?: string;
  witnesses: WitnessNomination[];
  status: WillStatus;
  physicalCustody?: PhysicalCustodyRecord;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttestationClause {
  jurisdiction: string;
  statutoryReference: string; // "Section 11, Kenya Law of Succession Act (Cap. 160)"
  testatorSignatureBlock: string;
  witnessAttestationStatement: string;
  statutoryDisqualificationsNotice: string; // Section 13 warning (beneficiaries cannot be witnesses)
}
