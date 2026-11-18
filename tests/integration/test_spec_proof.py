"""Integration tests on Studionet with real wallets, against the SpecProof registry.

    gltest tests/integration -v --network studionet

The suite deploys the registry once and then exercises it through real wallets:
opening cases, reads, an outsider's rejected evaluation, invalid specs that must
revert, and — with `SPECPROOF_LIVE_EVALUATION=1` — a real web render plus a real
validator consensus run.

A wallet is resolved from KEYSTORE_<label> (+ KEYSTORE_PASSWORD_<label>), or
from ACCOUNT_PRIVATE_KEY_<label>; without either, the network's configured
accounts are used. Studionet is gasless.
"""

import base64
import inspect
import json
import os
import re
from pathlib import Path

import pytest
from eth_account import Account
from eth_account.signers.local import LocalAccount
from gltest import get_contract_factory
from gltest.assertions import tx_execution_failed, tx_execution_succeeded

pytestmark = pytest.mark.integration

TITLE = "Example delivery check"
SITE_URL = "https://example.com"
CRITERIA = "\n".join(
    [
        "A page heading is visible without scrolling",
        "The page includes a link to another page",
    ]
)

# Studionet consensus can take a while; give each receipt up to ~4 minutes.
WAIT = {"wait_interval": 2000, "wait_retries": 120}
# A live web + LLM evaluation needs real consensus; allow up to ~10 minutes.
LIVE_WAIT = {"wait_interval": 3000, "wait_retries": 200}


def _keystore_account(label: str) -> LocalAccount | None:
    """Decrypt KEYSTORE_<label> (or the file in KEYSTORE_PATH_<label>).

    Mirrors the Clause Guard wallet loader: the secret may hold raw JSON or a
    base64 copy of it, and decryption goes through Account.decrypt(dict, pw).
    """
    raw = os.environ.get(f"KEYSTORE_{label}", "").strip()
    path = os.environ.get(f"KEYSTORE_PATH_{label}", "").strip()
    password = os.environ.get(f"KEYSTORE_PASSWORD_{label}", "")

    if not raw and path:
        raw = Path(path).read_text().strip()
    if not raw:
        return None

    text = raw.strip().strip("\"'")

    # A raw private key pasted into the keystore secret still works.
    if re.fullmatch(r"(0x)?[0-9a-fA-F]{64}", text):
        return Account.from_key(text)

    if not text.lstrip().startswith("{"):
        try:
            text = base64.b64decode(text).decode("utf-8").strip()
        except Exception as error:
            raise RuntimeError(
                f"KEYSTORE_{label} is neither JSON nor base64. Paste the contents of the "
                "keystore file, not a file path."
            ) from error

    try:
        payload = json.loads(text)
    except ValueError as error:
        raise RuntimeError(f"KEYSTORE_{label} is not valid JSON.") from error

    if not isinstance(payload, dict) or not ("crypto" in payload or "Crypto" in payload):
        raise RuntimeError(
            f"KEYSTORE_{label} is JSON but not a keystore v3 object "
            "(it has no \"crypto\" field)."
        )

    address = payload.get("address", "unknown address")
    version = payload.get("version", "?")
    crypto = payload.get("crypto") or payload.get("Crypto") or {}
    kdf = crypto.get("kdf", "?")

    # Passwords are compared byte for byte: try the value as stored, then
    # without a pasted trailing newline, then without surrounding quotes.
    candidates = [password]
    for candidate in (password.strip(), password.strip().strip("\"'")):
        if candidate and candidate not in candidates:
            candidates.append(candidate)
    if not any(candidates):
        raise RuntimeError(f"KEYSTORE_PASSWORD_{label} is empty.")

    last_error: Exception | None = None
    for candidate in candidates:
        try:
            return Account.from_key(Account.decrypt(payload, candidate))
        except Exception as error:
            last_error = error
            continue

    detail = f"{type(last_error).__name__}: {last_error}" if last_error else "unknown error"
    raise RuntimeError(
        f"Could not unlock KEYSTORE_{label} (wallet {address}, keystore v{version}, "
        f"kdf {kdf}). Decrypt failed with: {detail}"
    )


def _private_key_account(label: str) -> LocalAccount | None:
    key = os.environ.get(f"ACCOUNT_PRIVATE_KEY_{label}", "").strip()
    return Account.from_key(key) if key else None


def _wallet(label: str) -> LocalAccount | None:
    """Keystore first, then a private key; a broken keystore does not block the key."""
    keystore_error: RuntimeError | None = None
    try:
        account = _keystore_account(label)
    except RuntimeError as error:
        account = None
        keystore_error = error

    if account is not None:
        return account

    account = _private_key_account(label)
    if account is not None:
        return account

    if keystore_error is not None:
        raise keystore_error
    return None


def _fees() -> dict | None:
    """Fee budget for fee-charging networks; None on gasless Studio and localnet."""
    from gltest.clients import get_gl_client

    client = get_gl_client()
    if not getattr(client.chain, "fee_manager_contract", None):
        return None

    estimate = client.estimate_transaction_fees()
    return {"distribution": estimate["distribution"], "feeValue": estimate["feeValue"]}


def _fee_arguments(callable_obj) -> dict:
    """Only pass fees to gltest calls that accept them (v0.29 has no fee support)."""
    if "fees" not in inspect.signature(callable_obj).parameters:
        return {}

    fees = _fees()
    return {"fees": fees} if fees else {}


def _send(handle, wait=None):
    return handle.transact(**(wait or WAIT), **_fee_arguments(handle.transact))


def _count(contract) -> int:
    return int(contract.case_count().call())


def _open_case(contract, account, title=TITLE, url=SITE_URL, criteria=CRITERIA):
    """Open a case and return (receipt, id), using the registry's own counter."""
    before = _count(contract)
    receipt = _send(contract.connect(account).create_case(args=[title, url, criteria]))
    return receipt, str(before + 1)


@pytest.fixture(scope="session")
def test_wallets() -> tuple[LocalAccount, LocalAccount | None]:
    """Creator wallet plus an optional second wallet for the adversarial caller."""
    creator = _wallet("1")
    outsider = _wallet("2")
    print(f"[integration] creator wallet: {creator.address if creator else 'none'}")
    print(f"[integration] outsider wallet: {outsider.address if outsider else 'none'}")

    if creator is None:
        # Studio and localnet bring their own configured accounts.
        from gltest.accounts import get_accounts, get_default_account

        try:
            creator = get_default_account()
            network_accounts = get_accounts()
        except Exception:
            pytest.skip(
                "Set KEYSTORE_1 + KEYSTORE_PASSWORD_1 (or ACCOUNT_PRIVATE_KEY_1) "
                "to use the configured wallets, or run on studionet."
            )

        if outsider is None and len(network_accounts) > 1:
            outsider = network_accounts[1]

    return creator, outsider


@pytest.fixture(scope="session")
def registry(test_wallets):
    """Deploy the one contract every test uses; print its address for the frontend."""
    creator, _ = test_wallets
    factory = get_contract_factory("SpecProof")
    contract = factory.deploy(
        args=[],
        account=creator,
        **WAIT,
        **_fee_arguments(factory.deploy),
    )
    print(f"[integration] registry {contract.address}")
    return contract


def test_deploy_and_open_a_case(registry, test_wallets):
    creator, _ = test_wallets

    receipt, case_id = _open_case(registry, creator)
    assert tx_execution_succeeded(receipt)

    spec = json.loads(registry.get_case(args=[case_id]).call())

    assert spec["id"] == case_id
    assert spec["title"] == TITLE
    assert spec["site_url"] == SITE_URL
    assert spec["criteria"] == CRITERIA.split("\n")
    assert spec["evaluated"] is False
    assert spec["creator"].lower() == creator.address.lower()
    assert json.loads(registry.get_result(args=[case_id]).call()) == {}


def test_outsider_cannot_evaluate(registry, test_wallets):
    creator, outsider = test_wallets
    if outsider is None:
        pytest.skip("Set a second wallet (KEYSTORE_2 or ACCOUNT_PRIVATE_KEY_2)")

    _, case_id = _open_case(registry, creator)

    receipt = _send(registry.connect(outsider).evaluate(args=[case_id]))
    assert tx_execution_failed(receipt)

    assert json.loads(registry.get_case(args=[case_id]).call())["evaluated"] is False


def test_rejects_invalid_specs_on_chain(registry, test_wallets):
    creator, _ = test_wallets
    before = _count(registry)
    repeated = CRITERIA.splitlines()[0]

    invalid_cases = [
        (TITLE, "http://127.0.0.1/admin", CRITERIA, "private host"),
        (TITLE, SITE_URL, f"{repeated}\n{repeated}", "duplicate criteria"),
        (TITLE, SITE_URL, "A" * 181, "overlong criterion"),
        ("   ", SITE_URL, CRITERIA, "missing case name"),
    ]

    for title, site_url, criteria, label in invalid_cases:
        # Every call here is meant to revert, so a retry after a transient node
        # error cannot create anything.
        for attempt in range(2):
            try:
                receipt = _send(
                    registry.connect(creator).create_case(args=[title, site_url, criteria])
                )
                break
            except Exception as error:
                if attempt == 1 or "502" not in str(error):
                    raise
        assert tx_execution_failed(receipt), label

    assert _count(registry) == before


@pytest.mark.skipif(
    os.environ.get("SPECPROOF_LIVE_EVALUATION", "0") != "1",
    reason="Set SPECPROOF_LIVE_EVALUATION=1 to run a live web + LLM evaluation",
)
def test_end_to_end_creator_evaluates_after_outsider_attempt(registry, test_wallets):
    creator, outsider = test_wallets
    if outsider is None:
        pytest.skip("Set a second wallet (KEYSTORE_2 or ACCOUNT_PRIVATE_KEY_2)")

    receipt, case_id = _open_case(registry, creator)
    assert tx_execution_succeeded(receipt)

    # Adversarial step 1: an outsider cannot consume the one evaluation.
    outsider_receipt = _send(registry.connect(outsider).evaluate(args=[case_id]))
    assert tx_execution_failed(outsider_receipt)
    assert json.loads(registry.get_case(args=[case_id]).call())["evaluated"] is False

    # E2E: the creator runs the real web render + LLM consensus.
    first = _send(registry.connect(creator).evaluate(args=[case_id]), LIVE_WAIT)
    assert tx_execution_succeeded(first)

    spec = json.loads(registry.get_case(args=[case_id]).call())
    assert spec["evaluated"] is True

    result = json.loads(registry.get_result(args=[case_id]).call())
    assert isinstance(result["all_passed"], bool)
    assert [check["id"] for check in result["checks"]] == ["C1", "C2"]
    assert all(isinstance(check["passed"], bool) for check in result["checks"])

    # Adversarial step 2: neither party can replace the recorded outcome.
    outsider_again = _send(registry.connect(outsider).evaluate(args=[case_id]))
    assert tx_execution_failed(outsider_again)
    creator_again = _send(registry.connect(creator).evaluate(args=[case_id]))
    assert tx_execution_failed(creator_again)

    # Rejected attempts left the stored record untouched.
    assert json.loads(registry.get_result(args=[case_id]).call()) == result
