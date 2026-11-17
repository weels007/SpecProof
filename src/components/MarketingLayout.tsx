import type { ReactNode } from 'react';
import type { WalletState } from '../hooks/useWallet';
import type { RouteName } from '../lib/router';
import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

type MarketingLayoutProps = {
  route: RouteName;
  wallet: WalletState;
  onOpenWallet: () => void;
  children: ReactNode;
};

export function MarketingLayout({ route, wallet, onOpenWallet, children }: MarketingLayoutProps) {
  return (
    <div className="site">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById('main');
          main?.focus();
          main?.scrollIntoView({ block: 'start' });
        }}
      >
        Skip to content
      </a>
      <SiteHeader route={route} wallet={wallet} onOpenWallet={onOpenWallet} />
      <main className="site-main" id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
