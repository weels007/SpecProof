import type { WalletState } from '../hooks/useWallet';
import { pad2 } from '../lib/format';
import { routeHref } from '../lib/router';
import type { RouteName } from '../lib/router';
import { walletSubtitle, walletTitle } from '../lib/wallet';

type SidebarProps = {
  route: RouteName;
  wallet: WalletState;
  draftCount: number;
  onOpenWallet: () => void;
  onNewCase: () => void;
};

function walletDotClass(wallet: WalletState): string {
  if (wallet.isDemo) return 'wallet-dot wallet-dot--demo';
  if (wallet.status === 'connected') return 'wallet-dot wallet-dot--ok';
  if (wallet.status === 'connecting') return 'wallet-dot wallet-dot--busy';
  return 'wallet-dot';
}

export function Sidebar({ route, wallet, draftCount, onOpenWallet, onNewCase }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Workspace navigation">
      <a className="brand" href={routeHref('landing')} aria-label="SpecProof home">
        <span className="brand-mark" aria-hidden="true">
          <span />
        </span>
        <span className="brand-name">
          spec<span>proof</span>
        </span>
      </a>

      <button className="sidebar-new" type="button" onClick={onNewCase}>
        <span aria-hidden="true">+</span> New evaluation
      </button>

      <div className="workspace-label">WORKSPACE</div>
      <nav className="primary-nav">
        <a
          className={route === 'workspace' ? 'nav-link active' : 'nav-link'}
          href={routeHref('workspace')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
          </svg>
          Overview
        </a>
        <a
          className={route === 'evaluations' ? 'nav-link active' : 'nav-link'}
          href={routeHref('evaluations')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3.75h7l4.25 4.5v12H7a2 2 0 0 1-2-2v-12a2.5 2.5 0 0 1 2-2.5Z" />
            <path d="M14 4v5h4M9 13h6M9 16.5h6" />
          </svg>
          Evaluations <span className="nav-count">{pad2(draftCount)}</span>
        </a>
        <a
          className={route === 'how-it-works' ? 'nav-link active' : 'nav-link'}
          href={routeHref('how-it-works')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 8h.01M11 12h1v4h1" />
          </svg>
          How it works
        </a>
      </nav>

      <div className="sidebar-bottom">
        <button
          className="network-card wallet-card"
          type="button"
          onClick={onOpenWallet}
          aria-label="Wallet"
        >
          <span className="network-icon">
            <i className={walletDotClass(wallet)} />
          </span>
          <div>
            <strong>{walletTitle(wallet)}</strong>
            <small>{walletSubtitle(wallet)}</small>
          </div>
          <span className="network-chevron" aria-hidden="true">
            ⌄
          </span>
        </button>
        <a
          className="sidebar-docs"
          href="https://docs.genlayer.com/developers/intelligent-contracts/introduction"
          target="_blank"
          rel="noreferrer"
        >
          <span className="docs-icon" aria-hidden="true">
            ?
          </span>{' '}
          GenLayer docs <span className="external-mark" aria-hidden="true">↗</span>
        </a>
        <div className="profile-row">
          <span className="avatar">SP</span>
          <div>
            <strong>SpecProof</strong>
            <small>Studionet workspace</small>
          </div>
          <span className="profile-more" aria-hidden="true">
            ···
          </span>
        </div>
      </div>
    </aside>
  );
}
