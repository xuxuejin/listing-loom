import type { ProductFields } from '../types';

interface ProductFieldProps {
  name: keyof ProductFields;
  label: string;
  value: string;
  placeholder?: string;
  wide?: boolean;
  rows?: number;
  readOnly?: boolean;
  onChange: (name: keyof ProductFields, value: string) => void;
}

export function ProductField({ name, label, value, placeholder, wide, rows, readOnly, onChange }: ProductFieldProps) {
  const controlClass = `w-full rounded-lg border border-[var(--border)] ${readOnly ? 'bg-[var(--surface-soft)] text-[var(--text-muted)]' : 'bg-[var(--surface)] text-[var(--text-primary)]'} px-2.5 py-[9px] text-[11px] font-normal outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-soft)]/50`;
  return <label className={`mb-[11px] flex min-w-0 flex-col gap-[5px] text-[10px] font-semibold text-[var(--text-muted)] ${wide ? 'col-span-2' : ''}`}>
    <span>{label}</span>
    {rows ? <textarea name={name} rows={rows} value={value} placeholder={placeholder} onChange={event => onChange(name, event.target.value)} className={`${controlClass} resize-y`} />
      : <input name={name} value={value} placeholder={placeholder} readOnly={readOnly} onChange={event => onChange(name, event.target.value)} className={controlClass} />}
  </label>;
}
