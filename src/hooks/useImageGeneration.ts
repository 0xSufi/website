import { useState, useCallback } from 'react';
import { useNetworkContext } from '../contexts/NetworkContext';

interface ImageGenerationResult {
  images: string[];  // URLs to the 3 generated images
}

interface UseImageGeneration {
  generate: (prompt: string) => Promise<void>;
  status: 'idle' | 'loading' | 'success' | 'error';
  result: ImageGenerationResult | null;
  error: string | null;
  progress: number;
  reset: () => void;
}

export function useImageGeneration(): UseImageGeneration {
  const { selectedNetworkConfig } = useNetworkContext();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ImageGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);

  const API_BASE_URL = selectedNetworkConfig.features?.ai?.apiUrl || 'http://localhost:8090';

  const generate = useCallback(async (prompt: string) => {
    try {
      setStatus('loading');
      setError(null);
      setProgress(0);
      setResult(null);

      // Create job
      const createResponse = await fetch(`${API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.error || 'Failed to create job');
      }

      const { job } = await createResponse.json();
      const jobId = job.id;

      // Poll for completion
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds

        const statusResponse = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);

        if (!statusResponse.ok) {
          throw new Error('Failed to check job status');
        }

        const { job: jobData } = await statusResponse.json();

        setProgress(jobData.progress);

        if (jobData.status === 'completed') {
          // Extract the 3 image URLs
          // The API returns base filename, we need to construct URLs for -1, -2, -3 variants
          const baseFilename = jobData.result.filename;

          // Remove any existing suffix and extension to get the true base name
          // Example: "crypto-token-icon-2025-11-14_1763139330734.png" -> "crypto-token-icon-2025-11-14_1763139330734"
          const baseNameWithoutExt = baseFilename.replace(/(-\d+)?\.png$/, '');

          const images = [1, 2, 3].map(i => {
            const name = `${baseNameWithoutExt}-${i}.png`;
            return `${API_BASE_URL}/images/${name}`;
          });

          setResult({ images });
          setStatus('success');
          break;
        } else if (jobData.status === 'failed') {
          throw new Error(jobData.error || 'Image generation failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
      setProgress(0);
    }
  }, [API_BASE_URL]);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setProgress(0);
  }, []);

  return { generate, status, result, error, progress, reset };
}
