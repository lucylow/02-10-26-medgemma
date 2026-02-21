# PediScreen Prompt Templates

Poppins-style header: canonical few-shot and zero-shot templates for clinical summary and risk.

## Clinical summary (deterministic)

**Template:** "Provide a short clinical summary (2-4 bullets), a risk level, and 3 actionable recommendations."

- Risk levels: `on_track`, `monitor`, `discuss`, `refer`
- Output: bullets + risk + recommendations

## Zero-shot screening

- Input: observations text (and optional embedding context).
- Output: risk level + brief rationale.

## Few-shot

- 1–2 example(s) of observations → risk + rationale, then query.

## Usage

- `python -m prompts.render --prompt_id X` returns filled prompt with metadata and `prompt_hash`.
