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

SpecProof is a deliverable-acceptance tool for web work. A client and a builder write down up to six observable criteria for a page, open one case in a shared GenLayer registry, and let validators check the live page against that text. The contract renders the page itself, asks an LLM for one boolean per criterion, and compares answers across validators. Only the wallet that opened the case can evaluate it, only once; the stored result is ids and booleans, so there is no free text or score to argue with later.

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

SpecProof makes the rubric the contract. Two parties write the acceptance criteria for a page as plain, observable sentences; one shared registry contract stores each case with its URL and rubric, renders the live page itself, and records one verdict. The verdict is a list of ids and booleans, so it cannot be softened afterwards by a paragraph of prose.

---

## How it works

1. **Agree on the rubric.** A public URL, a case name and up to six observable criteria, at most 180 characters each and 1200 in total, no duplicates. `create_case` validates and stores them once, so the text the evaluator sees is the text on record.
2. **Check public evidence.** `evaluate(case_id)` renders the page with `gl.nondet.web.render`, wraps the capture in `<<<PAGE>>>` markers, treats it as untrusted data, and asks for exactly one boolean per criterion.
3. **Record one decision.** Validators compare ids and booleans only. Agreement writes a small result and closes the case. Disagreement writes nothing, and the owner may retry.

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
| `create_case(title, site_url, criteria_text)` | write | Validates, stores the caller as the case owner, returns the new case id |
| `evaluate(case_id)` | write | Owner-only, once-only: renders, judges, agrees, stores |
| `get_case(case_id)` | view | `id`, `creator`, `title`, `site_url`, `criteria`, `criteria_text`, `evaluated` |
| `get_result(case_id)` | view | `{ all_passed, checks: [{ id, passed }] }`, or `{}` before evaluation |
| `case_count()` | view | Number of cases opened so far |
| `list_cases()` | view | Newest first: id, title, URL, creator, `evaluated`, criteria and passed counts (50 max) |

Header pin: `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`

### Security model

- **Owner-only evaluation** — the wallet that called `create_case` is stored with the case; everyone else can read it but not evaluate it.
- **One outcome, retry only on failure** — a successful evaluation closes the case; a failed or inconclusive one writes nothing, so the owner can retry.
- **No unverified free text** — only ids and booleans are compared and stored; no leader-supplied reasoning, score or percentage drives later behaviour.
- **Bounded registry** — one shared contract holds at most 500 cases, so its storage stays finite.
- **Bounded input** — HTTP(S) on a public host only (no credentials, localhost, private, link-local or shared ranges); a case name of at most 80 characters; at most 6 criteria, 180 characters each, 1200 total, duplicates rejected.
- **Grounding and injection handling** — the captured page reaches the prompt as data inside markers, and the output must match the expected ids, order and boolean types or the transaction reverts.
- **Caller manipulation** — a stranger can open their own case with any rubric, but cannot evaluate someone else's, cannot consume its single evaluation, and cannot overwrite a recorded result.

---

## Frontend

React 18 + TypeScript + Vite, `genlayer-js@1.1.8`, hash routes so deep links survive static hosting:

- `#/` — landing page: the three steps, why the judgment holds up, and the current scope.
- `#/workspace` — overview, metrics, recent cases.
- `#/evaluations` — every case, tabs and search.
- `#/how-it-works` — the method, a rubric example, the stored result, the limits.

On-chain behaviour:

- **Create** calls `create_case` on the registry with the connected wallet; the case is a record in the shared contract.
- **Evaluate** appears only for the wallet that opened the case and only before a result exists; the dialog waits for the receipt and re-reads `get_result`.
- **Reads** (`list_cases`, `get_case`, `get_result`) need no wallet, so every visitor sees the same list.
- **Audit** — every case points at the registry contract and its evaluation transaction in the Studio explorer, with a refresh control.
- **Wallet discipline** — silent `eth_accounts` on load, one `eth_requestAccounts` per click behind a single-flight guard, `-32002` reported rather than retried, and `wallet_switchEthereumChain` (adding the chain on `4902`) instead of `client.connect()`, which is MetaMask/Snap-only and breaks in other injected wallets.

---

## Live deployment

One registry contract holds every case. Its address is the constant `REGISTRY_ADDRESS` in `src/lib/genlayer.ts`, and the integration suite deploys it and prints the address it used as `[integration] registry 0x…`. The run that produced the address below deployed, opened a case, read it back, tested the outsider rejection and the invalid specs.

| What | Value |
| --- | --- |
| Registry | [`0x40C41c0E67Ae771A5A1BcDDD6e67C8C0cD08BfbF`](https://explorer-studio.genlayer.com/address/0x40C41c0E67Ae771A5A1BcDDD6e67C8C0cD08BfbF) |
| Network | Studionet — `https://studio.genlayer.com/api` |
| Explorer | `https://explorer-studio.genlayer.com/address/<address>` and `https://explorer-studio.genlayer.com/tx/<hash>` |
| Gas | Studionet is gasless; neither wallet needs a GEN balance |
| Lifetime | Studionet state is temporary, so the registry can stop existing when the node resets |

Because the app reads the registry, a reviewer does not need a wallet to see cases and results; a wallet is only needed to open a case or to evaluate one you opened.

---

## How a reviewer verifies this

```bash
git clone https://github.com/weels007/SpecProof && cd SpecProof
pip install -r requirements.txt

# 1. Contract lint + fast tests (no network, mocked web + LLM)
genvm-lint check contracts/spec_proof.py
pytest tests/direct -v

# 2. Real chain: deploy the registry, open cases, read them, outsider rejection, invalid specs
KEYSTORE_1=... KEYSTORE_PASSWORD_1=... \
KEYSTORE_2=... KEYSTORE_PASSWORD_2=... \
gltest tests/integration -v --network studionet

# 3. Full E2E: real web render + real validators, then both follow-up attempts rejected
SPECPROOF_LIVE_EVALUATION=1 gltest tests/integration -v --network studionet

# 4. Frontend
npm install && npm run typecheck && npm run build
```

Then open the app, connect a wallet, open a case on a public URL and evaluate it with the same wallet. Studionet is gasless, so neither wallet needs a GEN balance.

---

## Test coverage

| Suite | What it proves |
| --- | --- |
| `tests/direct` — 23 tests | URL, title and rubric validation (private host, credentials, spaces, duplicates, overlong, empty, too many, missing name, unknown id), owner-only, once-only, all-pass, partial, unusable LLM output, validator agreement and disagreement, independent cases, newest-first listing |
| `tests/integration` — 4 tests | Deploy the registry once and open/read a case on Studionet; an outsider's `evaluate` fails; four invalid `create_case` calls revert without adding a case; with `SPECPROOF_LIVE_EVALUATION=1`, the owner's real evaluation is recorded and both later attempts (outsider and owner) revert with the stored result unchanged |
| `ci.yml` | Contract lint, direct tests, frontend typecheck and build on every push |
| `integration.yml` | The Studionet suite on demand, or by editing `.github/integration-request` |

Wallets come from repository secrets: `KEYSTORE_1` / `KEYSTORE_PASSWORD_1` for the creator, optional `KEYSTORE_2` / `KEYSTORE_PASSWORD_2` for the adversarial caller, with plaintext `ACCOUNT_PRIVATE_KEY_1` / `_2` as a fallback. Decryption happens in memory; no key is ever committed.

---

## Limits and non-goals

- Pages behind a login cannot be checked, and a page that changes between validator reads can end undetermined — nothing is written when that happens.
- Only the first 12,000 characters of a capture reach the evaluator.
- No evidence hash is stored on-chain: validators re-read the page rather than replaying one capture.
- Studionet state is temporary. The registry contract can stop existing when the node resets, which is why the app links to it on the explorer.
- One registry holds at most 500 cases, and the app lists the newest 50; there is no server or indexer beyond that.
- Not an escrow or a payment rail. SpecProof records the verdict; moving money on it is out of scope.

---

## Notes for stewards

- Everything above was run: 23 direct tests, the Studionet integration suite (fast run and the full E2E), contract lint, and the frontend typecheck and build in CI. The CI links are on the repository's Actions tab.
- The browser open-and-evaluate path is written against the same `genlayer-js` calls the integration suite exercises at contract level, but it has not been driven end-to-end in a wallet-enabled browser by the author — please treat a first on-chain click in the app as the remaining manual check.
- The repository is private. If a submission requires a public link, it needs to be made public or opened to the reviewers.
