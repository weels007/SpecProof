import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from './components/AppLayout';
import { CaseDetailDialog } from './components/CaseDetailDialog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MarketingLayout } from './components/MarketingLayout';
import { NewCaseDialog } from './components/NewCaseDialog';
import { Toast } from './components/Toast';
import { WalletDialog } from './components/WalletDialog';
import { useDrafts } from './hooks/useDrafts';
import { useToast } from './hooks/useToast';
import { useWallet } from './hooks/useWallet';
import { createDraftId, safeHost } from './lib/format';
import { navigateTo, routeTitle, useRoute } from './lib/router';
import { SAMPLE_CASES } from './lib/samples';
import { EvaluationsPage } from './pages/EvaluationsPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import type { EvaluationCase, NewCaseInput } from './types';

export default function App() {
  const route = useRoute();
  const wallet = useWallet();
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const { drafts, addDraft, deleteDraft } = useDrafts();

  const [walletOpen, setWalletOpen] = useState(false);
  const [creatingCase, setCreatingCase] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [startRequested, setStartRequested] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setWalletOpen(false);
    document.title = routeTitle(route);
  }, [route]);

  // A "start an evaluation" click from a marketing page opens the dialog once the
  // workspace is on screen.
  useEffect(() => {
    if (!startRequested) return;
    if (route !== 'workspace' && route !== 'evaluations') return;
    setCreatingCase(true);
    setStartRequested(false);
  }, [route, startRequested]);

  const allCases = useMemo(() => [...drafts, ...SAMPLE_CASES], [drafts]);
  const detailCase = detailId ? allCases.find((item) => item.id === detailId) ?? null : null;

  const handleStart = useCallback(() => {
    setStartRequested(true);
    navigateTo('workspace');
  }, []);

  const handleCreate = useCallback(
    (input: NewCaseInput): boolean => {
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
        showToast(
          'Could not save this draft. Browser storage is full or blocked — free some space and try again.',
          'error',
        );
        return false;
      }

      setCreatingCase(false);
      showToast('Draft saved in this browser. No website was checked.', 'success');
      setDetailId(draft.id);
      return true;
    },
    [addDraft, showToast],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!deleteDraft(id)) {
        showToast('Could not delete this draft. Browser storage is blocked.', 'error');
        return;
      }
      setDetailId(null);
      showToast('Draft deleted from this browser.', 'info');
    },
    [deleteDraft, showToast],
  );

  const handleWalletConnected = useCallback(() => {
    showToast('Wallet connected.', 'success');
  }, [showToast]);

  const openWallet = useCallback(() => setWalletOpen(true), []);
  const closeWallet = useCallback(() => setWalletOpen(false), []);
  const openNewCase = useCallback(() => setCreatingCase(true), []);

  const isMarketing = route === 'landing' || route === 'how-it-works';

  return (
    <ErrorBoundary>
      {isMarketing ? (
        <MarketingLayout route={route} wallet={wallet} onOpenWallet={openWallet}>
          {route === 'landing' ? (
            <LandingPage onStart={handleStart} />
          ) : (
            <HowItWorksPage onStart={handleStart} />
          )}
        </MarketingLayout>
      ) : (
        <AppLayout
          route={route}
          wallet={wallet}
          draftCount={drafts.length}
          onOpenWallet={openWallet}
          onNewCase={openNewCase}
        >
          {route === 'evaluations' ? (
            <EvaluationsPage drafts={drafts} onOpenCase={setDetailId} onNewCase={openNewCase} />
          ) : (
            <WorkspacePage drafts={drafts} onOpenCase={setDetailId} onNewCase={openNewCase} />
          )}
        </AppLayout>
      )}

      <NewCaseDialog open={creatingCase} onClose={() => setCreatingCase(false)} onCreate={handleCreate} />
      <CaseDetailDialog
        item={detailCase}
        onClose={() => setDetailId(null)}
        onDelete={handleDelete}
        onNotify={showToast}
      />
      <WalletDialog
        open={walletOpen}
        onClose={closeWallet}
        wallet={wallet}
        onConnected={handleWalletConnected}
      />
      <Toast toast={toast} onDismiss={dismissToast} />
    </ErrorBoundary>
  );
}
