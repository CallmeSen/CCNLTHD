import { create } from 'zustand'
import { apiClient, TOKEN_KEY } from '../services/apiClient'

type User = {
  id?: string
  email: string
  fullName?: string
  role?: string
}

type AuthState = {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<void>
  logout: () => void
}

const STORAGE_KEY = 'app_auth'

const readInitial = (): { user: User | null; isAuthenticated: boolean } => {
  try {
    if (typeof window === 'undefined') return { user: null, isAuthenticated: false }
    const raw = localStorage.getItem(STORAGE_KEY)
    const token = localStorage.getItem(TOKEN_KEY)
    if (!raw || !token) return { user: null, isAuthenticated: false }
    const parsed = JSON.parse(raw)
    return { user: parsed.user ?? null, isAuthenticated: !!parsed.isAuthenticated }
  } catch {
    return { user: null, isAuthenticated: false }
  }
}

const initial = readInitial()

const useAuthStore = create<AuthState>((set) => ({
  user: initial.user,
  isAuthenticated: initial.isAuthenticated,

  login: async (email: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { email, password })
    const user: User = {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.fullName,
      role: data.user.role,
    }
    localStorage.setItem(TOKEN_KEY, data.accessToken)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, isAuthenticated: true }))
    set({ user, isAuthenticated: true })
  },

  signup: async (firstName: string, lastName: string, email: string, password: string) => {
    const fullName = `${firstName} ${lastName}`.trim()
    const { data } = await apiClient.post('/auth/register', { email, password, fullName })
    const user: User = {
      id: data.user.id,
      email: data.user.email,
      fullName: data.user.fullName,
      role: data.user.role,
    }
    localStorage.setItem(TOKEN_KEY, data.accessToken)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, isAuthenticated: true }))
    set({ user, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STORAGE_KEY)
    set({ user: null, isAuthenticated: false })
  },
}))

export default useAuthStore

