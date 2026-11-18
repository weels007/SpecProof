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

Routes are hash based, so every page also survives a direct load on a static host:

- `#/` — landing page.
- `#/workspace` — workspace overview (recent cases, metrics, decision path).
- `#/evaluations` — every case, with tabs and search.
- `#/how-it-works` — the method, a rubric example, the stored result, and the limits.

Source layout:

- `src/pages/` — one component per route.
- `src/components/` — app shell, marketing shell, wallet dialog, case table, dialogs, toast.
- `src/hooks/` — drafts (`localStorage`), typed toasts, and the wallet state machine.
- `src/lib/` — hash router, wallet helpers, clipboard, sample data, storage, formatting.
- `src/styles.css` — the design system, landing page, and workspace layout.

Wallet handling keeps the wallet from popping up repeatedly: the app reads authorized accounts
silently on load, sends one `eth_requestAccounts` per click behind a guard, reports a pending
wallet request (`-32002`) instead of retrying it, and offers a clearly labelled demo session when
no injected wallet exists (as in a preview webview). Errors are shown inline in the dialog and
successes are confirmed with a toast.

The dashboard is deliberately honest about its current scope:

- The two evaluation rows are illustrative sample data; they are not live website checks.
- Creating a case saves a draft in this browser's `localStorage` only; drafts can be deleted.
- The prototype does not fetch submitted URLs, connect a wallet, call GenLayer RPC, or send a
  transaction.
- `contracts/spec_proof.py` is a contract draft, not a deployed or verified contract.

## Contract

`contracts/spec_proof.py` stores a public URL and a newline-separated rubric, renders the page
inside a non-deterministic block, asks for one boolean decision per criterion, and has validators
independently repeat the evaluation. Validators compare the stable decision fields rather than
free-form explanations.

Security properties worth knowing before any deployment:

- **Creator-only evaluation.** The deployer is stored as an `Address`; anyone else calling
  `evaluate` reverts, so a third party cannot burn a case's one recorded result.
- **One outcome, retry only on failure.** A successful evaluation sets `evaluated` and every later
  call reverts. A failed or inconclusive evaluation writes nothing, so the creator can retry.
- **No unverified free text in the result.** Only criterion ids and booleans are compared and
  stored; there is no leader-supplied reasoning, score or percentage that later logic relies on.
- **Bounded input.** The URL must be HTTP(S) on a public host (no credentials, localhost, private,
  link-local or shared ranges), and the rubric is capped at 6 criteria, 180 characters each and
  1200 in total, with duplicates rejected.
- **Normalized rubric.** Criteria are whitespace-collapsed and stored once, so the text the
  evaluator sees is exactly the text recorded in the contract.
- **Grounding and injection handling.** The prompt contains the captured page itself, wrapped in
  `<<<PAGE>>>` markers and explicitly treated as untrusted data; the output must match the expected
  ids, order and boolean types or the transaction reverts.

Tooling (Python 3.12+):

```bash
pip install -r requirements.txt
genvm-lint check contracts/spec_proof.py
pytest tests/direct -v
```

`tests/direct` runs in-memory with mocked web and LLM responses, including validator agreement
and disagreement. `tests/integration` runs against a real network and is not part of the push CI:

```bash
gltest tests/integration -v --network studionet
```

## Funded integration test (real wallet)

`tests/integration` deploys the contract with a real wallet and checks the creator-only guard
with a second wallet. Push CI stays fast; the **Integration (GenLayer)** workflow runs this on
demand from the Actions tab.

Repository secrets (Settings → Secrets and variables → Actions):

- `ACCOUNT_PRIVATE_KEY_1` — the case creator and deployer. Needs testnet GEN on Bradbury for the
  deploy and for the evaluation transaction.
- `ACCOUNT_PRIVATE_KEY_2` — a separate wallet used as the adversarial caller. It only needs enough
  GEN to send one reverting transaction. Without it, the outsider test is skipped.

Nothing else is required: the Bradbury RPC and chain id come from `gltest`, and the network's own
validators run the model, so no LLM or RPC keys are needed.

For a local funded run, fill `.env` (copied from `.env.example`) and swap in the testnet config:

```bash
cp gltest.testnet.yaml gltest.config.yaml
gltest tests/integration -v --network testnet_bradbury
git restore gltest.config.yaml
```

`gltest` reads `gltest.config.yaml` at startup, including during plain `pytest` runs, which is why
the committed default config contains no wallet references and the funded network lives in a
separate file.

Rules:

- Use a throwaway wallet funded only with testnet GEN, never a wallet with mainnet funds.
- Never commit the key, paste it into a chat, or put it in `.env.example`.
- `SPECPROOF_LIVE_EVALUATION=1` (a variable, not a secret) additionally runs a real web + LLM
  evaluation, which costs fees and depends on validator agreement.

SpecProof itself is not payable and holds no funds, so there is no escrow to drain or lock here —
the only cost of an adversarial run is gas.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `main`, pull requests and manual dispatch:

- **Contract lint** — `genvm-lint check` for every contract in `contracts/`.
- **Contract direct-mode tests** — `pytest tests/direct -v`.
- **Frontend typecheck and build** — `npm run typecheck` and `npm run build`.

The suite in `tests/direct` covers input validation, a fully passing and a partially failing
evaluation, unusable evaluator output, validator agreement and disagreement, and the
one-evaluation guard. GitHub Actions is the only place this repository runs those checks, so
`main` is kept green by the workflow rather than by a local run.

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
