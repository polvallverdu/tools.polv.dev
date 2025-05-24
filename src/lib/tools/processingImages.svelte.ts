export interface ProcessingImage {
  id: string;
  status: "processing" | "done" | "error";
  input: Blob;
  model: string;
  name: string;
}

let processingImages = $state<ProcessingImage[]>([]);

export const getProcessingImages = () => processingImages;

export const getProcessingImage = (id: string) => processingImages.find((image) => image.id === id);

export const removeProcessingImage = (id: string) =>
  (processingImages = processingImages.filter((image) => image.id !== id));

export const addProcessingImage = (image: ProcessingImage) =>
  (processingImages = [...processingImages, image]);
