import { useEffect, useRef, useState } from 'react';

function formatPrice(value) {
  return Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 2,
  }).format(value);
}

function Sparkline({ values, strokeClassName }) {
  const width = 80;
  const height = 30;
  const padding = 2;

  if (!values?.length) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const step = (width - padding * 2) / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = padding + i * step;
      const y = padding + (height - padding * 2) * (1 - (v - min) / range);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-9 w-20 mt-6"
      role="img"
      aria-label="biểu đồ nhỏ"
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        className={strokeClassName}
      />
    </svg>
  );
}

function StockCard({ item }) {
  const isUp = item.changePct >= 0;
  const changeText = `${isUp ? '+' : ''}${item.changePct.toFixed(2)}%`;

  const changeClass = isUp ? 'text-emerald-600' : 'text-rose-600';
  const badgeClass = isUp
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-rose-50 text-rose-700';

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-gray-900">{item.ticker}</div>
          <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>{changeText}</div>
        </div>
        <div className="mt-2 text-sm text-gray-700">{formatPrice(item.price)}</div>
      </div>

      <div className={`shrink-0 ${changeClass}`}>
        <Sparkline values={item.spark} strokeClassName={changeClass} />
      </div>
    </div>
  );
}

export default function TopStocksCarousel({ title = 'Top 10 cổ phiếu nổi bật trong ngày', items = [] }) {
  const scrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    const current = el.scrollLeft;
    setCanScrollLeft(current > 1);
    setCanScrollRight(current < maxScrollLeft - 1);
  };

  useEffect(() => {
    updateScrollButtons();
  }, [items.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => updateScrollButtons();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, []);

  const scrollByCards = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.min(3 * 240, el.clientWidth);
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  return (
    <section  >
      <div className="p-4 flex items-center justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight !text-black">{title}</h2>

        <div className="flex items-center gap-2">
          

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollByCards(-1)}
              disabled={!canScrollLeft}
              className="h-9 w-9 grid place-items-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
              aria-label="Xem stock trước"
              title="Trước"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M12.5 4.5 7.5 10l5 5.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollByCards(1)}
              disabled={!canScrollRight}
              className="h-9 w-9 grid place-items-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white"
              aria-label="Xem stock tiếp theo"
              title="Tiếp"
            >
              <svg
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M7.5 4.5 12.5 10l-5 5.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div
          ref={scrollerRef}
          className="flex gap-3 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div key={item.ticker} className="min-w-[220px] snap-start">
              <StockCard item={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
