"""Direct-mode tests for contracts/spec_proof.py."""

import json

CONTRACT = "contracts/spec_proof.py"
SITE_URL = "https://launch.example"
CRITERIA_LIST = [
    "A clear page heading is visible without scrolling",
    "A contact link is available in the page navigation",
    "The primary action is clearly labelled",
]
CRITERIA = "\n".join(CRITERIA_LIST)
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
    assert spec["criteria"] == CRITERIA_LIST
    assert spec["criteria_text"] == CRITERIA
    assert spec["evaluated"] is False
    assert spec["creator"].startswith("0x")
    assert len(spec["creator"]) == 42
    assert json.loads(contract.get_result()) == {}


def test_normalizes_whitespace_in_criteria(direct_vm, direct_deploy):
    contract = direct_deploy(
        CONTRACT,
        SITE_URL,
        "  A clear   page heading is visible without scrolling  \n\nB contact   link is available",
    )

    spec = json.loads(contract.get_spec())

    assert spec["criteria"] == [
        "A clear page heading is visible without scrolling",
        "B contact link is available",
    ]


def test_rejects_non_http_url(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, "ftp://launch.example", CRITERIA)

    with direct_vm.expect_revert("A public HTTP or HTTPS URL is required"):
        contract.evaluate()


def test_rejects_private_hosts(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, "http://127.0.0.1:8080/admin", CRITERIA)

    with direct_vm.expect_revert("must point at a public host"):
        contract.evaluate()


def test_rejects_credentials_in_url(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, "https://user:secret@launch.example", CRITERIA)

    with direct_vm.expect_revert("cannot contain credentials"):
        contract.evaluate()


def test_rejects_urls_with_whitespace(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, "https://launch.example/a b", CRITERIA)

    with direct_vm.expect_revert("cannot contain spaces"):
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


def test_rejects_overlong_criterion(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, SITE_URL, "A" * 181)

    with direct_vm.expect_revert("at most 180 characters"):
        contract.evaluate()


def test_rejects_duplicate_criteria(direct_vm, direct_deploy):
    repeated = "A clear page heading is visible without scrolling"
    contract = direct_deploy(CONTRACT, SITE_URL, f"{repeated}\n{repeated}")

    with direct_vm.expect_revert("must differ from each other"):
        contract.evaluate()


def test_only_creator_can_evaluate(direct_vm, direct_deploy, direct_bob):
    contract = direct_deploy(CONTRACT, SITE_URL, CRITERIA)
    mock_evaluation(direct_vm, True, True, True)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the case creator can record this evaluation"):
        contract.evaluate()

    assert json.loads(contract.get_spec())["evaluated"] is False


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
