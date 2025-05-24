import AsyncLock from "async-lock";
import { BG_REMOVAL_MODELS, type BGRemovalModel } from "./types";
import type { WorkerMessage, WorkerRequest } from "./types";
import { db } from "@/db/db.svelte";
import { blobToBase64 } from "@/utils/blob";
import { toast } from "svelte-sonner";
import {
  addProcessingImage,
  getProcessingImage,
  removeProcessingImage,
  type ProcessingImage,
} from "../processingImages.svelte";

const BG_REMOVAL_SELECTED_MODEL_KEY = "bg-removal-selected-model";

const savedModal =
  typeof window !== "undefined" ? localStorage.getItem(BG_REMOVAL_SELECTED_MODEL_KEY) : null;
let selectedModel = $state<BGRemovalModel>(
  !savedModal || BG_REMOVAL_MODELS.includes(savedModal as BGRemovalModel)
    ? (savedModal as BGRemovalModel)
    : BG_REMOVAL_MODELS[0],
);

export const setSelectedModel = (model: BGRemovalModel) => {
  selectedModel = model;
  localStorage.setItem(BG_REMOVAL_SELECTED_MODEL_KEY, model);
};

export const getSelectedModel = () => selectedModel;

let worker = $state<Worker | null>(null);

export const getWorker = () => worker;

const workerInitLock = new AsyncLock();

export async function initWorker() {
  await workerInitLock.acquire("worker-init", async () => {
    if (worker) return;

    return new Promise((resolve) => {
      worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });

      worker.onmessage = async (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;
        switch (message.type) {
          case "START":
            resolve(message);
            break;
          case "PROGRESS": {
            const image = getProcessingImage(message.id);
            if (image) {
              image.status = "processing";
            }
            break;
          }
          case "DONE": {
            const image = getProcessingImage(message.id);
            if (!image) {
              break;
            }

            removeProcessingImage(message.id);

            const [input, output] = await Promise.all([
              blobToBase64(image.input),
              blobToBase64(message.output),
            ]);

            db.addRow("images", {
              model: image.model,
              name: image.name,
              createdAt: new Date().toISOString(),
              input,
              output,
            });
            break;
          }
          case "ERROR": {
            toast.error("There was an error processing your image. More info on the console.");
            console.error(message.error);
            break;
          }
        }
      };

      worker.onerror = (error) => {
        // TODO: Handle worker errors
        console.error("Worker error:", error);
      };
    });
  });
}

export async function processImage(image: File): Promise<ProcessingImage> {
  await initWorker();

  const processingImage: ProcessingImage = {
    id: crypto.randomUUID(),
    status: "processing",
    input: image,
    model: selectedModel,
    name: image.name,
  };

  addProcessingImage(processingImage);

  const request: WorkerRequest = {
    type: "PROCESS_IMAGE",
    id: processingImage.id,
    image,
    model: selectedModel,
  };

  worker?.postMessage(request);

  return processingImage;
}
