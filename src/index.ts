export { ZKProver } from './prover';
export { SolanaSDK } from './solana';
export type { SolanaSDKConfig } from './solana';
export { ZKVerifierClient } from './solana/programs/verifier';
export { LendingPoolClient } from './solana/programs/lendingPool';
export { ZKCTokenClient } from './solana/programs/token';
export { ZKCreditAPI } from './api';
export type { APIClientConfig } from './api';
export { ZKCreditIntegrationSDK } from './integration';

export { PlaidConnector, AccountAggregatorConnector, PDFBankStatementParser } from './connectors';
export type {
  PlaidConnectConfig,
  PlaidTransaction,
  PlaidIncomeData,
  PlaidCreditScoreData,
  AConnectConfig,
  AAHeldAccount,
  AAStandingInstruction,
  AATransaction,
  AACreditReport,
  ParsedStatement,
  PDFTransaction,
  PDFMetrics,
} from './connectors';

export * from './types';
export * from './constants';
export {
  deriveCredentialPda,
  deriveLoanPda,
  deriveNullifierPda,
  deriveLendingPoolPda,
  deriveVaultPda,
  deriveConfigPda,
  toBasisPoints,
  fromBasisPoints,
  lamportsToSol,
  solToLamports,
} from './solana/utils';
