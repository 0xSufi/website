/**
 * Studio Service
 * Handles API calls and data fetching for the Studio page
 */

import { ethers } from 'ethers';
import { VaultInfo } from './vaultApiService';

const { formatEther } = ethers.utils;

export interface TokenData {
  id: number;
  name: string;
  symbol: string;
  price: number;
  priceUSD: number;
  change24h: number;
  volume24h: number;
  fdv: number;
  vault: string;
  poolAddress: string;
  logoUrl?: string;
  deployer?: string;
  status: 'active' | 'inactive';
}

export interface StudioStats {
  totalTokens: number;
  totalVolume: number;
  totalHolders: number;
  totalLiquidity: number;
}

/**
 * Convert VaultInfo array to TokenData array
 * @param vaults Array of VaultInfo from API
 * @returns Array of TokenData for display
 */
export const convertVaultsToTokens = (vaults: VaultInfo[]): TokenData[] => {
  try {
    // console.log('[Studio Service] Converting vaults to tokens:', vaults.length);

    if (!vaults || vaults.length === 0) {
      return [];
    }

    const tokens: TokenData[] = vaults.map((vault, index) => {
      // Parse price from vault data
      let price = 0;
      let priceUSD = 0;
      try {
        if (vault.spotPriceX96) {
          price = parseFloat(formatEther(vault.spotPriceX96));
          priceUSD = price; // TODO: Multiply by MON/USD price when available
        }
      } catch (error) {
        console.error('[Studio Service] Error parsing price for vault:', vault.address, error);
      }

      return {
        id: index + 1,
        name: vault.tokenName || vault.tokenSymbol,
        symbol: vault.tokenSymbol,
        price,
        priceUSD,
        change24h: 0, // Will be fetched separately
        volume24h: 0, // Will be fetched separately
        fdv: 0, // Calculate from supply * price
        vault: vault.address,
        poolAddress: vault.poolAddress || '',
        logoUrl: (vault as any).logoUrl, // logoUrl not in VaultInfo interface but may exist
        deployer: vault.deployer,
        status: 'active',
      };
    });

    return tokens;
  } catch (error) {
    console.error('[Studio Service] Error converting vaults to tokens:', error);
    return [];
  }
};

/**
 * Fetch token price stats from the API
 * @param interval Time interval (24h, 7d, etc.)
 * @param poolAddress Pool address
 * @returns Promise with price stats
 */
export const fetchTokenPriceStats = async (
  interval: string,
  poolAddress: string
): Promise<any> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8091';
    const url = `${API_URL}/api/stats?interval=${interval}&pool=${poolAddress}`;

    // console.log('[Studio Service] Fetching stats:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Studio Service] Error fetching price stats:', error);
    return null;
  }
};

/**
 * Fetch volume data for a token
 * @param poolAddress Pool address
 * @returns Promise with volume data
 */
export const fetchTokenVolume = async (poolAddress: string): Promise<number> => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8091';
    const url = `${API_URL}/api/volume?pool=${poolAddress}`;

    const response = await fetch(url);
    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.volume24h || 0;
  } catch (error) {
    console.error('[Studio Service] Error fetching volume:', error);
    return 0;
  }
};

/**
 * Calculate studio stats from token data
 * @param tokens Array of user tokens
 * @returns StudioStats object
 */
export const calculateStudioStats = (tokens: TokenData[]): StudioStats => {
  const totalVolume = tokens.reduce((sum, token) => sum + token.volume24h, 0);

  return {
    totalTokens: tokens.length,
    totalVolume,
    totalHolders: 0, // TODO: Fetch from blockchain
    totalLiquidity: 0, // TODO: Calculate from vault balances
  };
};

/**
 * Enrich tokens with price stats and volume
 * @param tokens Array of tokens
 * @returns Promise with enriched tokens
 */
export const enrichTokensWithStats = async (
  tokens: TokenData[]
): Promise<TokenData[]> => {
  const enrichedTokens = await Promise.all(
    tokens.map(async (token) => {
      if (!token.poolAddress || token.poolAddress === '0x0000000000000000000000000000000000000000') {
        return token;
      }

      try {
        // Fetch price stats
        const priceStats = await fetchTokenPriceStats('24h', token.poolAddress);
        if (priceStats?.percentageChange !== undefined) {
          token.change24h = priceStats.percentageChange;
        }

        // Fetch volume
        const volume = await fetchTokenVolume(token.poolAddress);
        token.volume24h = volume;
      } catch (error) {
        console.error(`[Studio Service] Error enriching token ${token.symbol}:`, error);
      }

      return token;
    })
  );

  return enrichedTokens;
};
