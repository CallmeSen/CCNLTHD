import axios from 'axios'
import { API_BASE_URL } from '../config/runtimeEnv'

export const TOKEN_KEY = 'invest_token'
export const AUTH_STORAGE_KEY = 'app_auth'
export const AUTH_UNAUTHORIZED_EVENT = 'invest-auth-unauthorized'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(AUTH_STORAGE_KEY)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
      }
    }
    return Promise.reject(error)
  },
)
