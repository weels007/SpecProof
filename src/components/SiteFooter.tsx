import { routeHref } from '../lib/router';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span className="brand-name">
            spec<span>proof</span>
          </span>
          <p>Delivery checks that independent validators can agree on.</p>
        </div>
        <nav className="site-footer-links" aria-label="Footer">
          <a href={routeHref('how-it-works')}>How it works</a>
          <a href={routeHref('evaluations')}>Evaluations</a>
          <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">
            GenLayer docs ↗
          </a>
          <a
            href="https://docs.genlayer.com/developers/intelligent-contracts/features/web-access"
            target="_blank"
            rel="noreferrer"
          >
            Web access ↗
          </a>
        </nav>
      </div>
      <div className="site-footer-base">
        <span>SpecProof · concept prototype</span>
        <span>Judgment by consensus, not a single backend.</span>
      </div>
    </footer>
  );
}
