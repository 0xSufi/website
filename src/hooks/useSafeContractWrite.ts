import { useContractWrite, usePrepareContractWrite } from 'wagmi';
import { useCallback, useState, useEffect } from 'react';
import { toaster } from '../components/ui/toaster';

interface UseSafeContractWriteConfig {
  address?: `0x${string}`;
  abi?: any;
  functionName?: string;
  args?: any;
  chainId?: number;
  mode?: 'prepared' | 'recklesslyUnprepared';
  overrides?: any;
  value?: any;
  onError?: (error: any) => void;
  onMutate?: () => void | Promise<unknown>;
  onSettled?: (data: any, error: any) => void;
  onSuccess?: (data: any) => void;
  retryOnNonceError?: boolean;
  maxRetries?: number;
}

export function useSafeContractWrite(config: UseSafeContractWriteConfig) {
  const { retryOnNonceError = true, maxRetries = 2, overrides, ...wagmiConfig } = config;
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Store the original callbacks
  const originalOnError = wagmiConfig.onError;
  const originalOnSuccess = wagmiConfig.onSuccess;

  // Enhanced write function that handles retries
  const contractWrite = useContractWrite({
    ...wagmiConfig,
    onError: async (error: any) => {
      const errorMessage = error?.message?.toLowerCase() || '';
      
      // Check if this is a nonce error and we should retry
      if (retryOnNonceError && 
          retryCount < maxRetries && 
          (errorMessage.includes('nonce too low') || 
           errorMessage.includes('nonce is too low') ||
           errorMessage.includes('transaction nonce is too low'))) {
        
        // console.log(`Nonce error detected, retrying... (attempt ${retryCount + 1}/${maxRetries})`);
        setIsRetrying(true);
        
        // Show retry notification
        toaster.create({
          title: "Transaction retry",
          description: `Retrying transaction due to network sync issue... (${retryCount + 1}/${maxRetries})`,
          duration: 3000,
        });
        
        // Increment retry count
        setRetryCount(prev => prev + 1);
        
        // Wait a bit for the network to sync
        await new Promise(resolve => setTimeout(resolve, 2000 + (retryCount * 1000)));
        
        // Clear the error and allow user to retry
        setIsRetrying(false);
        
        // Don't call the original onError for nonce errors during retry
        return;
      }
      
      // Reset retry count on non-nonce errors
      setRetryCount(0);
      
      // Call original error handler
      if (originalOnError) {
        originalOnError(error);
      }
    },
    onSuccess: (data: any) => {
      // Reset retry count on success
      setRetryCount(0);
      setIsRetrying(false);
      
      // Call original success handler
      if (originalOnSuccess) {
        originalOnSuccess(data);
      }
    }
  });

  // Create a wrapped write function that includes retry state and merges overrides
  const write = useCallback(
    (writeArgs?: any) => {
      if (!isRetrying) {
        const finalArgs: any = { ...writeArgs };

        // Handle gas overrides via request parameter (the proper wagmi way)
        if (writeArgs?.overrides && Object.keys(writeArgs.overrides).length > 0) {
          finalArgs.request = {
            gas: undefined, // Let wagmi estimate gas
            ...writeArgs.overrides
          };
          // console.log('[useSafeContractWrite] Applying gas overrides:', writeArgs.overrides);
        } else if (overrides && Object.keys(overrides).length > 0) {
          finalArgs.request = {
            gas: undefined, // Let wagmi estimate gas
            ...overrides
          };
          // console.log('[useSafeContractWrite] Applying config gas overrides:', overrides);
        }

        // console.log('[useSafeContractWrite] Final args:', finalArgs);

        return contractWrite.write(finalArgs);
      }
    },
    [contractWrite.write, isRetrying, overrides]
  );

  // Create a wrapped writeAsync function
  const writeAsync = useCallback(
    async (args?: any) => {
      if (!isRetrying) {
        return contractWrite.writeAsync(args);
      }
      throw new Error('Transaction is being retried, please wait...');
    },
    [contractWrite.writeAsync, isRetrying]
  );

  return {
    ...contractWrite,
    write,
    writeAsync,
    isRetrying,
    retryCount
  };
}