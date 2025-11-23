import { useState, useEffect, useCallback } from 'react';
import { loanService, LoanEvent, LoanStats } from '../services/loanService';

interface UseLoanHistoryOptions {
  userAddress?: string;
  vaultAddress?: string;
}

interface UseLoanHistoryResult {
  loans: LoanEvent[];
  stats: LoanStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage loan history
 *
 * @param options - Configuration options
 * @param options.userAddress - User address to fetch loans for
 * @param options.vaultAddress - Vault address to fetch loans for
 *
 * @example
 * // Get loan history for a user
 * const { loans, stats, isLoading } = useLoanHistory({ userAddress: '0x...' });
 *
 * @example
 * // Get loan history for a vault
 * const { loans, stats, isLoading } = useLoanHistory({ vaultAddress: '0x...' });
 */
export function useLoanHistory(options: UseLoanHistoryOptions = {}): UseLoanHistoryResult {
  const { userAddress, vaultAddress } = options;

  const [loans, setLoans] = useState<LoanEvent[]>([]);
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch loan history from API
  const fetchLoanHistory = useCallback(async () => {
    if (!userAddress && !vaultAddress) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (userAddress && vaultAddress) {
        // Fetch user loans and filter by vault client-side
        const [loansData, statsData] = await Promise.all([
          loanService.getLoansByUser(userAddress),
          loanService.getUserStats(userAddress)
        ]);

        // Filter loans by vault address
        const filteredLoans = loansData.loans.filter(
          loan => loan.vaultAddress.toLowerCase() === vaultAddress.toLowerCase()
        );

        setLoans(filteredLoans);
        setStats(statsData);
      } else if (userAddress) {
        // Fetch user loans and stats
        const [loansData, statsData] = await Promise.all([
          loanService.getLoansByUser(userAddress),
          loanService.getUserStats(userAddress)
        ]);

        setLoans(loansData.loans);
        setStats(statsData);
      } else if (vaultAddress) {
        // Fetch vault loans and stats
        const [loansData, statsData] = await Promise.all([
          loanService.getLoansByVault(vaultAddress),
          loanService.getVaultStats(vaultAddress)
        ]);

        setLoans(loansData.loans);
        setStats(statsData);
      }
    } catch (err) {
      console.error('Error fetching loan history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch loan history');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress, vaultAddress]);

  // Initial fetch
  useEffect(() => {
    fetchLoanHistory();
  }, [fetchLoanHistory]);

  return {
    loans,
    stats,
    isLoading,
    error,
    refetch: fetchLoanHistory
  };
}
