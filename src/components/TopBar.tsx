import { useState } from 'react';
import { themes, type ThemeId } from '../theme';

type View = 'capture' | 'library';
interface TopBarProps {
  view: View;
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  onToggleView: () => void;
}

export function TopBar({ view, theme, onThemeChange, onToggleView }: TopBarProps) {
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const tooltip = view === 'capture' ? '暂存商品' : '商品采集';
  return (
    <header className="sticky top-0 z-10 flex h-[66px] items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5">
      <img src="/icons/logo.svg" alt="Listing Loom" className="size-[34px] shrink-0 object-contain" />
      <div className="flex flex-1 flex-col gap-px">
        <strong className="text-[13px] tracking-tight">Listing Loom</strong>
        <span className="text-[10px] text-[var(--text-muted)]">
          商品织录 · 采集工作台
        </span>
      </div>
      <div className="relative ml-auto flex items-center gap-2">
      <button
        onClick={() => setThemeMenuOpen(open => !open)}
        title="选择主题色"
        aria-label="选择主题色"
        aria-expanded={themeMenuOpen}
        className="grid size-[34px] place-items-center rounded-[9px] border-0 bg-[var(--surface-soft)] text-[var(--text-secondary)] transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="10" cy="10" r="7.2"/><path d="M10 2.8v14.4M2.8 10h14.4M4.9 4.9l10.2 10.2M15.1 4.9 4.9 15.1"/></svg>
      </button>
      {themeMenuOpen && <div role="menu" aria-label="Theme" className="absolute right-11 top-[43px] z-30 grid w-[132px] grid-cols-4 gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-xl">
        {themes.map(option => <button key={option.id} role="menuitemradio" aria-label={option.label} title={option.label} aria-checked={theme === option.id} onClick={() => { onThemeChange(option.id); setThemeMenuOpen(false); }} className="grid size-6 place-items-center rounded-md border-0 p-0 transition hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27364b]" style={{ backgroundColor: option.color }}>
          {theme === option.id && <span aria-hidden="true" className="text-[13px] font-extrabold leading-none" style={{ color: option.foreground }}>✓</span>}
        </button>)}
      </div>}
      <button
        onClick={onToggleView}
        title={tooltip}
        aria-label={tooltip}
        aria-pressed={view === 'library'}
        className="grid size-[34px] place-items-center rounded-[9px] border-0 bg-[var(--surface-soft)] text-[var(--text-secondary)] transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
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
      </div>
    </header>
  );
}
