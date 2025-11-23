import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { vaultMapping, VaultMappingService } from '../utils/vaultMapping';
import { useVaultMappingLoaded } from '../components/VaultMappingProvider';

interface VaultUrlResult {
  vaultAddress: string | null;
  vaultSlug: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useVaultFromUrl(): VaultUrlResult {
  const { vaultSlug } = useParams<{ vaultSlug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoaded: mappingsLoaded } = useVaultMappingLoaded();

  const [result, setResult] = useState<VaultUrlResult>({
    vaultAddress: null,
    vaultSlug: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    // Don't resolve until mappings are loaded
    if (!mappingsLoaded) {
      setResult({
        vaultAddress: null,
        vaultSlug: null,
        isLoading: true,
        error: null
      });
      return;
    }

    const resolveVault = async () => {
      // console.log('[useVaultFromUrl] Resolving vault - slug:', vaultSlug, 'search:', searchParams.toString());
      
      // First check for legacy vault parameter
      const vaultParam = searchParams.get('vault') || searchParams.get('v');
      
      if (vaultParam) {
        // console.log('[useVaultFromUrl] Found vault param:', vaultParam);
        // Check if it's an address
        if (VaultMappingService.isAddress(vaultParam)) {
          // It's an address, try to get the slug
          const slug = vaultMapping.addressToSlug(vaultParam);
          
          if (slug && vaultSlug === undefined) {
            // Redirect to pretty URL
            const newPath = window.location.pathname.replace(/\/$/, '') + '/' + slug;
            navigate(newPath, { replace: true });
            return;
          }
          
          setResult({
            vaultAddress: vaultParam,
            vaultSlug: slug || null,
            isLoading: false,
            error: null
          });
        } else {
          // Treat as slug
          const address = vaultMapping.slugToAddress(vaultParam);
          
          if (address) {
            setResult({
              vaultAddress: address,
              vaultSlug: vaultParam,
              isLoading: false,
              error: null
            });
          } else {
            setResult({
              vaultAddress: null,
              vaultSlug: null,
              isLoading: false,
              error: `Invalid vault identifier: ${vaultParam}`
            });
          }
        }
      } else if (vaultSlug) {
        // console.log('[useVaultFromUrl] Using pretty URL with slug:', vaultSlug);
        // Using new pretty URL format
        const address = vaultMapping.slugToAddress(vaultSlug);
        // console.log('[useVaultFromUrl] Resolved address:', address);
        
        if (address) {
          setResult({
            vaultAddress: address,
            vaultSlug: vaultSlug,
            isLoading: false,
            error: null
          });
        } else {
          // Try to interpret as token symbol
          const vaultInfo = vaultMapping.getVaultBySymbol(vaultSlug);

          if (vaultInfo) {
            // If found by symbol, redirect to the correct slug
            // console.log('[useVaultFromUrl] Found vault by symbol, redirecting to correct slug:', vaultInfo.slug);
            const newPath = window.location.pathname.replace(vaultSlug, vaultInfo.slug);
            navigate(newPath, { replace: true });
            return;
          } else {
            console.warn('[useVaultFromUrl] Vault not found for slug:', vaultSlug);
            setResult({
              vaultAddress: null,
              vaultSlug: vaultSlug, // Keep the slug so we can show the error
              isLoading: false,
              error: `Vault not found: ${vaultSlug}. Please check the URL or select a vault from the available options.`
            });
          }
        }
      } else {
        // No vault specified
        setResult({
          vaultAddress: null,
          vaultSlug: null,
          isLoading: false,
          error: null
        });
      }
    };

    resolveVault();
  }, [vaultSlug, searchParams, navigate, mappingsLoaded]);

  return result;
}

// Hook to generate vault URLs
export function useVaultUrl() {
  const generateUrl = useCallback((path: string, vaultAddress: string): string => {
    const slug = vaultMapping.addressToSlug(vaultAddress);

    if (slug) {
      // Return pretty URL
      return `${path}/${slug}`;
    } else {
      // Fallback to address parameter
      return `${path}?vault=${vaultAddress}`;
    }
  }, []);

  const generateLiquidityUrl = useCallback((vaultAddress: string): string => {
    return generateUrl('/liquidity', vaultAddress);
  }, [generateUrl]);

  const generateBorrowUrl = useCallback((vaultAddress: string): string => {
    return generateUrl('/borrow', vaultAddress);
  }, [generateUrl]);

  const generateStakeUrl = useCallback((vaultAddress: string): string => {
    return generateUrl('/stake', vaultAddress);
  }, [generateUrl]);

  const generatePresaleUrl = useCallback((presaleAddress: string, referralCode?: string, vaultAddress?: string): string => {
    // Use vault address for slug lookup if provided, otherwise try presale address
    const slug = vaultMapping.addressToSlug(vaultAddress || presaleAddress);

    if (slug) {
      // Return pretty URL
      const baseUrl = `/presale/${slug}`;
      return referralCode ? `${baseUrl}?r=${referralCode}` : baseUrl;
    } else {
      // Fallback to address parameter
      const baseUrl = `/presale?a=${presaleAddress}`;
      return referralCode ? `${baseUrl}&r=${referralCode}` : baseUrl;
    }
  }, []);

  const generateExchangeUrl = useCallback((vaultAddress: string): string => {
    return generateUrl('/exchange', vaultAddress);
  }, [generateUrl]);

  return {
    generateUrl,
    generateLiquidityUrl,
    generateBorrowUrl,
    generateStakeUrl,
    generatePresaleUrl,
    generateExchangeUrl
  };
}