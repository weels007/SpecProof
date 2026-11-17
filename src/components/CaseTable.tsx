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
          cases.map((item) => (
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
                    item.status === 'draft' ? 'draft-mark' : item.tone ?? ''
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
              <span className={item.status === 'draft' ? 'status-pill draft' : 'status-pill'}>
                {item.status === 'draft' ? 'Draft' : 'Example'}
              </span>
              <span className="case-date">
                {item.status === 'draft' ? 'Just now' : item.updated ?? 'Example'}
              </span>
              <span className="row-chevron" aria-hidden="true">
                ›
              </span>
            </button>
          ))
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
