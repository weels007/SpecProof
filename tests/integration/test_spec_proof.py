"""Integration tests against a real GenLayer network and real wallets.

Studio (no wallet needed):

    gltest tests/integration -v --network studionet

Bradbury testnet, with an encrypted keystore (recommended) or a raw key:

    KEYSTORE_1='{"version":3,...}' KEYSTORE_PASSWORD_1='...' \
      gltest tests/integration -v --network testnet_bradbury

A session wallet is resolved in this order: keystore, raw private key, then the
network's configured accounts (what Studio and localnet use).

The live evaluation (real web render + real validators) only runs when
`SPECPROOF_LIVE_EVALUATION=1`, because it costs fees and can legitimately end
undetermined when validators disagree.
"""

import json
import os
from pathlib import Path

import pytest
from eth_account import Account
from eth_account.signers.local import LocalAccount
from gltest import get_contract_factory
from gltest.assertions import tx_execution_failed, tx_execution_succeeded

pytestmark = pytest.mark.integration

SITE_URL = "https://example.com"
CRITERIA = "\n".join(
    [
        "A page heading is visible without scrolling",
        "The page includes a link to another page",
    ]
)


def _keystore_account(label: str) -> LocalAccount | None:
    """Decrypt KEYSTORE_<label> (or the file in KEYSTORE_PATH_<label>)."""
    raw = os.environ.get(f"KEYSTORE_{label}", "").strip()
    path = os.environ.get(f"KEYSTORE_PATH_{label}", "").strip()
    password = os.environ.get(f"KEYSTORE_PASSWORD_{label}", "")

    if not raw and path:
        raw = Path(path).read_text().strip()
    if not raw:
        return None

    try:
        return Account.from_keystore(raw, password)
    except Exception as error:
        raise RuntimeError(
            f"Could not unlock KEYSTORE_{label} with KEYSTORE_PASSWORD_{label}. "
            "Check both values; the wallet was not used."
        ) from error


def _private_key_account(label: str) -> LocalAccount | None:
    key = os.environ.get(f"ACCOUNT_PRIVATE_KEY_{label}", "").strip()
    return Account.from_key(key) if key else None


def _wallet(label: str) -> LocalAccount | None:
    return _keystore_account(label) or _private_key_account(label)


def _fees() -> dict | None:
    """Fee budget for fee-charging networks; None on gasless Studio and localnet."""
    from gltest.clients import get_gl_client

    client = get_gl_client()
    if not getattr(client.chain, "fee_manager_contract", None):
        return None

    estimate = client.estimate_transaction_fees()
    return {"distribution": estimate["distribution"], "feeValue": estimate["feeValue"]}


@pytest.fixture(scope="session")
def test_wallets() -> tuple[LocalAccount, LocalAccount | None]:
    """Creator wallet plus an optional second wallet for the adversarial caller."""
    creator = _wallet("1")
    outsider = _wallet("2")

    if creator is None:
        # Studio and localnet bring their own configured accounts.
        from gltest.accounts import get_accounts, get_default_account

        try:
            creator = get_default_account()
            network_accounts = get_accounts()
        except Exception:
            pytest.skip(
                "Set KEYSTORE_1 + KEYSTORE_PASSWORD_1 (or ACCOUNT_PRIVATE_KEY_1) "
                "to run against Bradbury. Studio and localnet use their own accounts."
            )

        if outsider is None and len(network_accounts) > 1:
            outsider = network_accounts[1]

    return creator, outsider


def test_deploy_and_read_spec(test_wallets):
    creator, _ = test_wallets
    factory = get_contract_factory("SpecProof")
    contract = factory.deploy(args=[SITE_URL, CRITERIA], account=creator, fees=_fees())

    spec = json.loads(contract.get_spec().call())

    assert spec["site_url"] == SITE_URL
    assert spec["criteria"] == CRITERIA.split("\n")
    assert spec["evaluated"] is False
    assert spec["creator"].lower() == creator.address.lower()
    assert json.loads(contract.get_result().call()) == {}


def test_outsider_cannot_evaluate(test_wallets):
    creator, outsider = test_wallets
    if outsider is None:
        pytest.skip("Set a second wallet (KEYSTORE_2 or ACCOUNT_PRIVATE_KEY_2)")

    factory = get_contract_factory("SpecProof")
    contract = factory.deploy(args=[SITE_URL, CRITERIA], account=creator, fees=_fees())

    receipt = contract.connect(outsider).evaluate().transact(fees=_fees())
    assert tx_execution_failed(receipt)

    spec = json.loads(contract.get_spec().call())
    assert spec["evaluated"] is False


@pytest.mark.skipif(
    os.environ.get("SPECPROOF_LIVE_EVALUATION", "0") != "1",
    reason="Set SPECPROOF_LIVE_EVALUATION=1 to run a priced web + LLM evaluation",
)
def test_live_evaluation_records_outcome(test_wallets):
    creator, _ = test_wallets
    factory = get_contract_factory("SpecProof")
    contract = factory.deploy(args=[SITE_URL, CRITERIA], account=creator, fees=_fees())

    first = contract.evaluate().transact(fees=_fees())
    assert tx_execution_succeeded(first)

    result = json.loads(contract.get_result().call())
    assert isinstance(result["all_passed"], bool)
    assert [check["id"] for check in result["checks"]] == ["C1", "C2"]

    # A recorded outcome cannot be evaluated a second time.
    second = contract.evaluate().transact(fees=_fees())
    assert tx_execution_failed(second)
