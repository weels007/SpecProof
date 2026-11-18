import { useMemo, useState } from 'react';
import { CaseTable } from '../components/CaseTable';
import { pad2, shortAddress } from '../lib/format';
import { REGISTRY_ADDRESS, explorerAddress } from '../lib/genlayer';
import type { EvaluationCase } from '../types';

type EvaluationsPageProps = {
  cases: EvaluationCase[];
  /** `case_count` on the registry, so the header knows when the list is truncated. */
  total: number;
  loading: boolean;
  error: string | null;
  onOpenCase: (id: string) => void;
  onNewCase: () => void;
  onRefresh: () => void;
};

type Tab = 'all' | 'pending';

export function EvaluationsPage({
  cases,
  total,
  loading,
  error,
  onOpenCase,
  onNewCase,
  onRefresh,
}: EvaluationsPageProps) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  const effectiveTotal = total > 0 ? total : cases.length;

  const pending = useMemo(
    () => cases.filter((item) => item.status === 'onchain' && !item.evaluated),
    [cases],
  );
  const base = tab === 'pending' ? pending : cases;
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? base.filter((item) =>
        [item.title, item.url, ...item.criteria].some((value) =>
          value.toLowerCase().includes(needle),
        ),
      )
    : base;

  return (
    <>
      <header className="eval-head">
        <div>
          <div className="section-kicker">EVALUATIONS</div>
          <h1>Every case, one registry.</h1>
          <p>
            Cases are read from the SpecProof contract on Studionet. Sample rows are labelled as
            examples so a demo never looks like a live check.
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
            onClick={() => setTab('all')}
          >
            All cases <span>{pad2(effectiveTotal)}</span>
          </button>
          <button
            className={tab === 'pending' ? 'list-tab active' : 'list-tab'}
            type="button"
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
            placeholder="Search name, website, or criterion"
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

      {total > cases.length ? (
        <p className="detail-note">
          Showing the newest {cases.length} of {total} cases recorded in the registry.
        </p>
      ) : null}

      <CaseTable
        cases={visible}
        onOpenCase={onOpenCase}
        onNewCase={onNewCase}
        emptyTitle={needle ? 'No cases match that search.' : undefined}
        emptyBody={
          needle
            ? 'Try a different word, or clear the search to see every case.'
            : tab === 'pending'
              ? 'Every open case already has a recorded result.'
              : 'Open a case and it will be recorded in the registry for everyone to read.'
        }
      />

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
