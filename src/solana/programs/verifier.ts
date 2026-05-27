import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import { PublicKey, TransactionSignature } from '@solana/web3.js';
import { ZKProof, CreditTier, CredentialInfo, ClaimType } from '../../types';
import { SOLANA_PROGRAM_ID } from '../../constants';
import {
  deriveCredentialPda,
  deriveNullifierPda,
} from '../utils';

export class ZKVerifierClient {
  private program: Program;
  private provider: AnchorProvider;

  constructor(provider: AnchorProvider, idl?: Idl) {
    this.provider = provider;
    const programId = new PublicKey(SOLANA_PROGRAM_ID.verifier);
    this.program = new Program(idl || ({} as Idl), programId, provider);
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
    const nullifierPubkey = new PublicKey(
      proof.publicSignals.nullifier.slice(0, 32)
    );
    const [nullifierPda] = deriveNullifierPda(nullifierPubkey);

    const tx = await this.program.methods
      .verifyAndIssueCredential(
        {
          piA: proof.proof.pi_a,
          piB: proof.proof.pi_b,
          piC: proof.proof.pi_c,
        },
        {
          claimType: proof.publicSignals.claimType,
          threshold: BigInt(proof.publicSignals.threshold),
          expiry: BigInt(proof.publicSignals.expiryTimestamp),
          nullifier: Array.from(nullifierPubkey.toBytes()),
        }
      )
      .accounts({
        user: user,
        credential: credentialPda,
        nullifier: nullifierPda,
        systemProgram: PublicKey.default,
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
      const account = await this.program.account.credential.fetch(
        credentialPda
      );
      const data = account as any;
      const now = Math.floor(Date.now() / 1000);

      if (data.expiresAt.toNumber() < now) return false;
      if (data.claimType !== claimType) return false;
      if (requiredThreshold && data.threshold < requiredThreshold)
        return false;

      return true;
    } catch {
      return false;
    }
  }

  async getCreditTier(user: PublicKey): Promise<CredentialInfo> {
    const [credentialPda] = deriveCredentialPda(user);
    try {
      const account = await this.program.account.credential.fetch(
        credentialPda
      );
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
      .accounts({
        user: user,
        credential: credentialPda,
      })
      .rpc();
    return tx;
  }
}
