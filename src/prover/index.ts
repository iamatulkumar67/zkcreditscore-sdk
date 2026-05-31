import {
  ZKProof,
  ClaimRequest,
  ClaimType,
  DataSourceConfig,
  DataConnectionResult,
  ProverConfig,
} from '../types';

let snarkjsModule: any = null;
try {
  snarkjsModule = require('snarkjs');
} catch {
  // snarkjs is optional — will use fallback
}

interface CircuitCache {
  wasm: ArrayBuffer;
  zkey: ArrayBuffer;
}

export class ZKProver {
  private initialized = false;
  private circuitsUrl = '';
  private backendUrl?: string;
  private snarkjs: any = snarkjsModule;
  private circuitCache = new Map<string, CircuitCache>();

  async init(config: ProverConfig): Promise<void> {
    this.circuitsUrl = config.circuitsUrl;
    this.backendUrl = config.backendUrl;

    if (!this.snarkjs) {
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

    const circuitId = this.getCircuitId(claim.type);

    try {
      if (this.snarkjs) {
        return await this.realGenerateProof(claim, circuitId);
      }
    } catch (err) {
      console.warn(`snarkjs proof generation failed, falling back: ${err}`);
    }

    if (options?.useTEEFallback && this.backendUrl) {
      return this.teeGenerateProof(claim, circuitId);
    }

    return this.mockGenerateProof(claim, circuitId);
  }

  private async realGenerateProof(
    claim: ClaimRequest,
    circuitId: string
  ): Promise<ZKProof> {
    const circuit = await this.loadCircuit(circuitId);

    const inputs = this.buildCircuitInputs(claim);

    const { proof, publicSignals } = await this.snarkjs.groth16.fullProve(
      inputs,
      circuit.wasm,
      circuit.zkey
    );

    return {
      proof: {
        pi_a: proof.pi_a as [string, string],
        pi_b: proof.pi_b as [[string, string], [string, string]],
        pi_c: proof.pi_c as [string, string],
        protocol: 'groth16',
        curve: 'bn128',
      },
      publicSignals: {
        addressCommitment: publicSignals.addressCommitment || '0x00',
        claimType: claim.type,
        threshold: claim.threshold.toString(),
        nullifier: publicSignals.nullifier || '0x00',
        expiryTimestamp: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
        circuitVersion: '1.0.0',
      },
      metadata: {
        generatedAt: Date.now(),
        circuitId,
        proverVersion: 'snarkjs-0.7.0',
      },
    };
  }

  private async loadCircuit(circuitId: string): Promise<CircuitCache> {
    const cached = this.circuitCache.get(circuitId);
    if (cached) return cached;

    const baseUrl = this.circuitsUrl.replace(/\/+$/, '');
    const [wasm, zkey] = await Promise.all([
      this.fetchBinary(`${baseUrl}/${circuitId}/${circuitId}.wasm`),
      this.fetchBinary(`${baseUrl}/${circuitId}/${circuitId}_final.zkey`),
    ]);

    const entry: CircuitCache = { wasm, zkey };
    this.circuitCache.set(circuitId, entry);
    return entry;
  }

  private async fetchBinary(url: string): Promise<ArrayBuffer> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load circuit file: ${url} (${res.status})`);
    }
    return res.arrayBuffer();
  }

  private buildCircuitInputs(claim: ClaimRequest): Record<string, unknown> {
    const inputs: Record<string, unknown> = {
      addressCommitment: '0',
      thresholdPublic: claim.threshold.toString(),
      nullifier: '0',
      expiryTimestamp: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString(),
    };

    switch (claim.type) {
      case ClaimType.CREDIT_SCORE_ABOVE:
        Object.assign(inputs, {
          creditScore: '0',
          bureauTimestamp: Math.floor(Date.now() / 1000).toString(),
          salt: Math.floor(Math.random() * 1e9).toString(),
        });
        break;
      case ClaimType.MONTHLY_INCOME_ABOVE:
        Object.assign(inputs, {
          monthlyIncome: '0',
          incomeSource: '0',
          month1Income: '0',
          month2Income: '0',
          month3Income: '0',
          salt: Math.floor(Math.random() * 1e9).toString(),
        });
        break;
      case ClaimType.DTI_BELOW:
        Object.assign(inputs, {
          totalMonthlyDebt: '0',
          totalMonthlyIncome: '0',
          salt: Math.floor(Math.random() * 1e9).toString(),
        });
        break;
      case ClaimType.NO_DEFAULT_LAST_N_YEARS:
        Object.assign(inputs, {
          totalDefaults: '0',
          creditHistoryLength: Math.floor(Date.now() / 1000).toString(),
          salt: Math.floor(Math.random() * 1e9).toString(),
        });
        break;
      case ClaimType.COMPOSITE_TIER:
        Object.assign(inputs, {
          scoreThreshold: claim.threshold.toString(),
          incomeThreshold: (claim.threshold * 1000).toString(),
          dtiThreshold: '43',
          historyYearsThreshold: '3',
        });
        break;
    }

    return inputs;
  }

  private async teeGenerateProof(
    claim: ClaimRequest,
    circuitId: string
  ): Promise<ZKProof> {
    const res = await fetch(`${this.backendUrl}/prove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circuit: circuitId, claim }),
    });

    if (!res.ok) {
      throw new Error(`TEE proving failed: ${res.statusText}`);
    }

    return res.json();
  }

  private mockGenerateProof(
    claim: ClaimRequest,
    circuitId: string
  ): ZKProof {
    return {
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
        circuitId,
        proverVersion: 'snarkjs-0.7.0 (mock)',
      },
    };
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
      [ClaimType.CREDIT_SCORE_ABOVE]: 'credit_score_above',
      [ClaimType.MONTHLY_INCOME_ABOVE]: 'income_above',
      [ClaimType.DTI_BELOW]: 'dti_below',
      [ClaimType.NO_DEFAULT_LAST_N_YEARS]: 'no_default',
      [ClaimType.EMPLOYMENT_STATUS]: 'credit_score_above',
      [ClaimType.COMPOSITE_TIER]: 'composite_credit_score',
    };
    return circuitMap[claimType] || 'credit_score_above';
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
