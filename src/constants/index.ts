import { CreditTier, TierConfig, ClaimType, LendingPoolInfo } from '../types';

export const PROTOCOL_NAME = 'ZKCreditScore';
export const PROTOCOL_VERSION = '0.1.0';
export const SDK_VERSION = '0.1.0';

export const SOLANA_PROGRAM_ID = {
  verifier: '9fx3329hTirtrGA77bQ3qTQMHgkcYbiMJTSbY1kSK1Kh',
  lendingPool: 'HbHw6ib3eCfxbV1tv7X817VZ9J9tR4ZLGpNEQJ2jYDQo',
  zkcToken: 'AdeWp5SXbwMtb3Mr9FTfpygPGzHoTdGqxAu3EKmmXRTQ',
  governance: '4FE94XY5Az6fS2PCBxd2PZtzPq5EiXYT5EFPzYj53QkT',
};

export const CREDIT_TIERS: Record<CreditTier, TierConfig> = {
  [CreditTier.None]: {
    tier: CreditTier.None,
    label: 'No Credential',
    minScore: 0,
    collateralRatio: 15000,
    maxLoan: '50000',
    interestRateModifier: 0,
    requirements: [],
  },
  [CreditTier.Basic]: {
    tier: CreditTier.Basic,
    label: 'Basic',
    minScore: 650,
    collateralRatio: 11000,
    maxLoan: '100000',
    interestRateModifier: -200,
    requirements: ['Credit score > 650'],
  },
  [CreditTier.Good]: {
    tier: CreditTier.Good,
    label: 'Good',
    minScore: 700,
    collateralRatio: 8000,
    maxLoan: '250000',
    interestRateModifier: -400,
    requirements: ['Credit score > 700', 'Income proof verified'],
  },
  [CreditTier.Excellent]: {
    tier: CreditTier.Excellent,
    label: 'Excellent',
    minScore: 750,
    collateralRatio: 6000,
    maxLoan: '500000',
    interestRateModifier: -600,
    requirements: ['Credit score > 750', 'Income proof verified', 'DTI < 30%'],
  },
  [CreditTier.Premium]: {
    tier: CreditTier.Premium,
    label: 'Premium',
    minScore: 800,
    collateralRatio: 5000,
    maxLoan: '1000000',
    interestRateModifier: -800,
    requirements: [
      'Credit score > 800',
      'Income proof verified',
      'DTI < 30%',
      'No defaults in 5 years',
      'Multi-source verification',
    ],
  },
};

export const TIER_DISCOUNTS: Record<CreditTier, number> = {
  [CreditTier.None]: 0,
  [CreditTier.Basic]: 200,
  [CreditTier.Good]: 400,
  [CreditTier.Excellent]: 600,
  [CreditTier.Premium]: 800,
};

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  [ClaimType.CREDIT_SCORE_ABOVE]: 'Credit Score Above Threshold',
  [ClaimType.MONTHLY_INCOME_ABOVE]: 'Monthly Income Above Threshold',
  [ClaimType.DTI_BELOW]: 'Debt-to-Income Ratio Below Threshold',
  [ClaimType.NO_DEFAULT_LAST_N_YEARS]: 'No Defaults in Last N Years',
  [ClaimType.EMPLOYMENT_STATUS]: 'Employment Status Verification',
  [ClaimType.COMPOSITE_TIER]: 'Composite Credit Tier',
};

export const DEFAULT_LENDING_POOLS: LendingPoolInfo[] = [
  {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    totalDeposits: '0',
    totalBorrows: '0',
    utilizationRate: 0,
    borrowApy: 5,
    supplyApy: 3,
    baseRate: 200,
  },
  {
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    totalDeposits: '0',
    totalBorrows: '0',
    utilizationRate: 0,
    borrowApy: 5.5,
    supplyApy: 3.2,
    baseRate: 200,
  },
  {
    mint: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    totalDeposits: '0',
    totalBorrows: '0',
    utilizationRate: 0,
    borrowApy: 6,
    supplyApy: 3.5,
    baseRate: 200,
  },
];

export const KINK_MODEL = {
  baseRate: 200,
  optimalUtilization: 80,
  slope1: 800,
  slope2: 7500,
  minRate: 50,
};

export const CREDENTIAL_EXPIRY_DEFAULT = 30 * 24 * 60 * 60;
export const CREDENTIAL_RENEWAL_NOTICE = 7 * 24 * 60 * 60;
export const MAX_PROOF_SIZE = 5120;
export const MAX_PROOF_GENERATION_TIME = 30000;
export const LIQUIDATION_THRESHOLD_OFFSET = 500;
export const LIQUIDATION_BONUS = 500;
export const INSURANCE_FUND_FEE = 500;

export const NETWORK_URLS: Record<string, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  'localnet': 'http://127.0.0.1:8899',
};

export const ACCOUNT_SEEDS = {
  credential: 'credential',
  loan: 'loan',
  lendingPool: 'lending-pool',
  config: 'config',
  nullifier: 'nullifier',
  mintAuthority: 'mint-authority',
  vaultAuthority: 'vault-authority',
  stake: 'stake',
  stakingVault: 'staking-vault',
  treasury: 'treasury',
  governanceConfig: 'governance-config',
  governancePda: 'governance-pda',
  proposal: 'proposal',
};

export const ZKC_DECIMALS = 9;
export const ZKC_MIN_STAKE = 1_000_000_000_000;
export const ZKC_TOTAL_SUPPLY = '1000000000000000000';
export const STAKING_REWARD_RATE_BPS = 500;
export const SECONDS_IN_YEAR = 31_536_000;
export const FEE_DISCOUNT_TIERS = [
  { minStake: 0, discount: 0 },
  { minStake: 10_000_000_000_000, discount: 1000 },
  { minStake: 100_000_000_000_000, discount: 2000 },
  { minStake: 500_000_000_000_000, discount: 2500 },
  { minStake: 1_000_000_000_000_000, discount: 3000 },
];
