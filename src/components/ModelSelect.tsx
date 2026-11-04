import { useEffect, useRef, useState } from 'react';
import type { AIModel } from '../ai';
import { CheckIcon, ChevronDownIcon } from './icons';

const modelGroups: Array<{
  label: string;
  options: Array<{ value: AIModel; label: string }>;
}> = [
  {
    label: 'DeepSeek',
    options: [
      { value: 'deepseek-flash', label: 'DeepSeek V4.1 Flash' },
      { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
    ],
  },
  {
    label: 'Gemini',
    options: [
      { value: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
      { value: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
      { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite' },
      { value: 'gemini-sdk', label: 'Gemini SDK（自动降级）' },
    ],
  },
  {
    label: '本机模型',
    options: [{ value: 'gemini-nano', label: 'Gemini Nano' }],
  },
];

interface ModelSelectProps {
  value: AIModel;
  onChange: (model: AIModel) => void;
}

export function ModelSelect({ value, onChange }: ModelSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = modelGroups
    .flatMap((group) => group.options)
    .find((option) => option.value === value);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative min-w-0 flex-[0_0_68%] max-w-[310px]"
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`选择 AI 模型，当前为 ${selected?.label ?? value}`}
        onClick={() => setOpen((current) => !current)}
        className="relative h-full min-h-[40px] w-full truncate rounded-[9px] border border-[var(--border)] bg-[var(--surface)] py-2 pl-3 pr-9 text-left text-[11px] font-semibold text-[var(--text-primary)] outline-none transition hover:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
      >
        <span className="block truncate">{selected?.label ?? value}</span>
        <ChevronDownIcon
          className={`pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="AI 模型"
          className="absolute left-0 top-[calc(100%+6px)] z-40 max-h-[280px] w-full min-w-[240px] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl"
        >
          {modelGroups.map((group) => (
            <div key={group.label}>
              <div className="px-2.5 pb-1 pt-2 text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text-muted)]">
                {group.label}
              </div>
              {group.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md border-0 px-2.5 py-2 text-left text-[11px] transition ${value === option.value ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]' : 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--surface-soft)]'}`}
                >
                  <span>{option.label}</span>
                  {value === option.value && (
                    <CheckIcon className="size-3.5 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
