import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';

interface MonPriceContextType {
  monPrice: number;
  monPriceChange: number;
  isLoading: boolean;
  lastUpdated: number | null;
  error: string | null;
}

const MonPriceContext = createContext<MonPriceContextType>({
  monPrice: 0,
  monPriceChange: 0,
  isLoading: true,
  lastUpdated: null,
  error: null,
});

export const useMonPrice = () => {
  const context = useContext(MonPriceContext);
  if (!context) {
    throw new Error('useMonPrice must be used within MonPriceProvider');
  }
  return context;
};

// Uniswap V3 Pool ABI (only what we need)
const poolABI = [
  {
    "inputs": [],
    "name": "slot0",
    "outputs": [
      {"internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160"},
      {"internalType": "int24", "name": "tick", "type": "int24"},
      {"internalType": "uint16", "name": "observationIndex", "type": "uint16"},
      {"internalType": "uint16", "name": "observationCardinality", "type": "uint16"},
      {"internalType": "uint16", "name": "observationCardinalityNext", "type": "uint16"},
      {"internalType": "uint8", "name": "feeProtocol", "type": "uint8"},
      {"internalType": "bool", "name": "unlocked", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Constants
const CACHE_KEY = 'noma_mon_price_cache';
const FALLBACK_PRICE_API = 'https://pricefeed.noma.money/api/price/MON';
const DEFAULT_PRICE = 3.5; // Emergency fallback price
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const PRICE_UPDATE_INTERVAL = 30 * 1000; // 30 seconds

interface PriceCache {
  price: number;
  priceChange: number;
  timestamp: number;
}

export const MonPriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [monPrice, setMonPrice] = useState(0);
  const [monPriceChange, setMonPriceChange] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  
  const retryCount = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  // Uniswap V3 MON/USDT pool address
  const poolAddress = '0xE4baba78F933D58d52b7D564212b2C4CF910A36a';

  // Load cached price on mount
  useEffect(() => {
    const loadCachedPrice = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const data: PriceCache = JSON.parse(cached);
          const age = Date.now() - data.timestamp;
          
          if (age < CACHE_DURATION) {
            // console.log('[MonPrice] Loading cached price:', data.price);
            setMonPrice(data.price);
            setMonPriceChange(data.priceChange);
            setLastUpdated(data.timestamp);
            setIsLoading(false);
            setPreviousPrice(data.price);
            return true;
          } else {
            // console.log('[MonPrice] Cache expired, age:', age / 1000, 'seconds');
          }
        }
      } catch (error) {
        console.error('[MonPrice] Error loading cached price:', error);
      }
      return false;
    };

    const hasValidCache = loadCachedPrice();
    if (!hasValidCache) {
      // If no valid cache, start with default price to prevent UI issues
      // console.log('[MonPrice] No valid cache, using default price:', DEFAULT_PRICE);
      setMonPrice(DEFAULT_PRICE);
      setIsLoading(false);
    }
  }, []);

  // Cache price data
  const cachePrice = useCallback((price: number, change: number) => {
    try {
      const cacheData: PriceCache = {
        price,
        priceChange: change,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.error('[MonPrice] Error caching price:', error);
    }
  }, []);

  // Fetch price from API fallback
  const fetchPriceFromAPI = useCallback(async (): Promise<number | null> => {
    try {
      // console.log('[MonPrice] Fetching from API fallback...');
      const response = await fetch(FALLBACK_PRICE_API, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const data = await response.json();
      const price = data.price || data.value || data.usd;
      
      if (typeof price === 'number' && price > 0) {
        // console.log('[MonPrice] API fallback price:', price);
        return price;
      } else {
        throw new Error('Invalid price data from API');
      }
    } catch (error) {
      console.error('[MonPrice] API fallback failed:', error);
      return null;
    }
  }, []);

  // Calculate price from contract data
  const calculatePriceFromContract = useCallback((slot0Data: any): number | null => {
    try {
      if (!slot0Data || !Array.isArray(slot0Data) || slot0Data.length === 0) {
        return null;
      }

      const sqrtPriceX96 = slot0Data[0];
      if (!sqrtPriceX96) {
        return null;
      }
      
      // Convert sqrtPriceX96 to price
      const sqrtPrice = parseFloat(sqrtPriceX96.toString()) / Math.pow(2, 96);
      const price = sqrtPrice * sqrtPrice;
      
      // MON has 18 decimals, USDT has 6 decimals
      const monPriceInUSD = price * Math.pow(10, 12);
      
      // Validate price is reasonable (between $0.01 and $1000)
      if (monPriceInUSD > 0.01 && monPriceInUSD < 1000) {
        return monPriceInUSD;
      } else {
        console.warn('[MonPrice] Calculated price seems unreasonable:', monPriceInUSD);
        return null;
      }

      
    } catch (error) {
      console.error('[MonPrice] Error calculating price from contract:', error);
      return null;
    }
  }, []);

  // Update price with validation and caching
  const updatePrice = useCallback((newPrice: number, source: string) => {
    // Validate price
    if (!newPrice || newPrice <= 0 || newPrice > 1000) {
      console.warn('[MonPrice] Invalid price rejected:', newPrice, 'from', source);
      return false;
    }

    // console.log('[MonPrice] Updating price to:', newPrice, 'from', source);
    
    // Calculate price change
    let change = 0;
    if (previousPrice && previousPrice > 0) {
      change = ((newPrice - previousPrice) / previousPrice) * 100;
    }

    // Update state
    setMonPrice(newPrice);
    setMonPriceChange(change);
    setLastUpdated(Date.now());
    setError(null);
    setIsLoading(false);
    
    // Cache the price
    cachePrice(newPrice, change);
    
    // Update previous price for next calculation
    setPreviousPrice(newPrice);
    
    // Reset retry count on success
    retryCount.current = 0;
    
    return true;
  }, [previousPrice, cachePrice]);

  // Start periodic price updates
  useEffect(() => {
    // TEMPORARILY DISABLED: Contract calls are failing
    // Use API fallback instead
    // console.log('[MonPrice] Contract monitoring disabled, using API fallback...');

    const fetchFromAPI = async () => {
      const apiPrice = await fetchPriceFromAPI();
      if (apiPrice) {
        updatePrice(apiPrice, 'API fallback');
      } else if (monPrice === 0) {
        updatePrice(DEFAULT_PRICE, 'default fallback');
      }
    };

    // Initial fetch from API
    fetchFromAPI();

    // Set up periodic updates from API
    updateIntervalRef.current = setInterval(() => {
      // console.log('[MonPrice] Periodic API price update...');
      fetchFromAPI();
    }, PRICE_UPDATE_INTERVAL);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchPriceFromAPI, updatePrice, monPrice]);

  const value: MonPriceContextType = {
    monPrice,
    monPriceChange,
    isLoading: isLoading && monPrice === 0, // Don't show loading if we have a cached price
    lastUpdated,
    error,
  };

  return (
    <MonPriceContext.Provider value={value}>
      {children}
    </MonPriceContext.Provider>
  );
};