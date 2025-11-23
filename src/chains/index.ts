import { type Chain } from 'viem';

export { monadTestnet, monadMainnet, localhost } from './monad-testnet';
import { monadMainnet, monadTestnet, localhost } from './monad-testnet';

export const ALL_CHAINS: Chain[] = [
    monadTestnet,
    monadMainnet,
    localhost,
];

export const getChainById = (chainId: number): Chain | undefined => {
    return ALL_CHAINS.find(chain => chain.id === chainId);
};

export const getChainByNetworkKey = (networkKey: string): Chain | undefined => {
    const chainMap: Record<string, Chain> = {
        monadTestnet,
        monadMainnet,
        localhost,
    };
    return chainMap[networkKey];
};
