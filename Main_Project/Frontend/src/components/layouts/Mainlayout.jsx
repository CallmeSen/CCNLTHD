import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bot,
  History,
  LineChart as LineChartIcon,
  LogOut,
  Moon,
  PieChart,
  Settings,
  Sun,
} from 'lucide-react'
import Header from './Header'
import useAuthStore from '../../store/useAuthStore'
import { useDarkMode } from '../../hooks/useDarkMode'

const navItems = [
  { to: '/dashboard', label: 'Bảng điều khiển', icon: BarChart3 },
  { to: '/agent', label: 'Chat AI', icon: Bot },
  { to: '/history', label: 'Lịch sử báo cáo', icon: History },
  { to: '/portforlios', label: 'Quản lý danh mục', icon: PieChart },
  { to: '/market', label: 'Thị trường', icon: LineChartIcon },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
]

const navLinkClass = ({ isActive }) =>
  [
    'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
    isActive
      ? 'bg-primary/10 text-primary border border-primary/20'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
  ].join(' ')

export default function MainLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { isDark, toggle } = useDarkMode()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh w-full flex overflow-hidden bg-background text-foreground">
      <aside className="w-64 shrink-0 bg-card border-r border-border flex flex-col">
        <div className="h-16 flex items-center px-4 font-semibold text-foreground border-b border-border">
          <div className="w-9 h-9 rounded-xl gradient-primary text-white grid place-items-center text-sm shadow-sm">
            PF
          </div>
          <div className="ml-3 leading-tight min-w-0">
            <div className="text-sm truncate">Danh mục</div>
            <div className="text-xs text-muted-foreground truncate">Bảng điều khiển</div>
          </div>
        </div>

        {isAuthenticated && (
          <nav className="px-3 py-4 flex-1 flex flex-col gap-1 overflow-y-auto">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={navLinkClass}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </NavLink>
            ))}
          </nav>
        )}

        <div className="px-3 py-3 border-t border-border space-y-2">
          <button
            type="button"
            onClick={toggle}
            className="flex items-center w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
          >
            {isDark ? <Sun className="w-5 h-5 mr-3" /> : <Moon className="w-5 h-5 mr-3" />}
            {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-card border-b border-border px-4 flex items-center">
          <Header />
        </header>
        <main className="flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
