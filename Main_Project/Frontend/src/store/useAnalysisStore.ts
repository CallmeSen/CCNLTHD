import { create } from 'zustand';
import type { AnalyzeResponse } from '../types/agent';

interface AnalysisState {
  currentResult: AnalyzeResponse | null;
  isAnalyzing: boolean;
  currentRunId: string | null;
  setAnalyzing: (value: boolean) => void;
  setResult: (result: AnalyzeResponse) => void;
  clearResult: () => void;
  setRunId: (id: string | null) => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentResult: null,
  isAnalyzing: false,
  currentRunId: null,
  setAnalyzing: (value) => set({ isAnalyzing: value }),
  setResult: (result) =>
    set({
      currentResult: result,
      currentRunId: result.run_id ?? null,
      isAnalyzing: false,
    }),
  clearResult: () => set({ currentResult: null, currentRunId: null, isAnalyzing: false }),
  setRunId: (id) => set({ currentRunId: id }),
}));
