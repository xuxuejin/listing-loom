import { useEffect, useRef, useState } from 'react';
import { DraftLibrary } from './components/DraftLibrary';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ProductForm } from './components/ProductForm';
import { TopBar } from './components/TopBar';
import { optimizeAllDrafts } from './ai';
import { scrapeActiveTab } from './gigaScraper';
import { defaultPricing, deleteDraft, getDrafts, getPricing, saveDraft, savePricing, type PricingSettings } from './storage';
import { emptyProduct, type CaptureFilters, type ProductDraft, type ProductFields } from './types';

type View = 'capture' | 'library';
const hasProductData = (value: ProductFields) => Object.entries(value).some(([key, field]) =>
  key === 'productFeatures' ? Array.isArray(field) && field.length > 0 : typeof field === 'string' && field.trim().length > 0,
);
const withoutMetadata = (draft: ProductDraft): ProductFields => {
  const legacyDraft = draft as ProductDraft & { currency?: string };
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    currency: _legacyCurrency,
    ...product
  } = legacyDraft;
  return product;
};

export default function App() {
  const [product, setProduct] = useState<ProductFields>(emptyProduct);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasUnsavedProduct, setHasUnsavedProduct] = useState(false);
  const [view, setView] = useState<View>('capture');
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [pricing, setPricing] = useState<PricingSettings>(defaultPricing);
  const [filters, setFilters] = useState<CaptureFilters>({ minAvailable: 10, minDiscount: 0 });
  const [confirmation, setConfirmation] = useState<{ title: string; message: string } | null>(null);
  const confirmationResolver = useRef<((confirmed: boolean) => void) | null>(null);

  function askConfirmation(message: string, title = '请确认') {
    return new Promise<boolean>(resolve => {
      confirmationResolver.current = resolve;
      setConfirmation({ title, message });
    });
  }

  function resolveConfirmation(confirmed: boolean) {
    setConfirmation(null);
    confirmationResolver.current?.(confirmed);
    confirmationResolver.current = null;
  }

  useEffect(() => {
    void getPricing().then(setPricing).catch(() => setPricing(defaultPricing));
  }, []);

  function updatePricing(next: PricingSettings) {
    setPricing(next);
    void savePricing(next);
  }

  const parseAmount = (value: string) => Number.parseFloat(value.replace(/,/g, ''));
  const purchasePrice = parseAmount(product.originalPrice || product.salePrice);
  const fulfillmentCost = parseAmount(product.fulfillment);
  const totalRate = (pricing.commission + pricing.damage + pricing.advertising + pricing.profit) / 100;
  const listingPrice = Number.isFinite(purchasePrice) && Number.isFinite(fulfillmentCost) && totalRate < 1
    ? ((purchasePrice + fulfillmentCost) / (1 - totalRate)).toFixed(2)
    : '';

  async function toggleView() {
    if (view === 'capture') {
      try {
        setDrafts(await getDrafts());
        setNotice('');
        setView('library');
      } catch {
        setNotice('无法读取暂存商品，请检查扩展存储权限后重试。');
      }
      return;
    }
    setNotice('');
    setView('capture');
  }

  async function capture() {
    if (
      hasUnsavedProduct &&
      hasProductData(product) &&
      !(await askConfirmation('当前采集的信息还没有暂存。继续后将用新商品信息替换当前内容。'))
    ) {
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      const result = await scrapeActiveTab();
      const available = Number.parseInt(result.product.available.replace(/,/g, ''), 10);
      const discount = Number.parseFloat(result.product.discount.replace('%', ''));
      const unmet: string[] = [];
      if (!Number.isFinite(available) || available <= filters.minAvailable) {
        unmet.push(Number.isFinite(available)
          ? `库存 ${available} 件，不大于设定值 ${filters.minAvailable} 件`
          : '页面未采集到库存');
      }
      if (filters.minDiscount > 0 && (!Number.isFinite(discount) || discount < filters.minDiscount)) {
        unmet.push(Number.isFinite(discount)
          ? `折扣 ${discount}%，低于设定值 ${filters.minDiscount}%`
          : '页面未采集到折扣');
      }
      if (unmet.length && !(await askConfirmation(`${unmet.join('；')}。仍要继续采集吗？`, '未满足过滤条件'))) {
        setNotice(`已取消采集：${unmet.join('；')}。`);
        return;
      }
      const code = result.product.itemCode.trim().toLocaleLowerCase();
      if (code) {
        const stored = await getDrafts();
        const match = stored.find(draft => draft.itemCode.trim().toLocaleLowerCase() === code);
        const currentMatch = product.itemCode.trim().toLocaleLowerCase() === code;
        if (match || currentMatch) {
          setNotice(match
            ? `Item Code ${result.product.itemCode} 已暂存在本机，未重复采集。`
            : `Item Code ${result.product.itemCode} 与当前未暂存商品相同，保留现有信息。`);
          return;
        }
      }
      setProduct(result.product);
      setActiveId(null);
      setHasUnsavedProduct(true);
      setNotice(
        result.warnings.length
          ? `采集完成。${result.warnings.join(' ')}`
          : '采集完成，请检查字段后确认暂存。',
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '采集失败，请重试。');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!product.productName && !product.itemCode) {
      setNotice('至少补充 Product Name 或 Item Code 后再保存。');
      return;
    }
    const allDrafts = await getDrafts();
    const duplicate = product.itemCode.trim() && allDrafts.find(item =>
      item.id !== activeId && item.itemCode.trim().toLocaleLowerCase() === product.itemCode.trim().toLocaleLowerCase(),
    );
    if (duplicate) {
      setNotice(`Item Code ${product.itemCode} 已存在于暂存商品中，不能重复保存。`);
      return;
    }
    const existing = allDrafts.find((item) => item.id === activeId);
    const now = new Date().toISOString();
    const draft: ProductDraft = {
      ...product,
      id: activeId || crypto.randomUUID(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    await saveDraft(draft);
    setActiveId(draft.id);
    setHasUnsavedProduct(false);
    setNotice('已保存在本机浏览器扩展中。');
  }

  async function removeDraft(id: string) {
    await deleteDraft(id);
    setDrafts(await getDrafts());
  }

  async function optimizeDrafts() {
    try {
      const optimized = await optimizeAllDrafts(drafts);
      if (optimized.length) {
        for (const draft of optimized) await saveDraft(draft);
        setDrafts(await getDrafts());
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'AI 优化暂不可用。');
    }
  }

  function exportJson(data: unknown, name: string) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="min-h-screen bg-mist text-[#1c2b28] antialiased">
      <TopBar view={view} onToggleView={() => void toggleView()} />
      <main className="mx-auto max-w-[600px] px-5 pb-7 pt-[22px] max-[360px]:px-4">
        {view === 'capture' ? (
          <ProductForm
            product={product}
            filters={filters}
            pricing={pricing}
            listingPrice={listingPrice}
            notice={notice}
            busy={busy}
            onCapture={() => void capture()}
            onPricingChange={updatePricing}
            onFilterChange={setFilters}
            onClear={() => {
              setProduct(emptyProduct());
              setActiveId(null);
              setHasUnsavedProduct(false);
              setNotice('');
            }}
            onSave={() => void save()}
          />
        ) : (
          <DraftLibrary
            drafts={drafts}
            notice={notice}
            onOpen={(draft) => {
              setProduct(withoutMetadata(draft));
              setActiveId(draft.id);
              setHasUnsavedProduct(false);
              setNotice('');
              setView('capture');
            }}
            onDelete={(id) => void removeDraft(id)}
            onExport={() => exportJson(drafts, 'listing-loom-drafts.json')}
            onAiOptimize={() => void optimizeDrafts()}
            onChooseTemplate={file => setNotice(file ? `已选择 ${file.name}。Excel 模版读取和填充接口待接入。` : '')}
          />
        )}
      </main>
      <footer className="px-0 pb-[15px] pt-2.5 text-center text-[9px] text-[#a1aca5]">
        Listing Loom <span className="px-1">·</span> 本地优先，人工确认
      </footer>
      {confirmation && <ConfirmDialog title={confirmation.title} message={confirmation.message} onConfirm={() => resolveConfirmation(true)} onCancel={() => resolveConfirmation(false)} />}
    </div>
  );
}
