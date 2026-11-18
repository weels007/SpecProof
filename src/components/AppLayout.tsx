import type { ReactNode } from 'react';
import type { WalletState } from '../hooks/useWallet';
import type { RouteName } from '../lib/router';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

type AppLayoutProps = {
  route: RouteName;
  wallet: WalletState;
  caseCount: number;
  onOpenWallet: () => void;
  onNewCase: () => void;
  children: ReactNode;
};

export function AppLayout({
  route,
  wallet,
  caseCount,
  onOpenWallet,
  onNewCase,
  children,
}: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Sidebar
        route={route}
        wallet={wallet}
        caseCount={caseCount}
        onOpenWallet={onOpenWallet}
        onNewCase={onNewCase}
      />
      <main className="main-content" id="main" tabIndex={-1}>
        <TopBar
          route={route}
          wallet={wallet}
          onOpenWallet={onOpenWallet}
          onNewCase={onNewCase}
        />
        <div className="page-wrap">{children}</div>
      </main>
    </div>
  );
}
