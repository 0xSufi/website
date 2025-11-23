import { type Chain } from 'viem';
import { SUPPORTED_NETWORKS } from '../config';

const config_testnet = SUPPORTED_NETWORKS.monadTestnet;
const config_mainnet = SUPPORTED_NETWORKS.monadMainnet;

export const monadTestnet = {
    id: config_testnet.chainId,
    name: config_testnet.displayName,
    nativeCurrency: config_testnet.nativeCurrency,
    rpcUrls: {
        default: { http: [config_testnet.rpcUrl] },
        public: { http: [config_testnet.rpcUrl] },
    },
    blockExplorers: {
        default: {
            name: 'Monad Explorer',
            url: config_testnet.blockExplorer,
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 251449,
        },
    },
    testnet: true,
} as const satisfies Chain;

export const monadMainnet = {
    id: config_mainnet.chainId,
    name: config_mainnet.displayName,
    nativeCurrency: config_mainnet.nativeCurrency,
    rpcUrls: {
        default: { http: [config_mainnet.rpcUrl] },
        public: { http: [config_mainnet.rpcUrl] },
    },
    blockExplorers: {
        default: {
            name: 'Monad Explorer',
            url: config_mainnet.blockExplorer,
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 251449,
        },
    },
    testnet: false,
} as const satisfies Chain;

export const localhost = {
    id: 1337,
    name: 'Localhost',
    nativeCurrency: {
        name: 'Monad',
        symbol: 'MON',
        decimals: 18,
    },
    rpcUrls: {
        default: { http: ['http://localhost:8545'] },
        public: { http: ['http://localhost:8545'] },
    },
    blockExplorers: {
        default: {
            name: 'Local Explorer',
            url: '',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
            blockCreated: 0,
        },
    },
    testnet: true,
} as const satisfies Chain;