import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from './components/AppLayout';
import { CaseDetailDialog } from './components/CaseDetailDialog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MarketingLayout } from './components/MarketingLayout';
import { NewCaseDialog } from './components/NewCaseDialog';
import { Toast } from './components/Toast';
import { WalletDialog } from './components/WalletDialog';
import { useCases } from './hooks/useCases';
import { useToast } from './hooks/useToast';
import { useWallet } from './hooks/useWallet';
import { safeHost } from './lib/format';
import { chainErrorMessage, createCase, MAX_REGISTRY_CASES } from './lib/genlayer';
import { navigateTo, routeTitle, useRoute } from './lib/router';
import { SAMPLE_CASES } from './lib/samples';
import { EvaluationsPage } from './pages/EvaluationsPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { LandingPage } from './pages/LandingPage';
import { WorkspacePage } from './pages/WorkspacePage';
import type { NewCaseInput } from './types';

export default function App() {
  const route = useRoute();
  const wallet = useWallet();
  const { toast, show: showToast, dismiss: dismissToast } = useToast();
  const {
    cases,
    total,
    loading: casesLoading,
    error: casesError,
    refresh: refreshCases,
  } = useCases();

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

  // Sample rows stand in only when the registry answered with no cases at all —
  // never while a read is in flight or after it failed, so a broken registry
  // cannot look like a populated one.
  const allCases = useMemo(
    () => (cases.length > 0 || casesLoading || casesError ? cases : SAMPLE_CASES),
    [cases, casesLoading, casesError],
  );
  const detailCase = detailId ? allCases.find((item) => item.id === detailId) ?? null : null;

  const handleStart = useCallback(() => {
    setStartRequested(true);
    navigateTo('workspace');
  }, []);

  const handleRefresh = useCallback(() => {
    void refreshCases();
  }, [refreshCases]);

  const handleCreate = useCallback(
    async (input: NewCaseInput): Promise<boolean> => {
      if (!wallet.address) {
        showToast('Connect a wallet to open a case on Studionet.', 'error');
        return false;
      }

      if (total >= MAX_REGISTRY_CASES) {
        showToast('The registry is full (500 cases), so no new case can be opened.', 'error');
        return false;
      }

      const host = safeHost(input.url);
      const displayName = (input.title || `${host} delivery check`).slice(0, 80);

      try {
        const { caseId } = await createCase(wallet.address, displayName, input.url, input.criteria);
        await refreshCases();
        setCreatingCase(false);

        if (caseId) {
          showToast('Case opened in the SpecProof registry.', 'success');
          setDetailId(caseId);
        } else {
          showToast('Case opened on Studionet. Refresh the list to see it.', 'success');
        }

        return true;
      } catch (error) {
        showToast(chainErrorMessage(error), 'error');
        return false;
      }
    },
    [refreshCases, showToast, total, wallet.address],
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
          caseCount={total > 0 ? total : allCases.length}
          onOpenWallet={openWallet}
          onNewCase={openNewCase}
        >
          {route === 'evaluations' ? (
            <EvaluationsPage
              cases={allCases}
              total={total}
              loading={casesLoading}
              error={casesError}
              onOpenCase={setDetailId}
              onNewCase={openNewCase}
              onRefresh={handleRefresh}
            />
          ) : (
            <WorkspacePage
              cases={allCases}
              total={total}
              loading={casesLoading}
              error={casesError}
              onOpenCase={setDetailId}
              onNewCase={openNewCase}
            />
          )}
        </AppLayout>
      )}

      <NewCaseDialog
        open={creatingCase}
        walletAddress={wallet.address}
        onClose={() => setCreatingCase(false)}
        onCreate={handleCreate}
      />
      <CaseDetailDialog
        item={detailCase}
        walletAddress={wallet.address}
        onClose={() => setDetailId(null)}
        onNotify={showToast}
        onChainEvaluated={handleRefresh}
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
