// Vault address to token symbol mapping service
import { ethers } from 'ethers';

interface VaultInfo {
  address: string;
  tokenSymbol: string;
  tokenName: string;
  slug: string; // URL-friendly identifier
}

// This would ideally come from an API or be generated from on-chain data
const VAULT_MAPPINGS: VaultInfo[] = [
  // Add your vault mappings here
  // Example:
  // {
  //   address: '0x1df48d9738e38A40fBf3B329865f4bc772e907F4',
  //   tokenSymbol: 'NOMA',
  //   tokenName: 'Noma Token',
  //   slug: 'noma'
  // }
];

export class VaultMappingService {
  private static instance: VaultMappingService;
  private vaultsByAddress: Map<string, VaultInfo> = new Map();
  private vaultsBySlug: Map<string, VaultInfo> = new Map();
  private vaultsBySymbol: Map<string, VaultInfo> = new Map();
  private isInitialized: boolean = false;
  private lastUpdated: number | null = null;
  private currentApiUrl: string | null = null;

  private constructor() {
    this.initializeMappings();
  }

  static getInstance(): VaultMappingService {
    if (!VaultMappingService.instance) {
      VaultMappingService.instance = new VaultMappingService();
    }
    return VaultMappingService.instance;
  }

  private initializeMappings() {
    // Load from localStorage first
    try {
      const cached = localStorage.getItem('noma_vault_mappings');
      const lastUpdatedStr = localStorage.getItem('noma_vault_mappings_updated');

      if (cached) {
        const mappings = JSON.parse(cached);
        mappings.forEach((vault: VaultInfo) => this.addVaultMapping(vault));
        // console.log('[VaultMapping] Loaded', mappings.length, 'mappings from cache');
      }

      if (lastUpdatedStr) {
        this.lastUpdated = parseInt(lastUpdatedStr, 10);
        const age = Date.now() - this.lastUpdated;
        // console.log('[VaultMapping] Cache age:', Math.round(age / 1000 / 60), 'minutes');
      }
    } catch (error) {
      console.error('[VaultMapping] Failed to load cached mappings:', error);
    }

    VAULT_MAPPINGS.forEach(vault => {
      const normalizedAddress = vault.address.toLowerCase();
      this.vaultsByAddress.set(normalizedAddress, vault);
      this.vaultsBySlug.set(vault.slug.toLowerCase(), vault);
      this.vaultsBySymbol.set(vault.tokenSymbol.toUpperCase(), vault);
    });
    this.isInitialized = true;
  }

  // Add a new vault mapping dynamically
  addVaultMapping(vault: VaultInfo) {
    const normalizedAddress = vault.address.toLowerCase();
    this.vaultsByAddress.set(normalizedAddress, vault);
    this.vaultsBySlug.set(vault.slug.toLowerCase(), vault);
    this.vaultsBySymbol.set(vault.tokenSymbol.toUpperCase(), vault);
  }

  // Get vault info by address
  getVaultByAddress(address: string): VaultInfo | undefined {
    return this.vaultsByAddress.get(address.toLowerCase());
  }

  // Get vault info by URL slug
  getVaultBySlug(slug: string): VaultInfo | undefined {
    return this.vaultsBySlug.get(slug.toLowerCase());
  }

  // Get vault info by token symbol
  getVaultBySymbol(symbol: string): VaultInfo | undefined {
    return this.vaultsBySymbol.get(symbol.toUpperCase());
  }

  // Convert address to slug
  addressToSlug(address: string): string | undefined {
    const vault = this.getVaultByAddress(address);
    return vault?.slug;
  }

  // Convert slug to address
  slugToAddress(slug: string): string | undefined {
    const vault = this.getVaultBySlug(slug);
    return vault?.address;
  }

  // Create a slug from token symbol (for new vaults)
  static createSlug(tokenSymbol: string, tokenPair?: string): string {
    const base = tokenSymbol.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (tokenPair) {
      const pair = tokenPair.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return `${base}-${pair}`;
    }
    return base;
  }

  // Validate if string is a valid ethereum address
  static isAddress(value: string): boolean {
    return ethers.utils.isAddress(value);
  }

  // Load vault mappings from API or local storage
  async loadVaultMappings(apiUrl?: string) {
    if (apiUrl) {
      this.currentApiUrl = apiUrl;
      try {
        const response = await fetch(apiUrl);
        const vaults = await response.json();

        // console.log('[VaultMapping] Loaded vaults from API:', vaults.length);
        vaults.forEach((vault: any) => {
          // Handle both vault.vault and vault.address formats
          const vaultAddress = vault.vault || vault.address;
          if (vaultAddress && vault.tokenSymbol) {
            const mapping = {
              address: vaultAddress,
              tokenSymbol: vault.tokenSymbol,
              tokenName: vault.tokenName || vault.tokenSymbol,
              slug: VaultMappingService.createSlug(vault.tokenSymbol)
            };
            this.addVaultMapping(mapping);
            // console.log('[VaultMapping] Added mapping:', mapping.tokenSymbol, '->', mapping.slug, 'address:', mapping.address);
          }
        });
      } catch (error) {
        console.error('Failed to load vault mappings:', error);
        throw error; // Re-throw to let caller handle
      }
    }

    // Save to cache after loading from API
    this.saveMappingsToCache();
  }

  // Save current mappings to localStorage
  saveMappingsToCache() {
    const mappings = Array.from(this.vaultsByAddress.values());
    localStorage.setItem('noma_vault_mappings', JSON.stringify(mappings));
    localStorage.setItem('noma_vault_mappings_updated', Date.now().toString());
    this.lastUpdated = Date.now();
  }

  // Get all vault mappings
  getAllVaults(): VaultInfo[] {
    return Array.from(this.vaultsByAddress.values());
  }

  // Check if service is initialized
  isReady(): boolean {
    return this.isInitialized && this.vaultsByAddress.size > 0;
  }

  // Refresh mappings from API
  async refresh(): Promise<void> {
    if (!this.currentApiUrl) {
      console.warn('[VaultMapping] No API URL set, cannot refresh');
      return;
    }

    // console.log('[VaultMapping] Refreshing mappings from API...');

    // Clear existing mappings (except hardcoded ones)
    this.vaultsByAddress.clear();
    this.vaultsBySlug.clear();
    this.vaultsBySymbol.clear();

    // Re-add hardcoded mappings
    VAULT_MAPPINGS.forEach(vault => {
      const normalizedAddress = vault.address.toLowerCase();
      this.vaultsByAddress.set(normalizedAddress, vault);
      this.vaultsBySlug.set(vault.slug.toLowerCase(), vault);
      this.vaultsBySymbol.set(vault.tokenSymbol.toUpperCase(), vault);
    });

    // Reload from API
    await this.loadVaultMappings(this.currentApiUrl);
    // console.log('[VaultMapping] Refresh complete');
  }

  // Get last update timestamp
  getLastUpdated(): number | null {
    return this.lastUpdated;
  }

  // Check if mappings need refresh (based on age threshold in milliseconds)
  needsRefresh(maxAgeMs: number): boolean {
    if (!this.lastUpdated) return true;
    return Date.now() - this.lastUpdated > maxAgeMs;
  }
}

// Export singleton instance
export const vaultMapping = VaultMappingService.getInstance();