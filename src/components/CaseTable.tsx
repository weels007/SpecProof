import { pad2, safeHost } from '../lib/format';
import type { EvaluationCase } from '../types';

type CaseTableProps = {
  cases: EvaluationCase[];
  totalCount: number;
  draftCount: number;
  showDraftsOnly: boolean;
  onSelectTab: (draftsOnly: boolean) => void;
  onOpenCase: (id: string) => void;
  onNewCase: () => void;
  onFilter: () => void;
};

export function CaseTable({
  cases,
  totalCount,
  draftCount,
  showDraftsOnly,
  onSelectTab,
  onOpenCase,
  onNewCase,
  onFilter,
}: CaseTableProps) {
  return (
    <section className="case-list-card" aria-label="Evaluation cases">
      <div className="list-toolbar">
        <div className="list-tabs">
          <button
            className={showDraftsOnly ? 'list-tab' : 'list-tab active'}
            type="button"
            onClick={() => onSelectTab(false)}
          >
            All cases <span>{pad2(totalCount)}</span>
          </button>
          <button
            className={showDraftsOnly ? 'list-tab active' : 'list-tab'}
            type="button"
            onClick={() => onSelectTab(true)}
          >
            My drafts <span>{draftCount}</span>
          </button>
        </div>
        <button className="filter-button" type="button" aria-label="Filter cases" onClick={onFilter}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M7 12h10m-7 6h4" />
          </svg>
          <span>Filter</span>
        </button>
      </div>

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
            No drafts yet. Create an evaluation to start a local case.
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
          Create your first case <span>↗</span>
        </button>
      </div>
    </section>
  );
}
