import { safeHost } from '../lib/format';
import type { EvaluationCase } from '../types';

type CaseTableProps = {
  cases: EvaluationCase[];
  onOpenCase: (id: string) => void;
  onNewCase: () => void;
  emptyTitle?: string;
  emptyBody?: string;
};

export function CaseTable({
  cases,
  onOpenCase,
  onNewCase,
  emptyTitle,
  emptyBody,
}: CaseTableProps) {
  return (
    <section className="case-list-card" aria-label="Evaluation cases">
      <div className="case-table-head">
        <span>CASE / WEBSITE</span>
        <span>CRITERIA</span>
        <span>STATUS</span>
        <span>UPDATED</span>
        <span />
      </div>

      <div className="case-list">
        {cases.length === 0 ? (
          <div className="empty-state">
            <strong>{emptyTitle ?? 'No cases yet.'}</strong>
            <p>{emptyBody ?? 'Create an evaluation to start a local case.'}</p>
            <button className="button button-secondary" type="button" onClick={onNewCase}>
              <span className="plus-sign">+</span> New evaluation
            </button>
          </div>
        ) : (
          cases.map((item) => {
            const isDraft = item.status === 'draft';
            const isOnChain = item.status === 'onchain';
            const statusClass = isDraft
              ? 'status-pill draft'
              : isOnChain
                ? item.evaluated
                  ? 'status-pill evaluated'
                  : 'status-pill onchain'
                : 'status-pill';
            const statusLabel = isDraft
              ? 'Draft'
              : isOnChain
                ? item.evaluated
                  ? 'Evaluated'
                  : 'On-chain'
                : 'Example';

            return (
              <button
                className="case-row"
                type="button"
                key={item.id}
                aria-label={`Open ${item.title}`}
                onClick={() => onOpenCase(item.id)}
              >
                <span className="case-identity">
                  <span
                    className={`site-monogram ${
                      isDraft ? 'draft-mark' : isOnChain ? 'onchain-mark' : item.tone ?? ''
                    }`}
                  >
                    {(item.mark ?? item.title.charAt(0)).toUpperCase()}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{safeHost(item.url)}</small>
                  </span>
                </span>
                <span className="criteria-count">{item.criteria.length} checks</span>
                <span className={statusClass}>{statusLabel}</span>
                <span className="case-date">
                  {isDraft ? 'Just now' : item.updated ?? (isOnChain ? 'Studionet' : 'Example')}
                </span>
                <span className="row-chevron" aria-hidden="true">
                  ›
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="list-footer">
        <span>
          <span className="footer-dot" /> Sample records are illustrative, not live evaluations
        </span>
        <button type="button" className="text-button" onClick={onNewCase}>
          Create a case <span>↗</span>
        </button>
      </div>
    </section>
  );
}
