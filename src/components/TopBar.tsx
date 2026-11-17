import type { WalletState } from '../hooks/useWallet';
import type { RouteName } from '../lib/router';
import { walletButtonLabel } from '../lib/wallet';

type TopBarProps = {
  route: RouteName;
  wallet: WalletState;
  onOpenWallet: () => void;
  onNewCase: () => void;
};

const BREADCRUMBS: Record<RouteName, string> = {
  landing: 'Overview',
  workspace: 'Overview',
  evaluations: 'Evaluations',
  'how-it-works': 'How it works',
};

export function TopBar({ route, wallet, onOpenWallet, onNewCase }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <span className="breadcrumb-slash">/</span>
        <strong>{BREADCRUMBS[route]}</strong>
      </div>
      <div className="topbar-actions">
        <button className="button button-secondary button-sm" type="button" onClick={onNewCase}>
          <span className="plus-sign">+</span> New evaluation
        </button>
        <button
          className={
            wallet.status === 'connected'
              ? 'button button-wallet button-wallet--connected'
              : 'button button-wallet'
          }
          type="button"
          onClick={onOpenWallet}
        >
          {wallet.status === 'connected' ? <i className="wallet-dot wallet-dot--ok" /> : null}
          {walletButtonLabel(wallet)}
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </header>
  );
}
