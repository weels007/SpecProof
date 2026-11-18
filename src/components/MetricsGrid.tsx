import { pad2 } from '../lib/format';

type MetricsGridProps = {
  /** Cases held by the registry (`case_count`), not just the rows on screen. */
  total: number;
  /** Rows the app listed (the registry returns at most 50). */
  shown: number;
  sampleCount: number;
};

export function MetricsGrid({ total, shown, sampleCount }: MetricsGridProps) {
  return (
    <section className="metrics-grid" aria-label="Workspace summary">
      <article className="metric-card">
        <div className="metric-label">
          EVALUATIONS IN REGISTRY{' '}
          <span className="metric-icon icon-list" aria-hidden="true">
            ▤
          </span>
        </div>
        <div className="metric-value">
          {pad2(total)} <span className="metric-detail">cases</span>
        </div>
        <div className="metric-foot">
          <span className="metric-neutral">{pad2(sampleCount)} sample</span>
          <span>{total > shown ? `newest ${pad2(shown)} shown` : 'on Studionet'}</span>
        </div>
      </article>
      <article className="metric-card">
        <div className="metric-label">
          CRITERIA LIMIT{' '}
          <span className="metric-icon icon-target" aria-hidden="true">
            ◎
          </span>
        </div>
        <div className="metric-value">
          06<span className="metric-suffix">/case</span>
        </div>
        <div className="metric-foot">
          <span className="metric-good">
            <span>↗</span> Criteria first
          </span>
          <span>design principle</span>
        </div>
      </article>
      <article className="metric-card metric-network">
        <div className="metric-label">
          DECISION LAYER{' '}
          <span className="metric-icon icon-nodes" aria-hidden="true">
            ⌘
          </span>
        </div>
        <div className="metric-value network-value">
          <span className="genlayer-symbol">G</span> GenLayer
        </div>
        <div className="metric-foot">
          <span className="metric-neutral">One shared registry</span>
          <span>Studionet</span>
        </div>
      </article>
    </section>
  );
}
