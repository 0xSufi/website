import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';

interface PipState {
  isActive: boolean;
  position: { x: number; y: number };
  streamData?: {
    streamId: string;
    title?: string;
    broadcasterAddress?: string;
  };
  mediaStream?: MediaStream; // Transfer existing stream instead of creating new connection
}

interface PipContextType {
  pipState: PipState;
  showPip: (streamId: string, title?: string, broadcasterAddress?: string, mediaStream?: MediaStream) => void;
  hidePip: () => void;
  closePip: () => void; // Close PiP UI only, without cleanup (for maximize)
  updatePosition: (position: { x: number; y: number }) => void;
  onMaximize?: () => void;
  setOnMaximize: (callback: () => void) => void;
  isPipActive: () => boolean;
  shouldSkipCleanup: () => boolean;
  isLiveStreamModalOpen: boolean;
  setIsLiveStreamModalOpen: (open: boolean) => void;
}

const PipContext = createContext<PipContextType | undefined>(undefined);

export const PipProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pipState, setPipState] = useState<PipState>({
    isActive: false,
    position: { x: 20, y: 20 }
  });
  const [onMaximize, setOnMaximize] = useState<(() => void) | undefined>();
  const [isLiveStreamModalOpen, setIsLiveStreamModalOpen] = useState(false);

  // Use a ref to track PiP activation synchronously (avoids race conditions)
  const pipActiveRef = useRef(false);
  const skipCleanupRef = useRef(false);
  const closePipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showPip = (streamId: string, title?: string, broadcasterAddress?: string, mediaStream?: MediaStream) => {
    // console.log('[PipContext] Activating PiP with stream:', { streamId, title, hasMediaStream: !!mediaStream });

    // Clear any pending closePip timeout
    if (closePipTimeoutRef.current) {
      clearTimeout(closePipTimeoutRef.current);
      closePipTimeoutRef.current = null;
    }

    pipActiveRef.current = true;
    skipCleanupRef.current = true; // Skip cleanup while PiP is active

    setPipState(prev => ({
      ...prev,
      isActive: true,
      streamData: { streamId, title, broadcasterAddress },
      mediaStream
    }));
  };

  const closePip = () => {
    // Just close the PiP UI without cleanup (used when maximizing back to modal)
    // console.log('[PipContext] Closing PiP UI (no cleanup - returning to modal)');

    // Clear any existing timeout
    if (closePipTimeoutRef.current) {
      clearTimeout(closePipTimeoutRef.current);
    }

    // Keep pipActiveRef true for a short time to prevent cleanup during transition
    // This gives the modal time to mount before we allow cleanup
    closePipTimeoutRef.current = setTimeout(() => {
      pipActiveRef.current = false;
      skipCleanupRef.current = false;
      closePipTimeoutRef.current = null;
      // console.log('[PipContext] PiP fully closed - cleanup allowed now');
    }, 2000); // 2 second grace period for modal to mount

    setPipState(prev => ({
      ...prev,
      isActive: false,
      streamData: undefined,
      mediaStream: undefined
    }));
  };

  const hidePip = () => {
    // console.log('[PipContext] Hiding PiP and cleaning up WebRTC');
    pipActiveRef.current = false;
    skipCleanupRef.current = false;

    setPipState(prev => ({
      ...prev,
      isActive: false,
      streamData: undefined,
      mediaStream: undefined
    }));

    // Cleanup WebRTC when PiP is closed (user clicked X button)
    import('../services/webrtcService').then(({ webrtcService }) => {
      // console.log('[PipContext] Cleaning up WebRTC service');
      webrtcService.cleanup();
    });
  };

  const updatePosition = (position: { x: number; y: number }) => {
    setPipState(prev => ({
      ...prev,
      position
    }));
  };

  const isPipActive = () => pipActiveRef.current;

  const shouldSkipCleanup = () => {
    // Skip cleanup if PiP is currently active (keeps WebRTC connection alive)
    const skip = pipActiveRef.current;
    if (skip) {
      // console.log('[PipContext] shouldSkipCleanup returning true - PiP is active');
    }
    return skip;
  };

  return (
    <PipContext.Provider value={{
      pipState,
      showPip,
      hidePip,
      closePip,
      updatePosition,
      onMaximize,
      setOnMaximize,
      isPipActive,
      shouldSkipCleanup,
      isLiveStreamModalOpen,
      setIsLiveStreamModalOpen
    }}>
      {children}
    </PipContext.Provider>
  );
};

export const usePip = () => {
  const context = useContext(PipContext);
  if (context === undefined) {
    throw new Error('usePip must be used within a PipProvider');
  }
  return context;
};