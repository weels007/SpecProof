export type NavKey = 'overview' | 'evaluations';

type SidebarProps = {
  activeNav: NavKey;
  draftCount: number;
  onNavigate: (nav: NavKey) => void;
};

export function Sidebar({ activeNav, draftCount, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <a
        className="brand"
        href="#overview"
        aria-label="SpecProof home"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('overview');
        }}
      >
        <span className="brand-mark" aria-hidden="true">
          <span />
        </span>
        <span className="brand-name">
          spec<span>proof</span>
        </span>
      </a>

      <div className="workspace-label">WORKSPACE</div>
      <nav className="primary-nav">
        <a
          className={activeNav === 'overview' ? 'nav-link active' : 'nav-link'}
          href="#overview"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('overview');
          }}
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
          className={activeNav === 'evaluations' ? 'nav-link active' : 'nav-link'}
          href="#evaluations"
          onClick={(event) => {
            event.preventDefault();
            onNavigate('evaluations');
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3.75h7l4.25 4.5v12H7a2 2 0 0 1-2-2v-12a2.5 2.5 0 0 1 2-2.5Z" />
            <path d="M14 4v5h4M9 13h6M9 16.5h6" />
          </svg>
          Evaluations <span className="nav-count">{draftCount}</span>
        </a>
      </nav>

      <div className="sidebar-bottom">
        <div className="network-card">
          <span className="network-icon">
            <span className="pulse-dot" />
          </span>
          <div>
            <strong>Bradbury testnet</strong>
            <small>Wallet not connected</small>
          </div>
          <span className="network-chevron" aria-hidden="true">
            ⌄
          </span>
        </div>
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
            <small>Prototype workspace</small>
          </div>
          <span className="profile-more" aria-hidden="true">
            ···
          </span>
        </div>
      </div>
    </aside>
  );
}
