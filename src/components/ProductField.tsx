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
  const controlClass = `w-full rounded-lg border border-[#e2e8e3] ${readOnly ? 'bg-[#f8faf8] text-[#829089]' : 'bg-white text-[#283a33]'} px-2.5 py-[9px] text-[11px] font-normal outline-none transition placeholder:text-[#b1bbb5] focus:border-[#8aa891] focus:ring-[3px] focus:ring-[#dce9dd]/50`;
  return <label className={`mb-[11px] flex min-w-0 flex-col gap-[5px] text-[10px] font-semibold text-[#697770] ${wide ? 'col-span-2' : ''}`}>
    <span>{label}</span>
    {rows ? <textarea name={name} rows={rows} value={value} placeholder={placeholder} onChange={event => onChange(name, event.target.value)} className={`${controlClass} resize-y`} />
      : <input name={name} value={value} placeholder={placeholder} readOnly={readOnly} onChange={event => onChange(name, event.target.value)} className={controlClass} />}
  </label>;
}
