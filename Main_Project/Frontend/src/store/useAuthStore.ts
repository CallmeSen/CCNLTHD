import { create } from 'zustand'

type User = {
  firstName?: string
  lastName?: string
  email: string
  fullName?: string
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
    if (!raw) return { user: null, isAuthenticated: false }
    const parsed = JSON.parse(raw)
    return { user: parsed.user ?? null, isAuthenticated: !!parsed.isAuthenticated }
  } catch (e) {
    return { user: null, isAuthenticated: false }
  }
}

const initial = readInitial()

const useAuthStore = create<AuthState>((set, get) => ({
  user: initial.user,
  isAuthenticated: initial.isAuthenticated,

  login: async (email: string, password: string) => {
    await new Promise((res) => setTimeout(res, 500))
    // Mock success: create a simple user object from email
    const namePart = email.split('@')[0] || email
    const user: User = { email, firstName: namePart, lastName: '', fullName: namePart }
    set({ user, isAuthenticated: true })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, isAuthenticated: true }))
    } catch (e) {
      // ignore
    }
  },

  signup: async (firstName: string, lastName: string, email: string, password: string) => {
    await new Promise((res) => setTimeout(res, 500))
    const user: User = { firstName, lastName, email, fullName: `${firstName} ${lastName}`.trim() }
    set({ user, isAuthenticated: true })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, isAuthenticated: true }))
    } catch (e) {
      // ignore
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false })
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      // ignore
    }
  },
}))

export default useAuthStore
