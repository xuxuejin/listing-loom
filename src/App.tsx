import { useCallback, useEffect, useRef, useState } from 'react';
import { DraftLibrary } from './components/DraftLibrary';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ProductForm } from './components/ProductForm';
import { TopBar } from './components/TopBar';
import { Toast, type ToastKind, type ToastMessage } from './components/Toast';
import {
  getAIProvider,
  optimizeDraft,
  type AIModel,
  type CloudAIProvider,
} from './ai';
import { scrapeActiveTab } from './gigaScraper';
import {
  defaultPricing,
  deleteDraft,
  getAIProviderKeys,
  getBrandName,
  getDrafts,
  getPricing,
  getTheme,
  getTemplateCustomFields,
  saveAIProviderKey,
  saveBrandName,
  saveDraft,
  savePricing,
  saveTheme,
  saveTemplateCustomFields,
  type PricingSettings,
} from './storage';
import {
  emptyProduct,
  type CaptureFilters,
  type ProductDraft,
  type ProductFields,
} from './types';
import type { CustomProductField } from './types';
import { defaultTheme, type ThemeId } from './theme';
import { loadExcelTemplate, getTemplateSummary } from './excel/loadTemplate';
import { downloadWorkbook } from './excel/downloadWorkbook';
import type { LoadedExcelTemplate } from './excel/types';

type View = 'capture' | 'library';
const hasProductData = (value: ProductFields) =>
  Object.entries(value).some(([key, field]) =>
    key === 'productFeatures'
      ? Array.isArray(field) && field.length > 0
      : key === 'attributes'
        ? Boolean(
            field && typeof field === 'object' && Object.keys(field).length,
          )
        : typeof field === 'string' && field.trim().length > 0,
  );
const withoutMetadata = (draft: ProductDraft): ProductFields => {
  const legacyDraft = draft as ProductDraft & {
    currency?: string;
    mainColor?: string;
    mainMaterial?: string;
    bedFrameMaterial?: string;
    assembledLength?: string;
    assembledWidth?: string;
    assembledHeight?: string;
    productWeight?: string;
  };
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    aiResult: _aiResult,
    customFields: _customFields,
    currency: _legacyCurrency,
    mainColor: _mainColor,
    mainMaterial: _mainMaterial,
    bedFrameMaterial: _bedFrameMaterial,
    assembledLength: _assembledLength,
    assembledWidth: _assembledWidth,
    assembledHeight: _assembledHeight,
    productWeight: _productWeight,
    ...product
  } = legacyDraft;
  const attributes = Object.fromEntries(
    Object.entries(product.attributes ?? {}).filter(
      ([label]) =>
        !['item code', 'product name'].includes(
          label
            .replace(/[:：]\s*$/, '')
            .trim()
            .toLocaleLowerCase(),
        ),
    ),
  );
  const addLegacyAttribute = (label: string, value?: string) => {
    const exists = Object.keys(attributes).some(
      (name) =>
        name.replace(/\s+/g, ' ').trim().toLocaleLowerCase() ===
        label.toLocaleLowerCase(),
    );
    if (value && !exists) attributes[label] = value;
  };
  addLegacyAttribute('Main Color', legacyDraft.mainColor);
  addLegacyAttribute('Main Material', legacyDraft.mainMaterial);
  addLegacyAttribute('Bed Frame Material', legacyDraft.bedFrameMaterial);
  addLegacyAttribute('Assembled Length (in.)', legacyDraft.assembledLength);
  addLegacyAttribute('Assembled Width (in.)', legacyDraft.assembledWidth);
  addLegacyAttribute('Assembled Height (in.)', legacyDraft.assembledHeight);
  addLegacyAttribute('Product Weight (lbs.)', legacyDraft.productWeight);
  return {
    ...product,
    brandName: product.brandName ?? '',
    attributes,
  };
};

export default function App() {
  const [product, setProduct] = useState<ProductFields>(emptyProduct);
  const [brandName, setBrandName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasUnsavedProduct, setHasUnsavedProduct] = useState(false);
  const [view, setView] = useState<View>('capture');
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [aiCustomFields, setAiCustomFields] = useState<CustomProductField[]>(
    [],
  );
  const [customFieldsTemplateKey, setCustomFieldsTemplateKey] = useState<
    string | null
  >(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [excelBusy, setExcelBusy] = useState(false);
  const [excelTemplate, setExcelTemplate] =
    useState<LoadedExcelTemplate | null>(null);
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
  const brandNameLoaded = useRef(false);
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
    void getBrandName()
      .then((savedBrandName) => {
        setBrandName(savedBrandName);
        setProduct((current) => ({
          ...current,
          brandName: current.brandName || savedBrandName,
        }));
      })
      .catch(() => undefined)
      .finally(() => {
        brandNameLoaded.current = true;
      });
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
      setProduct({
        ...result.product,
        brandName: brandName || result.product.brandName,
      });
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
    customFields: ProductDraft['customFields'] = [],
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
            const aiResult = await optimizeDraft(
              { ...draft, customFields },
              model,
              apiKey,
            );
            await saveDraft({
              ...draft,
              customFields,
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

  function requestAIOptimization(
    model: AIModel,
    apiKey: string,
    excludeOptimized: boolean,
    customFields: ProductDraft['customFields'] = [],
  ) {
    if (!excelTemplate) {
      showToast('请先导入并解析 Excel 模版，再进行 AI 优化。', 'info');
      return;
    }
    const pendingDrafts = drafts.filter(
      (draft) => !excludeOptimized || !draft.aiResult,
    );
    if (!pendingDrafts.length) {
      showToast(
        '没有待优化的商品；可取消“排除已经 AI 优化的 listing”后重新生成。',
        'info',
      );
      return;
    }
    if (getAIProvider(model) && !apiKey.trim()) {
      showToast('请先填写当前模型的 API Key。', 'info');
      return;
    }
    void optimizeDrafts(model, apiKey, excludeOptimized, customFields);
  }

  async function chooseExcelTemplate(file: File | null) {
    if (!file) {
      setExcelTemplate(null);
      setCustomFieldsTemplateKey(null);
      setAiCustomFields([]);
      return null;
    }
    try {
      const loaded = await loadExcelTemplate(file);
      setExcelTemplate(loaded);
      const summary = getTemplateSummary(loaded);
      const templateKey = `${summary.categoryCode}-${summary.platformCode}-${summary.marketplaceCode}`;
      setCustomFieldsTemplateKey(templateKey);
      setAiCustomFields(await getTemplateCustomFields(templateKey));
      showToast('Excel 模版读取成功，导出时会自动定位首个空行。', 'success');
      return summary;
    } catch (error) {
      setExcelTemplate(null);
      setCustomFieldsTemplateKey(null);
      setAiCustomFields([]);
      showToast(
        error instanceof Error ? error.message : 'Excel 模版解析失败。',
        'error',
      );
      return null;
    }
  }

  function updateAICustomFields(fields: CustomProductField[]) {
    setAiCustomFields(fields);
    if (customFieldsTemplateKey) {
      void saveTemplateCustomFields(customFieldsTemplateKey, fields).catch(() =>
        showToast('预设字段暂未能保存到本机。', 'error'),
      );
    }
  }

  async function exportTemplate(
    shippingTemplateField: string,
    shippingTemplateValue: string,
  ) {
    if (excelBusy) {
      showToast('模版正在导出，请稍候。', 'info');
      return;
    }
    if (!excelTemplate) {
      showToast('请先导入并解析 Excel 模版。', 'error');
      return;
    }
    if (!drafts.length) {
      showToast('暂存列表为空，没有可导出的商品。', 'error');
      return;
    }
    const missingAiDraft = drafts.find((draft) => !draft.aiResult);
    if (missingAiDraft) {
      showToast(
        `${missingAiDraft.productName || missingAiDraft.itemCode} 尚无 AI 优化结果，请先完成 AI 优化。`,
        'error',
      );
      return;
    }
    const exportDrafts = drafts.map((draft) => ({
      ...draft,
      brandName: draft.brandName?.trim() || brandName.trim(),
    }));
    const missingBrandDraft = exportDrafts.find((draft) => !draft.brandName);
    if (missingBrandDraft) {
      showToast(
        `${missingBrandDraft.productName || missingBrandDraft.itemCode} 缺少 Brand Name，请打开该商品补充并暂存后重试。`,
        'error',
      );
      return;
    }
    setExcelBusy(true);
    try {
      const { fillExcelTemplate } = await import('./excel/fillTemplate');
      const filledWorkbook = await fillExcelTemplate(
        excelTemplate,
        exportDrafts,
        {
          parentageLevel: 'Parent',
          parentSku: '',
          pricing,
          shippingTemplateField,
          shippingTemplateValue,
        },
      );
      downloadWorkbook(filledWorkbook);
      showToast(
        `已导出 ${drafts.length} 个商品到 ${filledWorkbook.fileName}。`,
        'success',
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Excel 模版导出失败。',
        'error',
      );
    } finally {
      setExcelBusy(false);
    }
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
            onProductChange={(nextProduct) => {
              setProduct(nextProduct);
              if (nextProduct.brandName !== product.brandName) {
                setBrandName(nextProduct.brandName);
                if (brandNameLoaded.current) {
                  void saveBrandName(nextProduct.brandName).catch(() =>
                    showToast('Brand Name 暂未能保存到本机。', 'error'),
                  );
                }
              }
              setHasUnsavedProduct(true);
            }}
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
            customFields={aiCustomFields}
            onCustomFieldsChange={updateAICustomFields}
            onOpen={(draft) => {
              setProduct({
                ...withoutMetadata(draft),
                brandName: draft.brandName?.trim() || brandName,
              });
              setActiveId(draft.id);
              setHasUnsavedProduct(false);
              setToast(null);
              setView('capture');
            }}
            onDelete={(id) => void removeDraft(id)}
            onExport={(shippingTemplateField, shippingTemplateValue) =>
              void exportTemplate(shippingTemplateField, shippingTemplateValue)
            }
            onAiOptimize={(model, apiKey, excludeOptimized, customFields) =>
              requestAIOptimization(
                model,
                apiKey,
                excludeOptimized,
                customFields,
              )
            }
            apiKeys={apiKeys}
            onApiKeyChange={(provider, apiKey) => {
              setApiKeys((current) => ({ ...current, [provider]: apiKey }));
              void saveAIProviderKey(provider, apiKey).catch(() =>
                showToast('API Key 暂未能保存到本机。', 'error'),
              );
            }}
            optimizing={aiBusy}
            exporting={excelBusy}
            onChooseTemplate={chooseExcelTemplate}
            templateSummary={
              excelTemplate ? getTemplateSummary(excelTemplate) : null
            }
            templateFile={excelTemplate?.file ?? null}
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
