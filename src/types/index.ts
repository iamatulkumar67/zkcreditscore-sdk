export enum ClaimType {
  CREDIT_SCORE_ABOVE = 0,
  MONTHLY_INCOME_ABOVE = 1,
  DTI_BELOW = 2,
  NO_DEFAULT_LAST_N_YEARS = 3,
  EMPLOYMENT_STATUS = 4,
  COMPOSITE_TIER = 5,
}

export enum CreditTier {
  None = 0,
  Basic = 1,
  Good = 2,
  Excellent = 3,
  Premium = 4,
}

export enum EmploymentStatus {
  Employed = 0,
  SelfEmployed = 1,
  BusinessOwner = 2,
}

export interface ZKProof {
  proof: {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
    protocol: 'groth16';
    curve: 'bn128';
  };
  publicSignals: {
    addressCommitment: string;
    claimType: number;
    threshold: string;
    nullifier: string;
    expiryTimestamp: string;
    circuitVersion: string;
  };
  metadata: {
    generatedAt: number;
    circuitId: string;
    proverVersion: string;
  };
}

export interface ClaimRequest {
  type: ClaimType;
  threshold: number;
  dataSourceId: string;
}

export interface CreditCredential {
  tokenId: string;
  owner: string;
  credentialHash: string;
  creditTier: CreditTier;
  claimsBitmap: number;
  issuedAt: number;
  expiresAt: number;
  issuer: string;
}

export interface TierConfig {
  tier: CreditTier;
  label: string;
  minScore: number;
  collateralRatio: number;
  maxLoan: string;
  interestRateModifier: number;
  requirements: string[];
}

export interface LoanTerms {
  borrower: string;
  collateralMint: string;
  collateralAmount: string;
  borrowMint: string;
  borrowAmount: string;
  interestRate: number;
  collateralRatio: number;
  creditTier: CreditTier;
  startTimestamp: number;
  maturityTimestamp: number;
}

export interface LoanRecord {
  loanId: string;
  borrower: string;
  collateral: {
    mint: string;
    amount: string;
    valueUsd: string;
  };
  borrowed: {
    mint: string;
    amount: string;
    interestRate: number;
  };
  terms: {
    collateralRatio: number;
    liquidationThreshold: number;
    creditTierAtIssuance: CreditTier;
    maturityTimestamp: number;
  };
  status: 'active' | 'repaid' | 'liquidated';
  repaidAmount: string;
  createdAt: number;
  lastUpdateAt: number;
}

export interface DataSourceConfig {
  source: 'account-aggregator' | 'plaid' | 'pdf-upload';
  apiKey?: string;
  environment?: 'sandbox' | 'production';
}

export interface DataConnectionResult {
  connectionId: string;
  source: string;
  connectedAt: number;
  verified: boolean;
}

export interface ProverConfig {
  circuitsUrl: string;
  backendUrl?: string;
}

export interface ProofSubmissionResult {
  signature: string;
  slot: number;
  credentialAddress?: string;
}

export interface CredentialInfo {
  tier: CreditTier;
  expiresAt: Date;
  claims: ClaimType[];
  isValid: boolean;
}

export interface RecommendedLTV {
  ltvRatio: number;
  maxLoanAmount: string;
  interestRateModifier: number;
}

export interface ProtocolStats {
  totalCredentials: number;
  activeLoans: number;
  totalTvlUsd: string;
  averageCreditTier: number;
  loanOriginationVolume: string;
  defaultRate: number;
}

export interface LendingPoolInfo {
  mint: string;
  symbol: string;
  totalDeposits: string;
  totalBorrows: string;
  utilizationRate: number;
  borrowApy: number;
  supplyApy: number;
  baseRate: number;
}
