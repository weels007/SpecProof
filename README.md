# SpecProof

SpecProof is a prototype for checking whether a public website meets a short, agreed delivery
rubric. The judgment that matters belongs in a GenLayer Intelligent Contract: validators
independently inspect the same public page and compare the structured pass/fail decisions.

## Frontend

The frontend is a React 18 + TypeScript app built with Vite.

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build into dist/
```

Source layout:

- `src/App.tsx` — workspace state (drafts, tabs, dialogs, toast).
- `src/components/` — sidebar, hero, metrics, case table, side panels, dialogs, toast.
- `src/hooks/` — draft persistence and toast timers.
- `src/lib/` — sample data, `localStorage` storage, formatting helpers.
- `src/styles.css` — the design system and layout.

The dashboard is deliberately honest about its current scope:

- The two evaluation rows are illustrative sample data; they are not live website checks.
- Creating a case saves a draft in this browser's `localStorage` only.
- The prototype does not fetch submitted URLs, connect a wallet, call GenLayer RPC, or send a
  transaction.
- `contracts/spec_proof.py` is a contract draft, not a deployed or verified contract.

## Contract

`contracts/spec_proof.py` stores a public URL and a newline-separated rubric, renders the page
inside a non-deterministic block, asks for one boolean decision per criterion, and has validators
independently repeat the evaluation. Validators compare the stable decision fields rather than
free-form explanations. The stored result is deliberately small, and a case can only be
evaluated once so the recorded outcome stays a record.

Tooling (Python 3.12+):

```bash
pip install -r requirements.txt
genvm-lint check contracts/spec_proof.py
pytest tests/direct -v
```

`tests/direct` runs in-memory with mocked web and LLM responses, including validator agreement
and disagreement. `tests/integration` runs against a real network and is not part of CI:

```bash
gltest tests/integration -v --network studionet
```

## Continuous integration

`.github/workflows/ci.yml` runs three jobs on pushes, pull requests and manual dispatch:

- **Contract lint** — `genvm-lint check` for every contract in `contracts/`.
- **Contract direct-mode tests** — `pytest tests/direct -v`.
- **Frontend typecheck and build** — `npm run typecheck` and `npm run build`.

The workflow needs the repository to be on GitHub; it does not run until then.

Before deploying, test the contract against the current GenLayer runtime and refine its
rubric/input limits, page rendering behavior, error handling, and adversarial-page defenses. A
page can change between validator requests, HTML can be incomplete, and LLM decisions can
disagree; unresolved consensus should not be presented as a final result.

References:

- [Intelligent Contract introduction](https://docs.genlayer.com/developers/intelligent-contracts/introduction)
- [When to use GenLayer](https://docs.genlayer.com/developers/intelligent-contracts/when-to-use-genlayer)
- [Web access](https://docs.genlayer.com/developers/intelligent-contracts/features/web-access)
- [Calling LLMs](https://docs.genlayer.com/developers/intelligent-contracts/features/calling-llms)
- [Testing Intelligent Contracts](https://docs.genlayer.com/developers/intelligent-contracts/testing)
- [genvm-linter](https://docs.genlayer.com/api-references/genlayer-linter)
- [Equivalence Principle](https://docs.genlayer.com/equivalence-principle)
