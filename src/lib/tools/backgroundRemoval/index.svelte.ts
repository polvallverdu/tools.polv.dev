import AsyncLock from 'async-lock';
import { BG_REMOVAL_MODELS, type BGRemovalModel } from './types';

const BG_REMOVAL_SELECTED_MODEL_KEY = 'bg-removal-selected-model';

const savedModal =
	typeof window !== 'undefined' ? localStorage.getItem(BG_REMOVAL_SELECTED_MODEL_KEY) : null;
let selectedModel = $state<BGRemovalModel>(
	!savedModal || BG_REMOVAL_MODELS.includes(savedModal as BGRemovalModel)
		? (savedModal as BGRemovalModel)
		: BG_REMOVAL_MODELS[0]
);

export const setSelectedModel = (model: BGRemovalModel) => {
	selectedModel = model;
	localStorage.setItem(BG_REMOVAL_SELECTED_MODEL_KEY, model);
};

export const getSelectedModel = () => selectedModel;

let worker = $state<Worker | null>(null);

export const getWorker = () => worker;

const workerInitLock = new AsyncLock();

export function initWorker() {
	workerInitLock.acquire('worker-init', async () => {
		if (worker) return;

		worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
	});
}

export async function processImage(image: File) {}
