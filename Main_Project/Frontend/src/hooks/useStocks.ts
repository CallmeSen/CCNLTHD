import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchStocks } from '../services/stockApi'

export const useStocks = (page: number) => {
  return useQuery({
    queryKey: ['stocks', page],
    queryFn: () => fetchStocks(page),
    placeholderData: keepPreviousData,
  })
}
