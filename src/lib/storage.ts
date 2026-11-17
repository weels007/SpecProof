import type { EvaluationCase } from '../types';

const STORAGE_KEY = 'specproof-drafts-v1';

function isDraft(value: unknown): value is EvaluationCase {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<EvaluationCase>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.url === 'string' &&
    Array.isArray(candidate.criteria) &&
    candidate.criteria.every((criterion) => typeof criterion === 'string')
  );
}

export function readDrafts(): EvaluationCase[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDraft).map((draft) => ({ ...draft, status: 'draft' as const }));
  } catch {
    return [];
  }
}

export function writeDrafts(drafts: EvaluationCase[]): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    return true;
  } catch {
    return false;
  }
}
