import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { getInjectedProvider } from './wallet';
import type { WalletProvider } from './wallet';

export type ChainAddress = `0x${string}`;

/**
 * The SpecProof registry.
 *
 * It is deployed once on Studionet and every case is a record inside it, so the
 * app talks to a single fixed address instead of deploying a contract per case.
 * `gltest tests/integration --network studionet` prints the address it deploys.
 */
export const REGISTRY_ADDRESS = '' as ChainAddress;

export type ChainSpec = {
  id: string;
  creator: string;
  title: string;
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

export type ChainCaseSummary = {
  id: string;
  creator: string;
  title: string;
  site_url: string;
  evaluated: boolean;
  criteria_count: number;
  passed_count: number;
};

export const EXPLORER = 'https://explorer-studio.genlayer.com';

export function explorerAddress(address: string): string {
  return `${EXPLORER}/address/${address}`;
}

export function explorerTx(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function registryConfigured(): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(REGISTRY_ADDRESS);
}

const NOT_CONFIGURED =
  'The SpecProof registry address is not set in this build. Deploy the registry and set REGISTRY_ADDRESS in src/lib/genlayer.ts.';

const STUDIO_CHAIN_ID = `0x${studionet.id.toString(16)}`;

/** Reads need no wallet, so one client is enough for the whole session. */
const readClient = createClient({ chain: studionet });

function requireRegistry(): void {
  if (!registryConfigured()) throw new Error(NOT_CONFIGURED);
}

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

function isSummary(value: unknown): value is ChainCaseSummary {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<ChainCaseSummary>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.creator === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.site_url === 'string' &&
    typeof candidate.evaluated === 'boolean' &&
    typeof candidate.criteria_count === 'number'
  );
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

export async function readCase(caseId: string): Promise<ChainCase> {
  requireRegistry();

  const rawSpec = await readClient.readContract({
    address: REGISTRY_ADDRESS,
    functionName: 'get_case',
    args: [caseId],
  });
  const spec = JSON.parse(String(rawSpec)) as ChainSpec;

  const rawResult = await readClient.readContract({
    address: REGISTRY_ADDRESS,
    functionName: 'get_result',
    args: [caseId],
  });
  const parsed = plain(JSON.parse(String(rawResult))) as Partial<ChainResult>;
  const result =
    Array.isArray(parsed.checks) && typeof parsed.all_passed === 'boolean'
      ? (parsed as ChainResult)
      : null;

  return { spec, result };
}

/** Newest first; the registry never returns more than 50 rows. */
export async function listCases(): Promise<ChainCaseSummary[]> {
  requireRegistry();

  const raw = await readClient.readContract({
    address: REGISTRY_ADDRESS,
    functionName: 'list_cases',
    args: [],
  });
  const parsed: unknown = JSON.parse(String(raw));
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(isSummary);
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

function getProvider(): WalletProvider {
  const provider = getInjectedProvider();
  if (!provider) throw new Error('No browser wallet is available. Connect one first.');
  return provider;
}

async function sendWrite(
  walletAddress: string,
  functionName: string,
  args: unknown[],
  timeoutMessage: string,
): Promise<string> {
  requireRegistry();

  const provider = getProvider();
  await ensureStudionetChain(provider);
  const client = walletClient(walletAddress, provider);

  const payload: Record<string, unknown> = {
    address: REGISTRY_ADDRESS,
    functionName,
    args,
    value: 0n,
  };
  const fees = await estimateFees(client, payload);
  if (fees) payload.fees = fees;

  const hash = (await client.writeContract(payload as never)) as string;
  const receipt = await withTimeout(
    client.waitForTransactionReceipt({ hash: hash as never }) as unknown as Promise<unknown>,
    360_000,
    timeoutMessage,
  );
  if (!succeeded(receipt)) {
    throw new Error(receiptError(receipt));
  }

  return hash;
}

export type CreateResult = {
  /** The new registry case id, when the app could find it in the refreshed list. */
  caseId: string | null;
  txHash: string;
};

async function findCreatedCase(walletAddress: string, siteUrl: string): Promise<string | null> {
  try {
    const cases = await listCases();
    const mine = cases.find(
      (item) =>
        item.creator.toLowerCase() === walletAddress.toLowerCase() && item.site_url === siteUrl,
    );
    return mine?.id ?? null;
  } catch {
    return null;
  }
}

export async function createCase(
  walletAddress: string,
  title: string,
  siteUrl: string,
  criteria: string[],
): Promise<CreateResult> {
  const txHash = await sendWrite(
    walletAddress,
    'create_case',
    [title, siteUrl, criteria.join('\n')],
    'The case took too long to open. Check the transaction in the explorer before retrying.',
  );

  return { caseId: await findCreatedCase(walletAddress, siteUrl), txHash };
}

export type EvaluateResult = {
  txHash: string;
};

export async function evaluateCase(
  walletAddress: string,
  caseId: string,
): Promise<EvaluateResult> {
  const txHash = await sendWrite(
    walletAddress,
    'evaluate',
    [caseId],
    'Consensus took too long. Check the transaction in the explorer before retrying.',
  );

  return { txHash };
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
  [/only the case creator/i, 'Only the wallet that opened this case can evaluate it.'],
  [/unknown case/i, 'That case id is not in the registry. Refresh the list and try again.'],
  [/registry address is not set/i, NOT_CONFIGURED],
  [/must point at a public host|credentials|cannot contain spaces/i, 'That website URL cannot be checked. Use a public HTTP or HTTPS address.'],
  [/case name/i, 'Give the case a short name (80 characters at most).'],
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
