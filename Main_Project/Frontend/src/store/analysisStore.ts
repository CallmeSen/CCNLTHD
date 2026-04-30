import { create } from 'zustand'
import type { AnalyzeResponse } from '../types'

interface AnalysisState {
  currentResult: AnalyzeResponse | null
  isAnalyzing: boolean
  currentRunId: string | null
  setAnalyzing: (v: boolean) => void
  setResult: (result: AnalyzeResponse) => void
  clearResult: () => void
  setRunId: (id: string) => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  currentResult: null,
  isAnalyzing: false,
  currentRunId: null,
  setAnalyzing: (v) => set({ isAnalyzing: v }),
  setResult: (result) => set({ currentResult: result, isAnalyzing: false }),
  clearResult: () => set({ currentResult: null, currentRunId: null }),
  setRunId: (id) => set({ currentRunId: id }),
}))
