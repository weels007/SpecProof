import { useCallback, useEffect, useState } from 'react';
import { DRAFTS_STORAGE_KEY, readDrafts, writeDrafts } from '../lib/storage';
import type { EvaluationCase } from '../types';

export function useDrafts() {
  const [drafts, setDrafts] = useState<EvaluationCase[]>(() => readDrafts());

  // Keep another tab or window of the same app in sync.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === DRAFTS_STORAGE_KEY) setDrafts(readDrafts());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const addDraft = useCallback((draft: EvaluationCase): boolean => {
    const next = [draft, ...readDrafts()];
    if (!writeDrafts(next)) return false;
    setDrafts(next);
    return true;
  }, []);

  const deleteDraft = useCallback((id: string): boolean => {
    const existing = readDrafts();
    const next = existing.filter((draft) => draft.id !== id);
    if (next.length === existing.length) {
      setDrafts(existing);
      return true;
    }
    if (!writeDrafts(next)) return false;
    setDrafts(next);
    return true;
  }, []);

  return { drafts, addDraft, deleteDraft };
}
