import { ProtocolStats, LendingPoolInfo, CredentialInfo, CreditTier } from '../types';

export interface APIClientConfig {
  baseUrl?: string;
  apiKey?: string;
}

export class ZKCreditAPI {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config?: APIClientConfig) {
    this.baseUrl = config?.baseUrl || 'https://api.zkscore.credit/v1';
    this.apiKey = config?.apiKey;
  }

  private async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async getStats(): Promise<ProtocolStats> {
    return this.request<ProtocolStats>('/stats');
  }

  async getCredential(address: string): Promise<CredentialInfo> {
    return this.request<CredentialInfo>(`/credential/${address}`);
  }

  async getPools(): Promise<LendingPoolInfo[]> {
    return this.request<LendingPoolInfo[]>('/pools');
  }

  async getCircuitInfo(circuitId: string): Promise<{
    circuitId: string;
    verificationKeyCid: string;
    auditStatus: string;
  }> {
    return this.request(`/circuit/${circuitId}`);
  }

  async getLeaderboard(): Promise<{
    totalCredentials: number;
    averageTier: number;
    tierDistribution: Record<string, number>;
  }> {
    return this.request('/leaderboard');
  }
}
