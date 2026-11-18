# SpecProof

**Proof for work that ships.** Write down what “done” means, let independent GenLayer validators check the public evidence, and keep one result nobody can quietly rewrite.

SpecProof runs on **Studionet**: every case is deployed as its own Intelligent Contract from the app, the creator wallet records the evaluation, and the browser reads the spec and the result straight from the chain.

---

## Status

| Surface | What works today |
| --- | --- |
| Contract | Linted with `genvm-lint`; 17 direct-mode tests; 4 Studionet integration tests with real wallets |
| Frontend | React 18 + TypeScript + Vite; deploys, reads and evaluates against Studionet via `genlayer-js` |
| CI | Contract lint, direct tests, frontend typecheck/build, manual Studionet suite, Vercel preview |
| Hosting | Vercel-ready static build (`vercel.json`, `.nvmrc`, no environment variables) |

---

## Why GenLayer

“Does this page meet the agreement?” is not on-chain data. It needs a public page, a natural-language rubric, and a judgment that several independent parties can re-run and compare.

SpecProof uses GenLayer for exactly that:

- the contract renders the page itself with `gl.nondet.web.render`, no oracle in between;
- one LLM answers a strict rubric inside a non-deterministic block;
- validators independently repeat the read and must agree on **every boolean**;
- only deterministic code writes the result, once.

---

## How it works

1. **Agree on the rubric.** A public URL and up to six observable criteria. The contract normalizes and stores them at deploy time, so the text the evaluator sees is the text on record.
2. **Check public evidence.** The contract renders the page, wraps the capture in `<<<PAGE>>>` markers, treats it as untrusted data, and asks for one boolean per criterion.
3. **Record one decision.** Validators compare ids and booleans only. Agreement writes a small result and closes the case; disagreement writes nothing and the creator may retry.

### Contract API

| Method | Type | Behaviour |
| --- | --- | --- |
| `__init__(site_url, criteria_text)` | deploy | Stores the deployer, the URL and the normalized rubric |
| `evaluate()` | write | Creator-only, once-only: renders, judges, agrees, stores |
| `get_spec()` | view | `creator`, `criteria`, `criteria_text`, `evaluated`, `site_url` |
| `get_result()` | view | `{ all_passed, checks: [{ id, passed }] }` or `{}` before evaluation |

### Security properties

- **Creator-only evaluation** — the deployer is stored as an `Address`; everyone else reverts.
- **One outcome, retry only on failure** — a successful evaluation closes the case; a failed or
  inconclusive one writes nothing, so it can be retried.
- **No unverified free text** — only ids and booleans are compared and stored; no leader-supplied
  reasoning, score or percentage drives later behaviour.
- **Bounded input** — HTTP(S) on a public host only (no credentials, localhost, private, link-local
  or shared ranges); at most 6 criteria, 180 characters each, 1200 total, duplicates rejected.
- **Grounding and injection handling** — the prompt carries the captured page as data, and the
  output must match the expected ids, order and boolean types or the transaction reverts.

---

## Frontend

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production build into dist/
```

Routes are hash based, so deep links survive static hosting:

- `#/` — landing page.
- `#/workspace` — overview, metrics and recent cases.
- `#/evaluations` — all cases with tabs and search.
- `#/how-it-works` — the method, a rubric example, the stored result and the limits.

**On-chain flow**

- **Create** deploys one SpecProof contract with the creator wallet and stores its address in this
  browser. Local drafts still exist for exploring the UI without a wallet.
- **Evaluate** appears only for the creator wallet and only before a result exists. The dialog waits
  for the receipt, then re-reads `get_result`.
- **Reads** (`get_spec`, `get_result`) need no wallet and run from the browser.
- **Audit** — every case links to its contract, deployment transaction and evaluation transaction in
  the Studio explorer, with a refresh control.

**Wallet discipline**

- `eth_accounts` on load (no popup), one `eth_requestAccounts` per click behind a single-flight
  guard, and `-32002` reported instead of retried.
- Writes switch the wallet with `wallet_switchEthereumChain` (adding the chain on `4902`) rather than
  `client.connect()`, which is MetaMask/Snap-only and breaks in other injected wallets.
- Errors are translated into actionable text; consensus timeouts leave a clear message instead of
  hanging; a rejected or undetermined write never looks like a success.

---

## Testing

```bash
pip install -r requirements.txt
genvm-lint check contracts/spec_proof.py
pytest tests/direct -v                 # 17 tests, mocked web + LLM
```

`tests/integration` runs against Studionet with real wallets:

```bash
gltest tests/integration -v --network studionet
```

It covers fast deploys and reads, an outsider call that must fail, three invalid specs that must
revert on-chain, and — with `SPECPROOF_LIVE_EVALUATION=1` — the full E2E: outsider attempt rejected,
creator's real web + LLM evaluation recorded, both follow-up attempts rejected, stored result
unchanged.

Wallets come from repository secrets (Settings → Secrets and variables → Actions):

- `KEYSTORE_1` + `KEYSTORE_PASSWORD_1` — creator/deployer.
- `KEYSTORE_2` + `KEYSTORE_PASSWORD_2` — optional adversarial caller.
- Plaintext `ACCOUNT_PRIVATE_KEY_1` / `_2` still work, and are used when a keystore cannot be
  unlocked.

The keystore secret holds the JSON itself (a base64 copy is accepted), never a path or a quoted
string; the password stays in its own secret. Decryption happens in memory. Studionet is gasless, so
neither wallet needs a GEN balance.

The **Integration (GenLayer)** workflow runs the suite on demand, and a push that edits
`.github/integration-request` triggers it automatically.

---

## Continuous integration

`.github/workflows/ci.yml` runs on pushes, pull requests and manual dispatch:

- **Contract lint** — `genvm-lint check` for every contract in `contracts/`.
- **Contract direct-mode tests** — `pytest tests/direct -v`.
- **Frontend typecheck and build** — `npm run typecheck` and `npm run build`.

---

## Deploy on Vercel

1. **Add New → Project** in Vercel and import this repository.
2. Keep framework **Vite**, install `npm install`, build `npm run build`, output `dist` (pinned in
   `vercel.json`). Node 22 comes from `.nvmrc`.
3. **No environment variables are required.** The Studionet RPC is public and each case keeps its
   own contract address in the visitor's browser.

`contracts/spec_proof.py` is bundled at build time (`?raw`) for on-chain deployment, so
`.vercelignore` deliberately keeps `contracts/`. The on-chain flow needs HTTPS (Vercel) and a
browser with an injected wallet; without one the app still reads and keeps local drafts.

---

## Repository layout

```text
contracts/spec_proof.py     Intelligent Contract
tests/direct/               mocked web + LLM, fast
tests/integration/          Studionet, real wallets, E2E
src/pages/                  landing, workspace, evaluations, how it works
src/components/             shell, dialogs, wallet, case table, toast
src/hooks/                  drafts, toasts, wallet state machine
src/lib/genlayer.ts         Studionet reads, wallet writes, receipts
.github/workflows/          push CI, manual Studionet suite
SUBMISSION.md               form-ready submission text
```

---

## Limits

- Pages behind a login cannot be checked; a page that changes between validator reads can end
  undetermined (nothing is written).
- Only the first 12,000 characters of a capture reach the evaluator.
- No evidence hash is stored on-chain; validators re-read the page rather than replaying one capture.
- Studionet state is temporary. A case contract can stop existing when the node resets, which is why
  each case shows its address and explorer link.
- The frontend has no server, indexer or cross-browser case list: addresses live in the visitor's
  browser.

---

## References

- [Intelligent Contracts](https://docs.genlayer.com/developers/intelligent-contracts/introduction)
- [When to use GenLayer](https://docs.genlayer.com/developers/intelligent-contracts/when-to-use-genlayer)
- [Web access](https://docs.genlayer.com/developers/intelligent-contracts/features/web-access)
- [Calling LLMs](https://docs.genlayer.com/developers/intelligent-contracts/features/calling-llms)
- [Testing Intelligent Contracts](https://docs.genlayer.com/developers/intelligent-contracts/testing)
- [genvm-linter](https://docs.genlayer.com/api-references/genlayer-linter)
- [Equivalence Principle](https://docs.genlayer.com/equivalence-principle)
- [GenLayerJS](https://docs.genlayer.com/api-references/genlayer-js)
