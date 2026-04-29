import { useEffect, useRef, useState } from 'react';
import { usePortfolio } from '../context/PortfolioContext';
import DeleteConfirmModal from './DeleteConfirmModal';
import PortfolioWizardModal from './PortfolioWizardModal';

function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M16.5 6.5 8.5 14.5 3.5 9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <path d="M9 3h6" strokeLinecap="round" />
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M7 7l1 14h8l1-14" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6" strokeLinecap="round" />
      <path d="M14 11v6" strokeLinecap="round" />
    </svg>
  );
}

export default function PortfolioHeader() {
  const { portfolios, activePortfolio, setActivePortfolio, deleteActivePortfolio } = usePortfolio();

  const [open, setOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const onClickOutside = (e) => {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target)) return;
      setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

  const onPick = (id) => {
    setActivePortfolio(id);
    setOpen(false);
  };

  const onCreateNew = () => {
    setShowWizard(true);
    setOpen(false);
  };

  const onConfirmDelete = () => {
    deleteActivePortfolio();
    setShowDelete(false);
  };

  return (
    <header className="bg-white border border-gray-200 rounded-xl shadow-sm px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <div className="relative" ref={wrapRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-50"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              {activePortfolio?.name ?? 'Chọn danh mục'}
            </span>
            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
          </button>

          {open && (
            <div
              className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-sm py-1 z-50"
              role="menu"
              aria-label="Chọn danh mục"
            >
              {portfolios.map((p) => {
                const isActive = p.id === activePortfolio?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPick(p.id)}
                    className="w-full px-3 py-2 text-left flex items-center justify-between gap-3 hover:bg-gray-50"
                    role="menuitem"
                  >
                    <span className="text-sm font-medium text-gray-900">{p.name}</span>
                    {isActive && <CheckIcon className="h-4 w-4 text-emerald-600" />}
                  </button>
                );
              })}

              <div className="my-1 border-t border-gray-100" />

              <button
                type="button"
                onClick={onCreateNew}
                className="w-full px-3 py-2 text-left text-sm font-semibold text-blue-600 hover:bg-gray-50"
                role="menuitem"
              >
                + Tạo danh mục mới
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="h-10 w-10 grid place-items-center text-gray-500 hover:text-red-500"
          aria-label="Xóa danh mục đang chọn"
          onClick={() => setShowDelete(true)}
          disabled={!activePortfolio}
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </div>

      <DeleteConfirmModal
        open={showDelete}
        portfolioName={activePortfolio?.name ?? ''}
        onClose={() => setShowDelete(false)}
        onConfirm={onConfirmDelete}
      />

      <PortfolioWizardModal open={showWizard} onClose={() => setShowWizard(false)} />
    </header>
  );
}
