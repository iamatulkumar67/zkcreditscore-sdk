/**
 * PDF Bank Statement Parser
 *
 * Parses bank statement PDFs locally to extract transaction data and
 * compute financial metrics for credit scoring.
 *
 * Integration note: Replace the mock parse step with a real PDF library
 * such as `pdfjs-dist` (https://www.npmjs.com/package/pdfjs-dist) for
 * production use. The mock returns predefined transactions for testing.
 */

export interface ParsedStatement {
  bankName: string;
  accountNumber: string;
  period: {
    from: string;
    to: string;
  };
  transactions: PDFTransaction[];
}

export interface PDFTransaction {
  date: string;
  description: string;
  amount: number;
  balance: number;
  type: 'credit' | 'debit';
}

export interface PDFMetrics {
  totalCredits: number;
  totalDebits: number;
  averageMonthlyIncome: number;
  averageMonthlyExpenses: number;
  netCashflow: number;
  endingBalance: number;
  transactionCount: number;
  largestDeposit: number;
  largestWithdrawal: number;
}

export class PDFBankStatementParser {
  private parsedData: ParsedStatement | null = null;

  /**
   * Parse bank statement PDF buffer.
   * Production: use pdfjs-dist to extract text, then regex-match
   * transaction rows. For now returns mock parsed data.
   */
  async parse(fileBuffer: ArrayBuffer): Promise<ParsedStatement> {
    const text = new TextDecoder().decode(fileBuffer);
    if (!text || text.length === 0) {
      throw new Error('Empty file buffer');
    }
    const mock: ParsedStatement = {
      bankName: 'State Bank of India (PDF Simulated)',
      accountNumber: 'XXXXXX9876',
      period: { from: '2025-01-01', to: '2025-03-31' },
      transactions: [
        { date: '2025-01-05', description: 'Salary Credit', amount: 120000, balance: 150000, type: 'credit' },
        { date: '2025-01-10', description: 'Rent Payment', amount: 25000, balance: 125000, type: 'debit' },
        { date: '2025-01-15', description: 'Utility Bill', amount: 5000, balance: 120000, type: 'debit' },
        { date: '2025-02-05', description: 'Salary Credit', amount: 120000, balance: 240000, type: 'credit' },
        { date: '2025-02-10', description: 'Rent Payment', amount: 25000, balance: 215000, type: 'debit' },
        { date: '2025-02-20', description: 'Groceries', amount: 8000, balance: 207000, type: 'debit' },
        { date: '2025-03-05', description: 'Salary Credit', amount: 120000, balance: 327000, type: 'credit' },
        { date: '2025-03-10', description: 'Rent Payment', amount: 25000, balance: 302000, type: 'debit' },
        { date: '2025-03-25', description: 'Insurance Premium', amount: 15000, balance: 287000, type: 'debit' },
      ],
    };
    this.parsedData = mock;
    return mock;
  }

  /**
   * Extract transactions from previously parsed statement.
   */
  extractTransactions(): PDFTransaction[] {
    if (!this.parsedData) throw new Error('No parsed data. Call parse() first.');
    return this.parsedData.transactions;
  }

  /**
   * Calculate financial metrics from parsed statement data.
   */
  calculateMetrics(): PDFMetrics {
    if (!this.parsedData) throw new Error('No parsed data. Call parse() first.');
    const txns = this.parsedData.transactions;
    const credits = txns.filter((t) => t.type === 'credit');
    const debits = txns.filter((t) => t.type === 'debit');
    const totalCredits = credits.reduce((s, t) => s + t.amount, 0);
    const totalDebits = debits.reduce((s, t) => s + t.amount, 0);
    const months = 3;
    return {
      totalCredits,
      totalDebits,
      averageMonthlyIncome: Math.round(totalCredits / months),
      averageMonthlyExpenses: Math.round(totalDebits / months),
      netCashflow: totalCredits - totalDebits,
      endingBalance: txns[txns.length - 1]?.balance ?? 0,
      transactionCount: txns.length,
      largestDeposit: Math.max(...credits.map((t) => t.amount), 0),
      largestWithdrawal: Math.max(...debits.map((t) => t.amount), 0),
    };
  }
}
