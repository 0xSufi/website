import monadLogo from './assets/images/monad.svg';

const environment = import.meta.env.VITE_ENV;
const chain = import.meta.env.VITE_CHAIN;
const feeTiers = [3000, 10000];

// Check if environment is production or development
const isProduction = environment === 'prod' || environment === 'production';
const isDevelopment = environment === 'dev' || environment === 'development';

// API URL configuration based on environment
const API_URL = isDevelopment
    ? 'http://localhost:8091/api'
    : 'https://trollbox.noma.money/api';

// Use environment variables if available, otherwise use defaults
const REFERRAL_API_URL = (import.meta.env.VITE_REFERRAL_API_URL as string) || (isProduction ? 'https://trollbox.noma.money' : 'http://localhost:8090');
const VAULT_API_URL = (import.meta.env.VITE_VAULT_API_URL as string) || (isProduction ? 'https://trollbox.noma.money' : 'http://localhost:8090');
const AI_API_URL = (import.meta.env.VITE_AI_API_URL as string) || (isProduction ? 'https://trollbox.noma.money' : 'http://localhost:8090');

const blockchain_addresses = {
    143 : {
        WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A"
    },
    10143: {
        WMON: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701"
    }
}

// ============================================================================
// MULTI-NETWORK CONFIGURATION
// ============================================================================

// uniswapV3Factory: "0x961235a9020B05C44DF1026D956D1F4D78014276",
// pancakeV3Factory: "0x3b7838D96Fc18AD1972aFa17574686be79C50040",
// pancakeQuoterV2: "0x7f988126C2c5d4967Bb5E70bDeB7e26DB6BD5C28",
// uniswapQuoterV2: "0x1b4E313fEF15630AF3e6F2dE550Dbf4cC9D3081d",
// WMON: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",

export interface NetworkConfig {
    chainId: number;
    name: string;
    displayName: string;
    logo?: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    rpcUrl: string;
    blockExplorer: string;
    isTestnet: boolean;
    protocolAddresses: {
        uniswapV3Factory: string;
        pancakeV3Factory: string;
        pancakeQuoterV2: string;
        uniswapQuoterV2: string;
        WMON: string;
    };
    features?: {
        referralApi?: {
            url: string;
        };
        vault?: {
            apiUrl: string;
        };
        ai?: {
            apiUrl: string;
        };
    };
}

export const SUPPORTED_NETWORKS: Record<string, NetworkConfig> = {
    localhost: {
        chainId: 1337,
        name: 'localhost',
        displayName: 'Localhost',
        logo: monadLogo,
        nativeCurrency: {
            name: 'Monad',
            symbol: 'MON',
            decimals: 18,
        },
        rpcUrl: 'http://localhost:8545',
        blockExplorer: '',
        isTestnet: true,
        protocolAddresses: {
            uniswapV3Factory: "0x961235a9020B05C44DF1026D956D1F4D78014276",
            pancakeV3Factory: "0x3b7838D96Fc18AD1972aFa17574686be79C50040",
            pancakeQuoterV2: "0x7f988126C2c5d4967Bb5E70bDeB7e26DB6BD5C28",
            uniswapQuoterV2: "0x1b4E313fEF15630AF3e6F2dE550Dbf4cC9D3081d",
            WMON: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
        },
        features: {
            referralApi: {
                url: REFERRAL_API_URL,
            },
            vault: {
                apiUrl: VAULT_API_URL,
            },
            ai: {
                apiUrl: AI_API_URL,
            },
        },
    },
    monadTestnet: {
        chainId: 10143,
        name: 'monadTestnet',
        displayName: 'Monad Testnet',
        logo: monadLogo,
        nativeCurrency: {
            name: 'Monad',
            symbol: 'MON',
            decimals: 18,
        },
        // Always use the actual testnet RPC, not localhost (localhost has its own network config)
        rpcUrl: (import.meta.env.VITE_RPC_URL as string) || 'https://monad-testnet.drpc.org',
        blockExplorer: 'https://testnet.monadexplorer.com',
        isTestnet: true,
        protocolAddresses: {
            uniswapV3Factory: "0x961235a9020B05C44DF1026D956D1F4D78014276",
            pancakeV3Factory: "0x3b7838D96Fc18AD1972aFa17574686be79C50040",
            pancakeQuoterV2: "0x7f988126C2c5d4967Bb5E70bDeB7e26DB6BD5C28",
            uniswapQuoterV2: "0x1b4E313fEF15630AF3e6F2dE550Dbf4cC9D3081d",
            WMON: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",
        },
        features: {
            referralApi: {
                url: REFERRAL_API_URL,
            },
            vault: {
                apiUrl: VAULT_API_URL,
            },
            ai: {
                apiUrl: AI_API_URL,
            },
        },
    },
    monadMainnet: {
        chainId: 143,
        name: 'monadMainnet',
        displayName: 'Monad Mainnet',
        logo: monadLogo,
        nativeCurrency: {
            name: 'Monad',
            symbol: 'MON',
            decimals: 18,
        },
        // Always use the actual mainnet RPC, not localhost (localhost has its own network config)
        rpcUrl: (import.meta.env.VITE_RPC_URL as string) || 'https://rpc-mainnet.monadinfra.com/rpc/QQZWeL90V1vES3NSgM05o4LCoQeyKAVB',
        blockExplorer: 'https://monadexplorer.com',
        isTestnet: false,
        protocolAddresses: {
            uniswapV3Factory: "0x204FAca1764B154221e35c0d20aBb3c525710498",
            pancakeV3Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
            pancakeQuoterV2: "0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997",
            uniswapQuoterV2: "0x661e93cca42afacb172121ef892830ca3b70f08d",
            WMON: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
        },
        features: {
            referralApi: {
                url: REFERRAL_API_URL,
            },
            vault: {
                apiUrl: VAULT_API_URL,
            },
            ai: {
                apiUrl: AI_API_URL,
            },
        },
    },
};

// Default network (can be overridden by env var or user selection)
export const DEFAULT_NETWORK =
    (import.meta.env.VITE_DEFAULT_NETWORK as keyof typeof SUPPORTED_NETWORKS) ||
    'monadTestnet';

// Get current network config
export const getCurrentNetworkConfig = (networkKey?: string): NetworkConfig => {
    const key = networkKey || DEFAULT_NETWORK;
    return SUPPORTED_NETWORKS[key] || SUPPORTED_NETWORKS[DEFAULT_NETWORK];
};

// ============================================================================
// BACKWARD COMPATIBILITY - Legacy exports
// ============================================================================

// Get RPC URL from environment or default network
const RPC_URL = (import.meta.env.VITE_RPC_URL as string) || getCurrentNetworkConfig().rpcUrl;

// Legacy protocol addresses (defaults to default network)
const protocolAddresses = getCurrentNetworkConfig().protocolAddresses;

// Feature flags and settings
const features = {
    // Enable new referral API
    useNewReferralApi: import.meta.env.VITE_USE_NEW_REFERRAL_API === 'true' || true,

    // Referral API endpoint
    referralApi: {
        url: REFERRAL_API_URL,
    },

    // Trade history settings
    tradeHistory: {
        maxEventsInMemory: 1000,
        defaultTimeRange: '24h',
        defaultLimit: 50,
    },

    // Vault API settings
    vault: {
        apiUrl: VAULT_API_URL,
        cacheTimeout: 30000, // 30 seconds
    },
};

export default {
    chain,
    RPC_URL,
    API_URL,
    REFERRAL_API_URL,
    VAULT_API_URL,
    feeTiers,
    protocolAddresses,
    environment,
    isProduction,
    features,
};
