# Differential privacy plan (model-dev)

## When to use DP-SGD
- When training on sensitive/identifiable data and release of the model could leak information.
- Use Opacus (PyTorch) or TensorFlow Privacy; configure noise_multiplier, max_grad_norm, sample_rate.

## Optional hook in finetune_lora.py
- Add flag `--use_dp` and attach PrivacyEngine with config: noise_multiplier, max_grad_norm, sample_rate.
- Document epsilon/delta estimates after training (toy run on synthetic data).

## Federated learning (roadmap)
- Document in federated_plan.md: Flower or TensorFlow Federated, secure aggregation.
- Not implemented in this repo; placeholder for future work.
