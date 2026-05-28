import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor';
import {
  PublicKey,
  TransactionSignature,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { SOLANA_PROGRAM_ID, ZKC_TOTAL_SUPPLY } from '../../constants';
import { StakeAccount } from '../../types';

export class ZKCTokenClient {
  private program: Program;
  private provider: AnchorProvider;

  constructor(provider: AnchorProvider, idl?: Idl) {
    this.provider = provider;
    const programId = new PublicKey(SOLANA_PROGRAM_ID.zkcToken);
    this.program = new Program(idl || ({} as Idl), programId, provider);
  }

  get programId(): PublicKey {
    return this.program.programId;
  }

  get mintPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint')],
      this.program.programId
    );
    return pda;
  }

  get configPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      this.program.programId
    );
    return pda;
  }

  get stakingVaultPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('staking-vault')],
      this.program.programId
    );
    return pda;
  }

  get treasuryAuthorityPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury')],
      this.program.programId
    );
    return pda;
  }

  stakeAccountPda(user: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('stake'), user.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  userTokenAccount(user: PublicKey): PublicKey {
    return getAssociatedTokenAddressSync(
      this.mintPda,
      user,
      false,
      TOKEN_2022_PROGRAM_ID
    );
  }

  treasuryAta(): PublicKey {
    return getAssociatedTokenAddressSync(
      this.mintPda,
      this.treasuryAuthorityPda,
      true,
      TOKEN_2022_PROGRAM_ID
    );
  }

  async initializeToken(authority?: PublicKey): Promise<TransactionSignature> {
    const user = authority || this.provider.publicKey!;

    const tx = await this.program.methods
      .initializeToken(new BN(ZKC_TOTAL_SUPPLY.toString()))
      .accounts({
        authority: user,
        mint: this.mintPda,
        mintAuthority: this.mintPda,
        treasury: this.treasuryAta(),
        treasuryAuthority: this.treasuryAuthorityPda,
        config: this.configPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async stakeTokens(
    amount: number,
    user?: PublicKey
  ): Promise<TransactionSignature> {
    const owner = user || this.provider.publicKey!;

    const tx = await this.program.methods
      .stakeTokens(new BN(amount.toString()))
      .accounts({
        user: owner,
        userTokenAccount: this.userTokenAccount(owner),
        mint: this.mintPda,
        stakingVault: this.stakingVaultPda,
        stakeAccount: this.stakeAccountPda(owner),
        config: this.configPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async unstakeTokens(
    amount: number,
    user?: PublicKey
  ): Promise<TransactionSignature> {
    const owner = user || this.provider.publicKey!;

    const tx = await this.program.methods
      .unstakeTokens(new BN(amount.toString()))
      .accounts({
        user: owner,
        userTokenAccount: this.userTokenAccount(owner),
        mint: this.mintPda,
        stakingVault: this.stakingVaultPda,
        stakeAccount: this.stakeAccountPda(owner),
        config: this.configPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async claimRewards(user?: PublicKey): Promise<TransactionSignature> {
    const owner = user || this.provider.publicKey!;

    const tx = await this.program.methods
      .claimRewards()
      .accounts({
        user: owner,
        userTokenAccount: this.userTokenAccount(owner),
        mint: this.mintPda,
        mintAuthority: this.mintPda,
        stakeAccount: this.stakeAccountPda(owner),
        config: this.configPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async getFeeDiscount(user?: PublicKey): Promise<number> {
    const owner = user || this.provider.publicKey!;

    try {
      const discount = (await this.program.methods
        .getFeeDiscount()
        .accounts({
          user: owner,
          stakeAccount: this.stakeAccountPda(owner),
          config: this.configPda,
        })
        .view()) as any;

      return discount.toNumber();
    } catch {
      return 0;
    }
  }

  async getStakeInfo(user?: PublicKey): Promise<StakeAccount | null> {
    const owner = user || this.provider.publicKey!;
    try {
      const account = await this.program.account.stakeAccount.fetch(
        this.stakeAccountPda(owner)
      );
      return account as unknown as StakeAccount;
    } catch {
      return null;
    }
  }
}
