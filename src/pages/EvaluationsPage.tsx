import { useMemo, useState } from 'react';
import { CaseTable } from '../components/CaseTable';
import { pad2, shortAddress } from '../lib/format';
import { REGISTRY_ADDRESS, explorerAddress } from '../lib/genlayer';
import type { EvaluationCase } from '../types';

type EvaluationsPageProps = {
  cases: EvaluationCase[];
  /** `case_count` on the registry, so the header knows when the list is truncated. */
  total: number;
  walletAddress: string | null;
  loading: boolean;
  error: string | null;
  onOpenCase: (id: string) => void;
  onNewCase: () => void;
  onRefresh: () => void;
  onOpenWallet: () => void;
};

type Tab = 'all' | 'mine' | 'pending';

const EMPTY: Record<Tab, { title: string; body: string }> = {
  all: {
    title: 'No cases yet.',
    body: 'Open a case and it will be recorded in the registry for everyone to read.',
  },
  mine: {
    title: 'No cases from this wallet yet.',
    body: 'Create one and it will appear here. Only the wallet that opened a case can evaluate it.',
  },
  pending: {
    title: 'Nothing waiting for an evaluation.',
    body: 'Every case in the list already has a recorded result.',
  },
};

export function EvaluationsPage({
  cases,
  total,
  walletAddress,
  loading,
  error,
  onOpenCase,
  onNewCase,
  onRefresh,
  onOpenWallet,
}: EvaluationsPageProps) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  const effectiveTotal = total > 0 ? total : cases.length;
  const truncated = total > cases.length;
  const connected = Boolean(walletAddress);

  const mine = useMemo(() => {
    if (!walletAddress) return [];
    const me = walletAddress.toLowerCase();
    return cases.filter((item) => item.creator?.toLowerCase() === me);
  }, [cases, walletAddress]);

  const pending = useMemo(
    () => cases.filter((item) => item.status === 'onchain' && !item.evaluated),
    [cases],
  );

  const tabCases = tab === 'mine' ? mine : tab === 'pending' ? pending : cases;
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? tabCases.filter((item) =>
        [item.title, item.url, item.creator ?? '', ...item.criteria].some((value) =>
          value.toLowerCase().includes(needle),
        ),
      )
    : tabCases;

  const needsWallet = tab === 'mine' && !connected;

  const isAre = (count: number) => (count === 1 ? 'is' : 'are');
  const caseWord = cases.length === 1 ? 'case' : 'cases';
  const shownNote = truncated ? ` Showing the newest ${cases.length} of ${total}.` : '';

  let summary: string;
  if (tab === 'mine') {
    summary = connected
      ? `${mine.length} of ${cases.length} ${caseWord} ${
          mine.length === 1 ? 'was' : 'were'
        } opened by ${shortAddress(walletAddress ?? '')}.`
      : 'Connect a wallet to see the cases it opened.';
  } else if (tab === 'pending') {
    summary = `${pending.length} of ${cases.length} ${caseWord} ${isAre(
      pending.length,
    )} waiting for an evaluation; only the wallet that opened a case can evaluate it.${shownNote}`;
  } else {
    summary = truncated
      ? `Showing the newest ${cases.length} of ${total} cases in the registry.`
      : `${cases.length} ${caseWord} in the registry.`;
  }

  return (
    <>
      <header className="eval-head">
        <div>
          <div className="section-kicker">EVALUATIONS</div>
          <h1>Every case, one registry.</h1>
          <p>
            Cases are read from the SpecProof contract on Studionet. Your wallet marks the cases you
            opened; sample rows are labelled as examples so a demo never looks like a live check.
          </p>
        </div>
        <div className="heading-actions">
          <button className="button button-quiet" type="button" disabled={loading} onClick={onRefresh}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="button button-primary button-lg" type="button" onClick={onNewCase}>
            New evaluation <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>

      <div className="eval-toolbar">
        <div className="list-tabs eval-tabs">
          <button
            className={tab === 'all' ? 'list-tab active' : 'list-tab'}
            type="button"
            aria-pressed={tab === 'all'}
            onClick={() => setTab('all')}
          >
            All cases <span>{pad2(effectiveTotal)}</span>
          </button>
          <button
            className={tab === 'mine' ? 'list-tab active' : 'list-tab'}
            type="button"
            aria-pressed={tab === 'mine'}
            onClick={() => setTab('mine')}
          >
            My cases <span>{pad2(connected ? mine.length : 0)}</span>
          </button>
          <button
            className={tab === 'pending' ? 'list-tab active' : 'list-tab'}
            type="button"
            aria-pressed={tab === 'pending'}
            onClick={() => setTab('pending')}
          >
            Pending <span>{pad2(pending.length)}</span>
          </button>
        </div>
        <div className="eval-search">
          <label className="visually-hidden" htmlFor="case-search">
            Search cases
          </label>
          <input
            className="text-input"
            id="case-search"
            type="search"
            placeholder="Search name, website, creator, or criterion"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {error ? (
        <p className="wallet-alert wallet-alert--error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="detail-note">{summary}</p>

      {needsWallet ? (
        <section className="case-list-card" aria-label="My cases">
          <div className="empty-state">
            <strong>Connect a wallet to see your cases.</strong>
            <p>
              A case belongs to the wallet that opened it: the registry stores that address with the
              case, and only that wallet can evaluate it.
            </p>
            <button className="button button-secondary" type="button" onClick={onOpenWallet}>
              Connect wallet
            </button>
          </div>
        </section>
      ) : (
        <CaseTable
          cases={visible}
          onOpenCase={onOpenCase}
          onNewCase={onNewCase}
          emptyTitle={needle ? 'No cases match that search.' : EMPTY[tab].title}
          emptyBody={
            needle ? 'Try a different word, or clear the search to see every case.' : EMPTY[tab].body
          }
        />
      )}

      <p className="eval-footnote">
        Cases come from the SpecProof registry on Studionet
        {REGISTRY_ADDRESS ? (
          <>
            {' '}
            (
            <a href={explorerAddress(REGISTRY_ADDRESS)} target="_blank" rel="noreferrer">
              {shortAddress(REGISTRY_ADDRESS)} ↗
            </a>
            )
          </>
        ) : null}
        . Sample records are illustrative and are never fetched from a website.
      </p>
    </>
  );
}
