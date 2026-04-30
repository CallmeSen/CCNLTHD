import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Search,
  History,
  ChevronLeft,
  ChevronRight,
  Brain,
  TrendingUp,
  Shield,
  FileText,
} from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/analysis', label: 'Analysis', icon: Search },
  { path: '/history', label: 'History', icon: History },
]

const features = [
  { icon: Brain, label: 'Multi-Agent', desc: 'LangGraph workflow' },
  { icon: TrendingUp, label: 'Portfolio', desc: 'Optimization engine' },
  { icon: Shield, label: 'Compliance', desc: 'Regulatory guard' },
  { icon: FileText, label: 'Reports', desc: 'AI-generated insights' },
]

interface SidebarProps {
  open: boolean
  onToggle: () => void
}

export default function Sidebar({ open, onToggle }: SidebarProps) {
  const location = useLocation()

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-full z-40 flex flex-col bg-white border-r border-surface-200 transition-all duration-300',
        open ? 'w-64' : 'w-[72px]',
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-surface-200 gap-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl gradient-navy flex items-center justify-center shadow-sm">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        {open && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-surface-900 tracking-tight">FinAgents</span>
            <span className="text-xs text-surface-400 font-medium">Advisory Platform</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path
          return (
            <NavLink
              key={path}
              to={path}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200',
                active
                  ? 'bg-navy-50 text-navy-700 shadow-sm border border-navy-100'
                  : 'text-surface-500 hover:bg-surface-100 hover:text-surface-800',
              )}
            >
              <Icon className={clsx('flex-shrink-0', active ? 'w-5 h-5' : 'w-4.5 h-4.5')} />
              {open && <span>{label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Features */}
      {open && (
        <div className="px-3 pb-4 space-y-2">
          <p className="px-3 text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
            Capabilities
          </p>
          {features.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-50"
            >
              <div className="w-7 h-7 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-3.5 h-3.5 text-navy-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-surface-800">{label}</p>
                <p className="text-xs text-surface-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toggle */}
      <div className="px-3 pb-4">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-surface-400 hover:text-surface-700 hover:bg-surface-100 transition-all duration-200"
        >
          {open ? (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  )
}
