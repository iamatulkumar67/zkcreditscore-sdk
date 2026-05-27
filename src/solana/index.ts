import { AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import { ZKVerifierClient } from './programs/verifier';
import { LendingPoolClient } from './programs/lendingPool';
import { ZKCTokenClient } from './programs/token';
import { NETWORK_URLS } from '../constants';

export interface SolanaSDKConfig {
  network?: 'mainnet-beta' | 'devnet' | 'localnet';
  connection?: Connection;
  provider?: AnchorProvider;
}

export class SolanaSDK {
  public verifier: ZKVerifierClient;
  public lendingPool: LendingPoolClient;
  public zkcToken: ZKCTokenClient;
  public provider: AnchorProvider;

  constructor(config: SolanaSDKConfig) {
    if (config.provider) {
      this.provider = config.provider;
    } else {
      const connection =
        config.connection ||
        new Connection(
          NETWORK_URLS[config.network || 'devnet'],
          'confirmed'
        );
      this.provider = new AnchorProvider(
        connection,
        {} as any,
        { commitment: 'confirmed' }
      );
    }

    this.verifier = new ZKVerifierClient(this.provider);
    this.lendingPool = new LendingPoolClient(this.provider);
    this.zkcToken = new ZKCTokenClient(this.provider);
  }

  static connect(
    config: SolanaSDKConfig & { wallet: any }
  ): SolanaSDK {
    const connection =
      config.connection ||
      new Connection(
        NETWORK_URLS[config.network || 'devnet'],
        'confirmed'
      );
    const provider = new AnchorProvider(
      connection,
      config.wallet,
      { commitment: 'confirmed' }
    );
    return new SolanaSDK({ provider });
  }
}
