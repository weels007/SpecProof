import type { ToastState } from '../hooks/useToast';

const ICONS = {
  success: '✓',
  error: '!',
  info: 'i',
} as const;

type ToastProps = {
  toast: ToastState | null;
  onDismiss: () => void;
};

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) {
    return <div className="toast" role="status" aria-live="polite" />;
  }

  const isError = toast.tone === 'error';

  return (
    <div
      key={toast.id}
      className={`toast visible toast--${toast.tone}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <span className="toast-icon" aria-hidden="true">
        {ICONS[toast.tone]}
      </span>
      <span className="toast-message">{toast.message}</span>
      <button className="toast-close" type="button" aria-label="Dismiss message" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}
