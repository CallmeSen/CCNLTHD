import React from 'react'

type Props = {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
        <div className="hidden md:flex items-center justify-center bg-muted">
          <div className="w-64 h-64 rounded-3xl border border-border bg-card flex items-center justify-center relative shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl gradient-primary text-white font-bold">
                PF
              </div>
              <p className="text-sm font-semibold text-foreground">Portfolio Flow</p>
              <p className="text-xs text-muted-foreground mt-1">Investment workspace</p>
            </div>
          </div>
        </div>

        <div className="bg-card flex flex-col justify-center px-8 sm:px-12 lg:px-24">
          {children}
        </div>
      </div>
    </div>
  )
}
