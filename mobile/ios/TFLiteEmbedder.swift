/**
 * TFLite embedding model for iOS.
 * Podfile: pod 'TensorFlowLiteSwift'
 *
 * Add embedder.tflite to Xcode project (Target > Build Phases > Copy Bundle Resources)
 */
import Foundation
import TensorFlowLite
import UIKit

class TFLiteEmbedder {
    private var interpreter: Interpreter
    private let inputWidth = 224
    private let inputHeight = 224
    private let inputChannels = 3
    private let outputDim = 256

    init?(modelName: String = "embedder", bundle: Bundle = .main) {
        guard let modelPath = bundle.path(forResource: modelName, ofType: "tflite") else {
            return nil
        }
        do {
            interpreter = try Interpreter(modelPath: modelPath)
            try interpreter.allocateTensors()
        } catch {
            print("Failed to create interpreter: \(error)")
            return nil
        }
    }

    func preprocess(_ uiImage: UIImage) -> Data? {
        guard let cgImage = uiImage.cgImage else { return nil }
        let width = inputWidth
        let height = inputHeight
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let bitmapInfo = CGImageAlphaInfo.noneSkipLast.rawValue
        guard let context = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: colorSpace,
            bitmapInfo: bitmapInfo
        ) else { return nil }
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
        guard let imageData = context.data else { return nil }

        var buffer = Data(capacity: width * height * inputChannels * MemoryLayout<Float32>.size)
        for y in 0..<height {
            for x in 0..<width {
                let offset = ((y * width) + x) * 4
                let r = Float32(imageData.load(fromByteOffset: offset, as: UInt8.self)) / 255.0
                let g = Float32(imageData.load(fromByteOffset: offset + 1, as: UInt8.self)) / 255.0
                let b = Float32(imageData.load(fromByteOffset: offset + 2, as: UInt8.self)) / 255.0
                var rr = r
                var gg = g
                var bb = b
                buffer.append(Data(bytes: &rr, count: 4))
                buffer.append(Data(bytes: &gg, count: 4))
                buffer.append(Data(bytes: &bb, count: 4))
            }
        }
        return buffer
    }

    func getEmbedding(from image: UIImage) -> [Float]? {
        guard let inputData = preprocess(image) else { return nil }
        do {
            try interpreter.copy(inputData, toInputAt: 0)
            try interpreter.invoke()
            let outputTensor = try interpreter.output(at: 0)
            let outputCount = outputTensor.shape.dimensions.reduce(1, *)
            let outputData = outputTensor.data
            let floats = outputData.withUnsafeBytes {
                Array(UnsafeBufferPointer<Float32>(start: $0.baseAddress!.assumingMemoryBound(to: Float32.self), count: outputCount))
            }
            let sumsq = floats.map { $0 * $0 }.reduce(0, +)
            let norm = sqrt(sumsq)
            if norm > 0 {
                return floats.map { $0 / Float(norm) }
            } else {
                return floats
            }
        } catch {
            print("TFLite inference error: \(error)")
            return nil
        }
    }
}
