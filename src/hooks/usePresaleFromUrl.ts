import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { vaultMapping, VaultMappingService } from '../utils/vaultMapping';
import { useVaultMappingLoaded } from '../components/VaultMappingProvider';
import { vaultApiService } from '../services/vaultApiService';

interface PresaleUrlResult {
  presaleAddress: string | null;
  vaultAddress: string | null;
  presaleSlug: string | null;
  isLoading: boolean;
  error: string | null;
}

export function usePresaleFromUrl(): PresaleUrlResult {
  const { presaleSlug } = useParams<{ presaleSlug?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isLoaded: mappingsLoaded } = useVaultMappingLoaded();

  const [result, setResult] = useState<PresaleUrlResult>({
    presaleAddress: null,
    vaultAddress: null,
    presaleSlug: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    // Don't resolve until mappings are loaded
    if (!mappingsLoaded) {
      setResult({
        presaleAddress: null,
        vaultAddress: null,
        presaleSlug: null,
        isLoading: true,
        error: null
      });
      return;
    }

    const resolvePresale = async () => {

      // First check for legacy presale parameter
      const presaleParam = searchParams.get('a') || searchParams.get('presale');

      if (presaleParam) {
        // Check if it's an address
        if (VaultMappingService.isAddress(presaleParam)) {
          // It's an address, try to get the slug
          const slug = vaultMapping.addressToSlug(presaleParam);

          if (slug && presaleSlug === undefined) {
            // Redirect to pretty URL
            const newPath = window.location.pathname.replace(/\/$/, '') + '/' + slug;
            // Preserve referral code if present
            const referralCode = searchParams.get('r');
            const fullPath = referralCode ? `${newPath}?r=${referralCode}` : newPath;
            navigate(fullPath, { replace: true });
            return;
          }

          // Fetch vault data to get presale contract
          try {
            const vaultData = await vaultApiService.getVaultByAddress(presaleParam);
            if (vaultData && vaultData.presaleContract) {
              setResult({
                presaleAddress: vaultData.presaleContract,
                vaultAddress: presaleParam,
                presaleSlug: slug || null,
                isLoading: false,
                error: null
              });
            } else {
              setResult({
                presaleAddress: null,
                vaultAddress: presaleParam,
                presaleSlug: slug || null,
                isLoading: false,
                error: 'No presale contract found for this vault'
              });
            }
          } catch (error) {
            console.error('[usePresaleFromUrl] Failed to fetch vault data:', error);
            setResult({
              presaleAddress: null,
              vaultAddress: null,
              presaleSlug: null,
              isLoading: false,
              error: `Failed to fetch vault data: ${error}`
            });
          }
        } else {
          // Treat as slug
          const vaultAddress = vaultMapping.slugToAddress(presaleParam);

          if (vaultAddress) {
            // Fetch vault data to get presale contract
            try {
              const vaultData = await vaultApiService.getVaultByAddress(vaultAddress);
              if (vaultData && vaultData.presaleContract) {
                setResult({
                  presaleAddress: vaultData.presaleContract,
                  vaultAddress: vaultAddress,
                  presaleSlug: presaleParam,
                  isLoading: false,
                  error: null
                });
              } else {
                setResult({
                  presaleAddress: null,
                  vaultAddress: vaultAddress,
                  presaleSlug: presaleParam,
                  isLoading: false,
                  error: 'No presale contract found for this vault'
                });
              }
            } catch (error) {
              console.error('[usePresaleFromUrl] Failed to fetch vault data:', error);
              setResult({
                presaleAddress: null,
                vaultAddress: null,
                presaleSlug: null,
                isLoading: false,
                error: `Failed to fetch vault data: ${error}`
              });
            }
          } else {
            setResult({
              presaleAddress: null,
              vaultAddress: null,
              presaleSlug: null,
              isLoading: false,
              error: `Invalid presale identifier: ${presaleParam}`
            });
          }
        }
      } else if (presaleSlug) {
        // Using new pretty URL format
        const vaultAddress = vaultMapping.slugToAddress(presaleSlug);

        if (vaultAddress) {
          // Fetch vault data to get presale contract
          try {
            const vaultData = await vaultApiService.getVaultByAddress(vaultAddress);
            if (vaultData && vaultData.presaleContract) {
              setResult({
                presaleAddress: vaultData.presaleContract,
                vaultAddress: vaultAddress,
                presaleSlug: presaleSlug,
                isLoading: false,
                error: null
              });
            } else {
              setResult({
                presaleAddress: null,
                vaultAddress: vaultAddress,
                presaleSlug: presaleSlug,
                isLoading: false,
                error: 'No presale contract found for this vault'
              });
            }
          } catch (error) {
            console.error('[usePresaleFromUrl] Failed to fetch vault data:', error);
            setResult({
              presaleAddress: null,
              vaultAddress: null,
              presaleSlug: null,
              isLoading: false,
              error: `Failed to fetch vault data: ${error}`
            });
          }
        } else {
          // Try to interpret as token symbol
          const vaultInfo = vaultMapping.getVaultBySymbol(presaleSlug);

          if (vaultInfo) {
            // Fetch vault data to get presale contract
            try {
              const vaultData = await vaultApiService.getVaultByAddress(vaultInfo.address);
              if (vaultData && vaultData.presaleContract) {
                setResult({
                  presaleAddress: vaultData.presaleContract,
                  vaultAddress: vaultInfo.address,
                  presaleSlug: vaultInfo.slug,
                  isLoading: false,
                  error: null
                });
              } else {
                setResult({
                  presaleAddress: null,
                  vaultAddress: vaultInfo.address,
                  presaleSlug: vaultInfo.slug,
                  isLoading: false,
                  error: 'No presale contract found for this vault'
                });
              }
            } catch (error) {
              console.error('[usePresaleFromUrl] Failed to fetch vault data:', error);
              setResult({
                presaleAddress: null,
                vaultAddress: null,
                presaleSlug: null,
                isLoading: false,
                error: `Failed to fetch vault data: ${error}`
              });
            }
          } else {
            setResult({
              presaleAddress: null,
              vaultAddress: null,
              presaleSlug: null,
              isLoading: false,
              error: `Presale not found: ${presaleSlug}`
            });
          }
        }
      } else {
        // No presale specified
        setResult({
          presaleAddress: null,
          vaultAddress: null,
          presaleSlug: null,
          isLoading: false,
          error: null
        });
      }
    };

    resolvePresale();
  }, [presaleSlug, searchParams, navigate, mappingsLoaded]);

  return result;
}

// Hook to generate presale URLs
export function usePresaleUrl() {
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

  return {
    generatePresaleUrl
  };
}
