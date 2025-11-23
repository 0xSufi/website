import { useContractWrite, usePrepareContractWrite } from 'wagmi';
import { useCallback, useState, useEffect } from 'react';
import { toaster } from '../components/ui/toaster';

interface UseSafeContractWriteWithSimulationConfig {
  address?: `0x${string}`;
  abi?: any;
  functionName?: string;
  args?: any;
  chainId?: number;
  mode?: 'prepared' | 'recklesslyUnprepared';
  onError?: (error: any) => void;
  onMutate?: () => void | Promise<unknown>;
  onSettled?: (data: any, error: any) => void;
  onSuccess?: (data: any) => void;
  retryOnNonceError?: boolean;
  maxRetries?: number;
  simulateBeforeWrite?: boolean;
  onSimulationError?: (error: any) => void;
  onSimulationSuccess?: (result: any) => void;
}

export function useSafeContractWriteWithSimulation(config: UseSafeContractWriteWithSimulationConfig) {
  const { 
    retryOnNonceError = true, 
    maxRetries = 2, 
    simulateBeforeWrite = true,
    onSimulationError,
    onSimulationSuccess,
    ...wagmiConfig 
  } = config;
  
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<any>(null);
  const [currentArgs, setCurrentArgs] = useState(wagmiConfig.args);
  const [simulationComplete, setSimulationComplete] = useState(false);

  // Store the original callbacks
  const originalOnError = wagmiConfig.onError;
  const originalOnSuccess = wagmiConfig.onSuccess;

  // Use wagmi v1's prepare hook for simulation
  const { 
    config: preparedConfig, 
    error: prepareError,
    isError: isPrepareError,
    isLoading: isPreparing,
    refetch: refetchPrepare
  } = usePrepareContractWrite({
    address: wagmiConfig.address,
    abi: wagmiConfig.abi,
    functionName: wagmiConfig.functionName,
    args: currentArgs,
    enabled: simulateBeforeWrite && !!currentArgs && !!wagmiConfig.address && !!wagmiConfig.functionName,
    onError: (error: any) => {
      console.error('Contract preparation failed:', error);
      console.error('Prepare params:', {
        address: wagmiConfig.address,
        functionName: wagmiConfig.functionName,
        args: currentArgs
      });
      handleSimulationError(error);
    },
    onSuccess: (data: any) => {
      // console.log('Contract preparation successful:', data);
      setSimulationError(null);
      setSimulationComplete(true);
      if (onSimulationSuccess) {
        onSimulationSuccess(data);
      }
    }
  });

  // Handle simulation errors
  const handleSimulationError = (error: any) => {
    console.error('Transaction simulation failed:', error);
    console.error('Full error object:', {
      message: error?.message,
      reason: error?.reason,
      code: error?.code,
      data: error?.data,
      error: error?.error,
      stack: error?.stack
    });
    
    // Parse the error to provide better feedback
    let userFriendlyError = 'Transaction simulation failed';
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorReason = error?.reason?.toLowerCase() || '';
    const errorString = error?.toString?.()?.toLowerCase() || '';
    const fullError = `${errorMessage} ${errorReason} ${errorString}`;
    
    if (fullError.includes('slippageexceeded') || fullError.includes('slippage exceeded')) {
      userFriendlyError = 'Slippage tolerance exceeded. Try increasing your slippage settings.';
    } else if (fullError.includes('insufficient') || fullError.includes('balance')) {
      userFriendlyError = 'Insufficient balance for this transaction.';
    } else if (fullError.includes('allowance')) {
      userFriendlyError = 'Insufficient token allowance. Please approve the token first.';
    } else if (fullError.includes('invalidswap') || fullError.includes('invalid swap')) {
      userFriendlyError = 'Invalid swap parameters. Try adjusting the amount or slippage.';
    } else if (fullError.includes('liquidity')) {
      userFriendlyError = 'Insufficient liquidity for this trade. Try a smaller amount.';
    } else if (fullError.includes('pair')) {
      userFriendlyError = 'Invalid trading pair or pool not found.';
    } else if (error?.reason) {
      // Use the contract's revert reason if available
      userFriendlyError = error.reason;
    }
    
    setSimulationError(userFriendlyError);
    
    if (onSimulationError) {
      onSimulationError(error);
    }
  };

  // Show simulation error toast when prepare fails
  useEffect(() => {
    if (isPrepareError && prepareError && simulationError) {
      toaster.create({
        title: "Simulation Failed",
        description: simulationError,
        status: "error",
        duration: 5000,
      });
    }
  }, [isPrepareError, prepareError, simulationError]);

  // Update isSimulating based on prepare state
  useEffect(() => {
    setIsSimulating(isPreparing);
  }, [isPreparing]);

  // Enhanced write function that handles retries
  const contractWrite = useContractWrite({
    ...wagmiConfig,
    // Only use prepared config if simulation is enabled and successful
    ...(preparedConfig && simulateBeforeWrite && !isPrepareError ? preparedConfig.request || {} : {}),
    // Override mode to prevent execution without proper config
    mode: simulateBeforeWrite ? 'prepared' : wagmiConfig.mode,
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
      setSimulationError(null);
      
      // Call original success handler
      if (originalOnSuccess) {
        originalOnSuccess(data);
      }
    }
  });

  // Create a wrapped write function that respects simulation
  const write = useCallback(
    (overrideConfig?: any) => {
      if (isRetrying) {
        return;
      }
      
      // Handle args update
      const newArgs = overrideConfig?.args || wagmiConfig.args;
      
      // Update args if provided and different
      if (newArgs && JSON.stringify(newArgs) !== JSON.stringify(currentArgs)) {
        // console.log('Updating transaction args:', newArgs);
        setCurrentArgs(newArgs);
        setSimulationComplete(false); // Reset simulation state
        // Don't execute - just update args and let user retry
        // console.log('Args updated. Simulation will run automatically. Click again to execute.');
        return;
      }
      
      // Don't proceed if simulation is enabled and there's an error or not complete
      if (simulateBeforeWrite) {
        if (isPrepareError || !preparedConfig || !simulationComplete) {
          console.error('Cannot execute transaction: simulation failed or not ready');
          console.error('Simulation state:', {
            isPrepareError,
            preparedConfig,
            simulationError,
            simulationComplete,
            currentArgs
          });
          
          // Show user-friendly error
          toaster.create({
            title: "Cannot Execute Transaction",
            description: simulationError || "Transaction simulation failed or is still running. Please try again.",
            status: "error",
            duration: 5000,
          });
          
          return;
        }
      }
      
      // Only proceed if simulation is disabled OR simulation succeeded
      if (!simulateBeforeWrite || (preparedConfig && !isPrepareError && simulationComplete)) {
        return contractWrite.write?.(overrideConfig);
      }
    },
    [contractWrite.write, isRetrying, simulateBeforeWrite, isPrepareError, preparedConfig, currentArgs, wagmiConfig.args, simulationError, simulationComplete]
  );

  // Create a wrapped writeAsync function
  const writeAsync = useCallback(
    async (overrideConfig?: any) => {
      if (isRetrying) {
        throw new Error('Transaction is being retried, please wait...');
      }
      
      // Handle args update
      const newArgs = overrideConfig?.args || wagmiConfig.args;
      
      // Update args if provided and different
      if (newArgs && JSON.stringify(newArgs) !== JSON.stringify(currentArgs)) {
        // console.log('Updating transaction args for async:', newArgs);
        setCurrentArgs(newArgs);
        // Wait for prepare to complete with new args
        await new Promise(resolve => setTimeout(resolve, 200));
        const result = await refetchPrepare();
        if (result.error) {
          throw new Error(simulationError || 'Transaction simulation failed');
        }
      }
      
      // Don't proceed if simulation is enabled and there's an error
      if (simulateBeforeWrite && (isPrepareError || !preparedConfig)) {
        console.error('Cannot execute async transaction:', {
          isPrepareError,
          preparedConfig,
          simulationError
        });
        throw new Error(simulationError || 'Transaction simulation failed');
      }
      
      if (!contractWrite.writeAsync) {
        throw new Error('writeAsync is not available');
      }
      
      return contractWrite.writeAsync(overrideConfig);
    },
    [contractWrite.writeAsync, isRetrying, simulateBeforeWrite, isPrepareError, preparedConfig, simulationError, currentArgs, refetchPrepare, wagmiConfig.args]
  );

  return {
    ...contractWrite,
    write,
    writeAsync,
    isRetrying,
    retryCount,
    isSimulating,
    simulationError,
    simulationComplete,
    isPrepareError,
  };
}