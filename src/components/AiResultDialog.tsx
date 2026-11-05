import type { ReactNode } from 'react';
import type { AIListingContent } from '../types';

interface AiResultDialogProps {
  productName: string;
  result: AIListingContent;
  onClose: () => void;
}

export function AiResultDialog({
  productName,
  result,
  onClose,
}: AiResultDialogProps) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4 py-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-result-title"
        className="flex max-h-full w-full max-w-[560px] flex-col rounded-2xl border border-[#d9dee5] bg-white text-[#1f2937] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#e5e7eb] px-5 py-4">
          <div className="min-w-0">
            <h2 id="ai-result-title" className="m-0 text-base font-bold">
              AI 优化结果
            </h2>
            <p className="mb-0 mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[#758195]">
              {productName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid size-7 shrink-0 place-items-center rounded-md border-0 bg-[#f3f4f6] text-lg text-[#596579]"
          >
            ×
          </button>
        </header>
        <div className="overflow-y-auto px-5 py-4 text-sm">
          <ResultSection title="Product Title">
            <p className="m-0 leading-relaxed">{result.productTitle}</p>
          </ResultSection>
          <ResultSection
            title={`About This Item · ${result.bullets.length} 条要点`}
          >
            <ol className="m-0 list-decimal space-y-2 pl-5">
              {result.bullets.map((bullet, index) => (
                <li key={`${index}-${bullet}`} className="leading-relaxed">
                  <BulletText text={bullet} />
                </li>
              ))}
            </ol>
          </ResultSection>
          <ResultSection title="Product Description">
            <p className="m-0 whitespace-pre-wrap leading-relaxed">
              {result.productDescription}
            </p>
          </ResultSection>
          <ResultSection title="Search Keywords">
            <div className="flex flex-wrap gap-1.5">
              {result.searchKeywords.length ? (
                result.searchKeywords.map((keyword, index) => (
                  <span
                    key={`${index}-${keyword}`}
                    className="rounded-full bg-[#f1f5f2] px-2.5 py-1 text-xs text-[#315e4e]"
                  >
                    {keyword}
                  </span>
                ))
              ) : (
                <span className="text-[#758195]">未返回关键词</span>
              )}
            </div>
          </ResultSection>
          {!!result.customFields?.length && (
            <ResultSection title="Custom Fields">
              <dl className="m-0 space-y-2">
                {result.customFields.map((field, index) => (
                  <div key={`${field.fieldName}-${index}`}>
                    <dt className="font-semibold">{field.fieldName}</dt>
                    <dd className="m-0 mt-0.5">{field.value || '未返回有效预设值'}</dd>
                  </div>
                ))}
              </dl>
            </ResultSection>
          )}
        </div>
        <footer className="flex justify-end border-t border-[#e5e7eb] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] px-4 py-2 text-sm font-semibold"
          >
            关闭
          </button>
        </footer>
      </section>
    </div>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-1.5 mt-0 text-[11px] font-bold uppercase tracking-wide text-[#64748b]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function BulletText({ text }: { text: string }) {
  const separator = text.indexOf(':');
  if (separator < 1 || separator > 100) return <>{text}</>;
  const heading = text
    .slice(0, separator)
    .replace(/^\*\*|\*\*$/g, '')
    .replace(/^【|】$/g, '');
  return (
    <>
      <strong>{heading}:</strong>
      {text.slice(separator + 1)}
    </>
  );
}
