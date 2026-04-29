import { useEffect } from 'react';

export default function DeleteConfirmModal({
  open,
  portfolioName,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận xóa danh mục"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-bold text-gray-900">Xác nhận xóa</div>
        <p className="mt-2 text-sm text-gray-600">
          Bạn có chắc chắn muốn xóa danh mục <span className="font-semibold text-gray-900">{portfolioName}</span>?
          Toàn bộ dữ liệu hiệu suất sẽ bị mất.
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg bg-gray-100 text-gray-900 text-sm font-medium hover:bg-gray-200"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-10 px-4 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600"
          >
            Xác nhận xóa
          </button>
        </div>
      </div>
    </div>
  );
}
