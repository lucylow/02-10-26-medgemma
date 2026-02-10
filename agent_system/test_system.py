import asyncio
import json
from agent_system.schemas.models import CasePayload, CaseInputs, ImageInput
from agent_system.orchestrator.core import CentralOrchestrator

async def main():
    # 1. Prepare Mock Payload
    payload = CasePayload(
        case_id="case_123",
        client_version="0.1.0",
        consent_id="consent_abc_999",
        age_months=24,
        inputs=CaseInputs(
            images=[
                ImageInput(id="img_1", uri="gs://pediscreen/cases/123/img1.jpg", capture_ts="2026-02-03T10:00:00"),
                ImageInput(id="img_2", uri="gs://pediscreen/cases/123/img2.jpg", capture_ts="2026-02-03T11:00:00")
            ],
            questionnaire={"asq_responses": {"pincer": "yes", "stacks_blocks": "yes"}}
        )
    )

    # 2. Initialize Orchestrator
    orchestrator = CentralOrchestrator()

    # 3. Run Workflow
    print(f"--- Starting Multi-Agent Workflow for Case {payload.case_id} ---")
    result = await orchestrator.run_workflow(payload)

    # 4. Print Results
    print(f"\nStatus: {result.status}")
    if result.medgemma_output:
        print(f"Risk: {result.medgemma_output.risk}")
        print(f"Confidence: {result.medgemma_output.confidence}")
        print(f"Adapter: {result.medgemma_output.adapter_id} (v{result.medgemma_output.model_version})")
        print(f"Rationale: {result.medgemma_output.rationale_bullets[0]}")
        print(f"UI Advisory: {result.medgemma_output.ui_advisory}")
    
    if result.metrics:
        print(f"\nMetrics: {json.dumps(result.metrics, indent=2)}")

    print("\nLogs:")
    for log in result.logs:
        status = "✅" if log['success'] else "❌"
        print(f"{status} [{log['agent']}]: {log['message']}")

    # 5. Test Safety Failure
    print("\n--- Testing Safety Failure (forbidden word) ---")
    payload_fail = payload.copy(deep=True)
    payload_fail.case_id = "case_fail"
    
    # Run the workflow once
    result_fail = await orchestrator.run_workflow(payload_fail)
    # Manually inject a forbidden word into MedGemma output and re-run safety check
    if result_fail.medgemma_output:
        result_fail.medgemma_output.summary.append("We can definitely diagnose this.")
        await orchestrator._call_agent("safety", result_fail)
        
    print(f"Status after safety failure: {result_fail.status}")
    for log in result_fail.logs:
        if "SafetyAgent" in log['agent'] and not log['success']:
            print(f"❌ [SafetyAgent]: {log['message']}")

if __name__ == "__main__":
    asyncio.run(main())
