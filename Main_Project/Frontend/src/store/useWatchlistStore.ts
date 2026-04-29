import { create } from 'zustand'

interface WatchlistState {
  watchlistTickers: string[]
  toggleWatchlist: (ticker: string) => void
}

export const useWatchlistStore = create<WatchlistState>((set) => ({
  watchlistTickers: ['FPT', 'VCB'],
  toggleWatchlist: (ticker) => {
    set((state) => {
      const isInWatchlist = state.watchlistTickers.includes(ticker)

      if (isInWatchlist) {
        return {
          watchlistTickers: state.watchlistTickers.filter((item) => item !== ticker),
        }
      }

      return {
        watchlistTickers: [...state.watchlistTickers, ticker],
      }
    })
  },
}))
