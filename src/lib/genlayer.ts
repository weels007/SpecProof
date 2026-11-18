import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import contractSource from '../../contracts/spec_proof.py?raw';
import { getInjectedProvider } from './wallet';
import type { WalletProvider } from './wallet';

export type ChainAddress = `0x${string}`;

export type ChainSpec = {
  creator: string;
  criteria: string[];
  criteria_text: string;
  evaluated: boolean;
  site_url: string;
};

export type ChainCheck = {
  id: string;
  passed: boolean;
};

export type ChainResult = {
  all_passed: boolean;
  checks: ChainCheck[];
};

export type ChainCase = {
  spec: ChainSpec;
  result: ChainResult | null;
};

export const EXPLORER = 'https://explorer-studio.genlayer.com';

export function explorerAddress(address: string): string {
  return `${EXPLORER}/address/${address}`;
}

export function explorerTx(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

const STUDIO_CHAIN_ID = `0x${studionet.id.toString(16)}`;

/** Reads need no wallet, so one client is enough for the whole session. */
const readClient = createClient({ chain: studionet });

function toAddress(value: string): ChainAddress {
  return value as ChainAddress;
}

/** BigInt and SDK wrapper types are not safe to render; flatten them once. */
function plain(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
  }
  if (Array.isArray(value)) return value.map(plain);
  if (value instanceof Map) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of value.entries()) out[String(key)] = plain(item);
    return out;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[key] = plain(item);
    return out;
  }
  return value;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function readCase(address: string): Promise<ChainCase> {
  const rawSpec = await readClient.readContract({
    address: toAddress(address),
    functionName: 'get_spec',
    args: [],
  });
  const spec = JSON.parse(String(rawSpec)) as ChainSpec;

  const rawResult = await readClient.readContract({
    address: toAddress(address),
    functionName: 'get_result',
    args: [],
  });
  const parsed = plain(JSON.parse(String(rawResult))) as Partial<ChainResult>;
  const result =
    Array.isArray(parsed.checks) && typeof parsed.all_passed === 'boolean'
      ? (parsed as ChainResult)
      : null;

  return { spec, result };
}

/**
 * Put the wallet on Studio ourselves.
 *
 * `client.connect()` is MetaMask-only: it probes `wallet_getSnaps` and asks to
 * install the GenLayer Snap, which Rabby and other EIP-1193 wallets reject.
 * Switching the chain is enough for every injected wallet.
 */
async function ensureStudionetChain(provider: WalletProvider): Promise<void> {
  const current = String(await provider.request({ method: 'eth_chainId' })).toLowerCase();
  if (current === STUDIO_CHAIN_ID) return;

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIO_CHAIN_ID }],
    });
  } catch (error) {
    if (Number((error as { code?: number }).code) !== 4902) throw error;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: STUDIO_CHAIN_ID,
          chainName: studionet.name,
          rpcUrls: studionet.rpcUrls.default.http,
          nativeCurrency: studionet.nativeCurrency,
          blockExplorerUrls: studionet.blockExplorers
            ? [studionet.blockExplorers.default.url]
            : [],
        },
      ],
    });
  }

  const after = String(await provider.request({ method: 'eth_chainId' })).toLowerCase();
  if (after !== STUDIO_CHAIN_ID) {
    throw new Error(`Switch your wallet to ${studionet.name} (${studionet.id}) before writing.`);
  }
}

function walletClient(address: string, provider: WalletProvider) {
  return createClient({
    chain: studionet,
    account: toAddress(address),
    provider: provider as never,
  });
}

type FeeOption = {
  distribution: unknown;
  messageAllocations?: unknown;
  feeValue: unknown;
};

/** Studio is gasless; estimation is best-effort and never blocks the write. */
async function estimateFees(client: unknown, payload: Record<string, unknown>): Promise<FeeOption | null> {
  const estimator = (client as {
    estimateTransactionFeesForWrite?: (args: Record<string, unknown>) => Promise<FeeOption>;
  }).estimateTransactionFeesForWrite;

  if (typeof estimator !== 'function') return null;
  try {
    return await estimator(payload);
  } catch {
    return null;
  }
}

function statusName(receipt: { statusName?: unknown; status?: unknown }): string {
  return String(receipt?.statusName ?? receipt?.status ?? '').toUpperCase();
}

/** A write only counts if consensus accepted it and execution succeeded. */
export function succeeded(receipt: unknown): boolean {
  const record = receipt as {
    statusName?: unknown;
    status?: unknown;
    txExecutionResultName?: unknown;
    txExecutionResult?: unknown;
    consensus_data?: { leader_receipt?: Array<{ execution_result?: unknown; result?: unknown }> };
  };

  const status = statusName(record);
  if (status && status !== 'ACCEPTED' && status !== 'FINALIZED') return false;

  const execution = String(record?.txExecutionResultName ?? '');
  if (execution) return execution === 'FINISHED_WITH_RETURN';

  const leader = record?.consensus_data?.leader_receipt?.[0];
  const leaderResult = String(leader?.execution_result ?? leader?.result ?? '').toUpperCase();
  if (leaderResult) return leaderResult === 'SUCCESS' || leaderResult === 'FINISHED_WITH_RETURN';

  if (typeof record?.txExecutionResult === 'number') return record.txExecutionResult === 1;
  return true;
}

function receiptError(receipt: unknown): string {
  const record = receipt as {
    statusName?: unknown;
    status?: unknown;
    consensus_data?: {
      error?: unknown;
      leader_receipt?: Array<{ error?: unknown }>;
    };
    error?: unknown;
  };

  const status = statusName(record);
  if (status === 'UNDETERMINED') {
    return 'Validators did not reach consensus, so nothing was written. You can retry.';
  }

  const leader = record?.consensus_data?.leader_receipt?.[0];
  const raw = String(leader?.error ?? record?.consensus_data?.error ?? record?.error ?? '').trim();
  if (raw) return raw.length > 240 ? `${raw.slice(0, 237)}…` : raw;

  return 'The contract rejected the transaction.';
}

export type DeployResult = {
  address: ChainAddress;
  txHash: string;
};

export async function deployCase(
  walletAddress: string,
  siteUrl: string,
  criteria: string[],
): Promise<DeployResult> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error('No browser wallet is available. Connect one first.');
  }

  await ensureStudionetChain(provider);
  const client = walletClient(walletAddress, provider);

  const payload: Record<string, unknown> = {
    code: contractSource,
    args: [siteUrl, criteria.join('\n')],
  };
  const fees = await estimateFees(client, payload);
  if (fees) payload.fees = fees;

  const hash = (await client.deployContract(payload as never)) as unknown as string;
  const receipt = await withTimeout(
    client.waitForTransactionReceipt({ hash: hash as never }) as unknown as Promise<unknown>,
    360_000,
    'The deployment took too long. Check the transaction in the explorer before retrying.',
  );

  if (!succeeded(receipt)) {
    throw new Error(receiptError(receipt));
  }

  const decoded = receipt as { txDataDecoded?: { contractAddress?: string } };
  const address = decoded?.txDataDecoded?.contractAddress;
  if (!address) {
    throw new Error('The deployment was accepted but no contract address came back.');
  }

  return { address: toAddress(address), txHash: hash };
}

export type EvaluateResult = {
  txHash: string;
};

export async function evaluateCase(
  walletAddress: string,
  contractAddress: string,
): Promise<EvaluateResult> {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error('No browser wallet is available. Connect one first.');
  }

  await ensureStudionetChain(provider);
  const client = walletClient(walletAddress, provider);

  const payload: Record<string, unknown> = {
    address: toAddress(contractAddress),
    functionName: 'evaluate',
    args: [],
    value: 0n,
  };
  const fees = await estimateFees(client, payload);
  if (fees) payload.fees = fees;

  const hash = (await client.writeContract(payload as never)) as string;
  const receipt = await withTimeout(
    client.waitForTransactionReceipt({ hash: hash as never }) as unknown as Promise<unknown>,
    600_000,
    'Consensus took too long. Check the transaction in the explorer before retrying.',
  );

  if (!succeeded(receipt)) {
    throw new Error(receiptError(receipt));
  }

  return { txHash: hash };
}

const FRIENDLY: Array<[RegExp, string]> = [
  [/user rejected|4001|denied/i, 'Transaction rejected in the wallet.'],
  [/no wallet|wallet is available|no browser wallet/i, 'No wallet found. Open this page in a browser with MetaMask.'],
  [/insufficient funds|insufficient balance/i, 'Insufficient balance for network fees.'],
  [/wallet_getSnaps|doesn't has corresponding handler/i, 'This wallet does not support the request. Switch to Studionet manually and retry.'],
  [/wrong network|chain mismatch|switch your wallet/i, 'The wallet is on the wrong network. Switch to Studionet and try again.'],
  [/timed out|timeout|took too long/i, 'The transaction took too long. Check its hash in the explorer before retrying.'],
  [/failed to fetch|fetch failed|network error/i, 'Cannot reach Studionet. Check your connection and try again.'],
  [/undetermined/i, 'Validators did not reach consensus, so nothing was written. You can retry.'],
  [/already recorded|already been recorded/i, 'This case is already evaluated; a result can only be written once.'],
  [/only the case creator/i, 'Only the wallet that deployed this case can evaluate it.'],
  [/must point at a public host|credentials|cannot contain spaces/i, 'That website URL cannot be checked. Use a public HTTP or HTTPS address.'],
];

export function friendlyError(input: unknown): string {
  const raw = input instanceof Error ? input.message : String(input ?? '');
  const text = raw.trim() || 'Something went wrong.';
  for (const [pattern, message] of FRIENDLY) {
    if (pattern.test(text)) return message;
  }
  return text.length > 220 ? `${text.slice(0, 217)}…` : text;
}

export function chainErrorMessage(error: unknown): string {
  return friendlyError(error);
}
