"""
TF SavedModel -> TFLite with post-training quantization (model-dev).
Purpose: Full-integer or dynamic quant for edge. Inputs: SavedModel, optional representative dataset.
Outputs: .tflite file.
Usage: python model-dev/convert/tf_to_tflite.py --saved_model dir --output model.tflite
"""
import argparse


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--saved_model", required=True)
    parser.add_argument("--output", default="model.tflite")
    parser.add_argument("--representative_dataset", default=None)
    args = parser.parse_args()
    # TODO: TFLiteConverter.from_saved_model, optional quantization
    print("Stub: TF->TFLite not implemented", args.saved_model, args.output)


if __name__ == "__main__":
    main()
