import { useState } from 'react'
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
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="max-w-md w-full">
        <h1 className="text-4xl font-extrabold text-foreground mb-6">Đăng nhập</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Toggle password visibility"
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Mật khẩu nên có tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số.
            </p>
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-md px-4 py-2">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <hr className="my-6 border-border" />

        <p className="text-sm text-muted-foreground">
          Chưa có tài khoản?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
