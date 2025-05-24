import { AutoModel, AutoProcessor, RawImage } from "@huggingface/transformers";
import type { WorkerMessage, WorkerStart } from "./types";

async function applyMaskToImage(
  originalImage: RawImage,
  mask: RawImage,
  progressCallback: (status: string) => void,
): Promise<Blob> {
  progressCallback("Applying mask to image...");

  // Create canvas for compositing
  const canvas = new OffscreenCanvas(originalImage.width, originalImage.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context for compositing");

  // Convert original image to ImageData
  const originalRgbaData = new Uint8ClampedArray(originalImage.width * originalImage.height * 4);
  const originalData = originalImage.data;

  // Convert original image data to RGBA format
  for (let i = 0; i < originalImage.width * originalImage.height; i++) {
    const rgbaIndex = i * 4;
    const pixelIndex = i * originalImage.channels;

    if (originalImage.channels === 3) {
      // RGB image
      originalRgbaData[rgbaIndex] = originalData[pixelIndex]; // R
      originalRgbaData[rgbaIndex + 1] = originalData[pixelIndex + 1]; // G
      originalRgbaData[rgbaIndex + 2] = originalData[pixelIndex + 2]; // B
      originalRgbaData[rgbaIndex + 3] = 255; // A (fully opaque)
    } else if (originalImage.channels === 4) {
      // RGBA image
      originalRgbaData[rgbaIndex] = originalData[pixelIndex]; // R
      originalRgbaData[rgbaIndex + 1] = originalData[pixelIndex + 1]; // G
      originalRgbaData[rgbaIndex + 2] = originalData[pixelIndex + 2]; // B
      originalRgbaData[rgbaIndex + 3] = originalData[pixelIndex + 3]; // A
    } else {
      // Grayscale or other format - convert to RGB
      const grayValue = originalData[pixelIndex];
      originalRgbaData[rgbaIndex] = grayValue; // R
      originalRgbaData[rgbaIndex + 1] = grayValue; // G
      originalRgbaData[rgbaIndex + 2] = grayValue; // B
      originalRgbaData[rgbaIndex + 3] = 255; // A
    }
  }

  // Apply mask as alpha channel
  const maskData = mask.data;
  for (let i = 0; i < originalImage.width * originalImage.height; i++) {
    const rgbaIndex = i * 4;
    const maskValue = maskData[i];

    // Use mask value as alpha channel (0 = transparent, 255 = opaque)
    originalRgbaData[rgbaIndex + 3] = maskValue;
  }

  // Create ImageData and draw to canvas
  const imageData = new ImageData(originalRgbaData, originalImage.width, originalImage.height);
  ctx.putImageData(imageData, 0, 0);

  // Convert to blob
  const outputBlob = await canvas.convertToBlob({ type: "image/png" });
  return outputBlob;
}

async function processImageWithModel(
  image: Blob,
  model: string,
  messageId: string,
  progressCallback: (status: string) => void,
): Promise<Blob> {
  // Load model and processor for modnet
  const loadedModel = await AutoModel.from_pretrained(model, {
    dtype: "fp32",
    progress_callback: (progress) => {
      progressCallback(progress.status || "Loading model...");
    },
  });

  const processor = await AutoProcessor.from_pretrained(model, {});

  // Convert input Blob to RawImage format
  progressCallback("Converting image...");
  const rawImage = await RawImage.read(image);

  progressCallback("Pre-processing image...");
  // Pre-process image
  const { pixel_values } = await processor(rawImage);

  progressCallback("Generating mask...");
  // Predict alpha matte
  const { output } = await loadedModel({ input: pixel_values });

  progressCallback("Processing output...");
  // Convert output tensor to mask image
  const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(
    rawImage.width,
    rawImage.height,
  );

  // Apply mask to original image to create final result
  const outputBlob = await applyMaskToImage(rawImage, mask, progressCallback);

  return outputBlob;
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === "PROCESS_IMAGE") {
    const { image, model } = message;

    try {
      const progressCallback = (status: string) => {
        const progressMessage: WorkerMessage = {
          type: "PROGRESS",
          id: message.id,
          status,
        };
        self.postMessage(progressMessage);
      };

      const outputBlob = await processImageWithModel(image, model, message.id, progressCallback);

      const doneMessage: WorkerMessage = {
        type: "DONE",
        id: message.id,
        output: outputBlob,
      };
      self.postMessage(doneMessage);
    } catch (error) {
      const errorMessage: WorkerMessage = {
        type: "ERROR",
        id: message.id,
        error: error instanceof Error ? error.message : String(error),
      };
      self.postMessage(errorMessage);
    }
  }
};

self.postMessage({ type: "START" } as WorkerStart);
