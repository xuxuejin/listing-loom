import './style.css';
import { deleteDraft, getDrafts, saveDraft } from './storage';
import { scrapeActiveTab } from './scraper';
import { emptyProduct, fieldLabels, type ProductDraft, type ProductFields } from './types';

const fields: Array<{ key: keyof ProductFields; kind?: 'textarea'; rows?: number; placeholder?: string; wide?: boolean }> = [
  { key: 'title', kind: 'textarea', rows: 2, placeholder: '商品页面上的标题', wide: true },
  { key: 'itemCode', placeholder: '例如：GF-2048-SL' }, { key: 'merchant', placeholder: '供应商 / 商家名称' },
  { key: 'category', placeholder: '页面类目路径', wide: true },
  { key: 'currentPrice', placeholder: '215.20' }, { key: 'originalPrice', placeholder: '269.00' },
  { key: 'currency', placeholder: 'CAD' }, { key: 'discount', placeholder: '20% OFF' },
  { key: 'features', kind: 'textarea', rows: 4, placeholder: '保留页面原始要点；一条一行', wide: true },
  { key: 'description', kind: 'textarea', rows: 4, placeholder: '商品页面描述', wide: true },
  { key: 'material', placeholder: '页面明确说明时填写' }, { key: 'size', placeholder: '例如：30 × 20 × 10 cm' },
  { key: 'color', placeholder: '例如：Black' }, { key: 'sourceUrl', placeholder: '商品详情页链接', wide: true },
];

const app = document.querySelector<HTMLDivElement>('#app')!;
let current: ProductFields = emptyProduct();
let activeId: string | null = null;
let view: 'capture' | 'library' = 'capture';

function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }

function render(): void {
  app.innerHTML = `
    <header class="topbar"><div class="brand-mark">LL</div><div class="brand-copy"><strong>Listing Loom</strong><span>商品织录 · 采集工作台</span></div><button id="listButton" class="icon-button" aria-label="已保存草稿">☷</button></header>
    <main>${view === 'capture' ? renderCapture() : renderLibrary()}</main>
    <footer>Listing Loom <span>·</span> 本地优先，人工确认</footer>`;
  bindEvents();
}

function renderCapture(): string {
  return `<section><div class="intro-row"><div><p class="eyebrow">SOURCE CAPTURE</p><h1>商品信息</h1></div><span id="statusPill" class="status-pill">${activeId ? '已暂存' : '等待采集'}</span></div>
    <p class="hint">从当前商品页整理原始信息，确认后作为 AI 文案生成的输入。</p>
    <div class="toolbar"><button id="captureButton" class="button primary">采集当前页面</button><button id="clearButton" class="button secondary">清空</button></div>
    <div id="notice" class="notice" hidden></div>
    <form id="productForm" class="form">
      ${section('01', '基本信息')}${field('title')}${field('itemCode')}${field('merchant')}${field('category')}
      ${section('02', '价格信息')}<div class="field-grid">${field('currentPrice')}${field('originalPrice')}${field('currency')}${field('discount')}</div>
      ${section('03', '商品内容')}${field('features')}${field('description')}<div class="field-grid">${field('material')}${field('size')}${field('color')}</div>
      ${section('04', '来源')}${field('sourceUrl')}
      <div class="privacy-note"><span>▣</span><p>采集信息会交给 AI 重新生成文案。草稿仅保存在本机浏览器，不采集图片，也不会自动上传。</p></div>
      <div class="bottom-actions"><button id="saveButton" class="button primary" type="button">确认并暂存</button><button id="aiButton" class="button secondary" type="button">复制 AI 输入</button></div>
    </form></section>`;
}

function section(number: string, title: string): string { return `<div class="section-title col-span-2"><span>${number}</span><h2>${title}</h2><i></i></div>`; }
function field(key: keyof ProductFields): string {
  const config = fields.find(item => item.key === key)!;
  const control = config.kind === 'textarea'
    ? `<textarea name="${key}" rows="${config.rows}" placeholder="${config.placeholder}">${escapeHtml(current[key])}</textarea>`
    : `<input name="${key}" ${key === 'sourceUrl' ? 'readonly' : ''} value="${escapeHtml(current[key])}" placeholder="${config.placeholder || ''}">`;
  return `<label class="field ${config.wide ? 'wide' : ''}"><span>${fieldLabels[key]}</span>${control}</label>`;
}

function renderLibrary(): string {
  return `<section><div class="intro-row"><div><p class="eyebrow">LOCAL LIBRARY</p><h1>已暂存商品</h1></div><button id="backButton" class="text-button">返回采集</button></div>
    <p class="hint">保存在此浏览器中的草稿，可继续编辑或导出。</p><div id="draftList" class="draft-list">载入中…</div><button id="exportAllButton" class="button secondary full">导出全部草稿 JSON</button></section>`;
}

function readForm(): ProductFields {
  const form = document.querySelector<HTMLFormElement>('#productForm')!;
  return Object.fromEntries(fields.map(({ key }) => [key, (form.elements.namedItem(key) as HTMLInputElement | HTMLTextAreaElement).value.trim()])) as ProductFields;
}
function setNotice(message: string): void { const notice = document.querySelector<HTMLDivElement>('#notice'); if (notice) { notice.textContent = message; notice.hidden = !message; } }
function updateField<K extends keyof ProductFields>(key: K, value: ProductFields[K]): void { current = { ...current, [key]: value }; }

function bindEvents(): void {
  document.querySelector('#listButton')?.addEventListener('click', () => { view = 'library'; render(); loadLibrary(); });
  document.querySelector('#backButton')?.addEventListener('click', () => { view = 'capture'; render(); });
  document.querySelector('#productForm')?.addEventListener('input', event => {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    if (target.name in current) updateField(target.name as keyof ProductFields, target.value);
  });
  document.querySelector('#captureButton')?.addEventListener('click', async () => {
    const button = document.querySelector<HTMLButtonElement>('#captureButton')!;
    button.disabled = true; button.textContent = '正在读取…'; setNotice('');
    try {
      const extracted = await scrapeActiveTab();
      const edited = current;
      current = { ...extracted };
      for (const [key, value] of Object.entries(edited)) if (value && key !== 'sourceUrl') current[key as keyof ProductFields] = value;
      activeId = null; render(); setNotice('页面信息已读取，请检查后确认暂存。');
    } catch (error) { button.disabled = false; button.textContent = '采集当前页面'; setNotice(error instanceof Error ? error.message : '采集失败，请重试。'); }
  });
  document.querySelector('#clearButton')?.addEventListener('click', () => { current = emptyProduct(); activeId = null; render(); });
  document.querySelector('#saveButton')?.addEventListener('click', async () => {
    current = readForm();
    if (!current.title && !current.itemCode) { setNotice('至少补充商品标题或 Item Code 后再保存。'); return; }
    const existing = (await getDrafts()).find(item => item.id === activeId);
    const now = new Date().toISOString();
    const draft: ProductDraft = { ...current, id: activeId || crypto.randomUUID(), createdAt: existing?.createdAt || now, updatedAt: now };
    await saveDraft(draft); activeId = draft.id; render(); setNotice('已保存在本机浏览器扩展中。');
  });
  document.querySelector('#aiButton')?.addEventListener('click', async () => {
    current = readForm();
    const payload = { task: '请基于以下来源信息重新生成适用于目标亚马逊站点和商品类目的商品文案。只使用已提供且明确的事实；信息缺失时列出待确认项，不要编造。', sourceProduct: current };
    try { await navigator.clipboard.writeText(JSON.stringify(payload, null, 2)); setNotice('AI 输入 JSON 已复制，可粘贴到 AI 对话中。'); }
    catch { setNotice('剪贴板不可用，请使用导出功能保存商品信息。'); }
  });
  document.querySelector('#exportAllButton')?.addEventListener('click', async () => downloadJson(await getDrafts(), 'listing-loom-drafts.json'));
  if (view === 'capture' && !current.sourceUrl) chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => { if (tab?.url) { current.sourceUrl = tab.url; const source = document.querySelector<HTMLInputElement>('[name="sourceUrl"]'); if (source) source.value = tab.url; } });
}

async function loadLibrary(): Promise<void> {
  const container = document.querySelector<HTMLDivElement>('#draftList'); if (!container) return;
  const drafts = await getDrafts();
  if (!drafts.length) { container.innerHTML = '<div class="empty-state">还没有暂存商品<br>采集并确认后会显示在这里</div>'; return; }
  container.innerHTML = drafts.map(draft => `<article class="draft-card"><div class="draft-info"><strong>${escapeHtml(draft.title || draft.itemCode || '未命名商品')}</strong><span>${escapeHtml([draft.itemCode, draft.currency && draft.currentPrice ? `${draft.currency} ${draft.currentPrice}` : '', new Date(draft.updatedAt).toLocaleDateString()].filter(Boolean).join(' · '))}</span></div><button data-open="${draft.id}">打开</button><button data-delete="${draft.id}">删除</button></article>`).join('');
  container.querySelectorAll<HTMLButtonElement>('[data-open]').forEach(button => button.addEventListener('click', () => {
    const selected = drafts.find(draft => draft.id === button.dataset.open)!;
    current = Object.fromEntries(Object.entries(selected).filter(([key]) => !['id', 'createdAt', 'updatedAt'].includes(key))) as ProductFields;
    activeId = selected.id; view = 'capture'; render();
  }));
  container.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(button => button.addEventListener('click', async () => { await deleteDraft(button.dataset.delete!); await loadLibrary(); }));
}

function downloadJson(data: unknown, name: string): void {
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); link.download = name; link.click(); URL.revokeObjectURL(link.href);
}

render();
