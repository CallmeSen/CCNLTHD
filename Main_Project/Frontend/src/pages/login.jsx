import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import useAuthStore from '../store/useAuthStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      // handle error gracefully
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="max-w-md w-full">
        <h1 className="text-4xl font-extrabold !text-black mb-6">Log In</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email:</label>
            <input
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-md px-4 py-2 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password:</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-gray-100 rounded-md px-4 py-2 pr-10 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10a9.97 9.97 0 012.03-5.707M6.88 6.88A9.969 9.969 0 0112 5c5.523 0 10 4.477 10 10 0 1.098-.179 2.156-.513 3.135" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">Mật khẩu phải nhiều hơn 8 kí tự bao gồm chữ hoa, chữ thường và số.</p>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white w-full py-2 rounded-md disabled:opacity-60"
            >
              {loading ? 'Đang xử lý...' : 'Log In'}
            </button>
          </div>
        </form>

        <hr className="my-6 border-gray-200" />

        <p className="text-sm text-gray-600">
          Chưa có tài khoản?{' '}
          <Link to="/signup" className="text-blue-600">
            Đăng ký
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
