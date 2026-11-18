# SpecProof

**Proof for work that ships.** Write down what “done” means, let independent GenLayer validators check the public evidence, and keep one result nobody can quietly rewrite.

SpecProof runs on **Studionet** as a single registry contract: the app calls `create_case` to open a case, only the wallet that opened it can run `evaluate`, and the browser reads every case and result straight from the chain.

The registry is deployed at [`0x40C41c0E67Ae771A5A1BcDDD6e67C8C0cD08BfbF`](https://explorer-studio.genlayer.com/address/0x40C41c0E67Ae771A5A1BcDDD6e67C8C0cD08BfbF) on Studionet. Anyone can read it; a wallet is only needed to open a case or to evaluate one.

---

## Status

| Surface | What works today |
| --- | --- |
| Contract | One registry contract, linted with `genvm-lint`; 23 direct-mode tests; 4 Studionet integration tests with real wallets |
| Frontend | React 18 + TypeScript + Vite; lists, opens and evaluates registry cases via `genlayer-js` |
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

1. **Agree on the rubric.** A public URL, a case name and up to six observable criteria. `create_case` validates and stores them once, so the text the evaluator sees is the text on record.
2. **Check public evidence.** `evaluate(case_id)` renders the page, wraps the capture in `<<<PAGE>>>` markers, treats it as untrusted data, and asks for one boolean per criterion.
3. **Record one decision.** Validators compare ids and booleans only. Agreement writes a small result and closes the case; disagreement writes nothing and the case owner may retry.

### Contract API

| Method | Type | Behaviour |
| --- | --- | --- |
| `create_case(title, site_url, criteria_text)` | write | Validates, stores the caller as the case owner, returns the new case id |
| `evaluate(case_id)` | write | Owner-only, once-only: renders, judges, agrees, stores |
| `get_case(case_id)` | view | `id`, `creator`, `title`, `site_url`, `criteria`, `criteria_text`, `evaluated` |
| `get_result(case_id)` | view | `{ all_passed, checks: [{ id, passed }] }`, or `{}` before evaluation |
| `case_count()` | view | Number of cases opened so far |
| `list_cases()` | view | Newest first: id, title, URL, creator, `evaluated`, criteria and passed counts (50 max) |

### Security properties

- **Owner-only evaluation** — the wallet that called `create_case` is stored with the case; everyone
  else can read it but not evaluate it.
- **One outcome, retry only on failure** — a successful evaluation closes the case; a failed or
  inconclusive one writes nothing, so the owner can retry.
- **No unverified free text** — only ids and booleans are compared and stored; no leader-supplied
  reasoning, score or percentage drives later behaviour.
- **Bounded registry** — one shared contract holds at most 500 cases, so its storage stays finite.
- **Bounded input** — HTTP(S) on a public host only (no credentials, localhost, private, link-local
  or shared ranges); a case name of at most 80 characters; at most 6 criteria, 180 characters each,
  1200 total, duplicates rejected.
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

- **Create** calls `create_case` on the registry with the connected wallet; the case is a record in
  the shared contract, and its id is the pointer the app keeps.
- **Evaluate** appears only for the wallet that opened the case and only before a result exists. The
  dialog waits for the receipt, then re-reads `get_result`.
- **Reads** (`list_cases`, `get_case`, `get_result`) need no wallet, so everyone sees the same list.
- **Audit** — every case links to the registry contract and its evaluation transaction in the Studio
  explorer, with a refresh control.

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
pytest tests/direct -v                 # 23 tests, mocked web + LLM
```

`tests/integration` runs against Studionet with real wallets:

```bash
gltest tests/integration -v --network studionet
```

It deploys the registry once, opens and reads cases, checks that an outsider cannot evaluate someone
else's case, and checks that four invalid `create_case` calls revert without adding a case. With
`SPECPROOF_LIVE_EVALUATION=1` it also runs the full E2E: the owner's real web + LLM evaluation is
recorded, then a repeat and an outsider attempt are both rejected with the stored result unchanged.

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
3. **No environment variables are required.** The Studionet RPC is public and the registry address
   is a constant in `src/lib/genlayer.ts`.

Nothing from `contracts/` is bundled at build time any more: the site only talks to the deployed
registry. The on-chain flow needs HTTPS (Vercel) and a browser with an injected wallet; without one
the app still lists and reads cases, and shows illustrative sample rows while the registry is empty.

---

## Repository layout

```text
contracts/spec_proof.py     the registry Intelligent Contract
tests/direct/               mocked web + LLM, fast
tests/integration/          Studionet, real wallets, registry E2E
src/pages/                  landing, workspace, evaluations, how it works
src/components/             shell, dialogs, wallet, case table, toast
src/hooks/                  registry cases, toasts, wallet state machine
src/lib/genlayer.ts         registry address, reads, wallet writes, receipts
.github/workflows/          push CI, manual Studionet suite
SUBMISSION.md               form-ready submission text
```

---

## Limits

- Pages behind a login cannot be checked; a page that changes between validator reads can end
  undetermined (nothing is written).
- Only the first 12,000 characters of a capture reach the evaluator.
- No evidence hash is stored on-chain; validators re-read the page rather than replaying one capture.
- Studionet state is temporary. The registry contract can stop existing when the node resets, which
  is why the app links to it on the explorer.
- No server or indexer: the browser reads the registry directly, and the newest 50 cases only.

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
