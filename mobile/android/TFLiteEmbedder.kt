/**
 * TFLite embedding model for Android.
 * Add to build.gradle:
 *   implementation 'org.tensorflow:tensorflow-lite:2.14.0'
 *   implementation 'org.tensorflow:tensorflow-lite-support:0.4.2'
 *
 * Place embedder.tflite in app/src/main/assets/
 */
package com.pediscreen.tflite

import android.content.Context
import android.graphics.Bitmap
import org.tensorflow.lite.Interpreter
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.sqrt

class TFLiteEmbedder(
    context: Context,
    modelPath: String = "embedder.tflite"
) {
    private var interpreter: Interpreter
    private val inputImageWidth = 224
    private val inputImageHeight = 224
    private val inputChannels = 3
    private val outputDim = 256 // change to your model's output dim

    init {
        val assetManager = context.assets
        val fileDescriptor = assetManager.openFd(modelPath)
        val inputStream = fileDescriptor.createInputStream()
        val bytes = inputStream.readBytes()
        val options = Interpreter.Options()
        interpreter = Interpreter(bytes, options)
    }

    private fun preprocess(bitmap: Bitmap): ByteBuffer {
        val resized = Bitmap.createScaledBitmap(bitmap, inputImageWidth, inputImageHeight, true)
        val byteBuffer = ByteBuffer.allocateDirect(4 * inputImageWidth * inputImageHeight * inputChannels)
        byteBuffer.order(ByteOrder.nativeOrder())
        val intValues = IntArray(inputImageWidth * inputImageHeight)
        resized.getPixels(intValues, 0, resized.width, 0, 0, resized.width, resized.height)
        var pixel = 0
        for (i in 0 until inputImageWidth) {
            for (j in 0 until inputImageHeight) {
                val `val` = intValues[pixel++]
                byteBuffer.putFloat(((`val` shr 16) and 0xFF) / 255.0f)
                byteBuffer.putFloat(((`val` shr 8) and 0xFF) / 255.0f)
                byteBuffer.putFloat((`val` and 0xFF) / 255.0f)
            }
        }
        return byteBuffer
    }

    fun getEmbedding(bitmap: Bitmap): FloatArray {
        val inputBuffer = preprocess(bitmap)
        val outputBuffer = Array(1) { FloatArray(outputDim) }
        interpreter.run(inputBuffer, outputBuffer)
        val vec = outputBuffer[0]
        val norm = sqrt(vec.map { it * it }.sum())
        if (norm > 0) {
            for (i in vec.indices) vec[i] = vec[i] / norm.toFloat()
        }
        return vec
    }

    fun close() {
        interpreter.close()
    }
}
