import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { SUPPORTED_NETWORKS, DEFAULT_NETWORK, NetworkConfig } from '../config';
import { providerService } from '../services/providerService';
import { multicallService } from '../services/multicallService';
import { rpcDedupe } from '../services/rpcDeduplicationService';

interface NetworkContextType {
    // Current connected chain
    chainId: number | undefined;
    isConnected: boolean;
    address: string | undefined;
    isConnecting: boolean;

    // Selected network (may differ from connected if user needs to switch)
    selectedNetwork: string;
    selectedNetworkConfig: NetworkConfig;

    // Network management
    setSelectedNetwork: (networkKey: string) => void;
    switchToSelectedNetwork: () => Promise<void>;
    isSwitchingNetwork: boolean;

    // Available networks
    availableNetworks: typeof SUPPORTED_NETWORKS;

    // Network mismatch detection
    isNetworkMismatch: boolean;
}

const NETWORK_STORAGE_KEY = 'noma_selected_network';

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetworkContext = () => {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetworkContext must be used within NetworkProvider');
    }
    return context;
};

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Track switching state manually
    const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);

    // Track wallet state from window.ethereum directly
    const [walletChainId, setWalletChainId] = useState<number | undefined>(undefined);
    const [address, setAddress] = useState<string | undefined>(undefined);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // Load selected network from localStorage or use default
    const [selectedNetwork, setSelectedNetworkState] = useState<string>(() => {
        const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
        return stored && SUPPORTED_NETWORKS[stored] ? stored : DEFAULT_NETWORK;
    });

    // Listen to wallet state from window.ethereum
    useEffect(() => {
        const getWalletState = async () => {
            if (window.ethereum) {
                try {
                    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                    const chainIdNum = parseInt(chainIdHex, 16);
                    setWalletChainId(chainIdNum);

                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts && accounts.length > 0) {
                        setAddress(accounts[0]);
                        setIsConnected(true);
                    } else {
                        setAddress(undefined);
                        setIsConnected(false);
                    }
                } catch (error) {
                    console.error('[NetworkContext] Failed to get wallet state:', error);
                }
            }
        };

        getWalletState();

        // Listen for network changes
        const handleChainChanged = (chainIdHex: string) => {
            const chainIdNum = parseInt(chainIdHex, 16);
            setWalletChainId(chainIdNum);
        };

        // Listen for account changes
        const handleAccountsChanged = (accounts: string[]) => {
            if (accounts && accounts.length > 0) {
                setAddress(accounts[0]);
                setIsConnected(true);
            } else {
                setAddress(undefined);
                setIsConnected(false);
            }
        };

        if (window.ethereum) {
            window.ethereum.on('chainChanged', handleChainChanged);
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            return () => {
                window.ethereum.removeListener('chainChanged', handleChainChanged);
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            };
        }
    }, []);

    const selectedNetworkConfig = SUPPORTED_NETWORKS[selectedNetwork];

    // Persist network selection
    const setSelectedNetwork = useCallback((networkKey: string) => {
        if (SUPPORTED_NETWORKS[networkKey]) {
            // console.log('[NetworkContext] Setting selected network to:', networkKey);

            // Clear old provider cache to force re-initialization with new network
            // We need to clear the old selected network provider
            const oldSelectedNetwork = localStorage.getItem(NETWORK_STORAGE_KEY) || 'monadTestnet';
            providerService.clearProvider(oldSelectedNetwork);

            // Clear multicall service so it reinitializes with the new network
            multicallService.clear();
            // console.log('[NetworkContext] Cleared multicall service for network switch');

            // Clear RPC deduplication cache to force fresh balance fetches
            rpcDedupe.clearCache();
            // console.log('[NetworkContext] Cleared RPC deduplication cache for network switch');

            setSelectedNetworkState(networkKey);
            localStorage.setItem(NETWORK_STORAGE_KEY, networkKey);
        } else {
            console.warn('[NetworkContext] Invalid network key:', networkKey);
        }
    }, []);

    // Switch to selected network (or specified network)
    const switchToSelectedNetwork = useCallback(async (networkKey?: string) => {
        // Use provided networkKey or fall back to selectedNetwork from state
        const targetNetworkKey = networkKey || selectedNetwork;
        const targetNetworkConfig = SUPPORTED_NETWORKS[targetNetworkKey];

        if (!targetNetworkConfig) {
            console.warn('[NetworkContext] Invalid network key:', targetNetworkKey);
            return;
        }

        if (!window.ethereum) {
            throw new Error('No wallet detected');
        }

        try {
            setIsSwitchingNetwork(true);
            // console.log('[NetworkContext] 🔄 Switching wallet to:', targetNetworkConfig.displayName, 'chainId:', targetNetworkConfig.chainId);

            const chainIdHex = `0x${targetNetworkConfig.chainId.toString(16)}`;
            // console.log('[NetworkContext] Requesting wallet_switchEthereumChain to:', chainIdHex);

            // Use window.ethereum directly for more reliable switching
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainIdHex }],
            });

            // console.log('[NetworkContext] ✅ Wallet switched successfully');
        } catch (switchError: any) {
            // console.log('[NetworkContext] Switch error:', switchError.code, switchError.message);

            // If the network doesn't exist (error code 4902), add it manually
            if (switchError.code === 4902 || switchError.message?.includes('Unrecognized chain')) {
                // console.log('[NetworkContext] Network not in wallet, adding it...');
                await addNetworkToWallet(targetNetworkConfig);

                // Try switching again after adding
                const chainIdHex = `0x${targetNetworkConfig.chainId.toString(16)}`;
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: chainIdHex }],
                });
                // console.log('[NetworkContext] ✅ Wallet switched successfully after adding network');
            } else {
                // Other errors (user rejected, etc.)
                throw switchError;
            }
        } finally {
            setIsSwitchingNetwork(false);
        }
    }, [selectedNetwork]);

    // Add network to wallet if it doesn't exist
    const addNetworkToWallet = async (networkConfig: NetworkConfig) => {
        if (!window.ethereum) {
            throw new Error('No wallet detected');
        }

        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: `0x${networkConfig.chainId.toString(16)}`,
                    chainName: networkConfig.displayName,
                    nativeCurrency: networkConfig.nativeCurrency,
                    rpcUrls: [networkConfig.rpcUrl],
                    blockExplorerUrls: networkConfig.blockExplorer ? [networkConfig.blockExplorer] : undefined,
                }],
            });
            // console.log('[NetworkContext] Network added to wallet successfully');
        } catch (error) {
            console.error('[NetworkContext] Failed to add network to wallet:', error);
            throw error;
        }
    };

    // Detect network mismatch using actual wallet chainId
    const isNetworkMismatch = isConnected && walletChainId !== undefined && walletChainId !== selectedNetworkConfig.chainId;

    const value: NetworkContextType = {
        chainId: walletChainId,
        isConnected,
        address,
        isConnecting,
        selectedNetwork,
        selectedNetworkConfig,
        setSelectedNetwork,
        switchToSelectedNetwork,
        isSwitchingNetwork,
        availableNetworks: SUPPORTED_NETWORKS,
        isNetworkMismatch,
    };

    return (
        <NetworkContext.Provider value={value}>
            {children}
        </NetworkContext.Provider>
    );
};
