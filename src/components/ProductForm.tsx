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
  notice: string;
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
    <div className="border-b border-[#e8ede9] py-3 last:border-b-0">
      <dt className="mb-1 text-[10px] font-semibold text-[#697770]">{label}</dt>
      <dd className="m-0 whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[#283a33]">
        {value || <span className="text-[#a1aca5]">未采集到</span>}
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
  notice,
}: ProductFormProps) {
  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <p className="mb-1 mt-0 text-[9px] font-bold tracking-[.14em] text-[#87958e]">
            SOURCE CAPTURE
          </p>
          <h1 className="m-0 text-[22px] font-bold tracking-[-.04em]">
            商品信息
          </h1>
        </div>
      </div>
      <details className="mb-3.5">
        <summary className="cursor-pointer py-1 text-[11px] font-semibold text-[#53645b]">过滤条件</summary>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3 text-[10px] font-medium text-[#697770]">
            <span>库存需大于</span>
            <span className="flex items-center gap-2"><input type="number" min="0" value={filters.minAvailable} onChange={event => onFilterChange({ ...filters, minAvailable: Math.max(0, Number(event.target.value)) })} className="w-24 rounded-md border border-[#e2e8e3] px-2 py-1.5 text-right text-xs text-[#283a33] outline-none focus:border-[#8aa891]" /><span>件</span></span>
          </label>
          <label className="flex items-center justify-between gap-3 text-[10px] font-medium text-[#697770]">
            <span>最低折扣</span>
            <span className="flex items-center gap-2"><input type="number" min="0" max="100" step="0.1" value={filters.minDiscount} onChange={event => onFilterChange({ ...filters, minDiscount: Math.min(100, Math.max(0, Number(event.target.value))) })} className="w-24 rounded-md border border-[#e2e8e3] px-2 py-1.5 text-right text-xs text-[#283a33] outline-none focus:border-[#8aa891]" /><span>%</span></span>
          </label>
        </div>
      </details>
      <details className="mb-4">
        <summary className="cursor-pointer py-1 text-[11px] font-semibold text-[#53645b]">定价参数</summary>
        <div className="mt-2 flex flex-col gap-3">
          <p className="m-0 text-[10px] leading-relaxed text-[#89958f]">挂牌价根据采购价、运费和以下比例实时计算。</p>
          {([
            ['commission', '佣金'],
            ['damage', '货损'],
            ['advertising', '广告'],
            ['profit', '利润'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3 text-[10px] font-medium text-[#697770]">
              <span>{label}</span>
              <span className="flex items-center gap-2"><input type="number" min="0" max="99" step="0.1" value={pricing[key]} onChange={event => onPricingChange({ ...pricing, [key]: Math.max(0, Number(event.target.value)) })} className="w-24 rounded-md border border-[#e2e8e3] px-2 py-1.5 text-right text-xs text-[#283a33] outline-none focus:border-[#8aa891]" /><span>%</span></span>
            </label>
          ))}
          <div className="flex justify-between border-t border-[#e8ede9] pt-2 text-[10px] text-[#718078]">
            <span>合计定价比例</span>
            <strong className="text-[#283a33]">{(pricing.commission + pricing.damage + pricing.advertising + pricing.profit).toFixed(1)}%</strong>
          </div>
        </div>
      </details>
      <div className="mb-[17px] mt-4 flex gap-2">
        <button
          onClick={onCapture}
          disabled={busy}
          className={`${buttonBase} bg-forest text-white shadow-sm`}
        >
          {busy ? '正在采集…' : '采集商品信息'}
        </button>
        <button
          onClick={onClear}
          className={`${buttonBase} border-[#e1e7e2] bg-white text-[#43554d]`}
        >
          清空
        </button>
      </div>
      {notice && (
        <div
          role="status"
          className="mb-3.5 rounded-lg border border-[#f1e2b9] bg-[#fff6df] px-3 py-[9px] text-[11px] leading-relaxed text-[#765c19]"
        >
          {notice}
        </div>
      )}

      <dl className="m-0 rounded-[10px] border border-[#e5ebe6] bg-white px-3">
        {fieldOrder.map((key) =>
          key === 'productFeatures' ? (
            <div key={key} className="border-b border-[#e8ede9] py-3">
              <dt className="mb-1 text-[10px] font-semibold text-[#697770]">
                {fieldLabels.productFeatures}
              </dt>
              {product.productFeatures.length ? (
                <ol className="m-0 list-decimal space-y-1 pl-5 text-[12px] leading-relaxed text-[#283a33]">
                  {product.productFeatures.map((feature, index) => (
                    <li key={`${index}-${feature}`} className="break-words">
                      {featurePreview(feature)}
                    </li>
                  ))}
                </ol>
              ) : (
                <dd className="m-0 text-[12px] text-[#a1aca5]">未采集到</dd>
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
          className={`${buttonBase} flex-1 bg-forest text-white shadow-sm`}
        >
          确认并暂存
        </button>
      </div>
    </section>
  );
}
