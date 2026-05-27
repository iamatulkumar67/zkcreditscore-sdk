import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import {
  PublicKey,
  TransactionSignature,
} from '@solana/web3.js';
import { CreditTier, LoanTerms, LoanRecord } from '../../types';
import { SOLANA_PROGRAM_ID } from '../../constants';
import {
  deriveLoanPda,
  deriveLendingPoolPda,
  deriveVaultPda,
  deriveConfigPda,
  deriveCredentialPda,
} from '../utils';

export class LendingPoolClient {
  private program: Program;
  private provider: AnchorProvider;

  constructor(provider: AnchorProvider, idl?: Idl) {
    this.provider = provider;
    const programId = new PublicKey(SOLANA_PROGRAM_ID.lendingPool);
    this.program = new Program(idl || ({} as Idl), programId, provider);
  }

  get programId(): PublicKey {
    return this.program.programId;
  }

  async getCollateralRatio(
    user: PublicKey,
    borrowMint: PublicKey
  ): Promise<{ ratio: number; maxBorrow: string }> {
    const [credentialPda] = deriveCredentialPda(user);
    const [poolPda] = deriveLendingPoolPda(borrowMint);

    try {
      const poolAccount = await this.program.account.lendingPool.fetch(
        poolPda
      ) as any;
      const credentialExists = await this.provider.connection.getAccountInfo(
        credentialPda
      );

      if (credentialExists) {
        const credAccount = await this.program.account.credential.fetch(
          credentialPda
        ) as any;
        const tier: CreditTier = credAccount.creditTier || CreditTier.None;
        const tierRatios: Record<CreditTier, number> = {
          [CreditTier.None]: 15000,
          [CreditTier.Basic]: 11000,
          [CreditTier.Good]: 8000,
          [CreditTier.Excellent]: 6000,
          [CreditTier.Premium]: 5000,
        };
        return {
          ratio: tierRatios[tier] || 15000,
          maxBorrow: (poolAccount.maxLoanAmount?.toString() || '50000'),
        };
      }

      return {
        ratio: 15000,
        maxBorrow: '50000',
      };
    } catch {
      return {
        ratio: 15000,
        maxBorrow: '50000',
      };
    }
  }

  async depositAndBorrow(
    collateralMint: PublicKey,
    collateralAmount: number,
    borrowMint: PublicKey,
    borrowAmount: number
  ): Promise<TransactionSignature> {
    const user = this.provider.publicKey!;
    const [poolPda] = deriveLendingPoolPda(borrowMint);
    const [collateralVault] = deriveVaultPda(collateralMint);
    const [borrowVault] = deriveVaultPda(borrowMint);

    const tx = await this.program.methods
      .depositAndBorrow(
        BigInt(collateralAmount),
        BigInt(borrowAmount)
      )
      .accounts({
        user: user,
        collateralMint: collateralMint,
        borrowMint: borrowMint,
        pool: poolPda,
        collateralVault: collateralVault,
        borrowVault: borrowVault,
        tokenProgram: PublicKey.default,
        systemProgram: PublicKey.default,
      })
      .rpc();

    return tx;
  }

  async repay(
    loanId: number,
    amount: number
  ): Promise<TransactionSignature> {
    const user = this.provider.publicKey!;
    const [loanPda] = deriveLoanPda(user, loanId);

    const tx = await this.program.methods
      .repay(BigInt(amount))
      .accounts({
        user: user,
        loan: loanPda,
      })
      .rpc();

    return tx;
  }

  async liquidate(
    borrower: PublicKey,
    _collateralMint: PublicKey,
    _debtMint: PublicKey,
    debtToCover: number
  ): Promise<TransactionSignature> {
    const liquidator = this.provider.publicKey!;
    const [loanPda] = deriveLoanPda(borrower, 0);

    const tx = await this.program.methods
      .liquidate(BigInt(debtToCover))
      .accounts({
        liquidator: liquidator,
        borrower: borrower,
        loan: loanPda,
      })
      .rpc();

    return tx;
  }

  async getUtilizationRate(asset: PublicKey): Promise<number> {
    const [poolPda] = deriveLendingPoolPda(asset);
    try {
      const pool = await this.program.account.lendingPool.fetch(poolPda) as any;
      const totalDeposits = Number(pool.totalDeposits);
      const totalBorrows = Number(pool.totalBorrows);
      if (totalDeposits === 0) return 0;
      return (totalBorrows / totalDeposits) * 100;
    } catch {
      return 0;
    }
  }

  async getBorrowRate(asset: PublicKey): Promise<number> {
    const utilRate = await this.getUtilizationRate(asset);
    const optimal = 80;
    const baseRate = 2;
    const slope1 = 8;
    const slope2 = 75;

    if (utilRate <= optimal) {
      return baseRate + (utilRate / optimal) * slope1;
    }
    const excessUtil = utilRate - optimal;
    const maxUtil = 100;
    return (
      baseRate +
      slope1 +
      (excessUtil / (maxUtil - optimal)) * (slope2 - slope1)
    );
  }
}
