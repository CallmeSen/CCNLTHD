import { useEffect } from 'react';

const rebalanceData = [
  { ticker: 'FPT', currentWeight: 25, targetWeight: 15 },
  { ticker: 'VNM', currentWeight: 10, targetWeight: 20 },
  { ticker: 'SSI', currentWeight: 18, targetWeight: 14 },
  { ticker: 'VCB', currentWeight: 12, targetWeight: 16 },
];

function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M6 6l12 12" strokeLinecap="round" />
      <path d="M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function AlertIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M12 9v4" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.5" fill="currentColor" stroke="none" />
      <path d="M10.3 3.7 2.9 17A2 2 0 0 0 4.6 20h14.8a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
    </svg>
  );
}

function RobotIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <path d="M12 4v4" strokeLinecap="round" />
      <circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13" r="1" fill="currentColor" stroke="none" />
      <path d="M9 16h6" strokeLinecap="round" />
    </svg>
  );
}

export default function RebalanceDrawer({ open, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Rebalance drawer"
        className={`absolute right-0 top-0 h-screen w-full max-w-md bg-white shadow-2xl border-l border-gray-200 transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="text-lg font-bold text-gray-900">Đề xuất tái cân bằng</div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 inline-grid place-items-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Đóng drawer"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-amber-900">Danh mục đang lệch tỷ trọng an toàn</div>
                  <p className="mt-2 text-sm text-amber-800">
                    Biến động thị trường khiến tỷ trọng thực tế lệch &gt; 5% so với mục tiêu ban đầu. Điều này làm tăng rủi ro hệ thống.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-extrabold text-black">Tổng quan biến động</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                  <div className="text-xs text-gray-500">Mức rủi ro hiện tại</div>
                  <div className="mt-1 text-base font-bold text-red-600">Cao</div>
                </div>

                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                  <div className="text-xs text-gray-500">Mục tiêu</div>
                  <div className="mt-1 text-base font-bold text-emerald-600">Cân bằng</div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-sm font-extrabold text-black">Danh sách điều chỉnh đề xuất</div>
              <div className="mt-3 overflow-hidden rounded-lg border border-gray-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Mã</th>
                      <th className="px-3 py-2 text-left font-semibold">Tỷ trọng</th>
                      <th className="px-3 py-2 text-right font-semibold">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rebalanceData.map((item) => {
                      const shouldBuy = item.targetWeight > item.currentWeight;
                      return (
                        <tr key={item.ticker}>
                          <td className="px-3 py-2 font-semibold text-gray-900">{item.ticker}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {item.currentWeight}% {'->'} {item.targetWeight}%
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                shouldBuy ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {shouldBuy ? 'MUA' : 'BAN'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-white border border-blue-200 inline-grid place-items-center text-blue-600 shrink-0">
                  <RobotIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Risk Management Agent</div>
                  <div className="mt-2 rounded-2xl rounded-tl-sm bg-white/90 border border-blue-100 px-3 py-2 text-sm leading-relaxed text-gray-700">
                    Dựa trên biến động giá gần đây, mã FPT đang chiếm tỷ trọng quá lớn, khiến danh mục dễ tổn thương nếu ngành công nghệ điều chỉnh. Tôi đề xuất chốt lời một phần và tăng tỷ trọng VNM để đảm bảo tính phòng thủ.
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Bỏ qua lần này
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('He thong dang dat lenh dieu chinh...');
                }}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Đồng ý tái cân bằng
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
