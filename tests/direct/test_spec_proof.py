"""Direct-mode tests for contracts/spec_proof.py (the SpecProof registry)."""

import json

CONTRACT = "contracts/spec_proof.py"
TITLE = "Northstar launch page"
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


def open_case(contract, title=TITLE, url=SITE_URL, criteria=CRITERIA):
    """Create a case the way the app does, and return the id the registry gave it."""
    contract.create_case(title, url, criteria)
    return contract.case_count()


def test_registry_starts_empty(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)

    assert contract.case_count() == "0"
    assert json.loads(contract.list_cases()) == []


def test_open_case_records_the_spec(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    case_id = open_case(contract)

    spec = json.loads(contract.get_case(case_id))

    assert spec["id"] == case_id
    assert spec["title"] == TITLE
    assert spec["site_url"] == SITE_URL
    assert spec["criteria"] == CRITERIA_LIST
    assert spec["criteria_text"] == CRITERIA
    assert spec["evaluated"] is False
    assert spec["creator"].startswith("0x")
    assert len(spec["creator"]) == 42
    assert json.loads(contract.get_result(case_id)) == {}


def test_normalizes_whitespace_in_criteria(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    case_id = open_case(
        contract,
        criteria="  A clear   page heading is visible without scrolling  \n\nB contact   link is available",
    )

    spec = json.loads(contract.get_case(case_id))

    assert spec["criteria"] == [
        "A clear page heading is visible without scrolling",
        "B contact link is available",
    ]


def test_rejects_non_http_url(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)

    with direct_vm.expect_revert("A public HTTP or HTTPS URL is required"):
        contract.create_case(TITLE, "ftp://launch.example", CRITERIA)


def test_rejects_private_hosts(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)

    with direct_vm.expect_revert("must point at a public host"):
        contract.create_case(TITLE, "http://127.0.0.1:8080/admin", CRITERIA)


def test_rejects_credentials_in_url(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)

    with direct_vm.expect_revert("cannot contain credentials"):
        contract.create_case(TITLE, "https://user:secret@launch.example", CRITERIA)


def test_rejects_urls_with_whitespace(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)

    with direct_vm.expect_revert("cannot contain spaces"):
        contract.create_case(TITLE, "https://launch.example/a b", CRITERIA)


def test_rejects_more_than_six_criteria(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    criteria = "\n".join(f"Criterion number {index}" for index in range(1, 8))

    with direct_vm.expect_revert("Provide between 1 and 6 acceptance criteria"):
        contract.create_case(TITLE, SITE_URL, criteria)


def test_rejects_empty_criteria(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)

    with direct_vm.expect_revert("Provide between 1 and 6 acceptance criteria"):
        contract.create_case(TITLE, SITE_URL, "\n   \n")


def test_rejects_overlong_criterion(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)

    with direct_vm.expect_revert("at most 180 characters"):
        contract.create_case(TITLE, SITE_URL, "A" * 181)


def test_rejects_duplicate_criteria(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    repeated = "A clear page heading is visible without scrolling"

    with direct_vm.expect_revert("must differ from each other"):
        contract.create_case(TITLE, SITE_URL, f"{repeated}\n{repeated}")


def test_requires_a_case_name(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)

    with direct_vm.expect_revert("A case name is required"):
        contract.create_case("   ", SITE_URL, CRITERIA)


def test_rejects_overlong_case_name(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)

    with direct_vm.expect_revert("at most 80 characters"):
        contract.create_case("N" * 81, SITE_URL, CRITERIA)


def test_unknown_case_is_rejected(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)

    with direct_vm.expect_revert("Unknown case"):
        contract.get_case("7")


def test_only_creator_can_evaluate(direct_vm, direct_deploy, direct_bob):
    contract = direct_deploy(CONTRACT)
    case_id = open_case(contract)
    mock_evaluation(direct_vm, True, True, True)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the case creator can record this evaluation"):
        contract.evaluate(case_id)

    assert json.loads(contract.get_case(case_id))["evaluated"] is False


def test_records_all_passing_checks(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    case_id = open_case(contract)
    mock_evaluation(direct_vm, True, True, True)

    contract.evaluate(case_id)

    result = json.loads(contract.get_result(case_id))
    assert result["all_passed"] is True
    assert [check["id"] for check in result["checks"]] == ["C1", "C2", "C3"]
    assert all(check["passed"] for check in result["checks"])
    assert json.loads(contract.get_case(case_id))["evaluated"] is True


def test_records_partial_result(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    case_id = open_case(contract)
    mock_evaluation(direct_vm, True, False, True)

    contract.evaluate(case_id)

    result = json.loads(contract.get_result(case_id))
    assert result["all_passed"] is False
    assert [check["passed"] for check in result["checks"]] == [True, False, True]


def test_rejects_unusable_evaluator_output(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    case_id = open_case(contract)
    direct_vm.mock_web(r".*launch\.example.*", {"status": 200, "body": PAGE_HTML})
    direct_vm.mock_llm(LLM_PATTERN, json.dumps({"checks": [{"id": "C1", "passed": "yes"}]}))

    with direct_vm.expect_revert("The evaluator returned an unusable result"):
        contract.evaluate(case_id)


def test_validator_accepts_matching_second_opinion(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    case_id = open_case(contract)
    mock_evaluation(direct_vm, True, False, True)

    contract.evaluate(case_id)

    assert direct_vm.run_validator() is True


def test_validator_rejects_conflicting_second_opinion(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    case_id = open_case(contract)
    mock_evaluation(direct_vm, True, True, True)
    contract.evaluate(case_id)

    direct_vm.clear_mocks()
    mock_evaluation(direct_vm, True, False, True)

    assert direct_vm.run_validator() is False


def test_second_evaluation_is_rejected(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    case_id = open_case(contract)
    mock_evaluation(direct_vm, True, True, True)
    contract.evaluate(case_id)

    with direct_vm.expect_revert("This evaluation is already recorded"):
        contract.evaluate(case_id)


def test_cases_are_independent(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    first = open_case(contract)
    second = open_case(contract, title="Second delivery", url="https://second.example")

    assert first == "1"
    assert second == "2"

    mock_evaluation(direct_vm, True, True, True)
    contract.evaluate(first)

    assert json.loads(contract.get_case(first))["evaluated"] is True
    assert json.loads(contract.get_case(second))["evaluated"] is False
    assert json.loads(contract.get_result(second)) == {}


def test_lists_recent_cases_first(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    open_case(contract, title="One")
    open_case(contract, title="Two", url="https://second.example")
    open_case(contract, title="Three", url="https://third.example")

    assert contract.case_count() == "3"

    recent = json.loads(contract.list_cases())
    assert [row["id"] for row in recent] == ["3", "2", "1"]
    assert recent[0]["title"] == "Three"
    assert recent[0]["site_url"] == "https://third.example"
    assert recent[0]["criteria_count"] == 3
    assert recent[0]["evaluated"] is False
    assert recent[0]["passed_count"] == 0
