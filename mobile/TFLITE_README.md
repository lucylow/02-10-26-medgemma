# TFLite Embedder (Android & iOS)

On-device embedding using a converted vision encoder (`.tflite`).

## Model Conversion (Overview)

1. **PyTorch → ONNX**
   ```bash
   torch.onnx.export(model, dummy_input, "model.onnx", opset_version=13)
   ```

2. **ONNX → TensorFlow**
   ```bash
   onnx-tf convert -i model.onnx -o tf_model
   ```

3. **TFLite Convert**
   ```bash
   tflite_convert --saved_model_dir=tf_model --output_file=embedder.tflite --inference_type=FLOAT
   ```

## Android

- Add `embedder.tflite` to `app/src/main/assets/`
- build.gradle:
  ```gradle
  implementation 'org.tensorflow:tensorflow-lite:2.14.0'
  implementation 'org.tensorflow:tensorflow-lite-support:0.4.2'
  ```
- Use `TFLiteEmbedder(context).getEmbedding(bitmap)` → `FloatArray`
- Convert to base64 for storage/upload: `Base64.encodeToString(floatArrayToBytes(arr), Base64.NO_WRAP)`

## iOS

- Podfile: `pod 'TensorFlowLiteSwift'`
- Add `embedder.tflite` to Xcode (Copy Bundle Resources)
- Use `TFLiteEmbedder()?.getEmbedding(from: uiImage)` → `[Float]?`
- Convert to base64 for storage/upload before calling `queueCase`

## Input/Output Shapes

- **Input**: `[1, 224, 224, 3]` float32, RGB normalized 0..1
- **Output**: `[1, 256]` float32 (L2-normalized)

Adjust `outputDim` in the code if your model differs.
