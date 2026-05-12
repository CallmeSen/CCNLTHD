import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WatchlistState {
  watchlistTickers: string[]
  toggleWatchlist: (ticker: string) => void
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      watchlistTickers: [],
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
    }),
    {
      name: 'market-watchlist', // localStorage key
    },
  ),
)
