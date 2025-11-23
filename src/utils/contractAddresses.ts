import { useNetworkContext } from '../contexts/NetworkContext';
import { SUPPORTED_NETWORKS, getCurrentNetworkConfig } from '../config';

/**
 * Hook to get protocol addresses for the selected network
 */
export const useProtocolAddresses = () => {
    const { selectedNetworkConfig } = useNetworkContext();
    return selectedNetworkConfig.protocolAddresses;
};

/**
 * Hook to get network features for the selected network
 */
export const useNetworkFeatures = () => {
    const { selectedNetworkConfig } = useNetworkContext();
    return selectedNetworkConfig.features || {};
};

/**
 * Hook to get the selected network configuration
 */
export const useSelectedNetworkConfig = () => {
    const { selectedNetworkConfig } = useNetworkContext();
    return selectedNetworkConfig;
};

/**
 * Get protocol addresses for a specific network (non-hook, for use outside React components)
 */
export const getProtocolAddresses = (networkKey: string) => {
    return SUPPORTED_NETWORKS[networkKey]?.protocolAddresses;
};

/**
 * Get network configuration for a specific network (non-hook)
 */
export const getNetworkConfig = (networkKey?: string) => {
    return getCurrentNetworkConfig(networkKey);
};
