"""Direct-mode tests for contracts/spec_proof.py."""

import json

CONTRACT = "contracts/spec_proof.py"
SITE_URL = "https://launch.example"
CRITERIA = "\n".join(
    [
        "A clear page heading is visible without scrolling",
        "A contact link is available in the page navigation",
        "The primary action is clearly labelled",
    ]
)
PAGE_HTML = (
    "<html><body><h1>Northstar launch</h1>"
    '<nav><a href="/contact">Contact</a></nav>'
    '<a class="cta" href="/start">Get started</a>'
    "</body></html>"
)
LLM_PATTERN = r"Acceptance criteria"


def decision(*results):
    """Build the JSON payload an evaluator model would return."""
    return json.dumps(
        {
            "checks": [
                {"id": f"C{index + 1}", "passed": bool(result)}
                for index, result in enumerate(results)
            ]
        }
    )


def mock_evaluation(vm, *results, body=PAGE_HTML):
    """Register the page and evaluator mocks the contract needs."""
    vm.mock_web(r".*launch\.example.*", {"status": 200, "body": body})
    vm.mock_llm(LLM_PATTERN, decision(*results))


def test_deploys_with_spec_recorded(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, SITE_URL, CRITERIA)

    spec = json.loads(contract.get_spec())

    assert spec["site_url"] == SITE_URL
    assert spec["criteria"] == CRITERIA
    assert spec["evaluated"] is False
    assert json.loads(contract.get_result()) == {}


def test_rejects_non_http_url(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, "ftp://launch.example", CRITERIA)

    with direct_vm.expect_revert("A public HTTP or HTTPS URL is required"):
        contract.evaluate()


def test_rejects_more_than_six_criteria(direct_vm, direct_deploy):
    criteria = "\n".join(f"Criterion number {index}" for index in range(1, 8))
    contract = direct_deploy(CONTRACT, SITE_URL, criteria)

    with direct_vm.expect_revert("Provide between 1 and 6 acceptance criteria"):
        contract.evaluate()


def test_rejects_empty_criteria(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, SITE_URL, "\n   \n")

    with direct_vm.expect_revert("Provide between 1 and 6 acceptance criteria"):
        contract.evaluate()


def test_records_all_passing_checks(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, SITE_URL, CRITERIA)
    mock_evaluation(direct_vm, True, True, True)

    contract.evaluate()

    result = json.loads(contract.get_result())
    assert result["all_passed"] is True
    assert [check["id"] for check in result["checks"]] == ["C1", "C2", "C3"]
    assert all(check["passed"] for check in result["checks"])
    assert json.loads(contract.get_spec())["evaluated"] is True


def test_records_partial_result(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, SITE_URL, CRITERIA)
    mock_evaluation(direct_vm, True, False, True)

    contract.evaluate()

    result = json.loads(contract.get_result())
    assert result["all_passed"] is False
    assert [check["passed"] for check in result["checks"]] == [True, False, True]


def test_rejects_unusable_evaluator_output(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, SITE_URL, CRITERIA)
    direct_vm.mock_web(r".*launch\.example.*", {"status": 200, "body": PAGE_HTML})
    direct_vm.mock_llm(LLM_PATTERN, json.dumps({"checks": [{"id": "C1", "passed": "yes"}]}))

    with direct_vm.expect_revert("The evaluator returned an unusable result"):
        contract.evaluate()


def test_validator_accepts_matching_second_opinion(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, SITE_URL, CRITERIA)
    mock_evaluation(direct_vm, True, False, True)

    contract.evaluate()

    assert direct_vm.run_validator() is True


def test_validator_rejects_conflicting_second_opinion(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, SITE_URL, CRITERIA)
    mock_evaluation(direct_vm, True, True, True)
    contract.evaluate()

    direct_vm.clear_mocks()
    mock_evaluation(direct_vm, True, False, True)

    assert direct_vm.run_validator() is False


def test_second_evaluation_is_rejected(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, SITE_URL, CRITERIA)
    mock_evaluation(direct_vm, True, True, True)
    contract.evaluate()

    with direct_vm.expect_revert("This evaluation is already recorded"):
        contract.evaluate()
