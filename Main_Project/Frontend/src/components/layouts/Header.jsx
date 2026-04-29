export default function Header() {
  return (
    <div className="w-full flex items-center gap-4">
      <div className="flex-1 max-w-xl">
        <input
          placeholder="Tìm kiếm..."
          className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400
                     outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:block text-right leading-tight">
          <div className="text-sm font-medium text-gray-900">Tài khoản</div>
          <div className="text-xs text-gray-500">Gói miễn phí</div>
        </div>
        <button
          type="button"
          className="h-10 pl-1 pr-3 rounded-lg border border-gray-200 flex items-center gap-2 hover:bg-gray-50"
          aria-label="Menu tài khoản"
        >
          <div className="w-8 h-8 rounded-full bg-gray-200" />
          <span className="text-sm font-medium text-gray-900 sm:hidden">Tài khoản</span>
        </button>
      </div>
    </div>
  );
}