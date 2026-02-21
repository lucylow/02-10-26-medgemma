#!/usr/bin/env bash
# Orchestrate: student -> ONNX -> TF -> TFLite; test inference and log size/latency.
# Purpose: Single script for edge build (model-dev). TODO: Fill paths and env.
set -e
STUDENT_DIR="${STUDENT_DIR:-model-dev/artifacts/student}"
ONNX_PATH="${ONNX_PATH:-model-dev/artifacts/model.onnx}"
SAVED_MODEL="${SAVED_MODEL:-model-dev/artifacts/saved_model}"
TFLITE_PATH="${TFLITE_PATH:-model-dev/artifacts/model.tflite}"

echo "Stub: build_tflite pipeline"
echo "  student=$STUDENT_DIR onnx=$ONNX_PATH saved_model=$SAVED_MODEL tflite=$TFLITE_PATH"
# python model-dev/convert/convert_to_onnx.py --checkpoint "$STUDENT_DIR" --output "$ONNX_PATH"
# python model-dev/convert/onnx_to_tf.py --onnx "$ONNX_PATH" --output "$SAVED_MODEL"
# python model-dev/convert/tf_to_tflite.py --saved_model "$SAVED_MODEL" --output "$TFLITE_PATH"
# python -c "import tflite_runtime.interpreter as tflite; i=tflite.Interpreter('$TFLITE_PATH'); i.allocate_tensors(); print('TFLite OK')"
