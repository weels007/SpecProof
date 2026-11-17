import type { WalletState } from '../hooks/useWallet';
import { routeHref } from '../lib/router';
import type { RouteName } from '../lib/router';
import { walletButtonLabel } from '../lib/wallet';

type SiteHeaderProps = {
  route: RouteName;
  wallet: WalletState;
  onOpenWallet: () => void;
};

export function SiteHeader({ route, wallet, onOpenWallet }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand site-brand" href={routeHref('landing')} aria-label="SpecProof home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="brand-name">
            spec<span>proof</span>
          </span>
        </a>

        <nav className="site-nav" aria-label="Primary">
          <a className={route === 'landing' ? 'active' : ''} href={routeHref('landing')}>
            Product
          </a>
          <a
            className={route === 'how-it-works' ? 'active' : ''}
            href={routeHref('how-it-works')}
          >
            How it works
          </a>
          <a href={routeHref('evaluations')}>Evaluations</a>
        </nav>

        <div className="site-actions">
          <button className="button button-wallet" type="button" onClick={onOpenWallet}>
            {wallet.status === 'connected' ? <i className="wallet-dot wallet-dot--ok" /> : null}
            {walletButtonLabel(wallet)}
          </button>
          <a className="button button-primary site-cta" href={routeHref('workspace')}>
            Open workspace <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>
  );
}
