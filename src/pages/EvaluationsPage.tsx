import { useMemo, useState } from 'react';
import { CaseTable } from '../components/CaseTable';
import { pad2 } from '../lib/format';
import { SAMPLE_CASES } from '../lib/samples';
import type { EvaluationCase } from '../types';

type EvaluationsPageProps = {
  drafts: EvaluationCase[];
  onOpenCase: (id: string) => void;
  onNewCase: () => void;
};

type Tab = 'all' | 'drafts';

export function EvaluationsPage({ drafts, onOpenCase, onNewCase }: EvaluationsPageProps) {
  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');

  const allCases = useMemo(() => [...drafts, ...SAMPLE_CASES], [drafts]);
  const base = tab === 'drafts' ? drafts : allCases;
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
          <h1>Every case, one list.</h1>
          <p>
            Drafts live in this browser. Sample rows are labelled as examples so a demo never looks
            like a live check.
          </p>
        </div>
        <button className="button button-primary button-lg" type="button" onClick={onNewCase}>
          New evaluation <span aria-hidden="true">↗</span>
        </button>
      </header>

      <div className="eval-toolbar">
        <div className="list-tabs eval-tabs">
          <button
            className={tab === 'all' ? 'list-tab active' : 'list-tab'}
            type="button"
            onClick={() => setTab('all')}
          >
            All cases <span>{pad2(allCases.length)}</span>
          </button>
          <button
            className={tab === 'drafts' ? 'list-tab active' : 'list-tab'}
            type="button"
            onClick={() => setTab('drafts')}
          >
            My drafts <span>{pad2(drafts.length)}</span>
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

      <CaseTable
        cases={visible}
        onOpenCase={onOpenCase}
        onNewCase={onNewCase}
        emptyTitle={needle ? 'No cases match that search.' : undefined}
        emptyBody={
          needle
            ? 'Try a different word, or clear the search to see every case.'
            : tab === 'drafts'
              ? 'You have no local drafts yet. Create one and it will appear here.'
              : 'Create an evaluation to start a local case.'
        }
      />

      <p className="eval-footnote">
        Sample records are illustrative and are never fetched from a website. Drafts are saved in
        this browser only.
      </p>
    </>
  );
}
