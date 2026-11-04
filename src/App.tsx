import { useCallback, useEffect, useRef, useState } from 'react';
import { DraftLibrary } from './components/DraftLibrary';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ProductForm } from './components/ProductForm';
import { TopBar } from './components/TopBar';
import { Toast, type ToastKind, type ToastMessage } from './components/Toast';
import { optimizeDraft, type AIModel, type CloudAIProvider } from './ai';
import { scrapeActiveTab } from './gigaScraper';
import {
  defaultPricing,
  deleteDraft,
  getAIProviderKeys,
  getDrafts,
  getPricing,
  getTheme,
  saveAIProviderKey,
  saveDraft,
  savePricing,
  saveTheme,
  type PricingSettings,
} from './storage';
import {
  emptyProduct,
  type CaptureFilters,
  type ProductDraft,
  type ProductFields,
} from './types';
import { defaultTheme, type ThemeId } from './theme';

type View = 'capture' | 'library';
const hasProductData = (value: ProductFields) =>
  Object.entries(value).some(([key, field]) =>
    key === 'productFeatures'
      ? Array.isArray(field) && field.length > 0
      : typeof field === 'string' && field.trim().length > 0,
  );
const withoutMetadata = (draft: ProductDraft): ProductFields => {
  const legacyDraft = draft as ProductDraft & { currency?: string };
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    aiResult: _aiResult,
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
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<CloudAIProvider, string>>({
    gemini: '',
    deepseek: '',
  });
  const [pricing, setPricing] = useState<PricingSettings>(defaultPricing);
  const [filters, setFilters] = useState<CaptureFilters>({
    minAvailable: 10,
    minDiscount: 0,
  });
  const [theme, setTheme] = useState<ThemeId>(defaultTheme);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const confirmationResolver = useRef<((confirmed: boolean) => void) | null>(
    null,
  );

  function showToast(message: string, kind: ToastKind = 'info') {
    setToast({ id: Date.now() + Math.random(), kind, message });
  }
  const dismissToast = useCallback(() => setToast(null), []);

  function askConfirmation(message: string, title = '请确认') {
    return new Promise<boolean>((resolve) => {
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
    void getPricing()
      .then(setPricing)
      .catch(() => setPricing(defaultPricing));
    void getTheme()
      .then(setTheme)
      .catch(() => setTheme(defaultTheme));
    void getAIProviderKeys()
      .then(setApiKeys)
      .catch(() => setApiKeys({ gemini: '', deepseek: '' }));
  }, []);

  function updatePricing(next: PricingSettings) {
    setPricing(next);
    void savePricing(next);
  }

  function updateTheme(next: ThemeId) {
    setTheme(next);
    void saveTheme(next).catch(() =>
      showToast('主题已临时应用，但未能保存到本机。', 'error'),
    );
  }

  const parseAmount = (value: string) =>
    Number.parseFloat(value.replace(/,/g, ''));
  const purchasePrice = parseAmount(product.originalPrice || product.salePrice);
  const fulfillmentCost = parseAmount(product.fulfillment);
  const totalRate =
    (pricing.commission +
      pricing.damage +
      pricing.advertising +
      pricing.profit) /
    100;
  const listingPrice =
    Number.isFinite(purchasePrice) &&
    Number.isFinite(fulfillmentCost) &&
    totalRate < 1
      ? ((purchasePrice + fulfillmentCost) / (1 - totalRate)).toFixed(2)
      : '';

  async function toggleView() {
    if (view === 'capture') {
      try {
        setDrafts(await getDrafts());
        setToast(null);
        setView('library');
      } catch {
        showToast('无法读取暂存商品，请检查扩展存储权限后重试。', 'error');
      }
      return;
    }
    setToast(null);
    setView('capture');
  }

  async function capture() {
    if (
      hasUnsavedProduct &&
      hasProductData(product) &&
      !(await askConfirmation(
        '当前采集的信息还没有暂存。继续后将用新商品信息替换当前内容。',
      ))
    ) {
      return;
    }
    setBusy(true);
    setToast(null);
    try {
      const result = await scrapeActiveTab();
      const available = Number.parseInt(
        result.product.available.replace(/,/g, ''),
        10,
      );
      const discount = Number.parseFloat(
        result.product.discount.replace('%', ''),
      );
      const unmet: string[] = [];
      if (!Number.isFinite(available) || available <= filters.minAvailable) {
        unmet.push(
          Number.isFinite(available)
            ? `库存 ${available} 件，不大于设定值 ${filters.minAvailable} 件`
            : '页面未采集到库存',
        );
      }
      if (
        filters.minDiscount > 0 &&
        (!Number.isFinite(discount) || discount < filters.minDiscount)
      ) {
        unmet.push(
          Number.isFinite(discount)
            ? `折扣 ${discount}%，低于设定值 ${filters.minDiscount}%`
            : '页面未采集到折扣',
        );
      }
      if (
        unmet.length &&
        !(await askConfirmation(
          `${unmet.join('；')}。仍要继续采集吗？`,
          '未满足过滤条件',
        ))
      ) {
        showToast(`已取消采集：${unmet.join('；')}。`, 'info');
        return;
      }
      const code = result.product.itemCode.trim().toLocaleLowerCase();
      if (code) {
        const stored = await getDrafts();
        const match = stored.find(
          (draft) => draft.itemCode.trim().toLocaleLowerCase() === code,
        );
        const currentMatch =
          product.itemCode.trim().toLocaleLowerCase() === code;
        if (match || currentMatch) {
          showToast(
            match
              ? `Item Code ${result.product.itemCode} 已暂存在本机，未重复采集。`
              : `Item Code ${result.product.itemCode} 与当前未暂存商品相同，保留现有信息。`,
            'info',
          );
          return;
        }
      }
      setProduct(result.product);
      setActiveId(null);
      setHasUnsavedProduct(true);
      showToast(
        result.warnings.length
          ? `采集完成。${result.warnings.join(' ')}`
          : '采集完成，请检查字段后确认暂存。',
        result.warnings.length ? 'info' : 'success',
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : '采集失败，请重试。',
        'error',
      );
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!product.productName && !product.itemCode) {
      showToast('至少补充 Product Name 或 Item Code 后再保存。', 'error');
      return;
    }
    try {
      const allDrafts = await getDrafts();
      const duplicate =
        product.itemCode.trim() &&
        allDrafts.find(
          (item) =>
            item.id !== activeId &&
            item.itemCode.trim().toLocaleLowerCase() ===
              product.itemCode.trim().toLocaleLowerCase(),
        );
      if (duplicate) {
        showToast(
          `Item Code ${product.itemCode} 已存在于暂存商品中，不能重复保存。`,
          'error',
        );
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
      setDrafts(await getDrafts());
      setProduct(emptyProduct());
      setActiveId(null);
      setHasUnsavedProduct(false);
      showToast('商品已成功暂存，采集页面已清空。', 'success');
    } catch (error) {
      showToast(
        error instanceof Error
          ? `暂存失败：${error.message}`
          : '暂存失败，请重试。',
        'error',
      );
    }
  }

  async function removeDraft(id: string) {
    try {
      await deleteDraft(id);
      setDrafts(await getDrafts());
      showToast('商品草稿已删除。', 'success');
    } catch (error) {
      showToast(
        error instanceof Error
          ? `删除失败：${error.message}`
          : '删除失败，请重试。',
        'error',
      );
    }
  }

  async function optimizeDrafts(
    model: AIModel,
    apiKey: string,
    excludeOptimized: boolean,
  ) {
    setAiBusy(true);
    let completed = 0;
    const failures: string[] = [];
    const pendingDrafts = drafts.filter(
      (draft) => !excludeOptimized || !draft.aiResult,
    );
    try {
      let nextIndex = 0;
      const workerCount = Math.min(3, pendingDrafts.length);
      const workers = Array.from({ length: workerCount }, async () => {
        while (nextIndex < pendingDrafts.length) {
          const draft = pendingDrafts[nextIndex++];
          try {
            const aiResult = await optimizeDraft(draft, model, apiKey);
            await saveDraft({
              ...draft,
              aiResult,
              updatedAt: new Date().toISOString(),
            });
            completed += 1;
          } catch (error) {
            failures.push(
              `${draft.productName || draft.itemCode}: ${error instanceof Error ? error.message : '生成失败'}`,
            );
          }
        }
      });
      await Promise.all(workers);
      setDrafts(await getDrafts());
      if (failures.length) {
        showToast(
          completed
            ? `已完成 ${completed} 件商品；${failures.length} 件失败。${failures[0]}`
            : failures[0] || 'AI 优化失败。',
          'error',
        );
      } else {
        showToast(
          `已完成 ${completed} 件商品的 AI 文案优化，可在对应草稿中查看结果。`,
          'success',
        );
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'AI 优化暂不可用。',
        'error',
      );
    } finally {
      setAiBusy(false);
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
    <div
      className="app-shell min-h-screen bg-mist text-[var(--text-primary)] antialiased"
      data-theme={theme}
    >
      <TopBar
        view={view}
        theme={theme}
        onThemeChange={updateTheme}
        onToggleView={() => void toggleView()}
      />
      <Toast toast={toast} onDismiss={dismissToast} />
      <main className="mx-auto max-w-[600px] px-5 pb-7 pt-[22px] max-[360px]:px-4">
        {view === 'capture' ? (
          <ProductForm
            product={product}
            filters={filters}
            pricing={pricing}
            listingPrice={listingPrice}
            busy={busy}
            onCapture={() => void capture()}
            onPricingChange={updatePricing}
            onFilterChange={setFilters}
            onClear={() => {
              setProduct(emptyProduct());
              setActiveId(null);
              setHasUnsavedProduct(false);
              setToast(null);
            }}
            onSave={() => void save()}
          />
        ) : (
          <DraftLibrary
            drafts={drafts}
            onOpen={(draft) => {
              setProduct(withoutMetadata(draft));
              setActiveId(draft.id);
              setHasUnsavedProduct(false);
              setToast(null);
              setView('capture');
            }}
            onDelete={(id) => void removeDraft(id)}
            onExport={() => {
              exportJson(drafts, 'listing-loom-drafts.json');
              showToast('草稿数据已导出为 JSON。', 'success');
            }}
            onAiOptimize={(model, apiKey, excludeOptimized) =>
              void optimizeDrafts(model, apiKey, excludeOptimized)
            }
            apiKeys={apiKeys}
            onApiKeyChange={(provider, apiKey) => {
              setApiKeys((current) => ({ ...current, [provider]: apiKey }));
              void saveAIProviderKey(provider, apiKey).catch(() =>
                showToast('API Key 暂未能保存到本机。', 'error'),
              );
            }}
            optimizing={aiBusy}
            onChooseTemplate={(file) =>
              file && showToast(`已选择 ${file.name}。`, 'info')
            }
          />
        )}
      </main>
      <footer className="px-0 pb-[15px] pt-2.5 text-center text-[9px] text-[var(--text-muted)]">
        Listing Loom <span className="px-1">·</span> 本地优先，人工确认
      </footer>
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          message={confirmation.message}
          onConfirm={() => resolveConfirmation(true)}
          onCancel={() => resolveConfirmation(false)}
        />
      )}
    </div>
  );
}
