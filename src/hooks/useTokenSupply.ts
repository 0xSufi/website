import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getProvider } from "../services/providerService";
import { useNetworkContext } from "../contexts/NetworkContext";
import deployment from "../assets/deployment.json";

interface TokenSupplyData {
  totalSupply: string | null;
  circulatingSupply: string | null;
  loading: boolean;
  error: string | null;
}

interface UseTokenSupplyOptions {
  tokenAddress?: string;
  vaultAddress?: string;
  poolAddress?: string;
  enabled?: boolean;
  refetchInterval?: number;
}

const ERC20_ABI = [
  "function totalSupply() view returns (uint256)",
  "function decimals() view returns (uint8)",
];

const MODEL_HELPER_ABI = [
  "function getCirculatingSupply(address pool, address vault) view returns (uint256)",
];

export const useTokenSupply = (options: UseTokenSupplyOptions = {}): TokenSupplyData => {
  const {
    tokenAddress,
    vaultAddress,
    poolAddress,
    enabled = true,
    refetchInterval,
  } = options;

  const { selectedNetworkConfig } = useNetworkContext();
  const [totalSupply, setTotalSupply] = useState<string | null>(null);
  const [circulatingSupply, setCirculatingSupply] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchSupplyData = async () => {
      setLoading(true);
      setError(null);

      try {
        const provider = getProvider();

        // Fetch total supply from ERC20 contract
        if (tokenAddress && ethers.utils.isAddress(tokenAddress)) {
          try {
            const tokenContract = new ethers.Contract(
              tokenAddress,
              ERC20_ABI,
              provider
            );

            const [totalSupplyRaw, decimals] = await Promise.all([
              tokenContract.totalSupply(),
              tokenContract.decimals(),
            ]);

            const formattedTotalSupply = ethers.utils.formatUnits(totalSupplyRaw, decimals);
            setTotalSupply(formattedTotalSupply);
          } catch (err) {
            console.error("Error fetching total supply:", err);
          }
        }

        // Fetch circulating supply from ModelHelper
        if (
          vaultAddress &&
          poolAddress &&
          ethers.utils.isAddress(vaultAddress) &&
          ethers.utils.isAddress(poolAddress)
        ) {
          try {
            // Get ModelHelper address from deployment config
            const chainId = selectedNetworkConfig.chainId.toString();
            const modelHelperAddress = (deployment as any)[chainId]?.ModelHelper;

            if (!modelHelperAddress) {
              console.warn(`ModelHelper address not found for chainId ${chainId}`);
              return;
            }

            const modelHelperContract = new ethers.Contract(
              modelHelperAddress,
              MODEL_HELPER_ABI,
              provider
            );

            const circulatingSupplyRaw = await modelHelperContract.getCirculatingSupply(
              poolAddress,
              vaultAddress
            );

            // Get decimals from token contract to format circulating supply
            if (tokenAddress && ethers.utils.isAddress(tokenAddress)) {
              const tokenContract = new ethers.Contract(
                tokenAddress,
                ERC20_ABI,
                provider
              );
              const decimals = await tokenContract.decimals();
              const formattedCirculatingSupply = ethers.utils.formatUnits(
                circulatingSupplyRaw,
                decimals
              );
              setCirculatingSupply(formattedCirculatingSupply);
            }
          } catch (err) {
            console.error("Error fetching circulating supply:", err);
          }
        }
      } catch (err: any) {
        console.error("Error fetching supply data:", err);
        setError(err.message || "Failed to fetch supply data");
      } finally {
        setLoading(false);
      }
    };

    fetchSupplyData();

    // Set up refetch interval if provided
    if (refetchInterval && refetchInterval > 0) {
      const interval = setInterval(fetchSupplyData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [tokenAddress, vaultAddress, poolAddress, enabled, refetchInterval, selectedNetworkConfig.chainId]);

  return {
    totalSupply,
    circulatingSupply,
    loading,
    error,
  };
};
