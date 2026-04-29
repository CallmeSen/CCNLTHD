import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LineChart as LineChartIcon } from "lucide-react";
import Header from "./Header";
import useAuthStore from '../../store/useAuthStore'

const navLinkClass = ({ isActive }) =>
[  "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
    isActive
        ? "bg-gray-100 text-gray-900"
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
].join(" ");
export default function MainLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
        <div className="min-h-dvh w-full flex overflow-hidden bg-gray-50">
            <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
                <div className="h-16 flex items-center px-4 font-semibold text-gray-900">
                    <div className="w-9 h-9 rounded-xl bg-gray-900 text-white grid place-items-center text-sm">
                        PF
                    </div>
                    <div className="ml-3 leading-tight">
                        <div className="text-sm">Danh mục</div>
                        <div className="text-xs text-gray-500">Bảng điều khiển</div>
                    </div>
                </div>

                {isAuthenticated && (
                  <nav className="px-3 pb-4 flex-1 flex flex-col gap-1">
                      <NavLink to="/dashboard" className={navLinkClass}>
                          Bảng điều khiển
                      </NavLink>
                      <NavLink to="/chatai" className={navLinkClass}>
                          Chat AI
                      </NavLink>
                      <NavLink to="/portforlios" className={navLinkClass}>
                          Quản lý danh mục
                      </NavLink>
                      <NavLink to="/market" className={navLinkClass}>
                          <LineChartIcon className="h-4 w-4" />
                          Thị trường
                      </NavLink>
                      <NavLink to="/settings" className={navLinkClass}>
                          Cài đặt
                      </NavLink>
                  </nav>
                )}

                <div className="px-3 py-3">
                  <button onClick={handleLogout} className="flex items-center w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M7 8v8" />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 shrink-0 bg-white border-b border-gray-200 px-4 flex items-center">
                    <Header />
                </header>
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
  );
}