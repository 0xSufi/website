import { useState } from 'react';
import { useNetworkContext } from '../contexts/NetworkContext';

interface GenerateOptions {
  model?: 'claude' | 'openai';
  maxTokens?: number;
  temperature?: number;
}

interface AIResponse {
  success: boolean;
  alternatives: string[];
  model: string;
  cached: boolean;
  duration: string;
}

interface AIGenerationResult {
  generate: (prompt: string, options?: GenerateOptions) => Promise<string[]>;
  loading: boolean;
  error: string | null;
}

export const useAIGeneration = (): AIGenerationResult => {
  const { selectedNetworkConfig } = useNetworkContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (prompt: string, options: GenerateOptions = {}): Promise<string[]> => {
    setLoading(true);
    setError(null);

    try {
      const apiUrl = selectedNetworkConfig.features?.ai?.apiUrl || 'http://localhost:8090';
      // console.log('[AI] Making request to:', `${apiUrl}/api/ai/generate`);
      // console.log('[AI] Prompt:', prompt.substring(0, 100) + '...');
      // console.log('[AI] Full config:', selectedNetworkConfig.features);

      const response = await fetch(`${apiUrl}/api/ai/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model: options.model || 'claude',
          maxTokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7
        })
      });

      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a minute and try again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate text');
      }

      const data: AIResponse = await response.json();

      if (data.cached) {
        // console.log('[AI] Returned cached response');
      }

      // console.log('[AI] Received alternatives:', data.alternatives?.length || 0);

      return data.alternatives || [];

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, error };
};
