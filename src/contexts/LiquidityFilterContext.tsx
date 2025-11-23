import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LiquidityFilterContextType {
  isLiquidityFilterEnabled: boolean;
  setIsLiquidityFilterEnabled: (enabled: boolean) => void;
}

const LiquidityFilterContext = createContext<LiquidityFilterContextType | undefined>(undefined);

export const LiquidityFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default to disabled (filter OFF)
  const [isLiquidityFilterEnabled, setIsLiquidityFilterEnabled] = useState(false);

  return (
    <LiquidityFilterContext.Provider value={{ isLiquidityFilterEnabled, setIsLiquidityFilterEnabled }}>
      {children}
    </LiquidityFilterContext.Provider>
  );
};

export const useLiquidityFilter = () => {
  const context = useContext(LiquidityFilterContext);
  if (context === undefined) {
    throw new Error('useLiquidityFilter must be used within a LiquidityFilterProvider');
  }
  return context;
};
