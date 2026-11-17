import { useCallback, useMemo, useState } from 'react';
import { CaseDetailDialog } from './components/CaseDetailDialog';
import { CaseTable } from './components/CaseTable';
import { Hero } from './components/Hero';
import { MetricsGrid } from './components/MetricsGrid';
import { NewCaseDialog } from './components/NewCaseDialog';
import { PrototypeAlert } from './components/PrototypeAlert';
import { SidePanels } from './components/SidePanels';
import { Sidebar, type NavKey } from './components/Sidebar';
import { Toast } from './components/Toast';
import { TopBar } from './components/TopBar';
import { useDrafts } from './hooks/useDrafts';
import { useToast } from './hooks/useToast';
import { createDraftId, pad2, safeHost } from './lib/format';
import { SAMPLE_CASES } from './lib/samples';
import type { EvaluationCase, NewCaseInput } from './types';

export default function App() {
  const { drafts, addDraft } = useDrafts();
  const { message: toastMessage, show: showToast } = useToast();

  const [activeNav, setActiveNav] = useState<NavKey>('overview');
  const [showDraftsOnly, setShowDraftsOnly] = useState(false);
  const [alertVisible, setAlertVisible] = useState(true);
  const [creatingCase, setCreatingCase] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const allCases = useMemo(() => [...drafts, ...SAMPLE_CASES], [drafts]);
  const visibleCases = showDraftsOnly ? drafts : allCases;
  const detailCase = detailId ? allCases.find((item) => item.id === detailId) ?? null : null;

  const navigate = useCallback((nav: NavKey) => {
    setActiveNav(nav);
    if (nav === 'evaluations') setShowDraftsOnly(false);
    document.getElementById(nav)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleCreate = useCallback(
    (input: NewCaseInput) => {
      const host = safeHost(input.url);
      const displayName = input.title || `${host} delivery check`;
      const draft: EvaluationCase = {
        id: createDraftId(),
        title: displayName,
        url: input.url,
        criteria: input.criteria,
        status: 'draft',
        createdAt: new Date().toISOString(),
        mark: displayName.charAt(0).toUpperCase(),
      };

      if (!addDraft(draft)) {
        showToast('Could not save this draft in browser storage. Check your browser settings.');
        return;
      }

      setCreatingCase(false);
      setShowDraftsOnly(false);
      showToast('Draft saved locally. No website was checked and no transaction was sent.');
      setDetailId(draft.id);
    },
    [addDraft, showToast],
  );

  return (
    <>
      <div className="app-shell">
        <Sidebar activeNav={activeNav} draftCount={drafts.length} onNavigate={navigate} />

        <main className="main-content" id="overview">
          <TopBar
            onWallet={() => showToast('Wallet connection is not configured in this prototype.')}
          />

          <div className="page-wrap">
            <Hero onNewCase={() => setCreatingCase(true)} />

            {alertVisible ? <PrototypeAlert onDismiss={() => setAlertVisible(false)} /> : null}

            <MetricsGrid caseCount={allCases.length} sampleCount={SAMPLE_CASES.length} />

            <div className="section-heading" id="evaluations">
              <div>
                <div className="section-kicker">YOUR WORKSPACE</div>
                <h2>
                  Evaluation cases <span className="heading-count">{pad2(allCases.length)}</span>
                </h2>
              </div>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setCreatingCase(true)}
              >
                <span className="plus-sign">+</span> New evaluation
              </button>
            </div>

            <div className="dashboard-grid">
              <CaseTable
                cases={visibleCases}
                totalCount={allCases.length}
                draftCount={drafts.length}
                showDraftsOnly={showDraftsOnly}
                onSelectTab={setShowDraftsOnly}
                onOpenCase={setDetailId}
                onNewCase={() => setCreatingCase(true)}
                onFilter={() =>
                  showToast('All cases are shown. Filtering is not part of this prototype yet.')
                }
              />
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
          </div>
        </main>
      </div>

      <NewCaseDialog
        open={creatingCase}
        onClose={() => setCreatingCase(false)}
        onCreate={handleCreate}
      />
      <CaseDetailDialog item={detailCase} onClose={() => setDetailId(null)} />
      <Toast message={toastMessage} />
    </>
  );
}
