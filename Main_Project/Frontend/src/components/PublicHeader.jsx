import React from 'react'
import { Link } from 'react-router-dom'

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/60 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 rounded-2xl px-1 py-1 font-semibold text-gray-900 transition hover:bg-gray-50">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] text-sm text-white shadow-lg shadow-blue-200/50">
            PF
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Portfolio Flow</div>
            <div className="text-xs text-gray-500">Fintech landing / public access</div>
          </div>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm font-medium text-gray-600 transition hover:text-gray-950">Tính năng</a>
          <a href="#how-it-works" className="text-sm font-medium text-gray-600 transition hover:text-gray-950">Cách hoạt động</a>
          <a href="#faq" className="text-sm font-medium text-gray-600 transition hover:text-gray-950">FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-950"
          >
            Đăng nhập
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-[linear-gradient(135deg,#2563eb,#0f172a)] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-200/60 transition hover:opacity-95"
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </header>
  )
}
