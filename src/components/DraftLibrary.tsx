import { useRef, useState } from 'react';
import { getAIProvider, type AIModel, type CloudAIProvider } from '../ai';
import { AiResultDialog } from './AiResultDialog';
import { ModelSelect } from './ModelSelect';
import { EyeIcon, EyeOffIcon } from './icons';
import type { CustomProductField, ProductDraft } from '../types';
import type { ExcelTemplateSummary } from '../excel/types';

interface DraftLibraryProps {
  drafts: ProductDraft[];
  customFields: CustomProductField[];
  onCustomFieldsChange: (fields: CustomProductField[]) => void;
  onOpen: (draft: ProductDraft) => void;
  onDelete: (id: string) => void;
  onExport: (
    shippingTemplateField: string,
    shippingTemplateValue: string,
  ) => void;
  onAiOptimize: (
    model: AIModel,
    apiKey: string,
    excludeOptimized: boolean,
    customFields: CustomProductField[],
  ) => void;
  apiKeys: Record<CloudAIProvider, string>;
  onApiKeyChange: (provider: CloudAIProvider, apiKey: string) => void;
  optimizing: boolean;
  exporting: boolean;
  onChooseTemplate: (file: File | null) => Promise<ExcelTemplateSummary | null>;
  templateSummary: ExcelTemplateSummary | null;
  templateFile: File | null;
}

const buttonClass =
  'rounded-[9px] px-3 py-2.5 text-[11px] font-semibold transition';

export function DraftLibrary({
  drafts,
  customFields,
  onCustomFieldsChange,
  onOpen,
  onDelete,
  onExport,
  onAiOptimize,
  apiKeys,
  onApiKeyChange,
  optimizing,
  exporting,
  onChooseTemplate,
  templateSummary,
  templateFile,
}: DraftLibraryProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel>('deepseek-flash');
  const [resultDraft, setResultDraft] = useState<ProductDraft | null>(null);
  const [excludeOptimized, setExcludeOptimized] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [shippingTemplateField, setShippingTemplateField] = useState(
    'Shipping Template (US)',
  );
  const [shippingTemplateValue, setShippingTemplateValue] = useState('LA5');
  const eligibleCount = drafts.filter(
    (draft) => !excludeOptimized || !draft.aiResult,
  ).length;
  const provider = getAIProvider(selectedModel);
  const apiKey = provider ? apiKeys[provider] : '';

  return (
    <section>
      <div>
        <p className="mb-1 mt-0 text-[9px] font-bold tracking-[.14em] text-[var(--text-muted)]">
          LOCAL LIBRARY
        </p>
        <h1 className="m-0 text-[22px] font-bold tracking-[-.04em]">
          已暂存商品
        </h1>
      </div>
      <p className="my-2 mb-4 text-[11px] leading-relaxed text-[var(--text-muted)]">
        保存在此浏览器中的草稿，可继续编辑或导出。
      </p>

      <div className="mb-2">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className={`${buttonClass} w-full bg-[var(--accent)] text-[var(--accent-contrast)]`}
        >
          导入空模版
        </button>
      </div>
      <div className="mb-2 flex items-stretch gap-2">
        <ModelSelect value={selectedModel} onChange={setSelectedModel} />
        <button
          onClick={() =>
            onAiOptimize(selectedModel, apiKey, excludeOptimized, customFields)
          }
          disabled={!templateSummary || optimizing}
          className={`flex-1 justify-center bg-[var(--accent)] text-[var(--accent-contrast)] disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}
        >
          {optimizing ? '优化中…' : '优化'}
        </button>
      </div>
      {!templateSummary && (
        <p className="-mt-1 mb-3 text-[9px] text-[var(--text-muted)]">
          请先导入 Excel 模版；AI 自定义字段会按模板的品类、平台和站点自动恢复。
        </p>
      )}
      <div className="flex">
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-[10px] text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={excludeOptimized}
            onChange={(event) => setExcludeOptimized(event.target.checked)}
            className="size-3.5 accent-[var(--accent)]"
          />
          <span>排除已经 AI 优化的 listing</span>
        </label>
        <span className="ml-auto text-[9px] text-[var(--text-muted)]">
          本次将处理 {eligibleCount} 件
        </span>
      </div>
      {provider && (
        <label className="mb-3 block text-[10px] font-semibold text-[var(--text-secondary)]">
          <span>API Key</span>
          <span className="relative mt-1.5 block">
            <input
              type={showApiKey ? 'text' : 'password'}
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(event) => onApiKeyChange(provider, event.target.value)}
              placeholder="请输入选用模型的 API Key"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-3 pr-10 text-[11px] font-normal text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
              title={showApiKey ? '隐藏 API Key' : '显示 API Key'}
              onClick={() => setShowApiKey((visible) => !visible)}
              className="absolute right-1 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md border-0 bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            >
              {showApiKey ? (
                <EyeOffIcon className="size-4" />
              ) : (
                <EyeIcon className="size-4" />
              )}
            </button>
          </span>
        </label>
      )}
      <div className="mb-3">
        <button
          type="button"
          aria-expanded={customFieldsOpen}
          onClick={() => setCustomFieldsOpen((open) => !open)}
          className="inline-flex w-fit items-center gap-1.5 border-0 bg-transparent p-0 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)]"
        >
          <span
            aria-hidden="true"
            className={`text-[9px] transition-transform ${customFieldsOpen ? 'rotate-90' : ''}`}
          >
            ▶
          </span>
          预设字段
        </button>
        {customFieldsOpen && (
          <fieldset
            disabled={!templateSummary}
            className="m-0 mt-2 flex min-w-0 flex-col gap-2.5 border-0 p-0"
          >
            {templateSummary ? (
              <p className="m-0 text-[9px] leading-relaxed text-[var(--text-muted)]">
                AI
                会根据商品信息，从每个字段粘贴的模板预设值中选择一项。支持直接粘贴
                Excel
                单元格：制表符、换行或连续空格分隔；单个空格会保留在选项名称中。
              </p>
            ) : (
              <p className="m-0 text-[9px] text-[var(--text-muted)]">
                请先导入并解析 Excel 模版，再配置此模板的 AI 自定义字段。
              </p>
            )}
            {customFields.map((field, index) => (
              <div key={index} className="flex gap-2">
                <input
                  aria-label="字段名"
                  value={field.fieldName}
                  onChange={(event) =>
                    onCustomFieldsChange(
                      customFields.map((item, i) =>
                        i === index
                          ? { ...item, fieldName: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="字段名，例如 Special Features"
                  className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[10px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <textarea
                  aria-label="预设值"
                  value={field.presetValue}
                  onChange={(event) =>
                    onCustomFieldsChange(
                      customFields.map((item, i) =>
                        i === index
                          ? { ...item, presetValue: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="粘贴模板预设值"
                  rows={2}
                  className="min-w-0 flex-1 resize-y rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-[10px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  aria-label="删除字段"
                  onClick={() =>
                    onCustomFieldsChange(
                      customFields.filter((_, i) => i !== index),
                    )
                  }
                  className="rounded-md border-0 bg-[var(--surface-soft)] px-2 text-sm text-[var(--text-secondary)]"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                onCustomFieldsChange([
                  ...customFields,
                  { fieldName: '', presetValue: '' },
                ])
              }
              className="w-fit rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--text-secondary)]"
            >
              + 添加字段
            </button>
          </fieldset>
        )}
      </div>
      <div className="mb-3 grid gap-2">
        <button
          onClick={() => onExport(shippingTemplateField, shippingTemplateValue)}
          className={`${buttonClass} bg-[var(--accent)] text-[var(--accent-contrast)]`}
        >
          {exporting ? '导出中…' : '导出模版'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsm,.xlsx,application/vnd.ms-excel.sheet.macroEnabled.12,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              const summary = await onChooseTemplate(file);
              if (summary) {
                const isCanada = summary.marketplaceCode === 'CAN';
                setShippingTemplateField(
                  `Shipping Template (${isCanada ? 'CA' : 'US'})`,
                );
                setShippingTemplateValue(isCanada ? '' : 'LA5');
              }
            }
          }}
        />
      </div>

      {templateFile && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
          <span
            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[var(--text-secondary)]"
            title={templateFile.name}
          >
            {templateFile.name}
          </span>
          <span className="shrink-0 text-[9px] text-[var(--text-muted)]">
            {(templateFile.size / 1024).toFixed(0)} KB
          </span>
          <button
            type="button"
            onClick={() => {
              void onChooseTemplate(null);
            }}
            aria-label="移除 Excel 文件"
            title="移除文件"
            className="grid size-6 shrink-0 place-items-center rounded-full border-0 bg-[var(--accent-soft)] text-sm text-[var(--accent)]"
          >
            ×
          </button>
        </div>
      )}

      {templateSummary && (
        <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
          <label className="block text-[10px] text-[var(--text-secondary)]">
            {shippingTemplateField}
            <input
              value={shippingTemplateValue}
              onChange={(event) => setShippingTemplateValue(event.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-[10px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>
      )}

      <div className="my-[15px] flex flex-col gap-2">
        {drafts.length ? (
          drafts.map((draft) => (
            <article
              key={draft.id}
              className="flex items-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3"
            >
              <div className="min-w-0 flex-1">
                <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">
                  {draft.productName || draft.itemCode || '未命名商品'}
                </strong>
                <span className="mt-1 block text-[9px] text-[var(--text-muted)]">
                  {new Date(draft.updatedAt).toLocaleDateString('en-CA')}
                </span>
              </div>
              <button
                onClick={() => onOpen(draft)}
                className="rounded-md border-0 bg-[var(--accent)] px-[9px] py-[7px] text-[10px] font-semibold text-[var(--accent-contrast)]"
              >
                打开
              </button>
              <button
                onClick={() => onDelete(draft.id)}
                disabled={optimizing}
                className="rounded-md border-0 bg-[var(--accent)] px-[9px] py-[7px] text-[10px] font-semibold text-[var(--accent-contrast)]"
              >
                删除
              </button>
              {draft.aiResult && (
                <button
                  onClick={() => setResultDraft(draft)}
                  className="rounded-md border-0 bg-[var(--accent)] px-[9px] py-[7px] text-[10px] font-semibold text-[var(--accent-contrast)]"
                >
                  优化结果
                </button>
              )}
            </article>
          ))
        ) : (
          <div className="rounded-[10px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-2.5 py-7 text-center text-[11px] leading-6 text-[var(--text-muted)]">
            还没有暂存商品
            <br />
            采集并确认后会显示在这里
          </div>
        )}
      </div>
      {resultDraft?.aiResult && (
        <AiResultDialog
          productName={resultDraft.productName || resultDraft.itemCode}
          result={resultDraft.aiResult}
          onClose={() => setResultDraft(null)}
        />
      )}
    </section>
  );
}
