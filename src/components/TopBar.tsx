type TopBarProps = {
  onWallet: () => void;
};

export function TopBar({ onWallet }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <span className="breadcrumb-slash">/</span>
        <strong>Overview</strong>
      </div>
      <div className="topbar-actions">
        <span className="demo-badge">
          <span /> Local demo
        </span>
        <button className="button button-wallet" type="button" onClick={onWallet}>
          Connect wallet <span aria-hidden="true">↗</span>
        </button>
      </div>
    </header>
  );
}
