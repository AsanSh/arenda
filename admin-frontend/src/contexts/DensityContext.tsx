import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DensityContextType {
  isCompact: boolean;
  toggleCompact: () => void;
}

const DensityContext = createContext<DensityContextType | undefined>(undefined);

export function DensityProvider({ children }: { children: ReactNode }) {
  const [isCompact, setIsCompact] = useState(() => {
    const saved = localStorage.getItem('density-mode');
    return saved === 'compact';
  });

  useEffect(() => {
    localStorage.setItem('density-mode', isCompact ? 'compact' : 'normal');
  }, [isCompact]);

  const toggleCompact = () => {
    setIsCompact(!isCompact);
  };

  return (
    <DensityContext.Provider value={{ isCompact, toggleCompact }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const context = useContext(DensityContext);
  if (context === undefined) {
    throw new Error('useDensity must be used within a DensityProvider');
  }
  return context;
}
