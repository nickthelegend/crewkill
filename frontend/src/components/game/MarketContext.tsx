'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Player } from './PredictionMarket';

interface MarketContextType {
  selectedSuspect: string;
  setSelectedSuspect: (id: string) => void;
  betAmount: string;
  setBetAmount: (amount: string) => void;
  totalPot: number;
  setTotalPot: (v: number) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export function MarketProvider({ children }: { children: ReactNode }) {
  const [selectedSuspect, setSelectedSuspect] = useState('');
  const [betAmount, setBetAmount] = useState('0.1');
  const [totalPot, setTotalPot] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  return (
    <MarketContext.Provider value={{ 
      selectedSuspect, setSelectedSuspect, 
      betAmount, setBetAmount,
      totalPot, setTotalPot,
      isOpen, setIsOpen,
      loading, setLoading
    }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) throw new Error('useMarket must be used within MarketProvider');
  return context;
}
