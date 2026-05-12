import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface StoreState {
  systemProfile: any;
  setSystemProfile: (data: any) => void;
  modelAnalysis: any;
  setModelAnalysis: (data: any) => void;
  strategy: any;
  setStrategy: (data: any) => void;
  modelPath: string;
  setModelPath: (path: string) => void;
  goal: string;
  setGoal: (goal: string) => void;
}

const StoreContext = createContext<StoreState | undefined>(undefined);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [systemProfile, setSystemProfile] = useState<any>(null);
  const [modelAnalysis, setModelAnalysis] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [modelPath, setModelPath] = useState('');
  const [goal, setGoal] = useState('latency');

  return (
    <StoreContext.Provider value={{
      systemProfile, setSystemProfile,
      modelAnalysis, setModelAnalysis,
      strategy, setStrategy,
      modelPath, setModelPath,
      goal, setGoal
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};