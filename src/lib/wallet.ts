export type WalletStatus = 'disconnected' | 'connecting' | 'connected';

export type WalletProvider = {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (payload: unknown) => void) => void;
  removeListener?: (event: string, listener: (payload: unknown) => void) => void;
};

type ProviderHost = {
  ethereum?: WalletProvider & { providers?: WalletProvider[] };
};

/** Returns the injected wallet provider, preferring MetaMask when several are installed. */
export function getInjectedProvider(): WalletProvider | null {
  const host = window as unknown as ProviderHost;
  const injected = host.ethereum;
  if (!injected || typeof injected.request !== 'function') return null;

  const providers = injected.providers;
  if (Array.isArray(providers) && providers.length > 0) {
    const usable = providers.filter((provider) => typeof provider.request === 'function');
    if (usable.length === 0) return null;
    return usable.find((provider) => provider.isMetaMask) ?? usable[0];
  }

  return injected;
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum',
  10: 'Optimism',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
  11155111: 'Sepolia',
};

export function chainLabel(chainId: string | null): string {
  if (!chainId) return 'Bradbury testnet';
  const parsed = Number.parseInt(chainId, 16);
  return CHAIN_NAMES[parsed] ?? `Chain ${parsed}`;
}

type WalletLike = {
  status: WalletStatus;
  address: string | null;
  isDemo: boolean;
};

export function walletButtonLabel(wallet: WalletLike): string {
  if (wallet.status === 'connecting') return 'Connecting…';
  if (wallet.isDemo) return 'Demo session';
  if (wallet.status === 'connected' && wallet.address) return shortenAddress(wallet.address);
  return 'Connect wallet';
}

export function walletTitle(wallet: WalletLike & { chainId: string | null }): string {
  if (wallet.status === 'connecting') return 'Connecting…';
  if (wallet.isDemo) return 'Demo session';
  if (wallet.status === 'connected' && wallet.address) return shortenAddress(wallet.address);
  return 'Connect a wallet';
}

export function walletSubtitle(wallet: WalletLike & { chainId: string | null }): string {
  if (wallet.status === 'connecting') return 'Confirm in your wallet';
  if (wallet.isDemo) return 'No wallet, no transactions';
  if (wallet.status === 'connected') return chainLabel(wallet.chainId);
  return 'Bradbury testnet';
}

/** Maps EIP-1193 errors onto messages a person can act on. */
export function describeWalletError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: number }).code;
    if (code === 4001) {
      return 'You rejected the request in your wallet. Nothing was connected.';
    }
    if (code === -32002) {
      return 'Your wallet already has a pending request. Open the wallet app, finish that request, then try again here.';
    }
    if (code === -32603) {
      return 'The wallet reported an internal error. Close it and try again.';
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return 'The wallet request failed. Try again.';
}
