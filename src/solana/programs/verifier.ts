import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor';
import { PublicKey, TransactionSignature, SystemProgram } from '@solana/web3.js';
import { ZKProof, CreditTier, CredentialInfo, ClaimType } from '../../types';
import { SOLANA_PROGRAM_ID } from '../../constants';
import { deriveCredentialPda, deriveNullifierPda, deriveConfigPda } from '../utils';

// Nullifier on-chain is stored as a PDA seed (32 bytes), not as a PublicKey address.
// The nullifier bytes are passed directly as the instruction argument.
function parseNullifierBytes(nullifierHex: string): number[] {
  const hex = nullifierHex.startsWith('0x') ? nullifierHex.slice(2) : nullifierHex;
  const padded = hex.padStart(64, '0').slice(0, 64);
  const bytes: number[] = [];
  for (let i = 0; i < padded.length; i += 2) {
    bytes.push(parseInt(padded.slice(i, i + 2), 16));
  }
  return bytes;
}

export class ZKVerifierClient {
  private program: Program;
  private provider: AnchorProvider;

  constructor(provider: AnchorProvider, idl?: Idl) {
    this.provider = provider;
    const programId = new PublicKey(SOLANA_PROGRAM_ID.verifier);
    const programIdl: Idl = idl || {
      address: programId.toBase58(),
      metadata: { name: 'zk-credit-verifier', version: '0.1.0', spec: '0.1.0' },
      instructions: [],
    };
    this.program = new Program(programIdl, provider);
  }

  get programId(): PublicKey {
    return this.program.programId;
  }

  async verifyAndIssueCredential(
    proof: ZKProof,
    owner?: PublicKey
  ): Promise<TransactionSignature> {
    const user = owner || this.provider.publicKey!;
    const [credentialPda] = deriveCredentialPda(user);

    const nullifierBytes = parseNullifierBytes(proof.publicSignals.nullifier);
    const nullifierKey = new PublicKey(nullifierBytes.slice(0, 32));
    const [nullifierPda] = deriveNullifierPda(nullifierKey);

    const claimType = proof.publicSignals.claimType;
    const threshold = new BN(proof.publicSignals.threshold);
    const expiry = new BN(proof.publicSignals.expiryTimestamp);

    const tx = await this.program.methods
      .verifyAndIssueCredential(
        {
          piA: proof.proof.pi_a,
          piB: proof.proof.pi_b,
          piC: proof.proof.pi_c,
        },
        {
          claimType,
          threshold,
          expiry,
          nullifier: nullifierBytes.slice(0, 32),
        }
      )
      .accounts({
        user,
        credential: credentialPda,
        nullifier: nullifierPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async hasValidCredential(
    user: PublicKey,
    claimType: ClaimType,
    requiredThreshold?: number
  ): Promise<boolean> {
    const [credentialPda] = deriveCredentialPda(user);
    try {
      const account = await (this.program.account as any).credential.fetch(credentialPda);
      const data = account as any;
      const now = Math.floor(Date.now() / 1000);

      if (data.expiresAt.toNumber() < now) return false;

      const claimBit = 1 << claimType;
      if ((data.claimsBitmap & claimBit) === 0) return false;

      if (requiredThreshold && data.threshold.toNumber() < requiredThreshold) return false;

      return true;
    } catch {
      return false;
    }
  }

  async getCreditTier(user: PublicKey): Promise<CredentialInfo> {
    const [credentialPda] = deriveCredentialPda(user);
    try {
      const account = await (this.program.account as any).credential.fetch(credentialPda);
      const data = account as any;
      const now = Math.floor(Date.now() / 1000);

      return {
        tier: (data.creditTier as CreditTier) || CreditTier.None,
        expiresAt: new Date(data.expiresAt.toNumber() * 1000),
        claims: [data.claimType as ClaimType],
        isValid: data.expiresAt.toNumber() > now,
      };
    } catch {
      return {
        tier: CreditTier.None,
        expiresAt: new Date(0),
        claims: [],
        isValid: false,
      };
    }
  }

  async revokeCredential(user: PublicKey): Promise<TransactionSignature> {
    const [credentialPda] = deriveCredentialPda(user);
    const tx = await this.program.methods
      .revokeCredential()
      .accounts({ user, credential: credentialPda })
      .rpc();

    return tx;
  }
}
