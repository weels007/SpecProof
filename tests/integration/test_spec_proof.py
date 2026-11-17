"""Studio-mode integration test for contracts/spec_proof.py.

Run against a GenLayer network with:

    gltest tests/integration -v --network studionet

The CI workflow only runs the direct-mode tests, so this file is skipped
unless a network is available.
"""

import json

import pytest
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded

pytestmark = pytest.mark.integration

SITE_URL = "https://example.com"
CRITERIA = "A page heading is visible without scrolling"


def test_deploy_and_read_spec():
    factory = get_contract_factory("SpecProof")

    receipt = factory.deploy_contract_tx(args=[SITE_URL, CRITERIA])
    assert tx_execution_succeeded(receipt)

    contract = factory.deploy(args=[SITE_URL, CRITERIA])
    spec = json.loads(contract.get_spec().call())

    assert spec["site_url"] == SITE_URL
    assert spec["criteria"] == CRITERIA
    assert spec["evaluated"] is False
