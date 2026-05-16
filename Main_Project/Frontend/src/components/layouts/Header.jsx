export default function Header() {
  return (
    <div className="w-full flex items-center gap-4">
      <div className="flex-1 max-w-xl">
        <input
          placeholder="Tìm kiếm..."
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:block text-right leading-tight">
          <div className="text-sm font-medium text-foreground">Tài khoản</div>
          <div className="text-xs text-muted-foreground">Gói miễn phí</div>
        </div>
        <button
          type="button"
          className="h-10 pl-1 pr-3 rounded-lg border border-border flex items-center gap-2 hover:bg-muted transition-colors"
          aria-label="Menu tài khoản"
        >
          <div className="w-8 h-8 rounded-full bg-muted" />
          <span className="text-sm font-medium text-foreground sm:hidden">Tài khoản</span>
        </button>
      </div>
    </div>
  )
}
