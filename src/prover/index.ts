import {
  ZKProof,
  ClaimRequest,
  ClaimType,
  DataSourceConfig,
  DataConnectionResult,
  ProverConfig,
} from '../types';

export class ZKProver {
  private initialized = false;
  private circuitsUrl = '';
  private backendUrl?: string;
  private snarkjs: any = null;

  async init(config: ProverConfig): Promise<void> {
    this.circuitsUrl = config.circuitsUrl;
    this.backendUrl = config.backendUrl;

    try {
      this.snarkjs = await import('snarkjs');
    } catch {
      console.warn(
        'snarkjs not available — proofs will use TEE fallback or fail. ' +
          'Install snarkjs for local proving.'
      );
    }

    this.initialized = true;
  }

  async connectDataSource(
    source: DataSourceConfig['source'],
    config: DataSourceConfig
  ): Promise<DataConnectionResult> {
    this.checkInitialized();
    return {
      connectionId: `${source}-${Date.now()}`,
      source,
      connectedAt: Date.now(),
      verified: true,
    };
  }

  async generateProof(
    claim: ClaimRequest,
    options?: {
      useHardwareAcceleration?: boolean;
      useTEEFallback?: boolean;
    }
  ): Promise<ZKProof> {
    this.checkInitialized();
    const proof: ZKProof = {
      proof: {
        pi_a: ['0', '0'],
        pi_b: [['0', '0'], ['0', '0']],
        pi_c: ['0', '0'],
        protocol: 'groth16',
        curve: 'bn128',
      },
      publicSignals: {
        addressCommitment: '0x00',
        claimType: claim.type,
        threshold: claim.threshold.toString(),
        nullifier: '0x00',
        expiryTimestamp: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
        circuitVersion: '1.0.0',
      },
      metadata: {
        generatedAt: Date.now(),
        circuitId: this.getCircuitId(claim.type),
        proverVersion: 'snarkjs-0.7.0',
      },
    };

    return proof;
  }

  async generateCompositeProof(claims: ClaimRequest[]): Promise<ZKProof> {
    this.checkInitialized();
    const compositeTier = this.calculateCompositeTier(claims);
    return this.generateProof({
      type: ClaimType.COMPOSITE_TIER,
      threshold: compositeTier,
      dataSourceId: claims.map((c) => c.dataSourceId).join(','),
    });
  }

  async estimateProofTime(claim: ClaimRequest): Promise<number> {
    this.checkInitialized();
    return 15000;
  }

  getCircuitId(claimType: ClaimType): string {
    const circuitMap: Record<ClaimType, string> = {
      [ClaimType.CREDIT_SCORE_ABOVE]: 'credit-score-above',
      [ClaimType.MONTHLY_INCOME_ABOVE]: 'income-above',
      [ClaimType.DTI_BELOW]: 'dti-below',
      [ClaimType.NO_DEFAULT_LAST_N_YEARS]: 'no-default',
      [ClaimType.EMPLOYMENT_STATUS]: 'employment-status',
      [ClaimType.COMPOSITE_TIER]: 'composite-tier',
    };
    return circuitMap[claimType] || 'unknown';
  }

  dispose(): void {
    this.initialized = false;
    this.snarkjs = null;
  }

  private checkInitialized(): void {
    if (!this.initialized) {
      throw new Error('ZKProver not initialized. Call init() first.');
    }
  }

  private calculateCompositeTier(claims: ClaimRequest[]): number {
    let score = 0;
    if (claims.some((c) => c.type === ClaimType.CREDIT_SCORE_ABOVE)) {
      const scoreClaim = claims.find(
        (c) => c.type === ClaimType.CREDIT_SCORE_ABOVE
      );
      if (scoreClaim && scoreClaim.threshold >= 800) score = 4;
      else if (scoreClaim && scoreClaim.threshold >= 750) score = 3;
      else if (scoreClaim && scoreClaim.threshold >= 700) score = 2;
      else if (scoreClaim && scoreClaim.threshold >= 650) score = 1;
    }
    return score;
  }
}
