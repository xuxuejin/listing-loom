import { useEffect } from 'react';

export type ToastKind = 'success' | 'error' | 'info';
export interface ToastMessage { id: number; kind: ToastKind; message: string }

export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 3600);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const labels: Record<ToastKind, string> = { success: '成功', error: '错误', info: '提示' };
  const icons: Record<ToastKind, string> = { success: '✓', error: '!', info: 'i' };
  return (
    <div className={`toast toast-${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'} aria-live={toast.kind === 'error' ? 'assertive' : 'polite'}>
      <span className="toast-icon" aria-hidden="true">{icons[toast.kind]}</span>
      <span className="min-w-0 flex-1"><strong className="mr-1.5">{labels[toast.kind]}</strong>{toast.message}</span>
      <button type="button" onClick={onDismiss} aria-label="关闭提示" className="toast-close">×</button>
    </div>
  );
}
