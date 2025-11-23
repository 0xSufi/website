import { useSendTransaction, useAccount, useWaitForTransaction } from 'wagmi';
import { useCallback, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toaster } from '../components/ui/toaster';
import { useNetworkContext } from '../contexts/NetworkContext';

interface UseContractWriteWithGasConfig {
  address?: `0x${string}`;
  abi?: any;
  functionName?: string;
  onError?: (error: any) => void;
  onSuccess?: (data: any) => void;
}

export function useContractWriteWithGas(config: UseContractWriteWithGasConfig) {
  const { address: userAddress } = useAccount();
  const { selectedNetwork } = useNetworkContext();
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { sendTransactionAsync, isLoading: isSending } = useSendTransaction();

  // Wait for transaction to be mined
  const { isSuccess: isTxSuccess, isError: isTxError } = useWaitForTransaction({
    hash: txHash,
    enabled: !!txHash,
  });

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && txHash) {
      // console.log('[useContractWriteWithGas] Transaction mined successfully:', txHash);
      if (config.onSuccess) {
        config.onSuccess({ hash: txHash });
      }
      setTxHash(undefined);
    }
  }, [isTxSuccess, txHash, config]);

  // Handle transaction error (dropped, replaced, reverted)
  useEffect(() => {
    if (isTxError && txHash) {
      // console.log('[useContractWriteWithGas] Transaction failed:', txHash);
      setIsLoading(false);
      if (config.onError) {
        config.onError(new Error('Transaction failed'));
      } else {
        toaster.create({
          title: "Transaction failed",
          description: "The transaction was dropped or reverted",
          type: "error",
          duration: 5000,
        });
      }
      setTxHash(undefined);
    }
  }, [isTxError, txHash, config]);

  const write = useCallback(
    (params: { args?: any[]; value?: any; overrides?: any }) => {
      if (!config.address || !config.abi || !config.functionName) {
        console.error('[useContractWriteWithGas] Missing required config');
        return;
      }

      setIsLoading(true);

      // Create contract interface
      const contractInterface = new ethers.utils.Interface(config.abi);

      // Encode function call
      const data = contractInterface.encodeFunctionData(
        config.functionName,
        params.args || []
      );

      // console.log('[useContractWriteWithGas] Encoding transaction');
      // console.log('[useContractWriteWithGas] Function:', config.functionName);
      // console.log('[useContractWriteWithGas] Args:', params.args);

      // Build transaction request
      const txRequest: any = {
        to: config.address,
        data,
      };

      // Add value if provided
      // console.log('[useContractWriteWithGas] params.value:', params.value);
      // console.log('[useContractWriteWithGas] params.value type:', typeof params.value);

      if (params.value !== undefined && params.value !== null) {
        // Convert ethers.BigNumber to native BigInt if needed
        const valueToSet = typeof params.value.toBigInt === 'function'
          ? params.value.toBigInt()
          : params.value;

        // console.log('[useContractWriteWithGas] Setting value to:', valueToSet.toString());
        txRequest.value = valueToSet;
      } else {
        // console.log('[useContractWriteWithGas] No value provided');
      }

      // Add gas overrides if provided
      // Skip gas overrides for localhost networks (they often don't support EIP-1559)
      if (selectedNetwork !== 'localhost' && params.overrides && Object.keys(params.overrides).length > 0) {
        if (params.overrides.maxFeePerGas) {
          // Convert ethers.BigNumber to native BigInt if needed
          txRequest.maxFeePerGas = typeof params.overrides.maxFeePerGas.toBigInt === 'function'
            ? params.overrides.maxFeePerGas.toBigInt()
            : params.overrides.maxFeePerGas;
          // console.log('[useContractWriteWithGas] Setting maxFeePerGas:', ethers.utils.formatUnits(params.overrides.maxFeePerGas, 'gwei'), 'Gwei');
        }
        if (params.overrides.maxPriorityFeePerGas) {
          // Convert ethers.BigNumber to native BigInt if needed
          txRequest.maxPriorityFeePerGas = typeof params.overrides.maxPriorityFeePerGas.toBigInt === 'function'
            ? params.overrides.maxPriorityFeePerGas.toBigInt()
            : params.overrides.maxPriorityFeePerGas;
          // console.log('[useContractWriteWithGas] Setting maxPriorityFeePerGas:', ethers.utils.formatUnits(params.overrides.maxPriorityFeePerGas, 'gwei'), 'Gwei');
        }
      } else if (selectedNetwork === 'localhost') {
        // console.log('[useContractWriteWithGas] Skipping gas overrides for localhost network');
      }

      // console.log('[useContractWriteWithGas] Final transaction request:', txRequest);

      // Send transaction and handle promise
      sendTransactionAsync(txRequest)
        .then((result) => {
          // console.log('[useContractWriteWithGas] Transaction sent, result:', result);
          if (result?.hash) {
            setTxHash(result.hash);
            // console.log('[useContractWriteWithGas] Transaction hash:', result.hash);
          }
        })
        .catch((err: any) => {
          console.error('[useContractWriteWithGas] Transaction error:', err);
          setIsLoading(false);
          setTxHash(undefined);

          if (config.onError) {
            config.onError(err);
          } else {
            const errorMessage = err?.message || err?.shortMessage || 'Transaction failed';
            if (errorMessage.includes('User rejected') || errorMessage.includes('user rejected')) {
              toaster.create({
                title: "Transaction cancelled",
                description: "You rejected the transaction",
                type: "info",
                duration: 3000,
              });
            } else {
              toaster.create({
                title: "Transaction error",
                description: errorMessage.substring(0, 100),
                type: "error",
                duration: 5000,
              });
            }
          }
        });
    },
    [config, sendTransactionAsync, selectedNetwork]
  );

  return {
    write,
    data: txHash ? { hash: txHash } : undefined,
    error: undefined,
    isLoading: isLoading || isSending
  };
}
