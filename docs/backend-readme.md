# PediScreen AI: An Accessible Developmental Milestone Screening Assistant

**Project Name:** PediScreen AI  
**Creator:** Lucy Low

PediScreen AI is a human-centered, privacy-focused application that empowers community health workers and parents to conduct preliminary developmental screenings for children aged 0-5 years.

## Core Technology: MedGemma

PediScreen AI leverages Google's open-weight **MedGemma** model as its core reasoning engine. Generic LLMs fail on safety and medical domain knowledge; MedGemma provides:
- **Medical Domain Expertise:** Pre-trained on clinical text for accurate interpretation of child behavior descriptions.
- **Multimodal Capability:** Jointly processes textual descriptions and visual cues (drawings, block towers).
- **Privacy-Focused:** Optimized for edge deployment to ensure sensitive data stays on-device.

## Technical Architecture

- **Frontend:** Progressive Web App (PWA) / React Native for cross-platform offline-first use.
- **Inference Engine:** Quantized and fine-tuned MedGemma 2B model using LoRA adapters.
- **Inference Server:** FastAPI service providing high-performance async API for MedGemma analysis.

## Features

- 🧠 **MedGemma Integration** - Google's medical AI model optimized for healthcare
- 🔧 **LoRA Adapters** - Parameter-Efficient Fine-Tuning (PEFT) for developmental milestones
- 🚀 **FastAPI Server** - High-performance async API with automatic docs
- 🖼️ **Multimodal Fusion** - Combined analysis of text observations and visual evidence
- 📊 **Risk Stratification** - Evidence-grounded classifications ("On Track", "Monitor", "Refer")
- 📝 **Clinical Reasoning** - Structured explanations for screening outcomes

## Quick Start

### Prerequisites

- Python 3.10+
- CUDA-compatible GPU (recommended for production)
- 16GB+ RAM

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export MEDGEMMA_MODEL_NAME=google/medgemma-2b-it
export ADAPTER_SOURCE=""  # Optional: gs://bucket/path or HF repo

# Run server
python -m app.main
```

### Docker

```bash
# Build image
docker build -t pediscreen-medgemma .

# Run container
docker run -p 8000:8000 \
  -e MEDGEMMA_MODEL_NAME=google/medgemma-2b-it \
  --gpus all \
  pediscreen-medgemma
```

## API Endpoints

### Health Check

```bash
curl http://localhost:8000/health
```

### Analyze Screening

```bash
curl -X POST "http://localhost:8000/api/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "case-001",
    "age_months": 24,
    "domain": "communication",
    "observations": "Child responds to name, says about 20 words..."
  }'
```

### Response Format

```json
{
  "success": true,
  "screening_id": "screen_abc123",
  "timestamp": "2024-01-15T10:30:00Z",
  "report": {
    "risk_stratification": {
      "level": "moderate",
      "primary_domain": "Fine Motor Skills",
      "confidence": 0.85,
      "rationale": "Observed fine motor behaviors fall below expected range for age..."
    },
    "clinical_summary": "Child demonstrates age-appropriate gross motor skills. Fine motor development shows possible delay...",
    "parent_friendly_explanation": "Your child shows many strengths. Some hand-use skills may need a closer look...",
    "differential_considerations": ["Fine motor coordination delay", "Environmental factors"],
    "supporting_evidence": {
      "from_parent_report": ["Limited pincer grasp"],
      "from_assessment_scores": [],
      "from_visual_analysis": ["Scribbles without shape"]
    },
    "developmental_profile": {
      "strengths": ["Gross motor skills"],
      "concerns": ["Fine motor coordination"],
      "milestones_met": ["Walks independently"],
      "milestones_emerging": ["Uses spoon"],
      "milestones_not_observed": ["Pincer grasp"]
    },
    "recommendations": {
      "immediate": ["Refer to occupational therapy"],
      "short_term": ["Repeat screening in 3 months"],
      "long_term": [],
      "parent_friendly_tips": ["Provide home activities like block stacking"]
    },
    "referral_guidance": {
      "needed": true,
      "urgency": "routine",
      "specialties": ["Occupational Therapist"],
      "reason": "Clinical justification for referral"
    },
    "follow_up": {
      "rescreen_interval_days": 90,
      "monitoring_focus": ["Fine motor skills"],
      "red_flags_to_watch": []
    },
    "economic_impact": {
      "early_intervention_value": "$150,000+",
      "description": "Early intervention significantly reduces long-term support costs."
    }
  },
  "risk_assessment": {
    "level": "monitor",
    "confidence": 0.85,
    "reasoning": "Observed fine motor behaviors fall below expected range for age..."
  },
  "developmental_analysis": {
    "strengths": ["Gross motor skills"],
    "concerns": ["Fine motor coordination"]
  },
  "clinical_summary": "Child demonstrates age-appropriate gross motor skills...",
  "recommendations": {
    "immediate": ["Refer to occupational therapy"],
    "short_term": ["Repeat screening in 3 months"],
    "long_term": []
  },
  "referral_guidance": {
    "needed": true,
    "specialties": ["Occupational Therapist"],
    "urgency": "routine"
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MEDGEMMA_MODEL_NAME` | `google/medgemma-2b-it` | Base model name |
| `ADAPTER_SOURCE` | `""` | LoRA adapter source (GCS/HF/local) |
| `ADAPTER_LOCAL_DIR` | `/app/adapters` | Local adapter directory |
| `DEVICE_AUTO` | `1` | Auto-detect GPU |
| `PORT` | `8000` | Server port |

## Developmental Domains

- `communication` - Language and communication skills
- `gross_motor` - Large muscle movement and coordination
- `fine_motor` - Small muscle control and manipulation
- `cognitive` - Problem-solving and learning
- `social` - Personal and social development

## Testing

```bash
python -m tests.test_infer
```

## Production Deployment

### Security Considerations

1. **Protect admin endpoints** - Add authentication to `/admin/*`
2. **Use HTTPS** - Deploy behind TLS-terminating load balancer
3. **Rate limiting** - Implement request rate limits
4. **Audit logging** - Log all inferences with case IDs

### Scaling

- Use multiple workers for CPU-bound tasks
- Deploy GPU pods with autoscaling
- Consider batching for high throughput

### Monitoring

- Prometheus metrics endpoint (add `/metrics`)
- Structured logging with correlation IDs
- Latency and error rate dashboards

## License

Proprietary - PediScreen AI

## Support

Contact: support@pediscreen.ai
