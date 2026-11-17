import { useEffect, useRef } from 'react';
import type { WalletState } from '../hooks/useWallet';
import { chainLabel, shortenAddress } from '../lib/wallet';

type WalletDialogProps = {
  open: boolean;
  onClose: () => void;
  wallet: WalletState;
  onConnected: () => void;
};

export function WalletDialog({ open, onClose, wallet, onConnected }: WalletDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  useEffect(() => {
    if (open) wallet.refreshProvider();
  }, [open, wallet.refreshProvider]);

  const connected = wallet.status === 'connected';
  const connecting = wallet.status === 'connecting';

  async function handleConnect() {
    if (connecting) return;
    const result = await wallet.connect();
    if (result.status === 'connected') onConnected();
  }

  return (
    <dialog
      className="modal wallet-modal"
      id="wallet-dialog"
      ref={dialogRef}
      aria-labelledby="wallet-title"
      aria-busy={connecting}
      onPointerDown={(event) => {
        pressedOnBackdrop.current = event.target === dialogRef.current;
      }}
      onClick={(event) => {
        if (pressedOnBackdrop.current && event.target === dialogRef.current) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div className="modal-card">
        <div className="modal-topline">
          <span className="modal-eyebrow">WALLET</span>
          <button className="icon-button" type="button" aria-label="Close wallet" onClick={onClose}>
            ×
          </button>
        </div>

        <h2 id="wallet-title">{connected ? 'Wallet connected.' : 'Connect a wallet.'}</h2>

        {connected ? (
          <>
            <div className="wallet-account">
              <span className="wallet-avatar" aria-hidden="true">
                {wallet.isDemo ? '◈' : '◎'}
              </span>
              <div>
                <strong>{wallet.isDemo ? 'Demo session' : shortenAddress(wallet.address ?? '')}</strong>
                <small>
                  {wallet.isDemo
                    ? 'No wallet, no transactions — sample data only'
                    : chainLabel(wallet.chainId)}
                </small>
              </div>
            </div>
            <div className="wallet-actions">
              <button className="button button-quiet" type="button" onClick={wallet.disconnect}>
                {wallet.isDemo ? 'End demo session' : 'Disconnect'}
              </button>
              <button className="button button-primary" type="button" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="wallet-intro">
              SpecProof asks your wallet for the account address only. It never requests a seed
              phrase or a private key, and this prototype sends no transaction.
            </p>

            {wallet.error ? (
              <p className="wallet-alert wallet-alert--error" role="alert">
                {wallet.error}
              </p>
            ) : null}

            {!wallet.hasProvider ? (
              <p className="wallet-alert wallet-alert--warn">
                No browser wallet found here. Open SpecProof in a wallet-enabled browser (MetaMask,
                Coinbase Wallet, Rabby) to connect, or use a demo session below.
              </p>
            ) : null}

            <div className="wallet-actions">
              <button
                className="button button-primary"
                type="button"
                disabled={connecting || !wallet.hasProvider}
                onClick={() => {
                  void handleConnect();
                }}
              >
                {connecting ? 'Waiting for your wallet…' : 'Connect wallet'}
              </button>
              <button className="button button-quiet" type="button" onClick={wallet.connectDemo}>
                Use a demo session
              </button>
            </div>

            <p className="wallet-hint">
              {connecting
                ? 'Finish the request in your wallet app. Nothing is retried automatically.'
                : 'Only one request is sent per click. If your wallet already has a pending request, finish that one first — repeated requests will not open more windows.'}
            </p>
          </>
        )}
      </div>
    </dialog>
  );
}
