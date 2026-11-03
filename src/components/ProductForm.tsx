import type { CaptureFilters, ProductFields } from '../types';
import { fieldLabels } from '../types';
import type { PricingSettings } from '../storage';

interface ProductFormProps {
  product: ProductFields;
  filters: CaptureFilters;
  pricing: PricingSettings;
  listingPrice: string;
  onCapture: () => void;
  onPricingChange: (pricing: PricingSettings) => void;
  onFilterChange: (filters: CaptureFilters) => void;
  onClear: () => void;
  onSave: () => void;
  busy: boolean;
}

const fieldOrder: Array<keyof ProductFields> = [
  'itemCode',
  'productName',
  'originalPrice',
  'salePrice',
  'discount',
  'available',
  'fulfillment',
  'productFeatures',
  'mainColor',
  'mainMaterial',
  'bedFrameMaterial',
  'assembledLength',
  'assembledWidth',
  'assembledHeight',
  'productWeight',
];

const buttonBase =
  'rounded-[9px] border border-transparent px-[13px] py-2.5 text-[11px] font-semibold transition hover:-translate-y-px disabled:cursor-wait disabled:opacity-60';

function featurePreview(value: string) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= 76) return text;
  return `${text.slice(0, 42)} … ${text.slice(-28)}`;
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--border)] py-3 last:border-b-0">
      <dt className="mb-1 text-[10px] font-semibold text-[var(--text-muted)]">{label}</dt>
      <dd className="m-0 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[var(--text-primary)]">
        {value || <span className="text-[var(--text-muted)]">未采集到</span>}
      </dd>
    </div>
  );
}

export function ProductForm({
  product,
  filters,
  pricing,
  listingPrice,
  onCapture,
  onPricingChange,
  onFilterChange,
  onClear,
  onSave,
  busy,
}: ProductFormProps) {
  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <p className="mb-1 mt-0 text-[9px] font-bold tracking-[.14em] text-[var(--text-muted)]">
            SOURCE CAPTURE
          </p>
          <h1 className="m-0 text-[22px] font-bold tracking-[-.04em]">
            商品信息
          </h1>
        </div>
      </div>
      <details className="mb-3.5">
        <summary className="cursor-pointer py-1 text-[11px] font-semibold text-[var(--text-secondary)]">过滤条件</summary>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3 text-[10px] font-medium text-[var(--text-muted)]">
            <span>库存需大于</span>
            <span className="flex items-center gap-2"><input type="number" min="0" value={filters.minAvailable} onChange={event => onFilterChange({ ...filters, minAvailable: Math.max(0, Number(event.target.value)) })} className="w-24 rounded-md border border-[var(--border)] px-2 py-1.5 text-right text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" /><span>件</span></span>
          </label>
          <label className="flex items-center justify-between gap-3 text-[10px] font-medium text-[var(--text-muted)]">
            <span>最低折扣</span>
            <span className="flex items-center gap-2"><input type="number" min="0" max="100" step="0.1" value={filters.minDiscount} onChange={event => onFilterChange({ ...filters, minDiscount: Math.min(100, Math.max(0, Number(event.target.value))) })} className="w-24 rounded-md border border-[var(--border)] px-2 py-1.5 text-right text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" /><span>%</span></span>
          </label>
        </div>
      </details>
      <details className="mb-4">
        <summary className="cursor-pointer py-1 text-[11px] font-semibold text-[var(--text-secondary)]">定价参数</summary>
        <div className="mt-2 flex flex-col gap-3">
          <p className="m-0 text-[10px] leading-relaxed text-[var(--text-muted)]">挂牌价根据采购价、运费和以下比例实时计算。</p>
          {([
            ['commission', '佣金'],
            ['damage', '货损'],
            ['advertising', '广告'],
            ['profit', '利润'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 text-[10px] font-medium text-[var(--text-muted)]">
              <span>{label}</span>
              <span className="flex items-center gap-2"><input type="number" min="0" max="99" step="0.1" value={pricing[key]} onChange={event => onPricingChange({ ...pricing, [key]: Math.max(0, Number(event.target.value)) })} className="w-24 rounded-md border border-[var(--border)] px-2 py-1.5 text-right text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]" /><span>%</span></span>
            </label>
          ))}
          <div className="flex justify-between border-t border-[var(--border)] pt-2 text-[10px] text-[var(--text-muted)]">
            <span>合计定价比例</span>
            <strong className="text-[var(--text-primary)]">{(pricing.commission + pricing.damage + pricing.advertising + pricing.profit).toFixed(1)}%</strong>
          </div>
        </div>
      </details>
      <div className="mb-[17px] mt-4 flex gap-2">
        <button
          onClick={onCapture}
          disabled={busy}
          className={`${buttonBase} bg-forest text-[var(--accent-contrast)] shadow-sm`}
        >
          {busy ? '正在采集…' : '采集商品信息'}
        </button>
        <button
          onClick={onClear}
          className={`${buttonBase} border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)]`}
        >
          清空
        </button>
      </div>
      <dl className="m-0 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3">
        {fieldOrder.map((key) =>
          key === 'productFeatures' ? (
            <div key={key} className="border-b border-[var(--border)] py-3">
              <dt className="mb-1 text-[10px] font-semibold text-[var(--text-muted)]">
                {fieldLabels.productFeatures}
              </dt>
              {product.productFeatures.length ? (
                <ol className="m-0 list-decimal space-y-1 pl-5 text-[12px] leading-relaxed text-[var(--text-primary)]">
                  {product.productFeatures.map((feature, index) => (
                    <li key={`${index}-${feature}`} className="break-words">
                      {featurePreview(feature)}
                    </li>
                  ))}
                </ol>
              ) : (
                <dd className="m-0 text-[12px] text-[var(--text-muted)]">未采集到</dd>
              )}
            </div>
          ) : (
            <div key={key}>
            <ReadOnlyField
              label={fieldLabels[key]}
              value={product[key]}
            />
            {key === 'salePrice' && <ReadOnlyField label="Listing Price" value={listingPrice} />}
            </div>
          ),
        )}
      </dl>

      <div className="sticky bottom-0 mt-3 flex gap-2 bg-mist py-3 pb-1">
        <button
          type="button"
          onClick={onSave}
          className={`${buttonBase} flex-1 bg-forest text-[var(--accent-contrast)] shadow-sm`}
        >
          确认并暂存
        </button>
      </div>
    </section>
  );
}
