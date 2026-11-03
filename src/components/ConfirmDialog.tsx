interface ConfirmDialogProps {
  message: string;
  title?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, title = '请确认', onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-5" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onCancel(); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message" className="w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-xl">
        <h2 id="confirm-title" className="m-0 text-base font-bold text-[#1c2b28]">{title}</h2>
        <p id="confirm-message" className="mb-5 mt-2 text-sm leading-relaxed text-[#66736c]">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-lg border border-[#e1e7e2] bg-white px-4 py-2 text-sm font-semibold text-[#43554d]">取消</button>
          <button onClick={onConfirm} className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white">继续</button>
        </div>
      </section>
    </div>
  );
}
