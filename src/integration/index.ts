import { PublicKey } from '@solana/web3.js';
import {
  ClaimType,
  CredentialInfo,
  RecommendedLTV,
  CreditTier,
} from '../types';
import { CREDIT_TIERS } from '../constants';
import { SolanaSDK } from '../solana';

export class ZKCreditIntegrationSDK {
  private solana: SolanaSDK;

  constructor(solana: SolanaSDK) {
    this.solana = solana;
  }

  async hasCredential(
    userAddress: string,
    claimType: ClaimType,
    threshold?: number
  ): Promise<boolean> {
    const user = new PublicKey(userAddress);
    return this.solana.verifier.hasValidCredential(
      user,
      claimType,
      threshold
    );
  }

  async getCreditTier(userAddress: string): Promise<CredentialInfo> {
    const user = new PublicKey(userAddress);
    return this.solana.verifier.getCreditTier(user);
  }

  async getRecommendedLTV(
    userAddress: string,
    _loanMint: string,
    _loanAmount: string
  ): Promise<RecommendedLTV> {
    const user = new PublicKey(userAddress);
    const info = await this.solana.verifier.getCreditTier(user);
    const tierConfig = CREDIT_TIERS[info.tier];

    return {
      ltvRatio: tierConfig.collateralRatio,
      maxLoanAmount: tierConfig.maxLoan,
      interestRateModifier: tierConfig.interestRateModifier,
    };
  }

  getVerifierInterface(): string {
    return JSON.stringify(
      {
        verifyAndIssueCredential: {
          type: 'function',
          inputs: [
            { name: 'proof', type: 'groth16_proof' },
            { name: 'claim', type: 'credit_claim' },
          ],
          outputs: [{ name: 'credentialAddress', type: 'publicKey' }],
        },
        hasValidCredential: {
          type: 'function',
          inputs: [
            { name: 'user', type: 'publicKey' },
            { name: 'claimType', type: 'u8' },
            { name: 'requiredThreshold', type: 'u64' },
          ],
          outputs: [{ name: 'valid', type: 'bool' }],
        },
      },
      null,
      2
    );
  }

  getVerifierAddress(): string {
    return this.solana.verifier.programId.toBase58();
  }
}
