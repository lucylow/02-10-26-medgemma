# Example Adapter (template)

**Purpose:** Template for LoRA adapter metadata. Copy to your adapter folder and fill after training.

## Metadata
- **Adapter path:** `model-dev/adapters/example_adapter`
- **Base model:** google/medgemma-2b-it (or your base)
- **Dataset ID:** _fill_
- **Provenance ID:** _fill_

## Training
- **Train samples:** _fill_
- **Validation samples:** _fill_
- **Hyperparameters:** _fill (e.g. learning_rate, num_train_epochs, per_device_train_batch_size)_

## Evaluation summary
_Fill with ROUGE/BLEU or domain F1 from eval_pipeline._

## Intended use
Clinical decision support (CDS) only. Output must be reviewed by a licensed clinician.

## Limitations
Not a diagnostic system. Do not use as sole basis for diagnosis.

## Contact
See repo README for issues and governance.
