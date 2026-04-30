import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useState } from 'react'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((p) => !p)} />
      <main
        className="flex-1 overflow-y-auto transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '256px' : '72px' }}
      >
        <div className="min-h-full p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
