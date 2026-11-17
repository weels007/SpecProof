import { useCallback, useState } from 'react';
import { readDrafts, writeDrafts } from '../lib/storage';
import type { EvaluationCase } from '../types';

export function useDrafts() {
  const [drafts, setDrafts] = useState<EvaluationCase[]>(() => readDrafts());

  const addDraft = useCallback((draft: EvaluationCase) => {
    const next = [draft, ...readDrafts()];
    if (!writeDrafts(next)) return false;
    setDrafts(next);
    return true;
  }, []);

  return { drafts, addDraft };
}
