<div align="center">
  <h1>@zkcreditscore/sdk</h1>
  <p>
    <strong>ZKCreditScore Protocol SDK</strong>
  </p>
  <p>
    Privacy-preserving credit scoring on Solana — prove creditworthiness without revealing your data.
  </p>

  <p align="center">
    <a href="#installation">Installation</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#modules">Modules</a> •
    <a href="#api-reference">API Reference</a> •
    <a href="#examples">Examples</a>
  </p>

  <p>
    <img src="https://img.shields.io/npm/v/@zkcreditscore/sdk" alt="npm" />
    <img src="https://img.shields.io/badge/solana-v2.0-blue?logo=solana" alt="Solana" />
    <img src="https://img.shields.io/badge/anchor-v0.30.1-purple" alt="Anchor" />
    <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  </p>
</div>

---

## Overview

`@zkcreditscore/sdk` is the official TypeScript SDK for the **ZKCreditScore Protocol** — a privacy-preserving decentralized lending protocol on Solana. It provides client-side ZK proof generation (via snarkjs + Circom Groth16), Solana program interaction via Anchor, and DeFi integration utilities.

The SDK enables developers to:
- **Generate ZK proofs** client-side claiming credit score, income, DTI, and default history
- **Submit proofs on Solana** to mint Soulbound Token (SBT) credentials
- **Query on-chain credentials** and determine credit tiers
- **Interact with lending pools** — deposit, borrow, repay, and liquidate
- **Integrate credit-aware lending** into any DeFi protocol

---

## Installation

```bash
npm install @zkcreditscore/sdk
```

### Peer Dependencies

```bash
npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token
```

### Optional (for local ZK proving)

```bash
npm install snarkjs circomlibjs
```

---

## Quick Start

```typescript
import {
  ZKProver,
  SolanaSDK,
  ZKCreditIntegrationSDK,
  ClaimType,
} from '@zkcreditscore/sdk';

// 1. Initialize the ZK Prover (client-side proof generation)
const prover = new ZKProver();
await prover.init({
  circuitsUrl: 'https://circuits.zkscore.credit/v1',
});

// 2. Connect to Solana with a wallet
const solana = SolanaSDK.connect({
  network: 'devnet',
  wallet: yourWalletAdapter, // e.g., Phantom wallet
});

// 3. Generate a ZK proof for "credit score > 700"
const proof = await prover.generateProof({
  type: ClaimType.CREDIT_SCORE_ABOVE,
  threshold: 700,
  dataSourceId: 'plaid-connection-1',
});

// 4. Submit the proof on-chain → get an SBT credential
const tx = await solana.verifier.verifyAndIssueCredential(proof);
console.log('Credential issued:', tx);

// 5. Check your credit tier
const userInfo = await solana.verifier.getCreditTier(wallet.publicKey);
console.log('Tier:', userInfo.tier, 'Valid:', userInfo.isValid);

// 6. Use the integration SDK to get loan terms
const integration = new ZKCreditIntegrationSDK(solana);
const ltv = await integration.getRecommendedLTV(
  wallet.publicKey.toBase58(),
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC mint
  '10000'
);
console.log('Max LTV ratio:', ltv.ltvRatio);
```

---

## Modules

### Module Overview

| Module | Class | Category |
|---|---|---|
| [ZKProver](#zkprover) | `ZKProver` | Proving |
| [SolanaSDK](#solanastrk) | `SolanaSDK` | Blockchain |
| [ZKVerifierClient](#zkverifierclient) | `ZKVerifierClient` | Blockchain |
| [LendingPoolClient](#lendingpoolclient) | `LendingPoolClient` | Blockchain |
| [ZKCTokenClient](#zkctokenclient) | `ZKCTokenClient` | Blockchain |
| [ZKCreditAPI](#zkcreditapi) | `ZKCreditAPI` | API |
| [ZKCreditIntegrationSDK](#zkcreditintegrationsdk) | `ZKCreditIntegrationSDK` | Integration |

---

### ZKProver

Client-side ZK proof generation using Groth16 on the BN128 curve. Generates proofs locally via snarkjs WASM, targeting <30s generation time.

```typescript
import { ZKProver, ClaimType } from '@zkcreditscore/sdk';

const prover = new ZKProver();
await prover.init({
  circuitsUrl: 'https://circuits.zkscore.credit/v1',
  backendUrl: 'https://api.zkscore.credit/v1', // optional TEE fallback
});

// Single claim proof
const proof = await prover.generateProof({
  type: ClaimType.CREDIT_SCORE_ABOVE,
  threshold: 700,
  dataSourceId: 'plaid-connection-1',
});

// Composite proof (multiple claims → tier)
const compositeProof = await prover.generateCompositeProof([
  { type: ClaimType.CREDIT_SCORE_ABOVE, threshold: 750, dataSourceId: '...' },
  { type: ClaimType.MONTHLY_INCOME_ABOVE, threshold: 3000, dataSourceId: '...' },
  { type: ClaimType.DTI_BELOW, threshold: 30, dataSourceId: '...' },
]);
```

| Method | Returns | Description |
|---|---|---|
| `init(config)` | `Promise<void>` | Initializes prover with circuit URLs; eagerly imports snarkjs |
| `connectDataSource(source, config)` | `Promise<DataConnectionResult>` | Connects a financial data source (Plaid, AA, PDF upload) |
| `generateProof(claim, options?)` | `Promise<ZKProof>` | Generates a Groth16 ZK proof for a single claim |
| `generateCompositeProof(claims)` | `Promise<ZKProof>` | Combines multiple claims into a composite tier proof |
| `estimateProofTime(claim)` | `Promise<number>` | Returns estimated proof generation time in ms |
| `getCircuitId(claimType)` | `string` | Maps a `ClaimType` to its corresponding circuit ID |
| `dispose()` | `void` | Cleans up prover resources |

---

### SolanaSDK

Aggregator that initializes all three program clients from a single `AnchorProvider`.

```typescript
import { SolanaSDK } from '@zkcreditscore/sdk';

// Constructor — auto-connects to devnet
const sdk = new SolanaSDK({ network: 'devnet' });

// Factory method — with wallet for signing
const sdk = SolanaSDK.connect({
  network: 'devnet',
  wallet: myWalletAdapter,
});
```

| Property / Method | Type / Returns | Description |
|---|---|---|
| `verifier` | `ZKVerifierClient` | On-chain verifier program client |
| `lendingPool` | `LendingPoolClient` | On-chain lending pool program client |
| `zkcToken` | `ZKCTokenClient` | ZKC SPL Token-2022 program client |
| `provider` | `AnchorProvider` | Underlying Anchor provider |
| `constructor(config)` | `SolanaSDK` | Creates SDK; defaults to devnet if no provider given |
| `static connect(config)` | `SolanaSDK` | Factory method with wallet-based provider |

---

### ZKVerifierClient

Interacts with the `zk-credit-verifier` Solana program. Verifies Groth16 proofs and manages SBT credentials.

| Method | Returns | Description |
|---|---|---|
| `programId` (getter) | `PublicKey` | Program ID of the verifier |
| `verifyAndIssueCredential(proof, owner?)` | `Promise<TransactionSignature>` | Verifies a ZK proof on-chain and issues a credential PDA |
| `hasValidCredential(user, claimType, threshold?)` | `Promise<boolean>` | Checks if a user holds a valid, non-expired credential |
| `getCreditTier(user)` | `Promise<CredentialInfo>` | Fetches the user's credit tier, expiry, and validity |
| `revokeCredential(user)` | `Promise<TransactionSignature>` | Revokes the user's credential |

---

### LendingPoolClient

Interacts with the `zk-lending-pool` Solana program. Manages deposits, borrows, repayments, and liquidations with tier-based collateral ratios.

| Method | Returns | Description |
|---|---|---|
| `programId` (getter) | `PublicKey` | Program ID of the lending pool |
| `getCollateralRatio(user, borrowMint)` | `Promise<{ ratio, maxBorrow }>` | Returns collateral ratio and max borrow based on user's credit tier |
| `depositAndBorrow(collateralMint, amount, borrowMint, amount)` | `Promise<TransactionSignature>` | Deposits collateral and borrows in one transaction |
| `repay(loanId, amount)` | `Promise<TransactionSignature>` | Repays a specified loan |
| `liquidate(borrower, collateralMint, debtMint, debtToCover)` | `Promise<TransactionSignature>` | Liquidates an undercollateralized position |
| `getUtilizationRate(asset)` | `Promise<number>` | Pool utilization rate as a percentage |
| `getBorrowRate(asset)` | `Promise<number>` | Borrow APY using the kink interest rate model |

#### Credit Tiers & Collateral Ratios

| Tier | Label | Min Score | Collateral Ratio | Max Loan | Interest Discount |
|---|---|---|---|---|---|
| 0 | None | — | 150% | $50K | 0% |
| 1 | Basic | 650 | 110% | $100K | 2% |
| 2 | Good | 700 | 80% | $250K | 4% |
| 3 | Excellent | 750 | 60% | $500K | 6% |
| 4 | Premium | 800 | 50% | $1M | 8% |

#### Kink Interest Rate Model

- **Base rate:** 2%
- **Optimal utilization:** 80%
- **Slope 1 (below optimal):** 8%
- **Slope 2 (above optimal):** 75%

---

### ZKCTokenClient

Interacts with the `zkc-token` SPL Token-2022 program. Manages ZKCR token staking, rewards, and fee discounts.

| Property / Method | Returns | Description |
|---|---|---|
| `programId` (getter) | `PublicKey` | ZKC token program ID |
| `mintPda` (getter) | `PublicKey` | PDA of the ZKCR token mint |
| `configPda` (getter) | `PublicKey` | PDA of the token config |
| `stakingVaultPda` (getter) | `PublicKey` | PDA of the staking vault |
| `stakeAccountPda(user)` | `PublicKey` | Derives stake account PDA for a given user |
| `userTokenAccount(user)` | `PublicKey` | Derives the associated token account (ATA) |
| `initializeToken(authority?)` | `Promise<TransactionSignature>` | Initializes the ZKCR token with total supply |
| `stakeTokens(amount, user?)` | `Promise<TransactionSignature>` | Stakes ZKCR tokens and starts earning rewards |
| `unstakeTokens(amount, user?)` | `Promise<TransactionSignature>` | Unstakes tokens (rewards are forfeited on partial unstake) |
| `claimRewards(user?)` | `Promise<TransactionSignature>` | Claims accumulated staking rewards |
| `getFeeDiscount(user?)` | `Promise<number>` | Returns fee discount in basis points based on stake amount |
| `getStakeInfo(user?)` | `Promise<StakeAccount | null>` | Fetches the stake account details |

#### Fee Discount Tiers

| Min Stake (ZKCR) | Discount (bps) |
|---|---|
| 0 | 0% |
| 10,000 | 10% |
| 100,000 | 20% |
| 500,000 | 25% |
| 1,000,000 | 30% |

---

### ZKCreditAPI

REST API client for querying off-chain protocol data.

```typescript
import { ZKCreditAPI } from '@zkcreditscore/sdk';

const api = new ZKCreditAPI({
  baseUrl: 'https://api.zkscore.credit/v1',
  apiKey: 'your-api-key', // optional
});

const stats = await api.getStats();
const pools = await api.getPools();
const credential = await api.getCredential('wallet-address');
const circuit = await api.getCircuitInfo('credit-score-above');
const leaderboard = await api.getLeaderboard();
```

| Method | Returns | Description |
|---|---|---|
| `getStats()` | `Promise<ProtocolStats>` | Protocol-wide statistics (TVL, credentials, loans) |
| `getCredential(address)` | `Promise<CredentialInfo>` | Credential info for a wallet address |
| `getPools()` | `Promise<LendingPoolInfo[]>` | All active lending pools |
| `getCircuitInfo(circuitId)` | `Promise<CircuitInfo>` | ZK circuit metadata + verification key |
| `getLeaderboard()` | `Promise<Leaderboard>` | Credential leaderboard and tier distribution |

---

### ZKCreditIntegrationSDK

High-level integration layer for DeFi protocols that want to offer credit-aware lending.

```typescript
import { ZKCreditIntegrationSDK, ClaimType } from '@zkcreditscore/sdk';

const integration = new ZKCreditIntegrationSDK(solanaSDK);

// Check if a user has a valid credit credential
const hasCred = await integration.hasCredential(
  'user-wallet-address',
  ClaimType.CREDIT_SCORE_ABOVE,
  700
);

// Get recommended loan terms
const ltv = await integration.getRecommendedLTV(
  'user-wallet-address',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  '10000'
);
// => { ltvRatio: 8000, maxLoanAmount: '250000', interestRateModifier: -400 }
```

| Method | Returns | Description |
|---|---|---|
| `hasCredential(address, claimType, threshold?)` | `Promise<boolean>` | Checks if a Solana address holds a valid credential |
| `getCreditTier(address)` | `Promise<CredentialInfo>` | Fetches credit tier + expiry + validity |
| `getRecommendedLTV(address, loanMint, loanAmount)` | `Promise<RecommendedLTV>` | Calculates LTV ratio, max loan, and interest modifier based on tier |
| `getVerifierInterface()` | `string` | Returns JSON schema of the verifier's external interface |
| `getVerifierAddress()` | `string` | Returns the base58 verifier program ID |

---

## API Reference

### Enums

```typescript
enum ClaimType {
  CREDIT_SCORE_ABOVE = 0,
  MONTHLY_INCOME_ABOVE = 1,
  DTI_BELOW = 2,
  NO_DEFAULT_LAST_N_YEARS = 3,
  EMPLOYMENT_STATUS = 4,
  COMPOSITE_TIER = 5,
}

enum CreditTier {
  None = 0,     // 150% collateral
  Basic = 1,    // 110% collateral
  Good = 2,     // 80% collateral
  Excellent = 3, // 60% collateral
  Premium = 4,  // 50% collateral
}

enum EmploymentStatus {
  Employed = 0,
  SelfEmployed = 1,
  BusinessOwner = 2,
}
```

### Key Interfaces

| Interface | Key Fields | Purpose |
|---|---|---|
| `ZKProof` | `proof` (pi_a, pi_b, pi_c), `publicSignals`, `metadata` | Full Groth16 proof structure |
| `ClaimRequest` | `type`, `threshold`, `dataSourceId` | Input for proof generation |
| `CreditCredential` | `owner`, `creditTier`, `claimsBitmap`, `issuedAt`, `expiresAt` | On-chain SBT credential |
| `TierConfig` | `label`, `minScore`, `collateralRatio`, `maxLoan`, `interestRateModifier` | Credit tier parameters |
| `LoanTerms` | `borrower`, `collateralAmount`, `borrowAmount`, `interestRate`, `collateralRatio` | Full loan terms |
| `LoanRecord` | `loanId`, `borrower`, `collateral`, `borrowed`, `status` | On-chain loan record |
| `CredentialInfo` | `tier`, `expiresAt`, `claims`, `isValid` | User-facing credential summary |
| `RecommendedLTV` | `ltvRatio`, `maxLoanAmount`, `interestRateModifier` | LTV recommendation output |
| `ProtocolStats` | `totalCredentials`, `activeLoans`, `totalTvlUsd`, `averageCreditTier` | Protocol statistics |
| `StakeAccount` | `owner`, `amount`, `stakedAt`, `pendingRewards` | ZKCR staking account |
| `LendingPoolInfo` | `symbol`, `totalDeposits`, `totalBorrows`, `utilizationRate`, `borrowApy`, `supplyApy` | Lending pool data |

### Constants

```typescript
// Program IDs
SOLANA_PROGRAM_ID.verifier     // "9fx3329hTirtrGA77bQ3qTQMHgkcYbiMJTSbY1kSK1Kh"
SOLANA_PROGRAM_ID.lendingPool  // "HbHw6ib3eCfxbV1tv7X817VZ9J9tR4ZLGpNEQJ2jYDQo"
SOLANA_PROGRAM_ID.zkcToken     // "4A1AR7H5VHQzwM7QuucYDHKTrQWt9HQ1GyEB4gh4pump"
SOLANA_PROGRAM_ID.governance   // "4FE94XY5Az6fS2PCBxd2PZtzPq5EiXYT5EFPzYj53QkT"

// Network URLs
NETWORK_URLS.mainnet-beta      // "https://api.mainnet-beta.solana.com"
NETWORK_URLS.devnet            // "https://api.devnet.solana.com"
NETWORK_URLS.localnet          // "http://127.0.0.1:8899"

// Token
ZKC_DECIMALS                   // 9
ZKC_MIN_STAKE                  // 1,000 ZKCR (1_000_000_000_000 lamports)
ZKC_TOTAL_SUPPLY               // 1,000,000,000 ZKCR
STAKING_REWARD_RATE_BPS        // 500 bps (5% annually)
```

### Utility Functions

```typescript
// PDA derivation
deriveCredentialPda(owner: PublicKey): [PublicKey, number]
deriveLoanPda(borrower: PublicKey, loanId: number): [PublicKey, number]
deriveNullifierPda(nullifier: PublicKey): [PublicKey, number]
deriveLendingPoolPda(mint: PublicKey): [PublicKey, number]
deriveVaultPda(mint: PublicKey): [PublicKey, number]
deriveConfigPda(): [PublicKey, number]

// Unit conversion
toBasisPoints(percentage: number): number
fromBasisPoints(basisPoints: number): number
lamportsToSol(lamports: number): number
solToLamports(sol: number): number
```

### Account Seeds

```typescript
ACCOUNT_SEEDS = {
  credential:     'credential',
  loan:           'loan',
  lendingPool:    'lending-pool',
  vault:          'vault',
  config:         'config',
  nullifier:      'nullifier',
  mint:           'mint',
  stake:          'stake',
  stakingVault:   'staking-vault',
  treasury:       'treasury',
}
```

---

## Examples

### Full Flow: Prove, Verify, Borrow

```typescript
import { ZKProver, SolanaSDK, ClaimType, CreditTier } from '@zkcreditscore/sdk';

async function fullFlow(wallet: any) {
  // Initialize
  const prover = new ZKProver();
  await prover.init({ circuitsUrl: 'https://circuits.zkscore.credit/v1' });

  const solana = SolanaSDK.connect({ network: 'devnet', wallet });

  // Generate composite proof (Good tier)
  const proof = await prover.generateCompositeProof([
    { type: ClaimType.CREDIT_SCORE_ABOVE, threshold: 720, dataSourceId: 'plaid-1' },
    { type: ClaimType.MONTHLY_INCOME_ABOVE, threshold: 5000, dataSourceId: 'plaid-1' },
  ]);

  // Submit on-chain → SBT credential
  const tx = await solana.verifier.verifyAndIssueCredential(proof);
  console.log('Credential minted:', tx);

  // Check tier
  const info = await solana.verifier.getCreditTier(wallet.publicKey);
  console.log('Tier:', CreditTier[info.tier]); // "Good"

  // Deposit collateral and borrow
  const borrowTx = await solana.lendingPool.depositAndBorrow(
    usdcMint,    // collateral mint
    8000,        // $8,000 USDC
    usdcMint,    // borrow mint
    10000,       // $10,000 borrowed (80% LTV for Good tier)
  );
  console.log('Loan opened:', borrowTx);
}
```

### Check Credential Without Wallet

```typescript
import { SolanaSDK } from '@zkcreditscore/sdk';

const solana = new SolanaSDK({ network: 'devnet' });
const tier = await solana.verifier.getCreditTier(
  new PublicKey('user-wallet-address')
);
console.log('Tier:', tier.tier, 'Expires:', tier.expiresAt);
```

### Query Protocol Statistics

```typescript
import { ZKCreditAPI } from '@zkcreditscore/sdk';

const api = new ZKCreditAPI();
const stats = await api.getStats();
// => { totalCredentials: 100000, activeLoans: 20000, totalTvlUsd: "100000000", ... }
```

### Custom Network Connection

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';
import { SolanaSDK } from '@zkcreditscore/sdk';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
const solana = new SolanaSDK({ provider });
```

---

## Development

```bash
# Clone the monorepo
git clone https://github.com/iamatulkumar67/CreditScore.git
cd CreditScore/packages/sdk

# Install dependencies
npm install

# Build (ESM + CJS)
npm run build

# Run tests
npm test

# Lint
npm run lint
```

### Build Outputs

| Format | Path | Config |
|---|---|---|
| ESM (ES Modules) | `dist/esm/` | `tsc --module ES6` |
| CJS (CommonJS) | `dist/cjs/` | `tsc --module CommonJS` |

---

## Published Packages

| Package | Registry |
|---|---|
| `@zkcreditscore/sdk` | [npm](https://www.npmjs.com/package/@zkcreditscore/sdk) |

---

## License

[MIT](LICENSE)

---

<div align="center">
  <p>
    <a href="https://zkscore.credit">Website</a> •
    <a href="https://github.com/iamatulkumar67/CreditScore">Monorepo</a> •
    <a href="https://github.com/iamatulkumar67/zkcreditscore-sdk">SDK Repo</a>
  </p>
</div>
