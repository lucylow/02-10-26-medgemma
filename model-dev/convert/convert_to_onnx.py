"""
Export model to ONNX (model-dev convert pipeline).
Purpose: PyTorch/student -> ONNX for downstream TF/TFLite. Inputs: checkpoint path. Outputs: .onnx file.
Usage: python model-dev/convert/convert_to_onnx.py --checkpoint model-dev/artifacts/student --output model-dev/artifacts/model.onnx
"""
import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--output", default="model.onnx")
    args = parser.parse_args()
    # TODO: Load PyTorch model, export via torch.onnx.export
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    print("Stub: ONNX export not implemented; add torch.onnx.export", args.checkpoint, args.output)


if __name__ == "__main__":
    main()
