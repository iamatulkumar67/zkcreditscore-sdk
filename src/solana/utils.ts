import { PublicKey } from '@solana/web3.js';
import { ACCOUNT_SEEDS, SOLANA_PROGRAM_ID } from '../constants';

export function deriveCredentialPda(
  owner: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ACCOUNT_SEEDS.credential), owner.toBuffer()],
    new PublicKey(SOLANA_PROGRAM_ID.verifier)
  );
}

export function deriveLoanPda(
  borrower: PublicKey,
  loanId: number
): [PublicKey, number] {
  const loanIdBuf = Buffer.alloc(8);
  loanIdBuf.writeBigUint64LE(BigInt(loanId));
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(ACCOUNT_SEEDS.loan),
      borrower.toBuffer(),
      loanIdBuf,
    ],
    new PublicKey(SOLANA_PROGRAM_ID.lendingPool)
  );
}

export function deriveNullifierPda(
  nullifier: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ACCOUNT_SEEDS.nullifier), nullifier.toBuffer()],
    new PublicKey(SOLANA_PROGRAM_ID.verifier)
  );
}

export function deriveLendingPoolPda(
  mint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ACCOUNT_SEEDS.lendingPool), mint.toBuffer()],
    new PublicKey(SOLANA_PROGRAM_ID.lendingPool)
  );
}

export function deriveVaultPda(
  mint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ACCOUNT_SEEDS.vault), mint.toBuffer()],
    new PublicKey(SOLANA_PROGRAM_ID.lendingPool)
  );
}

export function deriveConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ACCOUNT_SEEDS.config)],
    new PublicKey(SOLANA_PROGRAM_ID.lendingPool)
  );
}

export function toBasisPoints(percentage: number): number {
  return Math.round(percentage * 100);
}

export function fromBasisPoints(basisPoints: number): number {
  return basisPoints / 100;
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1e9;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * 1e9);
}
