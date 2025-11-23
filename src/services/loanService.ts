import config from '../config';

export interface LoanEvent {
  id: string;                    // Unique ID: transactionHash-logIndex
  vaultAddress: string;          // Vault contract address
  eventName: 'Borrow' | 'Payback' | 'RollLoan' | 'DefaultLoans';
  blockNumber: number;           // Block number where event occurred
  blockHash: string;             // Block hash
  transactionHash: string;       // Transaction hash
  transactionIndex: number;      // Transaction index in block
  logIndex: number;              // Log index in transaction
  args: {                        // Event-specific arguments
    who?: string;                // User address (for Borrow, Payback, RollLoan)
    borrowAmount?: string;       // Amount borrowed (for Borrow only)
    duration?: string;           // Loan duration (for Borrow only)
    amount?: string;             // Amount repaid (for Payback only)
  };
  timestamp: number;             // Event timestamp
  storedAt: number;              // Storage timestamp
  vaultSymbol?: string;          // Vault token symbol (enriched)
  vaultName?: string;            // Vault token name (enriched)
}

export interface LoanStats {
  totalBorrows: number;
  totalPaybacks: number;
  totalRolls: number;
  totalDefaults?: number;
  totalBorrowed: string;
  uniqueBorrowers?: number;
  loans: LoanEvent[];
}

class LoanService {
  private baseUrl: string;

  constructor() {
    // Use the trollbox API URL from config
    const apiUrl = config.referralApi?.url || 'http://localhost:8090';
    this.baseUrl = `${apiUrl}/api/loans`;
  }

  /**
   * Get the latest loan events
   */
  async getLatestLoans(limit: number = 100): Promise<{ loans: LoanEvent[]; count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/latest?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch latest loans: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching latest loans:', error);
      return { loans: [], count: 0 };
    }
  }

  /**
   * Get all loan events for a specific user
   */
  async getLoansByUser(userAddress: string): Promise<{ userAddress: string; loans: LoanEvent[]; count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/user/${userAddress}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch loans for user: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user loans:', error);
      return { userAddress, loans: [], count: 0 };
    }
  }

  /**
   * Get all loan events for a specific vault
   */
  async getLoansByVault(vaultAddress: string): Promise<{ vaultAddress: string; loans: LoanEvent[]; count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/vault/${vaultAddress}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch loans for vault: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching vault loans:', error);
      return { vaultAddress, loans: [], count: 0 };
    }
  }

  /**
   * Get loan statistics for a specific user
   */
  async getUserStats(userAddress: string): Promise<LoanStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/stats/user/${userAddress}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch user stats: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }
  }

  /**
   * Get loan statistics for a specific vault
   */
  async getVaultStats(vaultAddress: string): Promise<LoanStats | null> {
    try {
      const response = await fetch(`${this.baseUrl}/stats/vault/${vaultAddress}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch vault stats: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching vault stats:', error);
      return null;
    }
  }

  /**
   * Get all loan events of a specific type
   */
  async getLoansByType(type: 'Borrow' | 'Payback' | 'RollLoan' | 'DefaultLoans'): Promise<{ type: string; loans: LoanEvent[]; count: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/type/${type}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch loans by type: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching loans by type:', error);
      return { type, loans: [], count: 0 };
    }
  }
}

export const loanService = new LoanService();
