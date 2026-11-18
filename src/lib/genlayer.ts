import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { ExecutionResult, TransactionStatus } from 'genlayer-js/types';
import contractSource from '../../contracts/spec_proof.py?raw';
import { getInjectedProvider } from './wallet';

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

/** Reads need no wallet, so one client is enough for the whole session. */
const readClient = createClient({ chain: studionet });

function toAddress(value: string): ChainAddress {
  return value as ChainAddress;
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
  const parsed = JSON.parse(String(rawResult)) as Partial<ChainResult>;
  const result =
    Array.isArray(parsed.checks) && typeof parsed.all_passed === 'boolean'
      ? (parsed as ChainResult)
      : null;

  return { spec, result };
}

/** A write client signs through the injected wallet, never a private key. */
function walletClient(address: string) {
  const provider = getInjectedProvider();
  if (!provider) {
    throw new Error('No browser wallet is available. Connect one first.');
  }

  return createClient({
    chain: studionet,
    account: toAddress(address),
    // The SDK expects viem's EthereumProvider; the injected object matches it.
    provider: provider as never,
  });
}

function receiptProblem(receipt: {
  statusName?: string;
  txExecutionResultName?: string;
}): string {
  const status = receipt.statusName ?? 'unknown status';
  const execution = receipt.txExecutionResultName ?? 'unknown execution result';
  if (execution === ExecutionResult.NOT_VOTED) {
    return `The transaction was accepted but has not been executed yet (${status}). Check the explorer in a moment.`;
  }
  if (execution === ExecutionResult.FINISHED_WITH_ERROR) {
    return `The contract rejected the transaction (${status} / ${execution}).`;
  }
  return `The transaction did not succeed (${status} / ${execution}).`;
}

export async function deployCase(
  walletAddress: string,
  siteUrl: string,
  criteria: string[],
): Promise<ChainAddress> {
  const client = walletClient(walletAddress);
  await client.connect('studionet');

  const hash = (await client.deployContract({
    code: contractSource,
    args: [siteUrl, criteria.join('\n')],
  })) as unknown as ChainAddress & { length: 66 };

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 3000,
    retries: 120,
  });

  const decoded = receipt.txDataDecoded as unknown as
    | { contractAddress?: string }
    | undefined;
  const address = decoded?.contractAddress;
  if (!address) {
    throw new Error(
      'The deployment was accepted but no contract address came back. Open the Studionet explorer and try again.',
    );
  }

  return toAddress(address);
}

export async function evaluateCase(
  walletAddress: string,
  contractAddress: string,
): Promise<void> {
  const client = walletClient(walletAddress);
  await client.connect('studionet');

  const hash = await client.writeContract({
    address: toAddress(contractAddress),
    functionName: 'evaluate',
    args: [],
    value: 0n,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 3000,
    retries: 240,
  });

  if (receipt.txExecutionResultName !== ExecutionResult.FINISHED_WITH_RETURN) {
    throw new Error(receiptProblem(receipt));
  }
}

export function chainErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'The Studionet request failed. Check the wallet and try again.';
}
