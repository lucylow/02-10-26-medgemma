"""
ONNX -> TF SavedModel (model-dev). Purpose: For TFLite pipeline. Inputs: .onnx. Outputs: SavedModel dir.
Usage: python model-dev/convert/onnx_to_tf.py --onnx model.onnx --output saved_model
"""
import argparse


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--onnx", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    # TODO: Use onnx-tf to convert
    print("Stub: ONNX->TF not implemented", args.onnx, args.output)


if __name__ == "__main__":
    main()
