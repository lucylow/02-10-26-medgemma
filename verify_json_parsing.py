
import json
from app.backend.medgemma_service import MedGemmaService

def test_json_parsing():
    service = MedGemmaService(model_name="google/medgemma-2b-it") # Won't actually load if not in environment
    
    # Test markdown block
    text1 = "Here is the result: ```json\n{\"risk\": \"low\"}\n```"
    parsed1 = service._safe_parse_json_from_text(text1)
    print(f"Test 1 (Markdown): {parsed1}")
    assert parsed1 == {"risk": "low"}
    
    # Test trailing comma
    text2 = "{\"risk\": \"low\",}"
    parsed2 = service._safe_parse_json_from_text(text2)
    print(f"Test 2 (Trailing Comma): {parsed2}")
    assert parsed2 == {"risk": "low"}

    # Test nested trailing comma
    text3 = "{\"risk\": \"low\", \"details\": [1, 2, ]}"
    parsed3 = service._safe_parse_json_from_text(text3)
    print(f"Test 3 (Nested Trailing): {parsed3}")
    assert parsed3 == {"risk": "low", "details": [1, 2]}

    print("JSON parsing tests passed!")

if __name__ == "__main__":
    try:
        test_json_parsing()
    except Exception as e:
        print(f"Tests failed: {e}")
