import { DataSourceConfig, DataConnectionResult } from '../types';

export interface PlaidConnectConfig {
  clientId: string;
  secret: string;
  environment: 'sandbox' | 'production';
}

export interface PlaidTransaction {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  description: string;
  category: string;
}

export interface PlaidIncomeData {
  monthlyGross: number;
  monthlyNet: number;
  employer: string;
  employmentStatus: string;
}

export interface PlaidCreditScoreData {
  score: number;
  provider: string;
  reportDate: string;
}

export class PlaidConnector {
  private connected = false;
  private config: PlaidConnectConfig | null = null;
  private connectionResult: DataConnectionResult | null = null;

  async connect(config: PlaidConnectConfig): Promise<DataConnectionResult> {
    this.config = config;
    this.connected = true;
    this.connectionResult = {
      connectionId: `plaid-${Date.now()}`,
      source: 'plaid',
      connectedAt: Date.now(),
      verified: true,
    };
    return this.connectionResult;
  }

  async getTransactions(daysBack: number): Promise<PlaidTransaction[]> {
    if (!this.connected) throw new Error('Not connected. Call connect() first.');
    const now = Date.now();
    const mock: PlaidTransaction[] = [];
    for (let i = 0; i < 10; i++) {
      const d = new Date(now - i * 86400000);
      mock.push({
        id: `txn-${i}`,
        accountId: 'plaid-acc-001',
        amount: Math.round(Math.random() * 5000 * 100) / 100,
        date: d.toISOString().split('T')[0],
        description: `Transaction ${i + 1}`,
        category: ['Food', 'Transport', 'Rent', 'Utilities', 'Income'][i % 5],
      });
    }
    return mock;
  }

  async getIncome(): Promise<PlaidIncomeData> {
    if (!this.connected) throw new Error('Not connected. Call connect() first.');
    return {
      monthlyGross: 120000,
      monthlyNet: 96000,
      employer: 'Tech Corp (Plaid Simulated)',
      employmentStatus: 'Employed',
    };
  }

  async getCreditScore(): Promise<PlaidCreditScoreData> {
    if (!this.connected) throw new Error('Not connected. Call connect() first.');
    return {
      score: 720,
      provider: 'Experian (Plaid Simulated)',
      reportDate: new Date().toISOString(),
    };
  }
}
