import React from 'react'

type Props = {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  return (
    <div className="h-screen bg-gray-100">
      <div className="h-full grid grid-cols-1 md:grid-cols-2">
        <div className="hidden md:flex items-center justify-center bg-gray-200">
          <div className="w-64 h-64 bg-gray-300 flex items-center justify-center relative">
            <svg
              width="80"
              height="80"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="1" y="1" width="22" height="22" rx="2" stroke="#9CA3AF" strokeWidth="2" />
              <path d="M6 6L18 18M6 18L18 6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="bg-white flex flex-col justify-center px-12 lg:px-24">
          {children}
        </div>
      </div>
    </div>
  )
}
