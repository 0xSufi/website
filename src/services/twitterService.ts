/**
 * Twitter/X API Service
 * Handles posting tweets to X through the backend API
 */

const TWITTER_API_URL = import.meta.env.VITE_TWITTER_API_URL || 'http://localhost:6002';

export interface TweetOptions {
  text: string;
  mediaUrls?: string[];
}

export interface TweetResponse {
  success: boolean;
  tweetId?: string;
  tweetUrl?: string;
  error?: string;
  data?: any;
}

/**
 * Post a tweet to X/Twitter
 * @param options Tweet content and optional media
 * @returns Promise with tweet response
 */
export const postTweet = async (options: TweetOptions): Promise<TweetResponse> => {
  try {
    const response = await fetch(`${TWITTER_API_URL}/api/twitter/tweet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to post tweet');
    }

    return data;
  } catch (error) {
    console.error('[Twitter Service] Error posting tweet:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to post tweet',
    };
  }
};

/**
 * Verify Twitter API credentials
 * @returns Promise with verification status
 */
export const verifyTwitterCredentials = async () => {
  try {
    const response = await fetch(`${TWITTER_API_URL}/api/twitter/verify`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Twitter Service] Error verifying credentials:', error);
    return {
      success: false,
      error: 'Failed to verify credentials',
    };
  }
};

/**
 * Generate a share tweet text with token information
 * @param tokenSymbol Token symbol (e.g., "BUN")
 * @param priceChange 24h price change percentage
 * @param price Current price
 * @param url Optional URL to include
 * @returns Formatted tweet text
 */
export const generateShareText = (
  tokenSymbol: string,
  priceChange: number,
  price: number,
  url?: string
): string => {
  const emoji = priceChange > 0 ? '🚀' : '📉';
  const changeText = priceChange > 0 ? `+${priceChange.toFixed(2)}%` : `${priceChange.toFixed(2)}%`;

  let tweet = `${emoji} $${tokenSymbol} is ${priceChange > 0 ? 'up' : 'down'} ${changeText} in 24h!\n\n`;
  tweet += `Current Price: $${price.toFixed(6)}\n\n`;

  if (url) {
    tweet += `Trade now: ${url}\n\n`;
  }

  tweet += `#Crypto #${tokenSymbol} #DeFi`;

  return tweet;
};
