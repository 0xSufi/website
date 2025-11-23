import { useState, useCallback, useRef, useEffect } from 'react';
import { EmojiData } from '../components/LiveStream/EmojiOverlay';

interface UseEmojiOverlayOptions {
  streamId?: string;
  username?: string;
  onSendEmoji?: (emoji: EmojiData) => void; // Callback to send emoji via WebSocket
}

export const useEmojiOverlay = (options: UseEmojiOverlayOptions = {}) => {
  const [emojis, setEmojis] = useState<EmojiData[]>([]);
  const emojiCounterRef = useRef(0);

  // Remove emoji when it expires
  const removeEmoji = useCallback((id: string) => {
    setEmojis(prev => prev.filter(emoji => emoji.id !== id));
  }, []);

  // Add emoji to overlay
  const addEmoji = useCallback((emoji: string, animationType?: string, position?: { x: number; y: number }, username?: string) => {
    const emojiData: EmojiData = {
      id: `${Date.now()}-${++emojiCounterRef.current}`,
      emoji,
      timestamp: Date.now(),
      username: username || options.username,
      duration: animationType && animationType !== 'flow' ? 2000 : 5000, // Stickers 2s, emojis 5s
      animationType: animationType as any || 'flow',
    };

    setEmojis(prev => [...prev, emojiData]);

    // Send via WebSocket if callback provided
    if (options.onSendEmoji) {
      options.onSendEmoji(emojiData);
    }

    return emojiData.id;
  }, [options.onSendEmoji, options.username]);

  // Add emoji from external source (e.g., WebSocket)
  const addExternalEmoji = useCallback((emojiData: EmojiData) => {
    setEmojis(prev => {
      // Avoid duplicates by checking ID
      if (prev.some(e => e.id === emojiData.id)) {
        return prev;
      }
      return [...prev, emojiData];
    });
  }, []);

  // Clear all emojis
  const clearEmojis = useCallback(() => {
    setEmojis([]);
  }, []);

  // Add multiple quick reaction emojis in a burst
  const addReactionBurst = useCallback((emoji: string, animationType?: string, count: number = 3) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        addEmoji(emoji, animationType);
      }, i * 150); // Stagger the emojis
    }
  }, [addEmoji]);

  // Listen for incoming emoji events from other users
  useEffect(() => {
    const handleEmojiReceived = (event: CustomEvent) => {
      const { roomId, emojiData } = event.detail;
      
      // console.log('🎭 [useEmojiOverlay] Received emoji event:', {
        // roomId,
        // myStreamId: options.streamId,
        // emojiData,
        // myUsername: options.username,
        // emojiUsername: emojiData?.username,
        // matches: roomId === options.streamId,
        // isMyOwn: emojiData?.username === options.username
      // });
      
      // Only add emojis for the current stream
      if (roomId === options.streamId && emojiData) {
        // Don't add our own emojis (they're already added locally)
        if (emojiData.username !== options.username) {
          // console.log('✅ [useEmojiOverlay] Adding external emoji:', emojiData);
          addExternalEmoji(emojiData);
        } else {
          // console.log('⚠️ [useEmojiOverlay] Skipping own emoji');
        }
      } else {
        // console.log('❌ [useEmojiOverlay] Emoji not for this stream or missing data');
      }
    };

    window.addEventListener('stream-emoji-received', handleEmojiReceived as EventListener);
    
    return () => {
      window.removeEventListener('stream-emoji-received', handleEmojiReceived as EventListener);
    };
  }, [options.streamId, options.username, addExternalEmoji]);

  return {
    emojis,
    addEmoji,
    addExternalEmoji,
    removeEmoji,
    clearEmojis,
    addReactionBurst,
  };
};