import { DataSourceConfig, DataConnectionResult } from '../types';

/**
 * Account Aggregator (India) Connector
 *
 * Implements the Sahamati framework for RBI-regulated Account Aggregator ecosystem.
 * Corresponding RBI/Sahamati APIs:
 *   - AA Consent API: POST /Consent (Request consent from FIP)
 *   - AA FI API: POST /FI/fetch (Fetch financial information from FIPs)
 *   - AA Session API: POST /Session (Create AA session with consent token)
 *
 * Reference: https://api.rebit.org.in (ReBIT AA API specification)
 */
export interface AConnectConfig {
  aaBaseUrl: string;
  consentToken: string;
}

export interface AAHeldAccount {
  accountId: string;
  accountType: string;
  maskedAccountNumber: string;
  bankName: string;
  ifsc: string;
  balance: number;
}

export interface AAStandingInstruction {
  type: string;
  amount: number;
  frequency: string;
  nextDate: string;
}

export interface AATransaction {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  description: string;
  type: 'credit' | 'debit';
  reference: string;
}

export interface AACreditReport {
  pan: string;
  cibilScore: number;
  reportDate: string;
  totalAccounts: number;
  activeAccounts: number;
  delinquentAccounts: number;
  totalEnquiries: number;
}

export class AccountAggregatorConnector {
  private connected = false;
  private config: AConnectConfig | null = null;
  private connectionResult: DataConnectionResult | null = null;

  /**
   * Simulates the AA consent flow per Sahamati framework.
   * Real flow: POST /Consent with consentToken, receive consent handle → POST /Session → ready.
   */
  async connect(config: AConnectConfig): Promise<DataConnectionResult> {
    this.config = config;
    this.connected = true;
    this.connectionResult = {
      connectionId: `aa-${Date.now()}`,
      source: 'account-aggregator',
      connectedAt: Date.now(),
      verified: true,
    };
    return this.connectionResult;
  }

  /**
   * Simulates fetching accounts via AA FI API.
   * Real flow: POST /FI/fetch with consent handle → receive account data from FIPs.
   */
  async fetchAccounts(): Promise<AAHeldAccount[]> {
    if (!this.connected) throw new Error('Not connected. Call connect() first.');
    return [
      {
        accountId: 'savings-001',
        accountType: 'SAVINGS',
        maskedAccountNumber: 'XXXXXX1234',
        bankName: 'HDFC Bank',
        ifsc: 'HDFC0000123',
        balance: 250000,
      },
      {
        accountId: 'salary-002',
        accountType: 'SALARY',
        maskedAccountNumber: 'XXXXXX5678',
        bankName: 'ICICI Bank',
        ifsc: 'ICIC0000456',
        balance: 180000,
      },
    ];
  }

  /**
   * Simulates fetching transactions from a specific account.
   * Real flow: part of /FI/fetch response based on consent scope.
   */
  async fetchTransactions(accountId: string, fromDate: string): Promise<AATransaction[]> {
    if (!this.connected) throw new Error('Not connected. Call connect() first.');
    const mock: AATransaction[] = [];
    const types: ('credit' | 'debit')[] = ['credit', 'debit'];
    for (let i = 0; i < 5; i++) {
      mock.push({
        id: `aa-txn-${accountId}-${i}`,
        accountId,
        amount: Math.round(Math.random() * 50000 * 100) / 100,
        date: fromDate,
        description: `AA Transaction ${i + 1}`,
        type: types[i % 2],
        reference: `REF${Date.now()}${i}`,
      });
    }
    return mock;
  }

  /**
   * Simulates fetching credit bureau report.
   * Real flow: AA connects to CIBIL/Experian/CRIF via FIU (Financial Information User).
   */
  async fetchCreditReport(): Promise<AACreditReport> {
    if (!this.connected) throw new Error('Not connected. Call connect() first.');
    return {
      pan: 'ABCDE1234F',
      cibilScore: 760,
      reportDate: new Date().toISOString(),
      totalAccounts: 12,
      activeAccounts: 8,
      delinquentAccounts: 0,
      totalEnquiries: 3,
    };
  }
}
