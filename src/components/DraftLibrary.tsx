import { useRef, useState } from 'react';
import type { ProductDraft } from '../types';

interface DraftLibraryProps {
  drafts: ProductDraft[];
  notice: string;
  onOpen: (draft: ProductDraft) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onAiOptimize: () => void;
  onChooseTemplate: (file: File | null) => void;
}

const buttonClass = 'rounded-[9px] px-3 py-2.5 text-[11px] font-semibold transition';

export function DraftLibrary({ drafts, notice, onOpen, onDelete, onExport, onAiOptimize, onChooseTemplate }: DraftLibraryProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  return (
    <section>
      <div>
        <p className="mb-1 mt-0 text-[9px] font-bold tracking-[.14em] text-[#87958e]">LOCAL LIBRARY</p>
        <h1 className="m-0 text-[22px] font-bold tracking-[-.04em]">已暂存商品</h1>
      </div>
      <p className="my-2 mb-4 text-[11px] leading-relaxed text-[#7d8983]">保存在此浏览器中的草稿，可继续编辑或导出。</p>

      <div className="mb-2">
        <button onClick={onAiOptimize} disabled={!drafts.length} className={`w-full bg-forest text-white disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}>AI 优化</button>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button onClick={() => fileInput.current?.click()} className={`${buttonClass} border border-[#e1e7e2] bg-white text-[#43554d]`}>导入空模版</button>
        <button onClick={onExport} className={`${buttonClass} border border-[#e1e7e2] bg-white text-[#43554d]`}>导出模版</button>
        <input ref={fileInput} type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={event => {
          const file = event.target.files?.[0];
          if (file) {
            setTemplateFile(file);
            onChooseTemplate(file);
          }
          event.target.value = '';
        }} />
      </div>

      {templateFile && <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#e5ebe6] bg-white px-3 py-2">
        <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#53645b]" title={templateFile.name}>{templateFile.name}</span>
        <span className="shrink-0 text-[9px] text-[#929e97]">{(templateFile.size / 1024).toFixed(0)} KB</span>
        <button type="button" onClick={() => { setTemplateFile(null); onChooseTemplate(null); }} aria-label="移除 Excel 文件" title="移除文件" className="grid size-6 shrink-0 place-items-center rounded-full border-0 bg-[#f2f5f2] text-sm text-[#718078]">×</button>
      </div>}

      {notice && <div role="status" className="mb-3.5 rounded-lg border border-[#f1e2b9] bg-[#fff6df] px-3 py-[9px] text-[11px] leading-relaxed text-[#765c19]">{notice}</div>}

      <div className="my-[15px] flex flex-col gap-2">
        {drafts.length ? drafts.map(draft => (
          <article key={draft.id} className="flex items-center gap-2.5 rounded-[10px] border border-[#e5ebe6] bg-white p-3">
            <div className="min-w-0 flex-1">
              <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">{draft.productName || draft.itemCode || '未命名商品'}</strong>
              <span className="mt-1 block text-[9px] text-[#929e97]">{[draft.itemCode, draft.salePrice, draft.fulfillment, new Date(draft.updatedAt).toLocaleDateString()].filter(Boolean).join(' · ')}</span>
            </div>
            <button onClick={() => onOpen(draft)} className="rounded-md border-0 bg-[#edf2ed] px-[9px] py-[7px] text-[10px] font-semibold text-[#446153]">打开</button>
            <button onClick={() => onDelete(draft.id)} className="rounded-md border-0 bg-[#edf2ed] px-[9px] py-[7px] text-[10px] font-semibold text-[#446153]">删除</button>
          </article>
        )) : <div className="rounded-[10px] border border-dashed border-[#dce4dd] bg-white px-2.5 py-7 text-center text-[11px] leading-6 text-[#9aa59e]">还没有暂存商品<br />采集并确认后会显示在这里</div>}
      </div>

    </section>
  );
}
