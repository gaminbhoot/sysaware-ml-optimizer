import { createContext, useContext, useState } from "react";
import type { ReactNode, Dispatch, SetStateAction } from "react";

interface StoreState {
  systemProfile: any;
  setSystemProfile: Dispatch<SetStateAction<any>>;
  modelAnalysis: any;
  setModelAnalysis: Dispatch<SetStateAction<any>>;
  strategy: any;
  setStrategy: Dispatch<SetStateAction<any>>;
  modelPath: string;
  setModelPath: Dispatch<SetStateAction<string>>;
  goal: string;
  setGoal: Dispatch<SetStateAction<string>>;
  lmStudioHost: string;
  setLmStudioHost: Dispatch<SetStateAction<string>>;
  lmStudioPort: number;
  setLmStudioPort: Dispatch<SetStateAction<number>>;
  // Live Tuning State
  isTuning: boolean;
  setIsTuning: Dispatch<SetStateAction<boolean>>;
  tuningProgress: string;
  setTuningProgress: Dispatch<SetStateAction<string>>;
  tuningCandidates: any[];
  setTuningCandidates: Dispatch<SetStateAction<any[]>>;
  winningConfig: any;
  setWinningConfig: Dispatch<SetStateAction<any>>;
  // Path A: Diagnostic State
  isDiagnosing: boolean;
  setIsDiagnosing: Dispatch<SetStateAction<boolean>>;
  diagnosticFindings: any[];
  setDiagnosticFindings: Dispatch<SetStateAction<any[]>>;
  // Path B: Runtime Tuner State
  isRuntimeTuning: boolean;
  setIsRuntimeTuning: Dispatch<SetStateAction<boolean>>;
  runtimeTuningProgress: any[];
  setRuntimeTuningProgress: Dispatch<SetStateAction<any[]>>;
  optimalRuntimeConfig: any;
  setOptimalRuntimeConfig: Dispatch<SetStateAction<any>>;
}

const StoreContext = createContext<StoreState | undefined>(undefined);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [systemProfile, setSystemProfile] = useState<any>(null);
  const [modelAnalysis, setModelAnalysis] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [modelPath, setModelPath] = useState("");
  const [goal, setGoal] = useState("latency");
  const [lmStudioHost, setLmStudioHost] = useState("127.0.0.1");
  const [lmStudioPort, setLmStudioPort] = useState(1234);
  
  // Live Tuning
  const [isTuning, setIsTuning] = useState(false);
  const [tuningProgress, setTuningProgress] = useState("Idle");
  const [tuningCandidates, setTuningCandidates] = useState<any[]>([]);
  const [winningConfig, setWinningConfig] = useState<any>(null);

  // Path A
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticFindings, setDiagnosticFindings] = useState<any[]>([]);

  // Path B
  const [isRuntimeTuning, setIsRuntimeTuning] = useState(false);
  const [runtimeTuningProgress, setRuntimeTuningProgress] = useState<any[]>([]);
  const [optimalRuntimeConfig, setOptimalRuntimeConfig] = useState<any>(null);

  return (
    <StoreContext.Provider value={{
      systemProfile, setSystemProfile,
      modelAnalysis, setModelAnalysis,
      strategy, setStrategy,
      modelPath, setModelPath,
      goal, setGoal,
      lmStudioHost, setLmStudioHost,
      lmStudioPort, setLmStudioPort,
      isTuning, setIsTuning,
      tuningProgress, setTuningProgress,
      tuningCandidates, setTuningCandidates,
      winningConfig, setWinningConfig,
      isDiagnosing, setIsDiagnosing,
      diagnosticFindings, setDiagnosticFindings,
      isRuntimeTuning, setIsRuntimeTuning,
      runtimeTuningProgress, setRuntimeTuningProgress,
      optimalRuntimeConfig, setOptimalRuntimeConfig
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
};
