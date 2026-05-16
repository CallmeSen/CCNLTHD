import { Link } from 'react-router-dom'

export default function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3 rounded-2xl px-1 py-1 font-semibold text-foreground transition hover:bg-muted">
          <div className="grid h-11 w-11 place-items-center rounded-2xl gradient-primary text-sm text-white shadow-lg shadow-primary/20">
            PF
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Portfolio Flow</div>
            <div className="text-xs text-muted-foreground">Fintech landing / public access</div>
          </div>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">Tính năng</a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">Cách hoạt động</a>
          <a href="#faq" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">FAQ</a>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-muted"
          >
            Đăng nhập
          </Link>
          <Link
            to="/signup"
            className="rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:brightness-110"
          >
            Đăng ký
          </Link>
        </div>
      </div>
    </header>
  )
}
