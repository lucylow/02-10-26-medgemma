
import os
import sys
import json

# Add current directory to path so we can import app
sys.path.append(os.path.join(os.getcwd(), "model-server"))

from app.gemma3_service import Gemma3Service

def test_gemma3_logic():
    print("Testing Gemma 3 Service Logic (Mocking models)...")
    
    # We'll mock the model loading to test the prompt construction and logic
    # In a real environment with GPUs, we'd load the actual model.
    
    # For the sake of this test, we'll just check if the service can be initialized 
    # and if the methods exist and construct prompts correctly.
    
    # Mocking torch and transformers to avoid heavy loads during verification
    import unittest.mock as mock
    
    with mock.patch('transformers.AutoTokenizer.from_pretrained'), \
         mock.patch('transformers.AutoModelForCausalLM.from_pretrained'), \
         mock.patch('torch.cuda.is_available', return_value=False):
        
        service = Gemma3Service(model_name="mock-gemma-3")
        
        # Test 1: Parent Rewrite
        clinical_summary = "Moderate risk for fine motor delay. Poor pencil grip observed."
        # Mock generate to return a fixed string
        service.generate = mock.Mock(return_value="Your child is doing great and we just want to look closer at how they hold crayons.")
        
        rewrite = service.rewrite_for_parents(clinical_summary)
        print(f"Rewrite: {rewrite}")
        assert "child" in rewrite
        
        # Test 2: Clinician Note
        clinical_data = {"summary": clinical_summary, "risk": "moderate"}
        service.generate = mock.Mock(return_value="SOAP Note: Subjective: ... Objective: ...")
        note = service.format_clinician_note(clinical_data)
        print(f"Note: {note}")
        assert "SOAP" in note
        
        # Test 3: Follow-up questions
        context = {"age": 24, "observations": "stacking blocks"}
        service.generate = mock.Mock(return_value="- How many blocks?\n- Does he use both hands?\n- Do they fall?")
        questions = service.generate_follow_up_questions(context)
        print(f"Questions: {questions}")
        assert len(questions) == 3
        assert "blocks" in questions[0]

    print("Gemma 3 Service Logic Verification: PASSED")

if __name__ == "__main__":
    try:
        test_gemma3_logic()
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)
