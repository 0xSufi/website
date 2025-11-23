import { ethers } from 'ethers';
import config, { getCurrentNetworkConfig } from '../config';

const { JsonRpcProvider } = ethers.providers;

// Removed unnecessary RPC test on module load to reduce eth_chainId calls

/**
 * Singleton provider service to prevent multiple provider instances
 * Each provider instance makes eth_chainId calls, so we need to reuse a single instance
 * Supports multi-network with per-network provider caching
 */
class ProviderService {
  private static instance: ProviderService;
  private providers: Map<string, ethers.providers.JsonRpcProvider> = new Map();
  private chainIds: Map<string, number> = new Map();
  private chainIdPromises: Map<string, Promise<number>> = new Map();
  private providerReadyPromises: Map<string, Promise<void>> = new Map();

  private constructor() {}

  static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  getProvider(networkKey?: string): ethers.providers.JsonRpcProvider {
    // Use selected network from localStorage if not specified
    let effectiveNetworkKey = networkKey;

    if (!effectiveNetworkKey) {
      const NETWORK_STORAGE_KEY = 'noma_selected_network';
      const selectedNetwork = localStorage.getItem(NETWORK_STORAGE_KEY);
      effectiveNetworkKey = selectedNetwork || 'monadTestnet'; // Use actual network name as default
    }

    // Map 'default' to actual network for backward compatibility
    if (effectiveNetworkKey === 'default') {
      effectiveNetworkKey = 'monadTestnet';
    }

    if (!this.providers.has(effectiveNetworkKey)) {
      // console.log('[ProviderService] Creating provider instance for network:', effectiveNetworkKey);

      try {
        // Get network configuration
        const networkConfig = getCurrentNetworkConfig(effectiveNetworkKey);
        const rpcUrl = networkConfig.rpcUrl;
        const expectedChainId = networkConfig.chainId;

        // console.log('[ProviderService] RPC URL:', rpcUrl, 'Expected ChainId:', expectedChainId);

        // Create provider with connection info
        const provider = new JsonRpcProvider({
          url: rpcUrl,
          timeout: 30000, // 30 second timeout
          allowGzip: true,
        });

        // IMPORTANT: Set _network before any operations to prevent automatic detection
        // This must match the actual network or calls will fail
        provider._network = {
          name: effectiveNetworkKey,
          chainId: expectedChainId,
        };

        // Add event listeners for debugging
        provider.on('debug', (info: any) => {
          // console.log('[ProviderService] Debug:', info);
        });

        provider.on('error', (error: any) => {
          console.error('[ProviderService] Provider error:', error);
        });

        this.providers.set(effectiveNetworkKey, provider);

        // Track ready state with retry logic
        const readyPromise = this.initializeNetwork(effectiveNetworkKey, expectedChainId);
        this.providerReadyPromises.set(effectiveNetworkKey, readyPromise);
      } catch (error) {
        console.error('[ProviderService] Failed to create provider:', error);
        throw error;
      }
    }

    return this.providers.get(effectiveNetworkKey)!;
  }

  private async initializeNetwork(networkKey: string, expectedChainId: number): Promise<void> {
    const provider = this.providers.get(networkKey);
    if (!provider) return;

    // Get the RPC URL for testing
    const networkConfig = getCurrentNetworkConfig(networkKey);
    const rpcUrl = networkConfig.rpcUrl;

    // First, test with a raw fetch to see if CORS is the issue
    if (networkKey === 'localhost') {
      try {
        // console.log('[ProviderService] Testing raw fetch to:', rpcUrl);
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1,
          }),
        });
        const result = await response.json();
        // console.log('[ProviderService] Raw fetch succeeded:', result);
      } catch (fetchError: any) {
        console.error('[ProviderService] Raw fetch failed:', fetchError);
        console.error('[ProviderService] This indicates a CORS or connectivity issue');
      }
    }

    // Since we pre-set the network, we just need to verify the connection works
    // by making a simple RPC call instead of using provider.ready
    let retries = 3;
    let lastError: any;

    while (retries > 0) {
      try {
        // Test connection with a simple call instead of network detection
        // console.log(`[ProviderService] Attempting getBlockNumber (try ${4 - retries}/3)...`);
        const blockNumber = await provider.getBlockNumber();
        // console.log('[ProviderService] Provider connected successfully for network:', networkKey, 'Block:', blockNumber);

        // Cache the chainId
        this.chainIds.set(networkKey, expectedChainId);

        return; // Success!
      } catch (error: any) {
        lastError = error;
        retries--;

        console.warn(`[ProviderService] Connection test failed (${3 - retries}/3):`, {
          code: error.code,
          message: error.message,
          reason: error.reason,
          stack: error.stack?.split('\n')[0],
        });

        // Check if it's a connection error
        const isConnectionError =
          error.code === 'NETWORK_ERROR' ||
          error.event === 'noNetwork' ||
          error.code === 'SERVER_ERROR' ||
          error.code === 'TIMEOUT' ||
          error.message?.includes('could not detect network');

        if (isConnectionError && networkKey === 'localhost') {
          console.error('[ProviderService] Cannot connect to localhost:8545. Please ensure a local node is running.');
          console.error('[ProviderService] Check that CORS is enabled on your local node.');
        }

        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        }
      }
    }

    // All retries failed - but don't throw, just warn and continue
    console.error('[ProviderService] Failed to connect to network after all retries:', lastError);

    if (networkKey === 'localhost') {
      console.error('[ProviderService] Common issues:');
      console.error('[ProviderService] 1. Local node is not running at http://localhost:8545');
      console.error('[ProviderService] 2. CORS is not enabled on the local node');
      console.error('[ProviderService] 3. Firewall blocking the connection');
      console.warn('[ProviderService] Continuing anyway - some features may not work until connection is established');
    }

    // Set the chainId anyway so the provider can still be used
    this.chainIds.set(networkKey, expectedChainId);
  }

  /**
   * Get cached chain ID without making an RPC call
   */
  async getCachedChainId(networkKey?: string): Promise<number> {
    const effectiveNetworkKey = networkKey || 'default';

    if (this.chainIds.has(effectiveNetworkKey)) {
      return this.chainIds.get(effectiveNetworkKey)!;
    }

    // If already fetching, return the existing promise
    if (this.chainIdPromises.has(effectiveNetworkKey)) {
      return this.chainIdPromises.get(effectiveNetworkKey)!;
    }

    // Create a promise for the chain ID fetch
    const promise = (async () => {
      try {
        const provider = this.getProvider(networkKey);
        const network = await provider.getNetwork();
        this.chainIds.set(effectiveNetworkKey, network.chainId);
        // console.log('[ProviderService] Chain ID cached for', effectiveNetworkKey, ':', network.chainId);
        return network.chainId;
      } finally {
        this.chainIdPromises.delete(effectiveNetworkKey);
      }
    })();

    this.chainIdPromises.set(effectiveNetworkKey, promise);
    return promise;
  }

  /**
   * Get provider that's guaranteed to be ready
   */
  async getReadyProvider(networkKey?: string): Promise<ethers.providers.JsonRpcProvider> {
    // Use selected network from localStorage if not specified
    let effectiveNetworkKey = networkKey;

    if (!effectiveNetworkKey) {
      const NETWORK_STORAGE_KEY = 'noma_selected_network';
      const selectedNetwork = localStorage.getItem(NETWORK_STORAGE_KEY);
      effectiveNetworkKey = selectedNetwork || 'monadTestnet';
    }

    // Map 'default' to actual network for backward compatibility
    if (effectiveNetworkKey === 'default') {
      effectiveNetworkKey = 'monadTestnet';
    }

    const provider = this.getProvider(effectiveNetworkKey);

    const readyPromise = this.providerReadyPromises.get(effectiveNetworkKey);
    if (readyPromise) {
      await readyPromise;
    }

    return provider;
  }

  /**
   * Clear a specific provider instance (useful for network switches)
   */
  clearProvider(networkKey?: string): void {
    const effectiveNetworkKey = networkKey || 'default';
    const provider = this.providers.get(effectiveNetworkKey);

    if (provider) {
      provider.removeAllListeners();
      this.providers.delete(effectiveNetworkKey);
      this.chainIds.delete(effectiveNetworkKey);
      this.chainIdPromises.delete(effectiveNetworkKey);
      this.providerReadyPromises.delete(effectiveNetworkKey);
      // console.log('[ProviderService] Cleared provider for network:', effectiveNetworkKey);
    }
  }

  /**
   * Clear all provider instances
   */
  clearAllProviders(): void {
    for (const [key, provider] of this.providers.entries()) {
      provider.removeAllListeners();
    }
    this.providers.clear();
    this.chainIds.clear();
    this.chainIdPromises.clear();
    this.providerReadyPromises.clear();
    // console.log('[ProviderService] Cleared all providers');
  }
}

// Export singleton instance
export const providerService = ProviderService.getInstance();

// Export convenience function (backward compatible - uses default network)
export const getProvider = (networkKey?: string) => providerService.getProvider(networkKey);

// Export for backward compatibility (uses default network)
export const localProvider = providerService.getProvider();
