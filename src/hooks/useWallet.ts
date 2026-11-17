import { useCallback, useEffect, useRef, useState } from 'react';
import { describeWalletError, getInjectedProvider } from '../lib/wallet';
import type { WalletStatus } from '../lib/wallet';

export type ConnectResult =
  | { status: 'connected' }
  | { status: 'no-provider' }
  | { status: 'busy' }
  | { status: 'error'; message: string };

/**
 * Wallet state for the whole app.
 *
 * Rules that keep the wallet from throwing popup after popup:
 * - the provider is only asked for accounts silently (`eth_accounts`) when the app loads;
 * - `eth_requestAccounts` runs once per click, guarded by a ref, and never on a timer;
 * - a pending request (error -32002) is reported instead of retried.
 */
export function useWallet() {
  const [status, setStatus] = useState<WalletStatus>('disconnected');
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [hasProvider, setHasProvider] = useState(() => getInjectedProvider() !== null);
  const busy = useRef(false);

  const applyAccounts = useCallback((accounts: unknown) => {
    if (Array.isArray(accounts) && typeof accounts[0] === 'string' && accounts[0]) {
      setAddress(accounts[0]);
      setStatus('connected');
      setIsDemo(false);
      setError(null);
    } else {
      setAddress(null);
      setStatus('disconnected');
    }
  }, []);

  const refreshProvider = useCallback(() => {
    const provider = getInjectedProvider();
    setHasProvider(provider !== null);
    return provider;
  }, []);

  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider) return;

    let cancelled = false;
    const readAccounts = (accounts: unknown) => {
      if (!cancelled) applyAccounts(accounts);
    };
    const readChain = (next: unknown) => {
      if (!cancelled && typeof next === 'string') setChainId(next);
    };

    // Silent restore: authorized accounts come back without a popup.
    provider.request({ method: 'eth_accounts' }).then(readAccounts).catch(() => undefined);
    provider.request({ method: 'eth_chainId' }).then(readChain).catch(() => undefined);

    provider.on?.('accountsChanged', readAccounts);
    provider.on?.('chainChanged', readChain);

    return () => {
      cancelled = true;
      provider.removeListener?.('accountsChanged', readAccounts);
      provider.removeListener?.('chainChanged', readChain);
    };
  }, [applyAccounts]);

  const connect = useCallback(async (): Promise<ConnectResult> => {
    if (busy.current) return { status: 'busy' };

    const provider = refreshProvider();
    if (!provider) {
      const message = 'No browser wallet is available in this browser.';
      setError(message);
      return { status: 'no-provider' };
    }

    busy.current = true;
    setStatus('connecting');
    setError(null);

    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      const account =
        Array.isArray(accounts) && typeof accounts[0] === 'string' ? accounts[0] : null;

      if (!account) {
        const message = 'The wallet returned no account, so nothing was connected.';
        setError(message);
        setStatus('disconnected');
        return { status: 'error', message };
      }

      setAddress(account);
      setIsDemo(false);
      setStatus('connected');
      provider
        .request({ method: 'eth_chainId' })
        .then((next) => setChainId(typeof next === 'string' ? next : null))
        .catch(() => undefined);
      return { status: 'connected' };
    } catch (cause) {
      const message = describeWalletError(cause);
      setError(message);
      setStatus('disconnected');
      return { status: 'error', message };
    } finally {
      busy.current = false;
    }
  }, [refreshProvider]);

  const connectDemo = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setIsDemo(true);
    setStatus('connected');
    setError(null);
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setIsDemo(false);
    setStatus('disconnected');
    setError(null);
  }, []);

  return {
    status,
    address,
    chainId,
    error,
    isDemo,
    hasProvider,
    connect,
    connectDemo,
    disconnect,
    refreshProvider,
  };
}

export type WalletState = ReturnType<typeof useWallet>;
