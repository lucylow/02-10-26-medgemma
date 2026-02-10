"""
Gemma3Service
- Handles generative reasoning tasks: communication, orchestration, and explanation.
- Complements MedGemma by providing emotionally safe, localized, and formatted outputs.
- Does NOT perform clinical reasoning.
"""

import os
from typing import Optional, Dict, Any, List
import torch
from loguru import logger
from transformers import AutoTokenizer, AutoModelForCausalLM

# Environment-driven defaults
GEMMA3_MODEL_NAME = os.getenv("GEMMA3_MODEL_NAME", "google/gemma-3-4b-it")
DEVICE_AUTO = os.getenv("DEVICE_AUTO", "1") == "1"

class Gemma3Service:
    def __init__(
        self,
        model_name: str = GEMMA3_MODEL_NAME,
        device: Optional[str] = None
    ):
        self.model_name = model_name
        
        # Choose device
        if device:
            self.device = torch.device(device)
        else:
            self.device = torch.device(
                "cuda" if (torch.cuda.is_available() and DEVICE_AUTO) else "cpu"
            )
        logger.info("Gemma3Service device: {}", self.device)
        
        # Load components
        self.tokenizer = None
        self.model = None
        self._load_model()

    def _load_model(self):
        logger.info("Loading Gemma 3 model: {}", self.model_name)
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name, trust_remote_code=True
            )
            
            # Use 4-bit quantization if possible to save memory for concurrent MedGemma
            try:
                from transformers import BitsAndBytesConfig
                quant_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.float16
                )
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name, 
                    trust_remote_code=True, 
                    device_map="auto",
                    quantization_config=quant_config
                )
                logger.info("Loaded Gemma 3 with 4-bit quantization")
            except Exception as e:
                logger.warning("Failed to load Gemma 3 with quantization: {}. Attempting standard load.", e)
                self.model = AutoModelForCausalLM.from_pretrained(
                    self.model_name, 
                    trust_remote_code=True, 
                    device_map="auto" if self.device.type == "cuda" else None
                )
                if self.device.type != "cuda":
                    self.model.to(self.device)
                
            self.model.eval()
            logger.info("Gemma 3 model loaded successfully")
        except Exception as e:
            logger.error("Failed to load Gemma 3 model: {}", e)
            # Use mock mode if model fails to load (demo resilience)
            self.model = None
            logger.warning("Gemma 3 entering mock mode due to load failure.")

    def generate(
        self, 
        prompt: str, 
        max_new_tokens: int = 512, 
        temperature: float = 0.7
    ) -> str:
        """Base generation method with mock fallback and robust error handling"""
        try:
            if not self.model or not self.tokenizer:
                logger.info("Gemma 3 using mock response (model/tokenizer not loaded)")
                if "explanation" in prompt.lower() or "rewrite" in prompt.lower():
                    return "The screening suggests your child is making good progress in some areas, while others may need a bit more observation. This tool is designed to help us identify where we can best support your child's growth. It is not a final diagnosis, but a way to ensure they get the right attention early on."
                elif "soap" in prompt.lower() or "note" in prompt.lower():
                    return "S: Caregiver reports concerns with fine motor control.\nO: MedSigLIP detected inconsistent pressure in drawing samples.\nA: Possible fine motor delay (moderate risk).\nP: Refer to occupational therapy for formal evaluation."
                return "PediScreen AI: Focused on early intervention and developmental support."

            try:
                inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
            except Exception as e:
                logger.error("Gemma 3 tokenization failed: {}", e)
                return f"Error: Tokenization failed - {str(e)}"
            
            with torch.no_grad():
                try:
                    outputs = self.model.generate(
                        **inputs,
                        max_new_tokens=max_new_tokens,
                        temperature=temperature,
                        do_sample=True if temperature > 0 else False
                    )
                except Exception as e:
                    logger.error("Gemma 3 generation failed: {}", e)
                    return f"Error: Generation failed - {str(e)}"
            
            try:
                full_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
                # Remove prompt from output if necessary (Gemma models usually include it)
                if full_text.startswith(prompt):
                    return full_text[len(prompt):].strip()
                return full_text.strip()
            except Exception as e:
                logger.error("Gemma 3 decoding failed: {}", e)
                return f"Error: Decoding failed - {str(e)}"
        except Exception as e:
            logger.exception("Unexpected error in Gemma3Service.generate")
            return f"Error: Unexpected failure - {str(e)}"

    def rewrite_for_parents(
        self, 
        clinical_summary: str, 
        tone: str = "reassuring",
        language: str = "English",
        reading_level: str = "grade 6"
    ) -> str:
        """
        Rewrites clinical outputs into parent-friendly language.
        Use Case 3.1 & 3.3
        """
        prompt = f"""SYSTEM:
You are a supportive pediatric assistant. Your job is to explain screening results to parents/caregivers.
- You DO NOT diagnose or predict long-term outcomes.
- Use {tone} language.
- Target a {reading_level} reading level.
- Respond in {language}.
- Keep it under 150 words.

INPUT:
Clinical summary: "{clinical_summary}"

TASK:
Rewrite this explanation for a caregiver with no medical background. Avoid clinical jargon. 
Focus on explaining that this is a screening to help the child, not a final diagnosis.
"""
        return self.generate(prompt)

    def format_clinician_note(self, clinical_data: Dict[str, Any]) -> str:
        """
        Formats structured output into EHR-style SOAP notes.
        Use Case 3.4
        """
        prompt = f"""SYSTEM:
You are a clinical documentation assistant. 
Format the following structured screening data into a professional SOAP-style note (Subjective, Objective, Assessment, Plan).

DATA:
{clinical_data}

TASK:
Generate a concise EHR-ready note. Maintain professional clinical terminology.
"""
        return self.generate(prompt, max_new_tokens=1024)

    def generate_follow_up_questions(self, context: Dict[str, Any]) -> List[str]:
        """
        Generates dynamic follow-up questions for the questionnaire.
        Use Case 3.2
        """
        prompt = f"""SYSTEM:
You are a conversational UX assistant for a pediatric screening app.
Based on the child's age and previous responses, generate 3 friendly follow-up questions to engage the caregiver.

CONTEXT:
{context}

TASK:
Return 3 conversational questions that encourage the parent to share more about their child's development.
Format as a simple bulleted list.
"""
        response = self.generate(prompt)
        # Simple parsing of bulleted list
        questions = [q.strip("- ").strip() for q in response.split("\n") if q.strip().startswith("-")]
        return questions[:3]
