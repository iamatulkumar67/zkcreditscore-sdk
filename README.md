# @zkcreditscore/sdk

ZKCreditScore Protocol SDK — Privacy-preserving credit scoring on Solana.

## Installation

```bash
npm install @zkcreditscore/sdk
```

## Quick Start

```typescript
import { ZKProver, SolanaSDK, ZKCreditIntegrationSDK } from '@zkcreditscore/sdk';

// 1. Initialize ZK Prover
const prover = new ZKProver();
await prover.init({
  circuitsUrl: 'ipfs://Qm...',
});

// 2. Connect to Solana
const sdk = SolanaSDK.connect({
  network: 'devnet',
  wallet: yourWallet,
});

// 3. Generate a ZK proof
const proof = await prover.generateProof({
  type: ClaimType.CREDIT_SCORE_ABOVE,
  threshold: 700,
  dataSourceId: 'plaid-connection-1',
});

// 4. Submit proof on-chain
const tx = await sdk.verifier.verifyAndIssueCredential(proof);
console.log('Credential issued:', tx);

// 5. Check credit tier
const info = await sdk.verifier.getCreditTier(userPublicKey);
console.log('Credit tier:', info.tier, 'Valid:', info.isValid);
```

## Modules

- **ZKProver** — Client-side ZK proof generation
- **SolanaSDK** — Solana program interaction (Anchor)
- **ZKCreditAPI** — REST API client for protocol data
- **ZKCreditIntegrationSDK** — Integration tools for DeFi builders

## License

MIT
