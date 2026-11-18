import { useState } from 'react';
import { CaseTable } from '../components/CaseTable';
import { Hero } from '../components/Hero';
import { MetricsGrid } from '../components/MetricsGrid';
import { PrototypeAlert } from '../components/PrototypeAlert';
import { SidePanels } from '../components/SidePanels';
import { pad2 } from '../lib/format';
import { routeHref } from '../lib/router';
import type { EvaluationCase } from '../types';

type WorkspacePageProps = {
  cases: EvaluationCase[];
  /** `case_count` on the registry, which can be larger than the rows listed. */
  total: number;
  loading: boolean;
  error: string | null;
  onOpenCase: (id: string) => void;
  onNewCase: () => void;
};

export function WorkspacePage({
  cases,
  total,
  loading,
  error,
  onOpenCase,
  onNewCase,
}: WorkspacePageProps) {
  const [alertVisible, setAlertVisible] = useState(true);
  const recentCases = cases.slice(0, 3);
  const sampleCount = cases.filter((item) => item.status === 'sample').length;

  return (
    <>
      <Hero onNewCase={onNewCase} />

      {alertVisible ? <PrototypeAlert onDismiss={() => setAlertVisible(false)} /> : null}

      <MetricsGrid total={total} shown={cases.length} sampleCount={sampleCount} />

      <div className="section-heading">
        <div>
          <div className="section-kicker">YOUR WORKSPACE</div>
          <h2>
            Recent cases <span className="heading-count">{pad2(cases.length)}</span>
          </h2>
        </div>
        <div className="heading-actions">
          <a className="button button-quiet button-sm" href={routeHref('evaluations')}>
            All evaluations
          </a>
          <button className="button button-secondary" type="button" onClick={onNewCase}>
            <span className="plus-sign">+</span> New evaluation
          </button>
        </div>
      </div>

      {loading ? <p className="detail-note">Reading the registry on Studionet…</p> : null}
      {error ? (
        <p className="wallet-alert wallet-alert--error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="dashboard-grid">
        <CaseTable cases={recentCases} onOpenCase={onOpenCase} onNewCase={onNewCase} />
        <SidePanels />
      </div>

      <footer className="page-footer">
        <span>
          SpecProof <span className="footer-separator">·</span> GenLayer Studionet
        </span>
        <span>Judgment by consensus, not a single backend.</span>
        <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">
          GenLayer documentation ↗
        </a>
      </footer>
    </>
  );
}
