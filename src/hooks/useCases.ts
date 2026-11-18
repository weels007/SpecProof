import { useCallback, useEffect, useState } from 'react';
import { chainErrorMessage, listCases, readCaseCount, registryConfigured } from '../lib/genlayer';
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

/**
 * Cases from the registry, plus the registry's own case count.
 *
 * The count matters because `list_cases` is capped at 50: it is how the app
 * knows the list is truncated, and whether the registry has room for another case.
 */
export function useCases() {
  const [cases, setCases] = useState<EvaluationCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!registryConfigured()) {
      setCases([]);
      setTotal(0);
      setError('This build has no registry address yet.');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [count, summaries] = await Promise.all([readCaseCount(), listCases()]);
      setTotal(count);
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

  return { cases, total, loading, error, refresh };
}
