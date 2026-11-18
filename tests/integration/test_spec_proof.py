"""Integration tests against a real GenLayer network and real wallets.

Run against Studio (no keys needed):

    gltest tests/integration -v --network studionet

Run against Bradbury testnet with two funded wallets in `.env`:

    gltest tests/integration -v --network testnet_bradbury

The live evaluation (real web render + real validators) only runs when
`SPECPROOF_LIVE_EVALUATION=1`, because it costs fees and can legitimately end
undetermined when validators disagree.
"""

import json
import os

import pytest
from eth_account import Account
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


def _outsider_account(accounts):
    """Second wallet: from the network accounts, or from ACCOUNT_PRIVATE_KEY_2."""
    if len(accounts) > 1:
        return accounts[1]

    key = os.environ.get("ACCOUNT_PRIVATE_KEY_2", "").strip()
    if key:
        return Account.from_key(key)
    return None


def test_deploy_and_read_spec(default_account):
    factory = get_contract_factory("SpecProof")
    contract = factory.deploy(args=[SITE_URL, CRITERIA], account=default_account)

    spec = json.loads(contract.get_spec().call())

    assert spec["site_url"] == SITE_URL
    assert spec["criteria"] == CRITERIA.split("\n")
    assert spec["evaluated"] is False
    assert spec["creator"].lower() == default_account.address.lower()
    assert json.loads(contract.get_result().call()) == {}


def test_outsider_cannot_evaluate(default_account, accounts):
    factory = get_contract_factory("SpecProof")
    contract = factory.deploy(args=[SITE_URL, CRITERIA], account=default_account)

    outsider = _outsider_account(accounts)
    if outsider is None:
        pytest.skip("Set ACCOUNT_PRIVATE_KEY_2 to run the outsider test")

    receipt = contract.connect(outsider).evaluate().transact()
    assert tx_execution_failed(receipt)

    spec = json.loads(contract.get_spec().call())
    assert spec["evaluated"] is False


@pytest.mark.skipif(
    os.environ.get("SPECPROOF_LIVE_EVALUATION", "0") != "1",
    reason="Set SPECPROOF_LIVE_EVALUATION=1 to run a priced web + LLM evaluation",
)
def test_live_evaluation_records_outcome(default_account):
    factory = get_contract_factory("SpecProof")
    contract = factory.deploy(args=[SITE_URL, CRITERIA], account=default_account)

    first = contract.evaluate().transact()
    assert tx_execution_succeeded(first)

    result = json.loads(contract.get_result().call())
    assert isinstance(result["all_passed"], bool)
    assert [check["id"] for check in result["checks"]] == ["C1", "C2"]

    # A recorded outcome cannot be evaluated a second time.
    second = contract.evaluate().transact()
    assert tx_execution_failed(second)
