import { useCallback, useEffect, useState } from 'react';
import { chainErrorMessage, listCases, registryConfigured } from '../lib/genlayer';
import type { ChainCaseSummary } from '../lib/genlayer';
import type { EvaluationCase } from '../types';

function toCase(summary: ChainCaseSummary): EvaluationCase {
  return {
    id: summary.id,
    title: summary.title,
    url: summary.site_url,
    criteria: [],
    criteriaCount: summary.criteria_count,
    status: 'onchain',
    caseId: summary.id,
    creator: summary.creator,
    evaluated: summary.evaluated,
    passedCount: summary.passed_count,
    updated: summary.evaluated ? 'Recorded' : 'Studionet',
    mark: (summary.title || 'S').charAt(0).toUpperCase(),
  };
}

/** Every case in the registry, read from Studionet; no wallet needed. */
export function useCases() {
  const [cases, setCases] = useState<EvaluationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!registryConfigured()) {
      setCases([]);
      setError('This build has no registry address yet.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const summaries = await listCases();
      setCases(summaries.map(toCase));
      setError(null);
    } catch (caught) {
      setError(chainErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { cases, loading, error, refresh };
}
