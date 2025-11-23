import { useNetworkContext } from '../contexts/NetworkContext';
import deploymentData from '../assets/deployment.json';

// Type for deployment addresses
export type DeploymentAddresses = {
    Resolver: string;
    Exchange: string;
    Factory: string;
    ModelHelper: string;
    AdaptiveSupply: string;
    RewardsCalculator: string;
    Vault?: string;
    Pool?: string;
    Proxy?: string;
    IDOHelper?: string;
};

// Full deployment type with chainId keys (for backward compatibility)
export type FullDeployment = Record<string, DeploymentAddresses>;

// Typed deployment data with chainId keys
const typedDeploymentData = deploymentData as FullDeployment;

/**
 * Hook to get the full deployment data (all networks)
 * This maintains backward compatibility with existing code
 */
export const useDeployment = (): FullDeployment => {
    // Return the full deployment data for backward compatibility
    return typedDeploymentData;
};

/**
 * Hook to get contract deployment addresses for the currently selected network only
 * Uses chainId to look up the correct deployment addresses
 */
export const useDeploymentAddresses = (): DeploymentAddresses => {
    const { selectedNetworkConfig } = useNetworkContext();
    const chainId = selectedNetworkConfig.chainId.toString();

    // Get deployment for the selected network's chainId
    const deployment = typedDeploymentData[chainId];

    if (!deployment) {
        console.warn(`[useDeploymentAddresses] No deployment found for chainId: ${chainId}`);
        // Return empty addresses as fallback
        return {
            Resolver: '',
            Exchange: '',
            Factory: '',
            ModelHelper: '',
            AdaptiveSupply: '',
            RewardsCalculator: '',
        };
    }

    return deployment;
};

/**
 * Non-hook version for use outside of React components
 * @param chainId - The chain ID to get deployment for
 */
export const getDeployment = (chainId: number): DeploymentAddresses => {
    const deployment = typedDeploymentData[chainId.toString()];

    if (!deployment) {
        console.warn(`[getDeployment] No deployment found for chainId: ${chainId}`);
        return {
            Resolver: '',
            Exchange: '',
            Factory: '',
            ModelHelper: '',
            AdaptiveSupply: '',
            RewardsCalculator: '',
        };
    }

    return deployment;
};

/**
 * Get deployment by network key
 * @param networkKey - The network key (e.g., 'monadTestnet', 'monadMainnet', 'localhost')
 */
export const getDeploymentByNetworkKey = (networkKey: string): DeploymentAddresses => {
    // Map network keys to chain IDs
    const networkToChainId: Record<string, number> = {
        localhost: 1337,
        monadTestnet: 10143,
        monadMainnet: 143,
    };

    const chainId = networkToChainId[networkKey];
    if (!chainId) {
        console.warn(`[getDeploymentByNetworkKey] Unknown network key: ${networkKey}`);
        return {
            Resolver: '',
            Exchange: '',
            Factory: '',
            ModelHelper: '',
            AdaptiveSupply: '',
            RewardsCalculator: '',
        };
    }

    return getDeployment(chainId);
};

/**
 * Hook to get the current chain ID as a string based on selected network
 * This replaces the pattern: config.chain == "local" ? "1337" : "143"
 *
 * Usage in components:
 *   const chainId = useChainId();
 *   const factoryAddress = getContractAddress(addresses, chainId, "Factory");
 */
export const useChainId = (): string => {
    const { selectedNetworkConfig } = useNetworkContext();
    return selectedNetworkConfig.chainId.toString();
};
