import React from 'react'
import { Link } from 'react-router-dom'
import PublicHeader from '../components/PublicHeader'

export default function Home() {
  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.24),_transparent_34%),radial-gradient(circle_at_80%_20%,rgba(15,23,42,0.12),transparent_28%),linear-gradient(to_bottom,_#f8fafc,_#e0e7ff_45%,_#f8fafc)]">
      <PublicHeader />

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur">
              Nền tảng quản lý danh mục và thị trường
            </div>

            <h1 className="text-4xl font-black tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
              Theo dõi thị trường, quản lý danh mục và ra quyết định nhanh hơn.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
              Một landing page fintech gọn, rõ và tập trung vào 3 việc chính: xem thị trường, lưu danh mục theo dõi,
              và mở rộng phân tích với AI khi bạn đã đăng nhập.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2563eb,#0f172a)] px-6 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-300/50 transition hover:translate-y-[-1px] hover:shadow-blue-300/70"
              >
                Đăng nhập để bắt đầu
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
              >
                Tạo tài khoản mới
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg shadow-blue-100/40 backdrop-blur">
                <div className="text-2xl font-black text-gray-950">60+</div>
                <div className="mt-1 text-sm text-gray-600">Mã cổ phiếu mô phỏng</div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg shadow-blue-100/40 backdrop-blur">
                <div className="text-2xl font-black text-gray-950">3s</div>
                <div className="mt-1 text-sm text-gray-600">Chuyển nhanh giữa màn hình</div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-lg shadow-blue-100/40 backdrop-blur">
                <div className="text-2xl font-black text-gray-950">AI</div>
                <div className="mt-1 text-sm text-gray-600">Phân tích ngữ cảnh sau đăng nhập</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 top-4 h-36 w-36 rounded-full bg-blue-500/30 blur-3xl" />
            <div className="absolute right-0 bottom-0 h-40 w-40 rounded-full bg-slate-900/15 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Market Snapshot</div>
                  <div className="mt-1 text-2xl font-black text-gray-950">VN-Index & Watchlist</div>
                </div>
                <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Live preview
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-2xl bg-[linear-gradient(160deg,#020617_0%,#0f172a_45%,#1d4ed8_100%)] p-5 text-white shadow-lg shadow-slate-900/20">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-sm text-slate-300">VN-Index</div>
                      <div className="mt-2 text-4xl font-black">1,245.80</div>
                    </div>
                    <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-300/30">
                      +1.24%
                    </div>
                  </div>

                  <div className="mt-6 h-44 rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.18),_transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-4 ring-1 ring-white/10">
                    <div className="flex h-full items-end gap-2">
                      {[32, 42, 39, 58, 49, 76, 69, 84, 77, 92, 88, 104].map((height, index) => (
                        <div
                          key={index}
                          className="flex-1 rounded-t-xl bg-[linear-gradient(to_top,#38bdf8,#60a5fa,#93c5fd)] shadow-[0_0_18px_rgba(96,165,250,0.25)]"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-medium text-gray-500">Danh mục</div>
                    <div className="mt-2 text-xl font-bold text-gray-950">Theo dõi mã yêu thích</div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Đánh dấu mã cổ phiếu, giữ lại trạng thái và mở chi tiết nhanh khi cần.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-medium text-gray-500">AI</div>
                    <div className="mt-2 text-xl font-bold text-gray-950">Gợi ý phân tích ngữ cảnh</div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Từ trang chi tiết, đi thẳng sang AI chatbot với mã cổ phiếu đang xem.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 bg-[linear-gradient(135deg,rgba(37,99,235,0.1),rgba(15,23,42,0.06))] p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Watchlist status</div>
                        <div className="mt-1 text-xl font-bold text-gray-950">Saved locally</div>
                      </div>
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                        F5 safe
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-14 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-blue-100/30">
            <div className="text-sm font-semibold text-blue-600">01</div>
            <h2 className="mt-3 text-lg font-bold text-gray-950">Xem thị trường nhanh</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Vào khu thị trường để xem danh sách cổ phiếu, trang chi tiết và biểu đồ theo từng mã.
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-blue-100/30">
            <div className="text-sm font-semibold text-blue-600">02</div>
            <h2 className="mt-3 text-lg font-bold text-gray-950">Giữ danh mục cá nhân</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Lưu các mã quan tâm vào watchlist để quay lại đúng nội dung mình cần.
            </p>
          </div>

          <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-lg shadow-blue-100/30">
            <div className="text-sm font-semibold text-blue-600">03</div>
            <h2 className="mt-3 text-lg font-bold text-gray-950">Mở AI khi sẵn sàng</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Đăng nhập để dùng chatbot AI theo ngữ cảnh mã cổ phiếu đang xem.
            </p>
          </div>
        </section>

        <section id="how-it-works" className="mt-16 rounded-[2rem] border border-gray-200 bg-white/90 p-6 shadow-lg shadow-blue-100/30 sm:p-8">
          <div className="max-w-2xl">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">How it works</div>
            <h2 className="mt-3 text-2xl font-black text-gray-950 sm:text-3xl">
              3 bước để bắt đầu trong vài giây.
            </h2>
            <p className="mt-3 text-gray-600">
              Landing page này được thiết kế để kéo người dùng vào đúng hành trình: mở trang chủ, đăng nhập, rồi đi sâu vào dữ liệu thị trường.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="text-sm font-semibold text-blue-600">Bước 1</div>
              <div className="mt-2 text-lg font-bold text-gray-950">Mở trang chủ</div>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Xem hero, banner và các điểm nhấn để hiểu nhanh sản phẩm.
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="text-sm font-semibold text-blue-600">Bước 2</div>
              <div className="mt-2 text-lg font-bold text-gray-950">Đăng nhập / Đăng ký</div>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Tạo phiên đăng nhập mock để truy cập các khu vực protected của app.
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-5">
              <div className="text-sm font-semibold text-blue-600">Bước 3</div>
              <div className="mt-2 text-lg font-bold text-gray-950">Khám phá dashboard</div>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Duyệt thị trường, mở chi tiết mã cổ phiếu và gửi sang AI chatbot khi cần.
              </p>
            </div>
          </div>
        </section>

        <section id="faq" className="mt-16 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-gray-200 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(37,99,235,0.92))] p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">FAQ</div>
            <h2 className="mt-3 text-2xl font-black sm:text-3xl">Một vài câu hỏi thường gặp.</h2>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <div className="font-semibold">Tôi có thể xem gì khi chưa đăng nhập?</div>
                <p className="mt-2 text-sm leading-6 text-blue-50/90">
                  Bạn chỉ xem được trang chủ công khai. Mọi khu vực dữ liệu bên trong sẽ yêu cầu đăng nhập.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <div className="font-semibold">Watchlist có mất khi F5 không?</div>
                <p className="mt-2 text-sm leading-6 text-blue-50/90">
                  Không. Auth và watchlist hiện đang lưu local để giữ trạng thái sau khi tải lại trang.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <div className="font-semibold">Có AI chatbot thật chưa?</div>
                <p className="mt-2 text-sm leading-6 text-blue-50/90">
                  Hiện tại là mock flow để chuẩn bị cho kết nối backend sau này.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg shadow-blue-100/30 sm:p-8">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Need more</div>
            <h2 className="mt-3 text-2xl font-black text-gray-950 sm:text-3xl">Sẵn sàng vào ứng dụng?</h2>
            <p className="mt-3 text-gray-600">
              Đăng nhập để mở dashboard, market, stock detail và chatbot AI.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2563eb,#0f172a)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200/50 transition hover:opacity-95"
              >
                Đăng nhập ngay
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
              >
                Tạo tài khoản
              </Link>
            </div>

            <div className="mt-8 rounded-2xl bg-gray-50 p-4">
              <div className="text-sm font-semibold text-gray-500">Quick checklist</div>
              <ul className="mt-3 space-y-2 text-sm text-gray-700">
                <li>• Public header đã có CTA đăng nhập / đăng ký</li>
                <li>• Hero có chart mini, gradients và preview panel</li>
                <li>• FAQ/How it works giúp landing page đầy đủ hơn</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
