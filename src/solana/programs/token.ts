import { AnchorProvider, Program, Idl, BN } from '@coral-xyz/anchor';
import {
  PublicKey,
  TransactionSignature,
  SystemProgram,
  Keypair,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { SOLANA_PROGRAM_ID, ZKC_TOTAL_SUPPLY } from '../../constants';
import { StakeAccount } from '../../types';

export class ZKCTokenClient {
  private program: Program;
  private provider: AnchorProvider;
  private _mintAddress: PublicKey | null = null;

  constructor(provider: AnchorProvider, idl?: Idl) {
    this.provider = provider;
    const programId = new PublicKey(SOLANA_PROGRAM_ID.zkcToken);
    const programIdl: Idl = idl || {
      address: programId.toBase58(),
      metadata: { name: 'zkc-token', version: '0.1.0', spec: '0.1.0' },
      instructions: [],
    };
    this.program = new Program(programIdl, provider);
  }

  get programId(): PublicKey {
    return this.program.programId;
  }

  get mintAuthorityPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint-authority')],
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

  get vaultAuthorityPda(): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault-authority')],
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

  get mintAddress(): PublicKey | null {
    return this._mintAddress;
  }

  setMintAddress(mint: PublicKey) {
    this._mintAddress = mint;
  }

  async loadMintFromConfig(): Promise<PublicKey | null> {
    try {
      const config = await (this.program.account as any).tokenConfig.fetch(this.configPda);
      this._mintAddress = (config as any).mint;
      return this._mintAddress;
    } catch {
      return null;
    }
  }

  userTokenAccount(user: PublicKey, mint: PublicKey): PublicKey {
    return getAssociatedTokenAddressSync(mint, user, false, TOKEN_2022_PROGRAM_ID);
  }

  treasuryAta(mint: PublicKey): PublicKey {
    return getAssociatedTokenAddressSync(mint, this.treasuryAuthorityPda, true, TOKEN_2022_PROGRAM_ID);
  }

  async initializeToken(mintKeypair: Keypair, authority?: PublicKey): Promise<TransactionSignature> {
    const user = authority || this.provider.publicKey!;
    this._mintAddress = mintKeypair.publicKey;

    const tx = await this.program.methods
      .initializeToken(new BN(ZKC_TOTAL_SUPPLY))
      .accounts({
        authority: user,
        mint: mintKeypair.publicKey,
        mintAuthority: this.mintAuthorityPda,
        treasury: this.treasuryAta(mintKeypair.publicKey),
        treasuryAuthority: this.treasuryAuthorityPda,
        config: this.configPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([mintKeypair])
      .rpc();

    return tx;
  }

  async stakeTokens(amount: number, user?: PublicKey): Promise<TransactionSignature> {
    const owner = user || this.provider.publicKey!;
    const mint = this._mintAddress!;

    const tx = await this.program.methods
      .stakeTokens(new BN(amount.toString()))
      .accounts({
        user: owner,
        userTokenAccount: this.userTokenAccount(owner, mint),
        mint,
        stakingVault: getAssociatedTokenAddressSync(mint, this.vaultAuthorityPda, true, TOKEN_2022_PROGRAM_ID),
        vaultAuthority: this.vaultAuthorityPda,
        stakeAccount: this.stakeAccountPda(owner),
        config: this.configPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  async unstakeTokens(amount: number, user?: PublicKey): Promise<TransactionSignature> {
    const owner = user || this.provider.publicKey!;
    const mint = this._mintAddress!;

    const tx = await this.program.methods
      .unstakeTokens(new BN(amount.toString()))
      .accounts({
        user: owner,
        userTokenAccount: this.userTokenAccount(owner, mint),
        mint,
        mintAuthority: this.mintAuthorityPda,
        stakingVault: getAssociatedTokenAddressSync(mint, this.vaultAuthorityPda, true, TOKEN_2022_PROGRAM_ID),
        vaultAuthority: this.vaultAuthorityPda,
        stakeAccount: this.stakeAccountPda(owner),
        config: this.configPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  async claimRewards(user?: PublicKey): Promise<TransactionSignature> {
    const owner = user || this.provider.publicKey!;
    const mint = this._mintAddress!;

    const tx = await this.program.methods
      .claimRewards()
      .accounts({
        user: owner,
        userTokenAccount: this.userTokenAccount(owner, mint),
        mint,
        mintAuthority: this.mintAuthorityPda,
        stakeAccount: this.stakeAccountPda(owner),
        config: this.configPda,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
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
      const account = await (this.program.account as any).stakeAccount.fetch(
        this.stakeAccountPda(owner)
      );
      return account as unknown as StakeAccount;
    } catch {
      return null;
    }
  }
}
