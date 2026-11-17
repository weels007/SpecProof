import { useMemo, useState } from 'react';
import { CaseTable } from '../components/CaseTable';
import { Hero } from '../components/Hero';
import { MetricsGrid } from '../components/MetricsGrid';
import { PrototypeAlert } from '../components/PrototypeAlert';
import { SidePanels } from '../components/SidePanels';
import { pad2 } from '../lib/format';
import { routeHref } from '../lib/router';
import { SAMPLE_CASES } from '../lib/samples';
import type { EvaluationCase } from '../types';

type WorkspacePageProps = {
  drafts: EvaluationCase[];
  onOpenCase: (id: string) => void;
  onNewCase: () => void;
};

export function WorkspacePage({ drafts, onOpenCase, onNewCase }: WorkspacePageProps) {
  const [alertVisible, setAlertVisible] = useState(true);
  const allCases = useMemo(() => [...drafts, ...SAMPLE_CASES], [drafts]);
  const recentCases = allCases.slice(0, 3);

  return (
    <>
      <Hero onNewCase={onNewCase} />

      {alertVisible ? <PrototypeAlert onDismiss={() => setAlertVisible(false)} /> : null}

      <MetricsGrid caseCount={allCases.length} sampleCount={SAMPLE_CASES.length} />

      <div className="section-heading">
        <div>
          <div className="section-kicker">YOUR WORKSPACE</div>
          <h2>
            Recent cases <span className="heading-count">{pad2(allCases.length)}</span>
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

      <div className="dashboard-grid">
        <CaseTable cases={recentCases} onOpenCase={onOpenCase} onNewCase={onNewCase} />
        <SidePanels />
      </div>

      <footer className="page-footer">
        <span>
          SpecProof <span className="footer-separator">·</span> concept prototype
        </span>
        <span>Judgment by consensus, not a single backend.</span>
        <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">
          GenLayer documentation ↗
        </a>
      </footer>
    </>
  );
}
