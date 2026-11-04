import { useRef, useState } from 'react';
import { getAIProvider, type AIModel, type CloudAIProvider } from '../ai';
import { AiResultDialog } from './AiResultDialog';
import { ModelSelect } from './ModelSelect';
import { EyeIcon, EyeOffIcon } from './icons';
import type { ProductDraft } from '../types';

interface DraftLibraryProps {
  drafts: ProductDraft[];
  onOpen: (draft: ProductDraft) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onAiOptimize: (
    model: AIModel,
    apiKey: string,
    excludeOptimized: boolean,
  ) => void;
  apiKeys: Record<CloudAIProvider, string>;
  onApiKeyChange: (provider: CloudAIProvider, apiKey: string) => void;
  optimizing: boolean;
  onChooseTemplate: (file: File | null) => void;
}

const buttonClass =
  'rounded-[9px] px-3 py-2.5 text-[11px] font-semibold transition';

export function DraftLibrary({
  drafts,
  onOpen,
  onDelete,
  onExport,
  onAiOptimize,
  apiKeys,
  onApiKeyChange,
  optimizing,
  onChooseTemplate,
}: DraftLibraryProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] =
    useState<AIModel>('gemini-3.8-flash');
  const [resultDraft, setResultDraft] = useState<ProductDraft | null>(null);
  const [excludeOptimized, setExcludeOptimized] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
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

      <div className="mb-2 flex items-stretch gap-2">
        <ModelSelect value={selectedModel} onChange={setSelectedModel} />
        <button
          onClick={() => onAiOptimize(selectedModel, apiKey, excludeOptimized)}
          disabled={
            !eligibleCount ||
            optimizing ||
            (provider !== null && !apiKey.trim())
          }
          className={`flex-1 justify-center bg-[var(--accent)] text-[var(--accent-contrast)] disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}
        >
          {optimizing ? '优化中…' : '优化'}
        </button>
      </div>
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
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => fileInput.current?.click()}
          className={`${buttonClass} bg-[var(--accent)] text-[var(--accent-contrast)]`}
        >
          导入空模版
        </button>
        <button
          onClick={onExport}
          className={`${buttonClass} bg-[var(--accent)] text-[var(--accent-contrast)]`}
        >
          导出模版
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setTemplateFile(file);
              onChooseTemplate(file);
            }
            event.target.value = '';
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
              setTemplateFile(null);
              onChooseTemplate(null);
            }}
            aria-label="移除 Excel 文件"
            title="移除文件"
            className="grid size-6 shrink-0 place-items-center rounded-full border-0 bg-[var(--accent-soft)] text-sm text-[var(--accent)]"
          >
            ×
          </button>
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
                  {[
                    draft.itemCode,
                    draft.salePrice,
                    draft.fulfillment,
                    new Date(draft.updatedAt).toLocaleDateString(),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
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
