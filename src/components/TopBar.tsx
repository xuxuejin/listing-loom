type View = 'capture' | 'library';
interface TopBarProps {
  view: View;
  onToggleView: () => void;
}

export function TopBar({ view, onToggleView }: TopBarProps) {
  const tooltip = view === 'capture' ? '暂存商品' : '商品采集';
  return (
    <header className="sticky top-0 z-10 flex h-[66px] items-center gap-3 border-b border-[#e7ece8] bg-white px-5">
      <img
        src="/icons/logo.svg"
        alt="Listing Loom"
        className="size-[34px] rounded-[11px] object-cover"
      />
      <div className="flex flex-1 flex-col gap-px">
        <strong className="text-[13px] tracking-tight">Listing Loom</strong>
        <span className="text-[10px] text-[#7b8983]">
          商品织录 · 采集工作台
        </span>
      </div>
      <button
        onClick={onToggleView}
        title={tooltip}
        aria-label={tooltip}
        aria-pressed={view === 'library'}
        className="grid size-[34px] place-items-center rounded-[9px] border-0 bg-[#f2f5f2] text-[#52635c] transition hover:bg-[#e8eee9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      >
        {view === 'capture' ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path
              d="M4 4.75h12M4 8.5h12M4 12.25h8M4 16h8"
              strokeLinecap="round"
            />
            <path d="M14 13.5h3v3h-3z" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M5 4.5h10v11H5z" strokeLinejoin="round" />
            <path d="M7.5 8h5M7.5 11h5M7.5 14h3" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </header>
  );
}
