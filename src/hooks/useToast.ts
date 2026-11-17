import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
};

const DURATION_MS: Record<ToastTone, number> = {
  success: 3800,
  info: 3800,
  error: 6000,
};

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const counter = useRef(0);

  const show = useCallback((message: string, tone: ToastTone = 'info') => {
    counter.current += 1;
    setToast({ id: counter.current, message, tone });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), DURATION_MS[tone]);
  }, []);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { toast, show, dismiss };
}

export type ToastApi = ReturnType<typeof useToast>;
