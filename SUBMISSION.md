# SpecProof — submission

SpecProof checks whether a public website meets the delivery rubric two parties agreed on, and lets independent GenLayer validators settle the answer once.

This pack carries what a submission form usually asks for — copy-ready text, the contract surface, the verification steps — and claims nothing that has not been run.

---

## Copy-ready fields

**Project name**

SpecProof

**Tagline** (87 characters)

Independent GenLayer validators verify a public site against a written delivery rubric.

**One-liner** (150 characters)

A GenLayer contract renders a public page, asks an LLM for one boolean per agreed criterion, and stores the verdict once independent validators agree.

**Short description** (about 480 characters)

SpecProof is a deliverable-acceptance tool for web work. A client and a builder write down up to six observable criteria for a page, deploy one GenLayer contract per case, and let validators check the live page against that text. The contract renders the page itself, asks an LLM for one boolean per criterion, and compares answers across validators. Only the creator can evaluate, only once; the stored result is ids and booleans, so there is no free text or score to argue with later.

**Categories**

AI judgment · Web verification · Deliverable acceptance · Smart contracts

**Network**

Studionet (hosted, gasless). The Bradbury preset is not used: its node RPC follows each release and returned `BadFunctionCallOutput` for deploys at the time this was built.

**Links**

- Repository — `https://github.com/weels007/SpecProof` (private; grant access if the form needs a public link)
- Contract source — `contracts/spec_proof.py`
- Frontend — React 18 + TypeScript + Vite, static build, no environment variables

---

## What problem it solves

"Has this been delivered?" is usually settled by whoever holds the payment or the admin password. Screenshots are stale, chat logs are partial, and an honour-system checklist is only as good as the person running it.

SpecProof makes the rubric the contract. Two parties write the acceptance criteria for a page as plain, observable sentences; one GenLayer contract per case stores that text with the URL, renders the live page itself, and records one verdict. The verdict is a list of ids and booleans, so it cannot be softened afterwards by a paragraph of prose.

---

## How it works

1. **Agree on the rubric.** A public URL and up to six observable criteria, at most 180 characters each and 1200 in total, no duplicates. The contract normalizes and stores them at deploy time, so the text the evaluator sees is the text on record.
2. **Check public evidence.** The contract renders the page with `gl.nondet.web.render`, wraps the capture in `<<<PAGE>>>` markers, treats it as untrusted data, and asks for exactly one boolean per criterion.
3. **Record one decision.** Validators compare ids and booleans only. Agreement writes a small result and closes the case. Disagreement writes nothing, and the creator may retry.

---

## How GenLayer is used

The judgement is not on-chain data and cannot be computed deterministically — it needs a live page, a natural-language rubric and several independent readers. That is the whole reason the case lives on GenLayer:

- `gl.nondet.web.render` pulls the page inside the contract; there is no oracle and no off-chain worker in between.
- `gl.nondet.exec_prompt` asks a strict rubric inside a non-deterministic block.
- Validators independently repeat the read and must agree on **every boolean**, not on the sentence the leader produced.
- Only deterministic code writes the outcome, and only once.

---

## Contract surface

`contracts/spec_proof.py` — Python Intelligent Contract, `SpecProof(gl.Contract)`.

| Method | Type | Behaviour |
| --- | --- | --- |
| `__init__(site_url, criteria_text)` | deploy | Stores the deployer as `Address`, the URL and the normalized rubric |
| `evaluate()` | write | Creator-only, once-only: renders, judges, agrees, stores |
| `get_spec()` | view | `creator`, `site_url`, `criteria`, `criteria_text`, `evaluated` |
| `get_result()` | view | `{ all_passed, checks: [{ id, passed }] }`, or `{}` before evaluation |

Header pin: `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`

### Security model

- **Creator-only evaluation** — the deployer is stored as an `Address`; everyone else reverts.
- **One outcome, retry only on failure** — a successful evaluation closes the case; a failed or inconclusive one writes nothing, so the creator can retry.
- **No unverified free text** — only ids and booleans are compared and stored; no leader-supplied reasoning, score or percentage drives later behaviour.
- **Bounded input** — HTTP(S) on a public host only (no credentials, localhost, private, link-local or shared ranges); at most 6 criteria, 180 characters each, 1200 total, duplicates rejected.
- **Grounding and injection handling** — the captured page reaches the prompt as data inside markers, and the output must match the expected ids, order and boolean types or the transaction reverts.
- **Caller manipulation** — a stranger can deploy their own case with any rubric, but cannot touch someone else's contract, cannot evaluate it, and cannot consume the creator's single evaluation.

---

## Frontend

React 18 + TypeScript + Vite, `genlayer-js@1.1.8`, hash routes so deep links survive static hosting:

- `#/` — landing page: the three steps, why the judgment holds up, and the current scope.
- `#/workspace` — overview, metrics, recent cases.
- `#/evaluations` — every case, tabs and search.
- `#/how-it-works` — the method, a rubric example, the stored result, the limits.

On-chain behaviour:

- **Create** deploys one SpecProof contract with the connected wallet and keeps its address in this browser; local drafts still exist for exploring the UI without a wallet.
- **Evaluate** appears only for the creator wallet and only before a result exists; the dialog waits for the receipt and re-reads `get_result`.
- **Reads** (`get_spec`, `get_result`) need no wallet and run from the browser.
- **Audit** — every case links to its contract, deployment transaction and evaluation transaction in the Studio explorer, with a refresh control.
- **Wallet discipline** — silent `eth_accounts` on load, one `eth_requestAccounts` per click behind a single-flight guard, `-32002` reported rather than retried, and `wallet_switchEthereumChain` (adding the chain on `4902`) instead of `client.connect()`, which is MetaMask/Snap-only and breaks in other injected wallets.

---

## Live deployment

Each case is its own contract, so there is no single global address to link:

- **Where an address comes from** — the app's **Create** step deploys one `SpecProof` contract with the connected wallet and shows its address with an explorer link; the integration suite deploys the contracts it tests and prints each one as `[integration] contract 0x… for https://example.com`, visible in the Integration job log on the Actions tab.
- **Studionet RPC** — `https://studio.genlayer.com/api`
- **Explorer** — `https://explorer-studio.genlayer.com/address/<address>` and `https://explorer-studio.genlayer.com/tx/<hash>`
- **Gas** — Studionet is gasless; neither wallet needs a GEN balance.
- **Lifetime** — Studionet state is temporary, so a case contract can stop existing when the node resets. Every case keeps its address and explorer link so the record is still attributable afterwards.

---

## How a reviewer verifies this

```bash
git clone https://github.com/weels007/SpecProof && cd SpecProof
pip install -r requirements.txt

# 1. Contract lint + fast tests (no network, mocked web + LLM)
genvm-lint check contracts/spec_proof.py
pytest tests/direct -v

# 2. Real chain: deploys, reads, outsider rejection, invalid specs
KEYSTORE_1=... KEYSTORE_PASSWORD_1=... \
KEYSTORE_2=... KEYSTORE_PASSWORD_2=... \
gltest tests/integration -v --network studionet

# 3. Full E2E: real web render + real validators, then both follow-up attempts rejected
SPECPROOF_LIVE_EVALUATION=1 gltest tests/integration -v --network studionet

# 4. Frontend
npm install && npm run typecheck && npm run build
```

Then open the app, connect a wallet, create a case on a public URL and evaluate it as the creator. Studionet is gasless, so neither wallet needs a GEN balance.

---

## Test coverage

| Suite | What it proves |
| --- | --- |
| `tests/direct` — 17 tests | URL and rubric validation (private host, credentials, spaces, duplicates, overlong, empty, too many), creator-only, once-only, all-pass, partial, unusable LLM output, validator agreement and disagreement |
| `tests/integration` — 4 tests | Deploy and read the spec on Studionet; an outsider's `evaluate` fails; three invalid specs revert on chain and leave `evaluated` false; with `SPECPROOF_LIVE_EVALUATION=1`, the creator's real evaluation is recorded and both later attempts (outsider and creator) revert with the stored result unchanged |
| `ci.yml` | Contract lint, direct tests, frontend typecheck and build on every push |
| `integration.yml` | The Studionet suite on demand, or by editing `.github/integration-request` |

Wallets come from repository secrets: `KEYSTORE_1` / `KEYSTORE_PASSWORD_1` for the creator, optional `KEYSTORE_2` / `KEYSTORE_PASSWORD_2` for the adversarial caller, with plaintext `ACCOUNT_PRIVATE_KEY_1` / `_2` as a fallback. Decryption happens in memory; no key is ever committed.

---

## Limits and non-goals

- Pages behind a login cannot be checked, and a page that changes between validator reads can end undetermined — nothing is written when that happens.
- Only the first 12,000 characters of a capture reach the evaluator.
- No evidence hash is stored on-chain: validators re-read the page rather than replaying one capture.
- Studionet state is temporary. A case contract can stop existing when the node resets, which is why each case shows its address and explorer link.
- There is no server, indexer or cross-browser case list; addresses live in the visitor's browser.
- Not an escrow or a payment rail. SpecProof records the verdict; moving money on it is out of scope.

---

## Notes for stewards

- Everything above was run: 17 direct tests, the Studionet integration suite (fast run and the full E2E), contract lint, and the frontend typecheck and build in CI. The CI links are on the repository's Actions tab.
- The browser deploy and evaluate path is written against the same `genlayer-js` calls the integration suite exercises at contract level, but it has not been driven end-to-end in a wallet-enabled browser by the author — please treat a first on-chain click in the app as the remaining manual check.
- The repository is private. If a submission requires a public link, it needs to be made public or opened to the reviewers.
